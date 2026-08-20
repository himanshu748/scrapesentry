from __future__ import annotations

import hashlib
import hmac
import json
import time
from datetime import datetime
from typing import Literal
from urllib.parse import urlparse

import httpx
from pydantic import BaseModel, Field

from app.models import AuditEvent, Collector, utc_now

ALERT_EVENT_KINDS = {"snapshot_quarantined", "recovery_verified"}


class AlertDelivery(BaseModel):
    event_id: str
    collector_id: str
    kind: str
    destination: str | None = None
    status: Literal["delivered", "failed"]
    attempted_at: datetime = Field(default_factory=utc_now)
    response_code: int | None = None
    error: str | None = None


class AlertRouterStatus(BaseModel):
    configured: bool
    destination: str | None = None
    event_kinds: list[str]
    deliveries_attempted: int = Field(ge=0)
    deliveries_succeeded: int = Field(ge=0)
    deliveries_failed: int = Field(ge=0)
    configuration_error: str | None = None
    last_delivery: AlertDelivery | None = None


class WebhookAlertRouter:
    """Routes critical lifecycle events to an operator-owned signed webhook."""

    def __init__(
        self,
        webhook_url: str | None,
        webhook_secret: str | None,
        client: httpx.Client | None = None,
    ) -> None:
        self.webhook_url = webhook_url
        self.webhook_secret = webhook_secret
        self.client = client or httpx.Client(timeout=8.0)
        self._deliveries: list[AlertDelivery] = []
        self._delivered_event_ids: set[str] = set()

    @property
    def configured(self) -> bool:
        return bool(self.webhook_url and self.webhook_secret)

    def route(self, event: AuditEvent, collector: Collector) -> AlertDelivery | None:
        if event.kind not in ALERT_EVENT_KINDS or not self.configured:
            return None
        if event.id in self._delivered_event_ids:
            return next(
                (item for item in reversed(self._deliveries) if item.event_id == event.id),
                None,
            )

        timestamp = str(int(time.time()))
        body = json.dumps(
            {
                "version": "1",
                "event": event.model_dump(mode="json"),
                "collector": {
                    "id": collector.id,
                    "name": collector.name,
                    "brightdata_collector_id": collector.brightdata_collector_id,
                    "owner": collector.owner,
                    "environment": collector.environment.value,
                    "status": collector.status.value,
                    "health_score": collector.health_score,
                },
            },
            separators=(",", ":"),
            sort_keys=True,
        ).encode()
        signature = hmac.new(
            self.webhook_secret.encode(),
            timestamp.encode() + b"." + body,
            hashlib.sha256,
        ).hexdigest()
        destination = urlparse(self.webhook_url).hostname
        try:
            response = self.client.post(
                self.webhook_url,
                content=body,
                headers={
                    "Content-Type": "application/json",
                    "X-ScrapeSentry-Event": event.id,
                    "X-ScrapeSentry-Timestamp": timestamp,
                    "X-ScrapeSentry-Signature": f"sha256={signature}",
                },
            )
            response.raise_for_status()
            delivery = AlertDelivery(
                event_id=event.id,
                collector_id=collector.id,
                kind=event.kind,
                destination=destination,
                status="delivered",
                response_code=response.status_code,
            )
        except Exception as error:
            delivery = AlertDelivery(
                event_id=event.id,
                collector_id=collector.id,
                kind=event.kind,
                destination=destination,
                status="failed",
                response_code=(
                    error.response.status_code
                    if isinstance(error, httpx.HTTPStatusError)
                    else None
                ),
                error=(
                    f"HTTP {error.response.status_code}: webhook delivery rejected"
                    if isinstance(error, httpx.HTTPStatusError)
                    else f"{type(error).__name__}: webhook delivery failed"
                ),
            )
        self._delivered_event_ids.add(event.id)
        self._deliveries.append(delivery)
        self._deliveries = self._deliveries[-50:]
        return delivery

    def status(self) -> AlertRouterStatus:
        error = None
        if bool(self.webhook_url) != bool(self.webhook_secret):
            error = "Set both ALERT_WEBHOOK_URL and ALERT_WEBHOOK_SECRET."
        return AlertRouterStatus(
            configured=self.configured,
            destination=(urlparse(self.webhook_url).hostname if self.webhook_url else None),
            event_kinds=sorted(ALERT_EVENT_KINDS),
            deliveries_attempted=len(self._deliveries),
            deliveries_succeeded=sum(item.status == "delivered" for item in self._deliveries),
            deliveries_failed=sum(item.status == "failed" for item in self._deliveries),
            configuration_error=error,
            last_delivery=self._deliveries[-1] if self._deliveries else None,
        )
