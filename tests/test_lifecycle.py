import pytest

from app.brightdata_client import DemoBrightDataAdapter
from app.errors import DomainError
from app.heal_orchestrator import ScrapeSentryService
from app.models import CollectorEnvironment, HealthStatus, RepairState
from app.runtime import Runtime
from app.seed import DEMO_COLLECTOR_ID, demo_collector
from app.settings import Settings


@pytest.fixture()
def runtime():
    return Runtime(Settings(app_env="demo"))


def test_approval_gated_recovery(runtime):
    service = runtime.service
    initial = service.dashboard(DEMO_COLLECTOR_ID)
    assert initial.collector.status == HealthStatus.GREEN
    assert initial.last_known_good is not None

    service.set_demo_layout(DEMO_COLLECTOR_ID, "broken")
    broken = service.check_health(DEMO_COLLECTOR_ID, "broken-1")
    assert broken.quarantined is True
    assert broken.evaluation.status == HealthStatus.RED

    repair = service.propose_heal(DEMO_COLLECTOR_ID, "heal-1")
    assert repair.state == RepairState.AWAITING_APPROVAL
    assert repair.schema_changed is False
    assert repair.preview_evaluation is not None
    assert repair.preview_evaluation.blocking is False

    approved = service.approve_heal(DEMO_COLLECTOR_ID, repair.id)
    assert approved.state == RepairState.APPROVED

    recovered = service.verify_recovery(DEMO_COLLECTOR_ID, "verify-1")
    final = service.dashboard(DEMO_COLLECTOR_ID)
    assert recovered.state == RepairState.RECOVERED
    assert final.collector.status == HealthStatus.GREEN
    assert final.collector.active_incident_id is None
    assert final.last_known_good.run_id != initial.last_known_good.run_id


def test_new_drift_cycle_breaks_after_a_completed_recovery(runtime):
    service = runtime.service
    service.set_demo_layout(DEMO_COLLECTOR_ID, "broken")
    service.check_health(DEMO_COLLECTOR_ID, "first-cycle-broken")
    repair = service.propose_heal(DEMO_COLLECTOR_ID, "first-cycle-heal")
    service.approve_heal(DEMO_COLLECTOR_ID, repair.id)
    service.verify_recovery(DEMO_COLLECTOR_ID, "first-cycle-verify")

    assert runtime.adapter.candidate_active is True

    service.set_demo_layout(DEMO_COLLECTOR_ID, "broken")
    second_cycle = service.check_health(DEMO_COLLECTOR_ID, "second-cycle-broken")

    assert runtime.adapter.candidate_active is False
    assert second_cycle.quarantined is True
    assert second_cycle.evaluation.status == HealthStatus.RED

    second_repair = service.propose_heal(DEMO_COLLECTOR_ID, "second-cycle-heal")

    assert second_repair.id != repair.id
    assert second_repair.state == RepairState.AWAITING_APPROVAL


def test_commands_are_idempotent(runtime):
    service = runtime.service
    service.set_demo_layout(DEMO_COLLECTOR_ID, "broken")

    first = service.check_health(DEMO_COLLECTOR_ID, "same-key")
    second = service.check_health(DEMO_COLLECTOR_ID, "same-key")

    assert first.id == second.id
    assert len(service.get_run_history(DEMO_COLLECTOR_ID)) == 2


def test_healthy_collector_cannot_request_repair(runtime):
    with pytest.raises(DomainError, match="blocking run"):
        runtime.service.propose_heal(DEMO_COLLECTOR_ID, "too-early")


def test_schema_change_needs_explicit_override(runtime):
    service = runtime.service
    service.set_demo_layout(DEMO_COLLECTOR_ID, "broken")
    service.check_health(DEMO_COLLECTOR_ID, "broken-schema")
    repair = service.propose_heal(DEMO_COLLECTOR_ID, "heal-schema")
    repair.preview_rows[0]["new_field"] = "unexpected"
    repair.schema_changed = True
    service.repository.save_repair(repair)

    with pytest.raises(DomainError, match="explicit override"):
        service.approve_heal(DEMO_COLLECTOR_ID, repair.id)

    approved = service.approve_heal(DEMO_COLLECTOR_ID, repair.id, allow_schema_change=True)
    assert approved.state == RepairState.APPROVED


def test_approval_and_failed_verification_are_idempotent(runtime):
    service = runtime.service
    service.set_demo_layout(DEMO_COLLECTOR_ID, "broken")
    service.check_health(DEMO_COLLECTOR_ID, "broken-canary")
    repair = service.propose_heal(DEMO_COLLECTOR_ID, "heal-canary")

    first_approval = service.approve_heal(DEMO_COLLECTOR_ID, repair.id)
    second_approval = service.approve_heal(DEMO_COLLECTOR_ID, repair.id)
    assert first_approval.id == second_approval.id

    repair = service.get_heal_preview(DEMO_COLLECTOR_ID)
    repair.preview_rows = runtime.adapter._read("broken")
    service.repository.save_repair(repair)

    first_failure = service.verify_recovery(DEMO_COLLECTOR_ID, "failed-canary")
    second_failure = service.verify_recovery(DEMO_COLLECTOR_ID, "failed-canary")
    assert first_failure.state == RepairState.FAILED
    assert second_failure.id == first_failure.id


def test_repeated_broken_checks_reuse_incident_without_duplicate_alert(runtime):
    service = runtime.service
    service.set_demo_layout(DEMO_COLLECTOR_ID, "broken")

    service.check_health(DEMO_COLLECTOR_ID, "broken-repeat-1")
    first_incident = service.dashboard(DEMO_COLLECTOR_ID).collector.active_incident_id
    service.check_health(DEMO_COLLECTOR_ID, "broken-repeat-2")
    dashboard = service.dashboard(DEMO_COLLECTOR_ID)

    event_kinds = [event.kind for event in dashboard.timeline]
    assert dashboard.collector.active_incident_id == first_incident
    assert event_kinds.count("snapshot_quarantined") == 1
    assert event_kinds.count("incident_reconfirmed") == 1


def test_provider_collection_id_is_attached_to_the_health_run(runtime):
    runtime.adapter.last_collection_id = "j_provider_123"

    run = runtime.service.check_health(DEMO_COLLECTOR_ID, "provider-job-link")

    assert run.provider_job_id == "j_provider_123"


def test_fleet_health_aggregates_real_registered_collector_state(runtime):
    service = runtime.service
    second = demo_collector("c_second_provider")
    second.id = "second-collector"
    second.name = "Second storefront"
    second.owner = "growth-data"
    second.environment = CollectorEnvironment.STAGING
    second.failure_budget_minutes = 30
    service.register_collector(second)
    service.check_health(
        second.id,
        "second-broken",
        snapshot=runtime.adapter._read("broken"),
    )

    fleet = service.get_fleet_health()

    assert fleet.total_collectors == 2
    assert fleet.matching_collectors == 2
    assert fleet.healthy == 1
    assert fleet.broken == 1
    assert fleet.active_incidents == 1
    assert fleet.protected_records == 12
    assert fleet.failure_budget_seconds == 5400
    assert [item.id for item in fleet.collectors] == [second.id, DEMO_COLLECTOR_ID]

    filtered = service.get_fleet_health(
        environment=CollectorEnvironment.STAGING,
        owner="GROWTH-DATA",
    )
    assert filtered.total_collectors == 2
    assert filtered.matching_collectors == 1
    assert filtered.collectors[0].id == second.id


def test_repair_records_provider_job_evidence_and_latency(runtime):
    service = runtime.service
    service.set_demo_layout(DEMO_COLLECTOR_ID, "broken")
    service.check_health(DEMO_COLLECTOR_ID, "provider-evidence-broken")

    repair = service.propose_heal(DEMO_COLLECTOR_ID, "provider-evidence-heal")

    assert repair.provider_evidence.provider == "brightdata_demo"
    assert repair.provider_evidence.job_id == "demo-refactor-001"
    assert repair.provider_evidence.progress_status == "completed"
    assert repair.provider_evidence.draft_status == "not_required"
    assert repair.provider_evidence.requires_publish is False
    assert repair.provider_evidence.latency_seconds >= 0


class PublishRequiredBrightDataAdapter(DemoBrightDataAdapter):
    accepted_candidates = 0

    def propose_heal(self, collector, prompt):
        result = super().propose_heal(collector, prompt)
        result.update(
            {
                "provider": "brightdata",
                "job_id": "sh_live_123",
                "status": "done",
                "started_at": "2026-08-18T10:00:00+00:00",
                "completed_at": "2026-08-18T10:00:12+00:00",
                "requires_publish": True,
                "requires_provider_accept": True,
                "draft_status": "awaiting_acceptance",
            }
        )
        return result

    def accept_candidate(self, collector, external_job):
        self.accepted_candidates += 1
        return {
            **external_job,
            "status": "done",
            "requires_provider_accept": False,
            "draft_status": "ready_for_review",
        }


def test_live_repair_cannot_verify_until_provider_draft_is_confirmed(runtime):
    adapter = PublishRequiredBrightDataAdapter(
        runtime.settings.fixture_dir, runtime.settings.live_evidence_path
    )
    runtime.adapter = adapter
    runtime.service = ScrapeSentryService(runtime.repository, adapter)
    service = runtime.service
    adapter.set_layout("broken")
    service.check_health(DEMO_COLLECTOR_ID, "publish-gate-broken")
    repair = service.propose_heal(DEMO_COLLECTOR_ID, "publish-gate-heal")
    approved = service.approve_heal(DEMO_COLLECTOR_ID, repair.id)

    assert adapter.accepted_candidates == 1
    assert approved.provider_evidence.draft_status == "ready_for_review"

    with pytest.raises(DomainError, match="development draft"):
        service.verify_recovery(DEMO_COLLECTOR_ID, "verify-before-publish")

    published = service.confirm_provider_publish(DEMO_COLLECTOR_ID, repair.id)
    assert published.provider_evidence.draft_status == "published"
    assert published.provider_evidence.published_at is not None

    recovered = service.verify_recovery(DEMO_COLLECTOR_ID, "verify-after-publish")
    assert recovered.state == RepairState.RECOVERED
