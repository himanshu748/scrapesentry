from __future__ import annotations

import copy
from contextlib import contextmanager
from threading import RLock
from typing import Any, ContextManager, Dict, Iterator, List, Protocol, Tuple

from app.models import AuditEvent, Collector, LastKnownGood, RepairJob, RunRecord


class Repository(Protocol):
    def collector_lock(self, collector_id: str) -> ContextManager[None]: ...
    def save_collector(self, collector: Collector) -> Collector: ...
    def get_collector(self, collector_id: str) -> Collector: ...
    def list_collectors(self) -> List[Collector]: ...
    def save_run(self, run: RunRecord) -> RunRecord: ...
    def list_runs(self, collector_id: str) -> List[RunRecord]: ...
    def latest_run(self, collector_id: str) -> RunRecord | None: ...
    def save_repair(self, repair: RepairJob) -> RepairJob: ...
    def latest_repair(self, collector_id: str) -> RepairJob | None: ...
    def save_event(self, event: AuditEvent) -> AuditEvent: ...
    def list_events(self, collector_id: str) -> List[AuditEvent]: ...
    def save_last_known_good(self, value: LastKnownGood) -> LastKnownGood: ...
    def get_last_known_good(self, collector_id: str) -> LastKnownGood | None: ...
    def get_idempotent(self, operation: str, collector_id: str, key: str) -> Any: ...
    def save_idempotent(self, operation: str, collector_id: str, key: str, value: Any) -> Any: ...


class InMemoryRepository:
    """Thread-safe demo repository with the same boundaries as the Postgres adapter."""

    def __init__(self) -> None:
        self._collectors: Dict[str, Collector] = {}
        self._runs: Dict[str, List[RunRecord]] = {}
        self._repairs: Dict[str, List[RepairJob]] = {}
        self._events: Dict[str, List[AuditEvent]] = {}
        self._last_known_good: Dict[str, LastKnownGood] = {}
        self._idempotency: Dict[Tuple[str, str, str], Any] = {}
        self._locks: Dict[str, RLock] = {}
        self._global_lock = RLock()

    @contextmanager
    def collector_lock(self, collector_id: str) -> Iterator[None]:
        with self._global_lock:
            lock = self._locks.setdefault(collector_id, RLock())
        with lock:
            yield

    def reset(self) -> None:
        with self._global_lock:
            self._collectors.clear()
            self._runs.clear()
            self._repairs.clear()
            self._events.clear()
            self._last_known_good.clear()
            self._idempotency.clear()
            self._locks.clear()

    def save_collector(self, collector: Collector) -> Collector:
        self._collectors[collector.id] = copy.deepcopy(collector)
        return copy.deepcopy(collector)

    def get_collector(self, collector_id: str) -> Collector:
        if collector_id not in self._collectors:
            raise KeyError(f"collector '{collector_id}' was not found")
        return copy.deepcopy(self._collectors[collector_id])

    def list_collectors(self) -> List[Collector]:
        return [copy.deepcopy(item) for item in self._collectors.values()]

    def save_run(self, run: RunRecord) -> RunRecord:
        self._runs.setdefault(run.collector_id, []).append(copy.deepcopy(run))
        return copy.deepcopy(run)

    def list_runs(self, collector_id: str) -> List[RunRecord]:
        return [copy.deepcopy(item) for item in reversed(self._runs.get(collector_id, []))]

    def latest_run(self, collector_id: str) -> RunRecord | None:
        runs = self._runs.get(collector_id, [])
        return copy.deepcopy(runs[-1]) if runs else None

    def save_repair(self, repair: RepairJob) -> RepairJob:
        repairs = self._repairs.setdefault(repair.collector_id, [])
        for index, existing in enumerate(repairs):
            if existing.id == repair.id:
                repairs[index] = copy.deepcopy(repair)
                break
        else:
            repairs.append(copy.deepcopy(repair))
        return copy.deepcopy(repair)

    def latest_repair(self, collector_id: str) -> RepairJob | None:
        repairs = self._repairs.get(collector_id, [])
        return copy.deepcopy(repairs[-1]) if repairs else None

    def save_event(self, event: AuditEvent) -> AuditEvent:
        self._events.setdefault(event.collector_id, []).append(copy.deepcopy(event))
        return copy.deepcopy(event)

    def list_events(self, collector_id: str) -> List[AuditEvent]:
        return [copy.deepcopy(item) for item in reversed(self._events.get(collector_id, []))]

    def save_last_known_good(self, value: LastKnownGood) -> LastKnownGood:
        self._last_known_good[value.collector_id] = copy.deepcopy(value)
        return copy.deepcopy(value)

    def get_last_known_good(self, collector_id: str) -> LastKnownGood | None:
        value = self._last_known_good.get(collector_id)
        return copy.deepcopy(value) if value else None

    def get_idempotent(self, operation: str, collector_id: str, key: str) -> Any:
        value = self._idempotency.get((operation, collector_id, key))
        return copy.deepcopy(value)

    def save_idempotent(self, operation: str, collector_id: str, key: str, value: Any) -> Any:
        self._idempotency[(operation, collector_id, key)] = copy.deepcopy(value)
        return copy.deepcopy(value)
