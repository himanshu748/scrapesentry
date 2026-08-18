from __future__ import annotations

import asyncio
from contextlib import suppress
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from pydantic import BaseModel, Field

from app.heal_orchestrator import ScrapeSentryService


class MonitorStatus(BaseModel):
    running: bool = False
    interval_seconds: float = Field(gt=0)
    cycles_completed: int = Field(default=0, ge=0)
    checks_completed: int = Field(default=0, ge=0)
    incidents_detected: int = Field(default=0, ge=0)
    last_cycle_at: datetime | None = None
    next_cycle_at: datetime | None = None
    last_error: str | None = None


class CollectorMonitor:
    def __init__(self, service: ScrapeSentryService, interval_seconds: float) -> None:
        self.service = service
        self.interval_seconds = interval_seconds
        self._running = False
        self._task: asyncio.Task[None] | None = None
        self._cycle_lock = asyncio.Lock()
        self._cycles_completed = 0
        self._checks_completed = 0
        self._incidents_detected = 0
        self._last_cycle_at: datetime | None = None
        self._next_cycle_at: datetime | None = None
        self._last_error: str | None = None

    async def run_once(self) -> MonitorStatus:
        async with self._cycle_lock:
            self._last_error = None
            for collector in self.service.list_collectors():
                had_incident = collector.active_incident_id is not None
                try:
                    run = await asyncio.to_thread(
                        self.service.check_health,
                        collector.id,
                        f"monitor-{uuid4().hex}",
                    )
                    self._checks_completed += 1
                    if run.quarantined and not had_incident:
                        self._incidents_detected += 1
                except Exception as error:
                    self._last_error = f"{collector.id}: {error}"
            self._cycles_completed += 1
            self._last_cycle_at = datetime.now(timezone.utc)
            self._next_cycle_at = (
                self._last_cycle_at + timedelta(seconds=self.interval_seconds)
                if self._running
                else None
            )
            return self.status()

    async def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._run_forever())

    async def stop(self) -> None:
        self._running = False
        self._next_cycle_at = None
        if not self._task:
            return
        self._task.cancel()
        with suppress(asyncio.CancelledError):
            await self._task
        self._task = None

    def status(self) -> MonitorStatus:
        return MonitorStatus(
            running=self._running,
            interval_seconds=self.interval_seconds,
            cycles_completed=self._cycles_completed,
            checks_completed=self._checks_completed,
            incidents_detected=self._incidents_detected,
            last_cycle_at=self._last_cycle_at,
            next_cycle_at=self._next_cycle_at,
            last_error=self._last_error,
        )

    async def _run_forever(self) -> None:
        while self._running:
            await self.run_once()
            await asyncio.sleep(self.interval_seconds)
