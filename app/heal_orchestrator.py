from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List
from uuid import uuid4

from app.brightdata_client import BrightDataAdapter, DemoBrightDataAdapter
from app.contracts import build_repair_prompt, evaluate_contract, schema_signature
from app.errors import DomainError
from app.models import (
    AuditEvent,
    Collector,
    DashboardState,
    DataContract,
    HealthStatus,
    LastKnownGood,
    PolicyMode,
    ProviderRepairEvidence,
    RepairJob,
    RepairState,
    RunRecord,
)
from app.repository import Repository


def _parse_provider_time(value: Any, fallback: datetime) -> datetime:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return fallback
    return fallback


def _build_provider_evidence(external: Dict[str, Any]) -> ProviderRepairEvidence:
    fallback = datetime.now(timezone.utc)
    started_at = _parse_provider_time(external.get("started_at"), fallback)
    completed_at = _parse_provider_time(external.get("completed_at"), fallback)
    published_at = (
        _parse_provider_time(external.get("published_at"), completed_at)
        if external.get("published_at")
        else None
    )
    raw_status = str(external.get("status") or "unknown")
    progress_status = "completed" if raw_status in {"done", "completed"} else raw_status
    requires_publish = bool(external.get("requires_publish", False))
    draft_status = external.get("draft_status") or (
        "ready_for_review" if requires_publish else "not_required"
    )
    return ProviderRepairEvidence(
        provider=str(external.get("provider") or "unknown"),
        job_id=external.get("job_id"),
        trigger_status=str(external.get("trigger_status") or "accepted"),
        progress_status=progress_status,
        draft_status=draft_status,
        requires_publish=requires_publish,
        started_at=started_at,
        completed_at=completed_at,
        published_at=published_at,
        latency_seconds=max(0, (completed_at - started_at).total_seconds()),
    )


class ScrapeSentryService:
    def __init__(self, repository: Repository, adapter: BrightDataAdapter) -> None:
        self.repository = repository
        self.adapter = adapter

    def register_collector(self, collector: Collector) -> Collector:
        self.repository.save_collector(collector)
        self._event(
            collector.id,
            "collector_registered",
            "Collector registered",
            f"Contract v{collector.contract.version} is now enforced in "
            f"{collector.policy_mode.value} mode.",
        )
        return collector

    def set_data_contract(self, collector_id: str, contract: DataContract) -> Collector:
        collector = self.repository.get_collector(collector_id)
        if contract.version <= collector.contract.version:
            raise DomainError(
                "contract_version_conflict",
                "The new contract version must be greater than the current version.",
            )
        collector.contract = contract
        self.repository.save_collector(collector)
        self._event(
            collector_id,
            "contract_updated",
            "Data contract updated",
            f"Collector now validates against contract v{contract.version}.",
        )
        return collector

    def list_collectors(self) -> List[Collector]:
        return self.repository.list_collectors()

    def check_health(
        self,
        collector_id: str,
        idempotency_key: str,
        snapshot: List[Dict[str, Any]] | None = None,
        source: str | None = None,
    ) -> RunRecord:
        cached = self.repository.get_idempotent("check", collector_id, idempotency_key)
        if cached:
            return cached
        with self.repository.collector_lock(collector_id):
            cached = self.repository.get_idempotent("check", collector_id, idempotency_key)
            if cached:
                return cached
            collector = self.repository.get_collector(collector_id)
            rows = snapshot if snapshot is not None else self.adapter.collect(collector)
            evaluation = evaluate_contract(rows, collector.contract)
            resolved_source = source or (
                "demo" if isinstance(self.adapter, DemoBrightDataAdapter) else "brightdata"
            )
            run = RunRecord(
                id=f"run_{uuid4().hex[:12]}",
                collector_id=collector_id,
                idempotency_key=idempotency_key,
                snapshot=rows,
                evaluation=evaluation,
                quarantined=evaluation.blocking,
                provider_job_id=(
                    getattr(self.adapter, "last_collection_id", None)
                    if snapshot is None
                    else None
                ),
                source=resolved_source,
            )
            collector.status = evaluation.status
            collector.health_score = evaluation.score
            collector.last_run_at = run.created_at
            if evaluation.blocking:
                if collector.active_incident_id:
                    self._event(
                        collector_id,
                        "incident_reconfirmed",
                        "Incident still active",
                        f"The scheduled check reconfirmed {len(evaluation.violations)} "
                        "contract violations. Downstream delivery remains blocked.",
                        {"run_id": run.id, "score": evaluation.score},
                    )
                else:
                    collector.active_incident_id = f"inc_{uuid4().hex[:10]}"
                    self._event(
                        collector_id,
                        "snapshot_quarantined",
                        "Bad snapshot quarantined",
                        f"{len(evaluation.violations)} contract violations blocked "
                        "downstream delivery.",
                        {"run_id": run.id, "score": evaluation.score},
                    )
            else:
                collector.last_healthy_at = run.created_at
                collector.active_incident_id = None
                self.repository.save_last_known_good(
                    LastKnownGood(collector_id=collector_id, run_id=run.id, snapshot=rows)
                )
                self._event(
                    collector_id,
                    "health_check_passed",
                    "Contract check passed",
                    f"{len(rows)} rows scored {evaluation.score}/100 and became last known good.",
                    {"run_id": run.id},
                )
            self.repository.save_run(run)
            self.repository.save_collector(collector)
            self.repository.save_idempotent("check", collector_id, idempotency_key, run)
            return run

    def get_drift_report(self, collector_id: str) -> Dict[str, Any]:
        run = self.repository.latest_run(collector_id)
        if not run:
            raise DomainError(
                "no_runs", "Run a health check before requesting a drift report.", 404
            )
        return {
            "run_id": run.id,
            "status": run.evaluation.status,
            "score": run.evaluation.score,
            "quarantined": run.quarantined,
            "violations": run.evaluation.violations,
            "repair_prompt": build_repair_prompt(run.evaluation),
        }

    def propose_heal(self, collector_id: str, idempotency_key: str) -> RepairJob:
        cached = self.repository.get_idempotent("propose", collector_id, idempotency_key)
        if cached:
            return cached
        with self.repository.collector_lock(collector_id):
            collector = self.repository.get_collector(collector_id)
            latest_run = self.repository.latest_run(collector_id)
            if not latest_run or not latest_run.evaluation.blocking:
                raise DomainError(
                    "collector_not_broken",
                    "A blocking run is required before proposing a repair.",
                    409,
                )
            if collector.policy_mode == PolicyMode.OBSERVE:
                raise DomainError(
                    "observe_only",
                    "This collector is in observe mode and cannot request repairs.",
                    409,
                )
            prompt = build_repair_prompt(latest_run.evaluation)
            external = self.adapter.propose_heal(collector, prompt)
            provider_evidence = _build_provider_evidence(external)
            preview_rows = external.get("preview_rows") or []
            preview_evaluation = (
                evaluate_contract(preview_rows, collector.contract) if preview_rows else None
            )
            last_known_good = self.repository.get_last_known_good(collector_id)
            expected_signature = (
                schema_signature(last_known_good.snapshot)
                if last_known_good
                else tuple(sorted(collector.contract.fields.keys()))
            )
            schema_changed = bool(preview_rows) and (
                schema_signature(preview_rows) != expected_signature
            )
            repair = RepairJob(
                id=f"heal_{uuid4().hex[:12]}",
                collector_id=collector_id,
                idempotency_key=idempotency_key,
                state=RepairState.AWAITING_APPROVAL,
                prompt=prompt,
                confidence=int(external.get("confidence", 0)),
                before_rows=latest_run.snapshot,
                preview_rows=preview_rows,
                preview_evaluation=preview_evaluation,
                diff_summary=external.get("diff_summary") or [],
                schema_changed=schema_changed,
                provider_evidence=provider_evidence,
                external_job=external,
            )
            self.repository.save_repair(repair)
            self.repository.save_idempotent("propose", collector_id, idempotency_key, repair)
            self._event(
                collector_id,
                "repair_awaiting_approval",
                "Repair candidate ready",
                "Bright Data Self-Healing completed and the candidate is awaiting approval.",
                {
                    "repair_id": repair.id,
                    "confidence": repair.confidence,
                    "provider": provider_evidence.provider,
                    "provider_job_id": provider_evidence.job_id,
                    "repair_latency_seconds": provider_evidence.latency_seconds,
                },
            )
            if (
                collector.policy_mode == PolicyMode.GUARDED_AUTO
                and preview_evaluation
                and not preview_evaluation.blocking
                and not schema_changed
                and repair.confidence >= collector.auto_approve_threshold
            ):
                return self.approve_heal(collector_id, repair.id, allow_schema_change=False)
            return repair

    def confirm_provider_publish(
        self, collector_id: str, repair_id: str | None = None
    ) -> RepairJob:
        with self.repository.collector_lock(collector_id):
            repair = self._require_repair(collector_id)
            if repair_id and repair.id != repair_id:
                raise DomainError("repair_not_found", "The requested repair was not found.", 404)
            evidence = repair.provider_evidence
            if not evidence or not evidence.requires_publish:
                raise DomainError(
                    "provider_publish_not_required",
                    "This repair does not require a provider draft publish confirmation.",
                    409,
                )
            if repair.state != RepairState.APPROVED:
                raise DomainError(
                    "repair_not_approved",
                    "Approve the repair before confirming the provider draft publish.",
                    409,
                )
            if evidence.draft_status == "published":
                return repair
            published_at = datetime.now(timezone.utc)
            evidence.draft_status = "published"
            evidence.published_at = published_at
            repair.updated_at = published_at
            self.repository.save_repair(repair)
            self._event(
                collector_id,
                "provider_draft_published",
                "Scraper Studio draft published",
                "The reviewed provider draft is cleared for guarded verification.",
                {"repair_id": repair.id, "provider_job_id": evidence.job_id},
            )
            return repair

    def get_heal_preview(self, collector_id: str) -> RepairJob:
        repair = self.repository.latest_repair(collector_id)
        if not repair:
            raise DomainError("no_repair", "No repair proposal exists for this collector.", 404)
        return repair

    def approve_heal(
        self, collector_id: str, repair_id: str | None = None, allow_schema_change: bool = False
    ) -> RepairJob:
        with self.repository.collector_lock(collector_id):
            repair = self.repository.latest_repair(collector_id)
            if not repair or (repair_id and repair.id != repair_id):
                raise DomainError("repair_not_found", "The requested repair was not found.", 404)
            if repair.state in {
                RepairState.APPROVED,
                RepairState.SHADOW_VERIFYING,
                RepairState.PRODUCTION_VERIFYING,
                RepairState.RECOVERED,
            }:
                return repair
            if repair.state != RepairState.AWAITING_APPROVAL:
                raise DomainError(
                    "invalid_repair_state",
                    "Only an awaiting-approval repair can be approved.",
                    409,
                )
            if repair.schema_changed and not allow_schema_change:
                raise DomainError(
                    "schema_change_requires_approval",
                    "This repair changes the output schema and requires an explicit override.",
                    409,
                )
            if repair.external_job and repair.external_job.get("requires_provider_accept"):
                try:
                    repair.external_job = self.adapter.accept_candidate(
                        self.repository.get_collector(collector_id), repair.external_job
                    )
                except Exception as error:
                    raise DomainError(
                        "provider_candidate_acceptance_failed",
                        f"Bright Data could not save the approved development draft: {error}",
                        502,
                    ) from error
                repair.provider_evidence = _build_provider_evidence(repair.external_job)
                repair.preview_rows = repair.external_job.get("preview_rows") or repair.preview_rows
            repair.state = RepairState.APPROVED
            repair.updated_at = datetime.now(timezone.utc)
            self.repository.save_repair(repair)
            self._event(
                collector_id,
                "repair_approved",
                "Repair approved",
                "The candidate may proceed to canary and production verification.",
                {"repair_id": repair.id},
            )
            return repair

    def reject_heal(self, collector_id: str, reason: str = "Rejected by reviewer") -> RepairJob:
        repair = self._require_repair(collector_id)
        if repair.state == RepairState.REJECTED:
            return repair
        if repair.state != RepairState.AWAITING_APPROVAL:
            raise DomainError(
                "invalid_repair_state",
                "Only an awaiting-approval repair can be rejected.",
                409,
            )
        repair.state = RepairState.REJECTED
        repair.failure_reason = reason
        repair.updated_at = datetime.now(timezone.utc)
        self.repository.save_repair(repair)
        self._event(
            collector_id, "repair_rejected", "Repair rejected", reason, {"repair_id": repair.id}
        )
        return repair

    def verify_recovery(self, collector_id: str, idempotency_key: str) -> RepairJob:
        cached = self.repository.get_idempotent("verify", collector_id, idempotency_key)
        if cached:
            return cached
        with self.repository.collector_lock(collector_id):
            collector = self.repository.get_collector(collector_id)
            repair = self._require_repair(collector_id)
            if repair.state != RepairState.APPROVED:
                raise DomainError(
                    "repair_not_approved",
                    "Approve the repair before verification.",
                    409,
                )
            evidence = repair.provider_evidence
            if evidence and evidence.requires_publish and evidence.draft_status != "published":
                raise DomainError(
                    "provider_draft_not_published",
                    "Review and publish the Bright Data development draft before verification.",
                    409,
                )
            repair.state = RepairState.SHADOW_VERIFYING
            repair.updated_at = datetime.now(timezone.utc)
            self.repository.save_repair(repair)
            self._event(
                collector_id,
                "shadow_verification_started",
                "Canary verification started",
                "The candidate is being evaluated against canary inputs and contract rules.",
                {"repair_id": repair.id},
            )
            canary_rows = repair.preview_rows or self.adapter.collect(collector, purpose="canary")
            canary_evaluation = evaluate_contract(canary_rows, collector.contract)
            repair.preview_evaluation = canary_evaluation
            if canary_evaluation.blocking:
                repair.state = RepairState.FAILED
                repair.failure_reason = "Canary contract verification failed."
                repair.updated_at = datetime.now(timezone.utc)
                self.repository.save_repair(repair)
                self._event(
                    collector_id,
                    "canary_failed",
                    "Canary verification failed",
                    "The candidate did not reach production.",
                    {"repair_id": repair.id},
                )
                self.repository.save_idempotent("verify", collector_id, idempotency_key, repair)
                return repair
            repair.state = RepairState.PRODUCTION_VERIFYING
            self.repository.save_repair(repair)
            self._event(
                collector_id,
                "production_verification_started",
                "Production verification started",
                "The approved candidate passed canary checks and is being verified in production.",
                {"repair_id": repair.id},
            )
            try:
                self.adapter.activate_candidate(collector, repair.external_job or {})
                production_rows = self.adapter.collect(collector, purpose="production")
            except Exception as error:
                repair.state = RepairState.FAILED
                repair.failure_reason = f"Production activation failed: {error}"
                repair.updated_at = datetime.now(timezone.utc)
                self.repository.save_repair(repair)
                self._event(
                    collector_id,
                    "production_activation_failed",
                    "Production activation failed",
                    repair.failure_reason,
                    {"repair_id": repair.id},
                )
                self.repository.save_idempotent("verify", collector_id, idempotency_key, repair)
                return repair
            production_evaluation = evaluate_contract(production_rows, collector.contract)
            run = RunRecord(
                id=f"run_{uuid4().hex[:12]}",
                collector_id=collector_id,
                idempotency_key=f"verification:{idempotency_key}",
                snapshot=production_rows,
                evaluation=production_evaluation,
                quarantined=production_evaluation.blocking,
                provider_job_id=getattr(self.adapter, "last_collection_id", None),
                source="production",
            )
            self.repository.save_run(run)
            if production_evaluation.blocking:
                repair.state = RepairState.FAILED
                repair.failure_reason = (
                    "Production verification failed. Last known good remains active."
                )
                self._event(
                    collector_id,
                    "production_verification_failed",
                    "Production verification failed",
                    repair.failure_reason,
                    {"repair_id": repair.id, "run_id": run.id},
                )
            else:
                repair.state = RepairState.RECOVERED
                collector.status = HealthStatus.GREEN
                collector.health_score = production_evaluation.score
                collector.last_run_at = run.created_at
                collector.last_healthy_at = run.created_at
                collector.active_incident_id = None
                self.repository.save_collector(collector)
                self.repository.save_last_known_good(
                    LastKnownGood(
                        collector_id=collector_id, run_id=run.id, snapshot=production_rows
                    )
                )
                self._event(
                    collector_id,
                    "recovery_verified",
                    "Recovery verified",
                    f"Canary and production checks passed at {production_evaluation.score}/100.",
                    {"repair_id": repair.id, "run_id": run.id},
                )
            repair.updated_at = datetime.now(timezone.utc)
            self.repository.save_repair(repair)
            self.repository.save_idempotent("verify", collector_id, idempotency_key, repair)
            return repair

    def rollback_heal(self, collector_id: str, reason: str = "Rollback requested") -> RepairJob:
        collector = self.repository.get_collector(collector_id)
        repair = self._require_repair(collector_id)
        if repair.state == RepairState.ROLLED_BACK:
            return repair
        self.adapter.rollback(collector)
        repair.state = RepairState.ROLLED_BACK
        repair.failure_reason = reason
        repair.updated_at = datetime.now(timezone.utc)
        self.repository.save_repair(repair)
        self._event(collector_id, "repair_rolled_back", "Repair rolled back", reason)
        return repair

    def get_run_history(self, collector_id: str) -> List[RunRecord]:
        self.repository.get_collector(collector_id)
        return self.repository.list_runs(collector_id)

    def get_last_known_good(self, collector_id: str) -> LastKnownGood | None:
        self.repository.get_collector(collector_id)
        return self.repository.get_last_known_good(collector_id)

    def dashboard(self, collector_id: str) -> DashboardState:
        layout = self.adapter.layout if isinstance(self.adapter, DemoBrightDataAdapter) else "live"
        return DashboardState(
            collector=self.repository.get_collector(collector_id),
            latest_run=self.repository.latest_run(collector_id),
            repair=self.repository.latest_repair(collector_id),
            last_known_good=self.repository.get_last_known_good(collector_id),
            timeline=self.repository.list_events(collector_id),
            demo_layout=layout,
        )

    def set_demo_layout(self, collector_id: str, layout: str) -> str:
        if not isinstance(self.adapter, DemoBrightDataAdapter):
            raise DomainError("not_demo_mode", "Layout switching is only available in demo mode.")
        self.repository.get_collector(collector_id)
        self.adapter.set_layout(layout)
        self._event(
            collector_id,
            "demo_layout_changed",
            f"Demo layout set to {layout}",
            "The next collection will use the selected recorded storefront layout.",
        )
        return layout

    def _require_repair(self, collector_id: str) -> RepairJob:
        repair = self.repository.latest_repair(collector_id)
        if not repair:
            raise DomainError("no_repair", "No repair proposal exists for this collector.", 404)
        return repair

    def _event(
        self,
        collector_id: str,
        kind: str,
        title: str,
        detail: str,
        metadata: Dict[str, Any] | None = None,
    ) -> None:
        self.repository.save_event(
            AuditEvent(
                id=f"evt_{uuid4().hex[:12]}",
                collector_id=collector_id,
                kind=kind,
                title=title,
                detail=detail,
                metadata=metadata or {},
            )
        )
