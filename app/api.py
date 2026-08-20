from __future__ import annotations

import secrets
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import Depends, FastAPI, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.alerts import AlertRouterStatus
from app.errors import DomainError
from app.http_controls import SlidingWindowRateLimiter
from app.live_evidence import LiveRunEvidence, build_live_run_evidence
from app.models import (
    Collector,
    CollectorEnvironment,
    DashboardState,
    DataContract,
    FleetSummary,
    HealthStatus,
    LastKnownGood,
    RepairJob,
    RunRecord,
)
from app.monitor import MonitorStatus
from app.readiness import SystemReadiness, build_system_readiness
from app.runtime import get_runtime
from app.schemas import (
    ApproveAction,
    DemoLayoutAction,
    ErrorEnvelope,
    IdempotentAction,
    ProviderPublishAction,
    RegisterCollectorAction,
    RejectAction,
    RollbackAction,
)
from app.seed import DEMO_COLLECTOR_ID
from app.settings import get_settings

settings = get_settings()
mutation_limiter = SlidingWindowRateLimiter(settings.mutation_rate_limit_per_minute)


def require_operator(authorization: str | None = Header(default=None)) -> None:
    """Protect state-changing production operations with a server-held token."""
    if settings.app_env == "demo":
        return
    if not settings.operator_api_token:
        raise DomainError(
            "operator_token_not_configured",
            "Production mutations are disabled until OPERATOR_API_TOKEN is configured.",
            503,
        )
    scheme, _, token = (authorization or "").partition(" ")
    if (
        scheme.lower() != "bearer"
        or not token
        or not secrets.compare_digest(token, settings.operator_api_token)
    ):
        raise DomainError(
            "operator_unauthorized",
            "A valid operator bearer token is required.",
            401,
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    runtime = get_runtime()
    if settings.monitor_enabled:
        await runtime.monitor.start()
    try:
        yield
    finally:
        await runtime.monitor.stop()


app = FastAPI(
    title="ScrapeSentry API",
    version="0.1.0",
    description=(
        "Approval-gated health and recovery control plane for Bright Data "
        "Scraper Studio collectors."
    ),
    lifespan=lifespan,
    docs_url="/docs" if settings.app_env == "demo" else None,
    redoc_url="/redoc" if settings.app_env == "demo" else None,
    openapi_url="/openapi.json" if settings.app_env == "demo" else None,
)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.parsed_allowed_hosts)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.parsed_cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Idempotency-Key"],
)


@app.middleware("http")
async def operational_controls(request: Request, call_next):
    request_id = f"req_{uuid4().hex[:16]}"
    request.state.request_id = request_id
    response: JSONResponse
    is_mutation = request.method in {"POST", "PUT", "PATCH", "DELETE"}
    if is_mutation and request.url.path.startswith("/api/"):
        client_key = request.client.host if request.client else "unknown"
        allowed, retry_after = mutation_limiter.allow(client_key)
        if not allowed:
            response = JSONResponse(
                status_code=429,
                content=ErrorEnvelope(
                    error={
                        "code": "mutation_rate_limited",
                        "message": "Too many state-changing requests. Try again shortly.",
                    },
                    request_id=request_id,
                ).model_dump(),
                headers={"Retry-After": str(retry_after)},
            )
        else:
            response = await call_next(request)
    else:
        response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response


@app.exception_handler(DomainError)
async def domain_error_handler(request: Request, error: DomainError) -> JSONResponse:
    return JSONResponse(
        status_code=error.status_code,
        content=ErrorEnvelope(
            error={"code": error.code, "message": error.message},
            request_id=getattr(request.state, "request_id", None),
        ).model_dump(),
        headers={"WWW-Authenticate": "Bearer"} if error.status_code == 401 else None,
    )


@app.exception_handler(KeyError)
async def key_error_handler(request: Request, error: KeyError) -> JSONResponse:
    return JSONResponse(
        status_code=404,
        content=ErrorEnvelope(
            error={"code": "not_found", "message": str(error).strip("'")},
            request_id=getattr(request.state, "request_id", None),
        ).model_dump(),
    )


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": settings.app_name, "mode": settings.app_env}


@app.get("/ready")
def ready() -> dict:
    runtime = get_runtime()
    return {"status": "ready", "collectors": len(runtime.service.list_collectors())}


@app.get("/api/monitor", response_model=MonitorStatus)
def monitor_status() -> MonitorStatus:
    return get_runtime().monitor.status()


@app.get("/api/alerts", response_model=AlertRouterStatus)
def alert_status() -> AlertRouterStatus:
    return get_runtime().alert_router.status()


@app.get("/api/readiness", response_model=SystemReadiness)
def system_readiness() -> SystemReadiness:
    return build_system_readiness(get_runtime())


@app.post(
    "/api/monitor/run",
    response_model=MonitorStatus,
    dependencies=[Depends(require_operator)],
)
async def run_monitor() -> MonitorStatus:
    return await get_runtime().monitor.run_once()


@app.get("/api/evidence/live-run", response_model=LiveRunEvidence)
def live_run_evidence() -> LiveRunEvidence:
    return build_live_run_evidence(settings.live_evidence_path)


@app.get("/api/collectors", response_model=list[Collector])
def list_collectors() -> list[Collector]:
    return get_runtime().service.list_collectors()


@app.get("/api/fleet", response_model=FleetSummary)
def fleet_health(
    status: HealthStatus | None = None,
    environment: CollectorEnvironment | None = None,
    owner: str | None = None,
) -> FleetSummary:
    return get_runtime().service.get_fleet_health(status, environment, owner)


@app.post(
    "/api/collectors",
    response_model=Collector,
    dependencies=[Depends(require_operator)],
)
def register_collector(action: RegisterCollectorAction) -> Collector:
    return get_runtime().service.register_collector(action.to_collector())


@app.put(
    "/api/collectors/{collector_id}/contract",
    response_model=Collector,
    dependencies=[Depends(require_operator)],
)
def set_contract(collector_id: str, contract: DataContract) -> Collector:
    return get_runtime().service.set_data_contract(collector_id, contract)


@app.get("/api/collectors/{collector_id}/dashboard", response_model=DashboardState)
def dashboard(collector_id: str) -> DashboardState:
    return get_runtime().service.dashboard(collector_id)


@app.post(
    "/api/collectors/{collector_id}/check",
    response_model=RunRecord,
    dependencies=[Depends(require_operator)],
)
def check_health(collector_id: str, action: IdempotentAction) -> RunRecord:
    source = "demo" if settings.app_env == "demo" else "brightdata"
    return get_runtime().service.check_health(collector_id, action.idempotency_key, source=source)


@app.get("/api/collectors/{collector_id}/drift")
def drift_report(collector_id: str) -> dict:
    return get_runtime().service.get_drift_report(collector_id)


@app.post(
    "/api/collectors/{collector_id}/repairs",
    response_model=RepairJob,
    dependencies=[Depends(require_operator)],
)
def propose_heal(collector_id: str, action: IdempotentAction) -> RepairJob:
    return get_runtime().service.propose_heal(collector_id, action.idempotency_key)


@app.get("/api/collectors/{collector_id}/repairs/latest", response_model=RepairJob)
def heal_preview(collector_id: str) -> RepairJob:
    return get_runtime().service.get_heal_preview(collector_id)


@app.post(
    "/api/collectors/{collector_id}/repairs/approve",
    response_model=RepairJob,
    dependencies=[Depends(require_operator)],
)
def approve_heal(collector_id: str, action: ApproveAction) -> RepairJob:
    return get_runtime().service.approve_heal(
        collector_id, action.repair_id, action.allow_schema_change
    )


@app.post(
    "/api/collectors/{collector_id}/repairs/provider-published",
    response_model=RepairJob,
    dependencies=[Depends(require_operator)],
)
def confirm_provider_publish(
    collector_id: str, action: ProviderPublishAction
) -> RepairJob:
    return get_runtime().service.confirm_provider_publish(collector_id, action.repair_id)


@app.post(
    "/api/collectors/{collector_id}/repairs/reject",
    response_model=RepairJob,
    dependencies=[Depends(require_operator)],
)
def reject_heal(collector_id: str, action: RejectAction) -> RepairJob:
    return get_runtime().service.reject_heal(collector_id, action.reason)


@app.post(
    "/api/collectors/{collector_id}/repairs/verify",
    response_model=RepairJob,
    dependencies=[Depends(require_operator)],
)
def verify_recovery(collector_id: str, action: IdempotentAction) -> RepairJob:
    return get_runtime().service.verify_recovery(collector_id, action.idempotency_key)


@app.post(
    "/api/collectors/{collector_id}/repairs/rollback",
    response_model=RepairJob,
    dependencies=[Depends(require_operator)],
)
def rollback_heal(collector_id: str, action: RollbackAction) -> RepairJob:
    return get_runtime().service.rollback_heal(collector_id, action.reason)


@app.get("/api/collectors/{collector_id}/runs", response_model=list[RunRecord])
def run_history(collector_id: str) -> list[RunRecord]:
    return get_runtime().service.get_run_history(collector_id)


@app.get(
    "/api/collectors/{collector_id}/last-known-good",
    response_model=LastKnownGood | None,
)
def last_known_good(collector_id: str) -> LastKnownGood | None:
    return get_runtime().service.get_last_known_good(collector_id)


@app.get("/api/collectors/{collector_id}/safe-output")
def safe_output(collector_id: str) -> dict:
    service = get_runtime().service
    last_good = service.get_last_known_good(collector_id)
    latest = service.dashboard(collector_id).latest_run
    if not last_good:
        raise DomainError("no_safe_output", "No contract-valid snapshot exists yet.", 404)
    age_seconds = max(0, int((datetime.now(timezone.utc) - last_good.captured_at).total_seconds()))
    quarantined = bool(latest and latest.quarantined)
    return {
        "collector_id": collector_id,
        "run_id": last_good.run_id,
        "snapshot": last_good.snapshot,
        "age_seconds": age_seconds,
        "stale": quarantined,
        "warning": (
            "Latest output is quarantined. Serving the last known good snapshot."
            if quarantined
            else None
        ),
    }


@app.post("/api/demo/layout", dependencies=[Depends(require_operator)])
def set_demo_layout(action: DemoLayoutAction) -> dict:
    if settings.app_env != "demo":
        raise DomainError("not_demo_mode", "Demo controls are disabled outside demo mode.", 404)
    return {
        "layout": get_runtime().service.set_demo_layout(DEMO_COLLECTOR_ID, action.layout)
    }


@app.post(
    "/api/demo/reset",
    response_model=DashboardState,
    dependencies=[Depends(require_operator)],
)
async def reset_demo() -> DashboardState:
    if settings.app_env != "demo":
        raise DomainError("not_demo_mode", "Demo reset is disabled outside demo mode.", 404)
    runtime = get_runtime()
    await runtime.reset_async()
    return runtime.service.dashboard(DEMO_COLLECTOR_ID)
