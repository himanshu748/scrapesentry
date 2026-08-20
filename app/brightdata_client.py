from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Protocol

import httpx

from app.live_evidence import load_live_snapshot, normalize_brightdata_row
from app.models import Collector
from app.settings import Settings


class BrightDataAdapter(Protocol):
    def collect(
        self, collector: Collector, purpose: str = "production"
    ) -> List[Dict[str, Any]]: ...

    def propose_heal(self, collector: Collector, prompt: str) -> Dict[str, Any]: ...

    def accept_candidate(
        self, collector: Collector, external_job: Dict[str, Any]
    ) -> Dict[str, Any]: ...

    def activate_candidate(self, collector: Collector, external_job: Dict[str, Any]) -> None: ...

    def rollback(self, collector: Collector) -> None: ...


def parse_brightdata_dataset_response(
    response: httpx.Response,
) -> List[Dict[str, Any]] | None:
    if response.status_code == 202:
        return None
    try:
        payload = response.json()
    except json.JSONDecodeError:
        rows = []
        for line in response.text.splitlines():
            if line.strip():
                row = json.loads(line)
                if not isinstance(row, dict):
                    raise RuntimeError("Bright Data NDJSON rows must be objects")
                rows.append(normalize_brightdata_row(row))
        return rows
    if isinstance(payload, list):
        return [normalize_brightdata_row(row) for row in payload]
    if isinstance(payload, dict) and "status" not in payload and "message" not in payload:
        return [normalize_brightdata_row(payload)]
    return None


class DemoBrightDataAdapter:
    """Recorded adapter used for a deterministic judge demo and automated tests."""

    def __init__(self, fixture_dir: Path, live_evidence_path: Path) -> None:
        self.fixture_dir = fixture_dir
        self.live_evidence_path = live_evidence_path
        self.layout = "healthy"
        self.candidate_active = False

    def _read(self, name: str) -> List[Dict[str, Any]]:
        if name in {"healthy", "repaired"}:
            return load_live_snapshot(self.live_evidence_path)
        if name == "broken":
            rows = load_live_snapshot(self.live_evidence_path)
            stock_labels = {
                "in_stock": "In stock",
                "low_stock": "Only a few left",
                "out_of_stock": "Unavailable",
            }
            for row in rows:
                price = row.pop("price", None)
                availability = row.pop("availability", None)
                row["price_text"] = f"£{price:.2f}" if isinstance(price, (int, float)) else price
                row["stock_label"] = stock_labels.get(availability, availability)
            return rows
        return json.loads((self.fixture_dir / f"{name}.json").read_text(encoding="utf-8"))

    def collect(self, collector: Collector, purpose: str = "production") -> List[Dict[str, Any]]:
        if purpose == "canary" or self.candidate_active:
            return self._read("repaired")
        return self._read(self.layout)

    def propose_heal(self, collector: Collector, prompt: str) -> Dict[str, Any]:
        completed_at = datetime.now(timezone.utc).isoformat()
        return {
            "provider": "brightdata_demo",
            "status": "done",
            "job_id": "demo-refactor-001",
            "trigger_status": "accepted",
            "started_at": completed_at,
            "completed_at": completed_at,
            "requires_publish": False,
            "draft_status": "not_required",
            "preview_rows": self._read("repaired"),
            "confidence": 98,
            "diff_summary": [
                "Restore numeric GBP price extraction from the Bright Data Price value.",
                "Normalize the changed stock label to the availability contract.",
                "Preserve all ten production fields plus stable SKU and URL identities.",
            ],
            "prompt": prompt,
        }

    def activate_candidate(self, collector: Collector, external_job: Dict[str, Any]) -> None:
        self.candidate_active = True

    def accept_candidate(
        self, collector: Collector, external_job: Dict[str, Any]
    ) -> Dict[str, Any]:
        return external_job

    def rollback(self, collector: Collector) -> None:
        self.candidate_active = False
        self.layout = "healthy"

    def set_layout(self, layout: str) -> None:
        if layout not in {"healthy", "broken"}:
            raise ValueError("layout must be 'healthy' or 'broken'")
        self.layout = layout
        # A new layout selection starts a new demo collection cycle. Clear the
        # previously activated repair so repeated judge runs can break again.
        self.candidate_active = False

    def reset(self) -> None:
        self.layout = "healthy"
        self.candidate_active = False


class HttpBrightDataAdapter:
    """Official Scraper Studio Collection and AI Flow API adapter."""

    def __init__(self, settings: Settings) -> None:
        if not settings.brightdata_api_token:
            raise ValueError("BRIGHTDATA_API_TOKEN is required when APP_ENV is not demo")
        self.settings = settings
        self.client = httpx.Client(
            base_url=settings.brightdata_base_url,
            headers={
                "Authorization": f"Bearer {settings.brightdata_api_token}",
                "Content-Type": "application/json",
            },
            timeout=30.0,
        )
        self.last_collection_id: str | None = None

    def collect(self, collector: Collector, purpose: str = "production") -> List[Dict[str, Any]]:
        response = self._request_with_backoff(
            "POST",
            "/dca/trigger",
            params={"collector": collector.brightdata_collector_id, "queue_next": "1"},
            json=collector.inputs or collector.contract.canary_inputs,
        )
        collection_id = response.json().get("collection_id")
        if not collection_id:
            raise RuntimeError("Bright Data did not return a collection_id")
        self.last_collection_id = collection_id
        deadline = time.monotonic() + self.settings.brightdata_poll_timeout_seconds
        delay = 1.0
        while time.monotonic() < deadline:
            result_response = self._request_with_backoff(
                "GET", "/dca/dataset", params={"id": collection_id}
            )
            rows = parse_brightdata_dataset_response(result_response)
            if rows is not None:
                return rows
            result = result_response.json()
            if result.get("status") in {"failed", "error"}:
                raise RuntimeError(f"Bright Data collection failed: {result}")
            time.sleep(delay)
            delay = min(delay * 2, 8.0)
        raise TimeoutError("Bright Data collection polling timed out")

    def propose_heal(self, collector: Collector, prompt: str) -> Dict[str, Any]:
        started_at = datetime.now(timezone.utc)
        response = self._request_with_backoff(
            "POST",
            f"/dca/collectors/{collector.brightdata_collector_id}/refactor_template",
            json={"prompt": prompt[:1000], "custom_input": collector.contract.canary_inputs},
        )
        started = response.json() if response.content else {"status": "started"}
        deadline = time.monotonic() + self.settings.brightdata_poll_timeout_seconds
        delay = 1.0
        while time.monotonic() < deadline:
            progress = self._request_with_backoff(
                "GET",
                f"/dca/collectors/{collector.brightdata_collector_id}/refactor_template/progress",
            ).json()
            status = progress.get("status")
            if status in {"pending_answer", "done"}:
                completed_at = datetime.now(timezone.utc)
                preview_rows = (
                    progress.get("preview_rows")
                    or progress.get("preview")
                    or progress.get("preview_result")
                    or []
                )
                normalized_preview = [
                    normalize_brightdata_row(row)
                    for row in preview_rows
                    if isinstance(row, dict)
                ]
                diff = progress.get("diff") or {}
                return {
                    "provider": "brightdata",
                    "status": status,
                    "job_id": (
                        started.get("job_id")
                        or started.get("id")
                        or progress.get("job_id")
                        or progress.get("id")
                    ),
                    "trigger_status": str(started.get("status") or "accepted"),
                    "started_at": started_at.isoformat(),
                    "completed_at": completed_at.isoformat(),
                    "requires_publish": True,
                    "requires_provider_accept": status == "pending_answer",
                    "draft_status": (
                        "awaiting_acceptance"
                        if status == "pending_answer"
                        else "ready_for_review"
                    ),
                    "trigger": started,
                    "progress": progress,
                    "preview_rows": normalized_preview,
                    "confidence": progress.get("confidence", 0),
                    "diff_summary": progress.get("diff_summary")
                    or ([diff.get("title")] if isinstance(diff, dict) and diff.get("title") else [])
                    or [
                        "Bright Data Self-Healing produced a contract-tested development draft."
                    ],
                }
            if status in {"failed", "error"}:
                raise RuntimeError(f"Bright Data Self-Healing failed: {progress}")
            time.sleep(delay)
            delay = min(delay * 2, 8.0)
        raise TimeoutError("Bright Data Self-Healing polling timed out")

    def accept_candidate(
        self, collector: Collector, external_job: Dict[str, Any]
    ) -> Dict[str, Any]:
        if not external_job.get("requires_provider_accept"):
            return external_job
        self._request_with_backoff(
            "POST",
            f"/dca/collectors/{collector.brightdata_collector_id}/resume_automation_job",
            json={"message": True, "auto_save": True},
        )
        deadline = time.monotonic() + self.settings.brightdata_poll_timeout_seconds
        delay = 1.0
        while time.monotonic() < deadline:
            progress = self._request_with_backoff(
                "GET",
                f"/dca/collectors/{collector.brightdata_collector_id}/refactor_template/progress",
            ).json()
            status = progress.get("status")
            if status == "done":
                completed_at = datetime.now(timezone.utc)
                preview_rows = (
                    progress.get("preview_rows")
                    or progress.get("preview")
                    or progress.get("preview_result")
                    or external_job.get("preview_rows")
                    or []
                )
                return {
                    **external_job,
                    "status": "done",
                    "progress": progress,
                    "preview_rows": [
                        normalize_brightdata_row(row)
                        for row in preview_rows
                        if isinstance(row, dict)
                    ],
                    "completed_at": completed_at.isoformat(),
                    "requires_provider_accept": False,
                    "draft_status": "published",
                    "published_at": completed_at.isoformat(),
                }
            if status in {"failed", "error"}:
                raise RuntimeError(f"Bright Data candidate acceptance failed: {progress}")
            time.sleep(delay)
            delay = min(delay * 2, 8.0)
        raise TimeoutError("Bright Data candidate acceptance polling timed out")

    def activate_candidate(self, collector: Collector, external_job: Dict[str, Any]) -> None:
        # The AI Flow updates the collector development draft. ScrapeSentry records
        # approval here and verifies outputs before declaring recovery.
        return None

    def rollback(self, collector: Collector) -> None:
        raise RuntimeError(
            "Bright Data production rollback requires the collector Versions "
            "workflow for this account."
        )

    def _request_with_backoff(self, method: str, path: str, **kwargs: Any) -> httpx.Response:
        delay = 1.0
        last_error: Exception = RuntimeError("Bright Data request failed")
        for _ in range(4):
            try:
                response = self.client.request(method, path, **kwargs)
                if response.status_code < 500 and response.status_code != 429:
                    response.raise_for_status()
                    return response
                last_error = RuntimeError(
                    f"Bright Data returned {response.status_code}: {response.text[:300]}"
                )
            except httpx.HTTPError as error:
                last_error = error
            time.sleep(delay)
            delay *= 2
        raise RuntimeError(str(last_error))
