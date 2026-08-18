from datetime import datetime

from fastapi.testclient import TestClient

from app.api import app
from app.runtime import get_runtime
from app.seed import DEMO_COLLECTOR_ID

client = TestClient(app)


def setup_function():
    get_runtime().reset()


def test_demo_api_flow():
    assert client.get("/ready").status_code == 200

    evidence = client.get("/api/evidence/live-run")
    evidence.raise_for_status()
    assert evidence.json()["records"] == 12
    assert evidence.json()["failed_crawls"] == 0
    assert evidence.json()["collector_id"] == "c_msxcshnz2bwrroekf3"
    assert evidence.json()["job_id"] == "j_msyad7l21v1fnqbljn"
    assert evidence.json()["repair_job_id"] == "ia_msya56gd1y2ucwwy0j"
    assert evidence.json()["repair_status"] == "done"
    assert evidence.json()["repair_preview_records"] == 1
    assert len(evidence.json()["schema_fields"]) == 10
    assert isinstance(evidence.json()["sample_rows"][0]["price"], float)
    assert len(evidence.json()["artifact_sha256"]) == 64

    client.post("/api/demo/layout", json={"layout": "broken"}).raise_for_status()
    layout_timeline = client.get(
        f"/api/collectors/{DEMO_COLLECTOR_ID}/dashboard"
    ).json()["timeline"]
    assert layout_timeline[0]["kind"] == "demo_layout_changed"
    assert layout_timeline[0]["collector_id"] == DEMO_COLLECTOR_ID

    broken = client.post(
        f"/api/collectors/{DEMO_COLLECTOR_ID}/check",
        json={"idempotency_key": "api-broken"},
    )
    assert broken.status_code == 200
    assert broken.json()["quarantined"] is True
    incident_timeline = client.get(
        f"/api/collectors/{DEMO_COLLECTOR_ID}/dashboard"
    ).json()["timeline"]
    assert [event["kind"] for event in incident_timeline[:2]] == [
        "snapshot_quarantined",
        "demo_layout_changed",
    ]
    assert datetime.fromisoformat(incident_timeline[0]["created_at"]) >= datetime.fromisoformat(
        incident_timeline[1]["created_at"]
    )
    safe_output = client.get(f"/api/collectors/{DEMO_COLLECTOR_ID}/safe-output")
    safe_output.raise_for_status()
    held_output = safe_output.json()
    assert held_output["stale"] is True
    assert held_output["warning"] == (
        "Latest output is quarantined. Serving the last known good snapshot."
    )
    assert len(held_output["snapshot"]) == 12

    proposed = client.post(
        f"/api/collectors/{DEMO_COLLECTOR_ID}/repairs",
        json={"idempotency_key": "api-heal"},
    )
    proposed.raise_for_status()
    repair_id = proposed.json()["id"]

    client.post(
        f"/api/collectors/{DEMO_COLLECTOR_ID}/repairs/approve",
        json={"repair_id": repair_id},
    ).raise_for_status()
    recovered = client.post(
        f"/api/collectors/{DEMO_COLLECTOR_ID}/repairs/verify",
        json={"idempotency_key": "api-verify"},
    )
    recovered.raise_for_status()
    assert recovered.json()["state"] == "recovered"

    released_output = client.get(
        f"/api/collectors/{DEMO_COLLECTOR_ID}/safe-output"
    ).json()
    assert released_output["stale"] is False
    assert released_output["warning"] is None
    assert released_output["run_id"] != held_output["run_id"]
    assert len(released_output["snapshot"]) == 12

    dashboard = client.get(f"/api/collectors/{DEMO_COLLECTOR_ID}/dashboard").json()
    assert dashboard["collector"]["status"] == "green"
    assert dashboard["last_known_good"] is not None


def test_structured_domain_error():
    response = client.post(
        f"/api/collectors/{DEMO_COLLECTOR_ID}/repairs",
        json={"idempotency_key": "too-early"},
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "collector_not_broken"


def test_monitor_api_runs_a_real_health_cycle():
    status = client.get("/api/monitor")
    status.raise_for_status()
    assert status.json()["running"] is False
    assert status.json()["cycles_completed"] == 0

    client.post("/api/demo/layout", json={"layout": "broken"}).raise_for_status()
    cycle = client.post("/api/monitor/run")
    cycle.raise_for_status()

    assert cycle.json()["cycles_completed"] == 1
    assert cycle.json()["checks_completed"] == 1
    assert cycle.json()["incidents_detected"] == 1
    dashboard = client.get(f"/api/collectors/{DEMO_COLLECTOR_ID}/dashboard").json()
    assert dashboard["latest_run"]["quarantined"] is True


def test_demo_repair_rejects_false_provider_publish_confirmation():
    client.post("/api/demo/layout", json={"layout": "broken"}).raise_for_status()
    client.post("/api/monitor/run").raise_for_status()
    repair = client.post(
        f"/api/collectors/{DEMO_COLLECTOR_ID}/repairs",
        json={"idempotency_key": "provider-publish-demo"},
    ).json()
    client.post(
        f"/api/collectors/{DEMO_COLLECTOR_ID}/repairs/approve",
        json={"repair_id": repair["id"]},
    ).raise_for_status()

    response = client.post(
        f"/api/collectors/{DEMO_COLLECTOR_ID}/repairs/provider-published",
        json={"repair_id": repair["id"]},
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "provider_publish_not_required"
