from __future__ import annotations

from contextlib import contextmanager
from threading import RLock
from typing import Any, Dict, Iterator, List, Type, TypeVar

import httpx
from pydantic import BaseModel

from app.models import AuditEvent, Collector, LastKnownGood, RepairJob, RunRecord

ModelT = TypeVar("ModelT", bound=BaseModel)


class SupabaseRepository:
    """PostgREST repository using JSON payloads and server-side service credentials."""

    def __init__(self, url: str, service_role_key: str) -> None:
        self.client = httpx.Client(
            base_url=f"{url.rstrip('/')}/rest/v1",
            headers={
                "apikey": service_role_key,
                "Authorization": f"Bearer {service_role_key}",
                "Content-Type": "application/json",
            },
            timeout=20.0,
        )
        self._locks: Dict[str, RLock] = {}
        self._global_lock = RLock()

    @contextmanager
    def collector_lock(self, collector_id: str) -> Iterator[None]:
        with self._global_lock:
            lock = self._locks.setdefault(collector_id, RLock())
        with lock:
            yield

    def _request(self, method: str, table: str, **kwargs: Any) -> httpx.Response:
        response = self.client.request(method, f"/{table}", **kwargs)
        response.raise_for_status()
        return response

    def _upsert(self, table: str, payload: Dict[str, Any]) -> None:
        self._request(
            "POST",
            table,
            headers={"Prefer": "resolution=merge-duplicates,return=minimal"},
            json=payload,
        )

    def _one(self, table: str, model: Type[ModelT], params: Dict[str, str]) -> ModelT | None:
        response = self._request("GET", table, params={**params, "limit": "1"})
        rows = response.json()
        return model.model_validate(rows[0]["payload"]) if rows else None

    def save_collector(self, collector: Collector) -> Collector:
        self._upsert(
            "scrapesentry_collectors",
            {
                "id": collector.id,
                "updated_at": collector.last_run_at or collector.last_healthy_at,
                "payload": collector.model_dump(mode="json"),
            },
        )
        return collector.model_copy(deep=True)

    def get_collector(self, collector_id: str) -> Collector:
        value = self._one("scrapesentry_collectors", Collector, {"id": f"eq.{collector_id}"})
        if not value:
            raise KeyError(f"collector '{collector_id}' was not found")
        return value

    def list_collectors(self) -> List[Collector]:
        rows = self._request(
            "GET", "scrapesentry_collectors", params={"select": "payload", "order": "id.asc"}
        ).json()
        return [Collector.model_validate(row["payload"]) for row in rows]

    def save_run(self, run: RunRecord) -> RunRecord:
        self._upsert(
            "scrapesentry_runs",
            {
                "id": run.id,
                "collector_id": run.collector_id,
                "created_at": run.created_at.isoformat(),
                "payload": run.model_dump(mode="json"),
            },
        )
        return run.model_copy(deep=True)

    def list_runs(self, collector_id: str) -> List[RunRecord]:
        rows = self._request(
            "GET",
            "scrapesentry_runs",
            params={
                "collector_id": f"eq.{collector_id}",
                "select": "payload",
                "order": "created_at.desc",
            },
        ).json()
        return [RunRecord.model_validate(row["payload"]) for row in rows]

    def latest_run(self, collector_id: str) -> RunRecord | None:
        return self._one(
            "scrapesentry_runs",
            RunRecord,
            {"collector_id": f"eq.{collector_id}", "order": "created_at.desc"},
        )

    def save_repair(self, repair: RepairJob) -> RepairJob:
        self._upsert(
            "scrapesentry_repairs",
            {
                "id": repair.id,
                "collector_id": repair.collector_id,
                "created_at": repair.created_at.isoformat(),
                "updated_at": repair.updated_at.isoformat(),
                "payload": repair.model_dump(mode="json"),
            },
        )
        return repair.model_copy(deep=True)

    def latest_repair(self, collector_id: str) -> RepairJob | None:
        return self._one(
            "scrapesentry_repairs",
            RepairJob,
            {"collector_id": f"eq.{collector_id}", "order": "created_at.desc"},
        )

    def save_event(self, event: AuditEvent) -> AuditEvent:
        self._upsert(
            "scrapesentry_events",
            {
                "id": event.id,
                "collector_id": event.collector_id,
                "created_at": event.created_at.isoformat(),
                "payload": event.model_dump(mode="json"),
            },
        )
        return event.model_copy(deep=True)

    def list_events(self, collector_id: str) -> List[AuditEvent]:
        rows = self._request(
            "GET",
            "scrapesentry_events",
            params={
                "collector_id": f"eq.{collector_id}",
                "select": "payload",
                "order": "created_at.desc",
            },
        ).json()
        return [AuditEvent.model_validate(row["payload"]) for row in rows]

    def save_last_known_good(self, value: LastKnownGood) -> LastKnownGood:
        self._upsert(
            "scrapesentry_last_known_good",
            {
                "collector_id": value.collector_id,
                "captured_at": value.captured_at.isoformat(),
                "payload": value.model_dump(mode="json"),
            },
        )
        return value.model_copy(deep=True)

    def get_last_known_good(self, collector_id: str) -> LastKnownGood | None:
        return self._one(
            "scrapesentry_last_known_good",
            LastKnownGood,
            {"collector_id": f"eq.{collector_id}"},
        )

    def get_idempotent(self, operation: str, collector_id: str, key: str) -> Any:
        rows = self._request(
            "GET",
            "scrapesentry_idempotency",
            params={
                "operation": f"eq.{operation}",
                "collector_id": f"eq.{collector_id}",
                "key": f"eq.{key}",
                "select": "payload",
                "limit": "1",
            },
        ).json()
        if not rows:
            return None
        model = RunRecord if operation == "check" else RepairJob
        return model.model_validate(rows[0]["payload"])

    def save_idempotent(self, operation: str, collector_id: str, key: str, value: Any) -> Any:
        payload = value.model_dump(mode="json") if hasattr(value, "model_dump") else value
        self._upsert(
            "scrapesentry_idempotency",
            {
                "operation": operation,
                "collector_id": collector_id,
                "key": key,
                "payload": payload,
            },
        )
        return value.model_copy(deep=True) if hasattr(value, "model_copy") else value
