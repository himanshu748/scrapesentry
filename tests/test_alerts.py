import hashlib
import hmac
import json

import httpx

from app.alerts import WebhookAlertRouter
from app.models import AuditEvent
from app.runtime import Runtime
from app.seed import DEMO_COLLECTOR_ID, demo_collector
from app.settings import Settings


def test_signed_webhook_delivery_is_verifiable_and_idempotent():
    requests = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        timestamp = request.headers["X-ScrapeSentry-Timestamp"]
        expected = hmac.new(
            b"alert-secret",
            timestamp.encode() + b"." + request.content,
            hashlib.sha256,
        ).hexdigest()
        assert request.headers["X-ScrapeSentry-Signature"] == f"sha256={expected}"
        assert json.loads(request.content)["event"]["kind"] == "snapshot_quarantined"
        return httpx.Response(202)

    router = WebhookAlertRouter(
        "https://alerts.example.test/scrapesentry",
        "alert-secret",
        client=httpx.Client(transport=httpx.MockTransport(handler)),
    )
    event = AuditEvent(
        id="evt_alert_1",
        collector_id=DEMO_COLLECTOR_ID,
        kind="snapshot_quarantined",
        title="Bad snapshot quarantined",
        detail="Two contract violations blocked downstream delivery.",
        metadata={"incident_id": "inc_1"},
    )

    first = router.route(event, demo_collector())
    second = router.route(event, demo_collector())

    assert first is not None
    assert first.status == "delivered"
    assert second == first
    assert len(requests) == 1
    assert router.status().deliveries_succeeded == 1


def test_incident_and_recovery_each_send_one_lifecycle_alert():
    payloads = []

    def handler(request: httpx.Request) -> httpx.Response:
        payloads.append(json.loads(request.content))
        return httpx.Response(200)

    runtime = Runtime(Settings(app_env="demo"))
    runtime.service.alert_router = WebhookAlertRouter(
        "https://alerts.example.test/scrapesentry",
        "alert-secret",
        client=httpx.Client(transport=httpx.MockTransport(handler)),
    )
    service = runtime.service
    service.set_demo_layout(DEMO_COLLECTOR_ID, "broken")
    service.check_health(DEMO_COLLECTOR_ID, "alert-broken-1")
    service.check_health(DEMO_COLLECTOR_ID, "alert-broken-2")
    repair = service.propose_heal(DEMO_COLLECTOR_ID, "alert-heal")
    service.approve_heal(DEMO_COLLECTOR_ID, repair.id)
    service.verify_recovery(DEMO_COLLECTOR_ID, "alert-verify")

    assert [item["event"]["kind"] for item in payloads] == [
        "snapshot_quarantined",
        "recovery_verified",
    ]
    assert payloads[0]["event"]["metadata"]["incident_id"]
    assert payloads[1]["event"]["metadata"]["incident_id"]


def test_alert_delivery_failure_does_not_break_health_checks():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(503)

    runtime = Runtime(Settings(app_env="demo"))
    router = WebhookAlertRouter(
        "https://alerts.example.test/scrapesentry",
        "alert-secret",
        client=httpx.Client(transport=httpx.MockTransport(handler)),
    )
    runtime.service.alert_router = router
    runtime.service.set_demo_layout(DEMO_COLLECTOR_ID, "broken")

    run = runtime.service.check_health(DEMO_COLLECTOR_ID, "failed-alert")

    assert run.quarantined is True
    assert router.status().deliveries_failed == 1
    assert router.status().last_delivery.error == "HTTP 503: webhook delivery rejected"
