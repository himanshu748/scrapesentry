from __future__ import annotations

from typing import TYPE_CHECKING, Literal

from pydantic import BaseModel

if TYPE_CHECKING:
    from app.runtime import Runtime


class ReadinessCheck(BaseModel):
    id: str
    label: str
    status: Literal["ready", "optional", "missing"]
    detail: str


class SystemReadiness(BaseModel):
    mode: str
    status: Literal["judge_ready", "production_ready", "needs_configuration"]
    judge_ready: bool
    production_ready: bool
    checks: list[ReadinessCheck]
    blockers: list[str]


def build_system_readiness(runtime: Runtime) -> SystemReadiness:
    settings = runtime.settings
    judge_mode = settings.app_env == "demo"
    live_provider_ready = bool(settings.brightdata_api_token)
    provider_ready = judge_mode or live_provider_ready
    persistence_ready = type(runtime.repository).__name__ == "SupabaseRepository"
    operator_configured = bool(settings.operator_api_token)
    operator_ready = judge_mode or operator_configured
    evidence_ready = settings.live_evidence_path.is_file()
    blockers: list[str] = []
    if not live_provider_ready:
        blockers.append("Configure BRIGHTDATA_API_TOKEN for live collections.")
    if not persistence_ready:
        blockers.append("Configure Supabase for durable production history.")
    if not operator_configured:
        blockers.append("Configure OPERATOR_API_TOKEN for protected mutations.")
    if judge_mode:
        blockers.append("Deploy with APP_ENV=production after live controls are configured.")

    production_ready = not blockers
    judge_ready = judge_mode and evidence_ready
    status = (
        "production_ready"
        if production_ready
        else "judge_ready"
        if judge_ready
        else "needs_configuration"
    )
    return SystemReadiness(
        mode=settings.app_env,
        status=status,
        judge_ready=judge_ready,
        production_ready=production_ready,
        checks=[
            ReadinessCheck(
                id="provider",
                label="Bright Data provider",
                status="ready" if provider_ready else "missing",
                detail=(
                    "Recorded production evidence is active in credit safe recovery mode."
                    if judge_mode
                    else "Live Scraper Studio credentials are configured."
                    if provider_ready
                    else "Live provider credentials are not configured."
                ),
            ),
            ReadinessCheck(
                id="evidence",
                label="Production evidence",
                status="ready" if evidence_ready else "missing",
                detail=(
                    "Verified Bright Data run evidence is available."
                    if evidence_ready
                    else "The recorded provider artifact is unavailable."
                ),
            ),
            ReadinessCheck(
                id="persistence",
                label="Durable audit history",
                status="ready" if persistence_ready else "optional" if judge_mode else "missing",
                detail=(
                    "Supabase audit persistence is active."
                    if persistence_ready
                    else "Recovery state is process-local. Configure Supabase for production."
                ),
            ),
            ReadinessCheck(
                id="operator",
                label="Operator boundary",
                status="ready" if operator_ready else "missing",
                detail=(
                    "Recorded recovery actions are isolated from live provider credentials."
                    if judge_mode
                    else "Production mutations require a bearer token stored on the server."
                    if operator_ready
                    else "Production mutation authentication is not configured."
                ),
            ),
            ReadinessCheck(
                id="monitor",
                label="Continuous monitor",
                status="ready" if settings.monitor_enabled else "optional",
                detail=(
                    f"Scheduled every {settings.monitor_interval_seconds} seconds."
                    if settings.monitor_enabled
                    else (
                        "Available on demand. Scheduling is disabled by default to protect "
                        "provider credits."
                    )
                ),
            ),
            ReadinessCheck(
                id="alerts",
                label="Signed incident routing",
                status="ready" if runtime.alert_router.configured else "optional",
                detail=(
                    "Signed incident and recovery webhooks are active."
                    if runtime.alert_router.configured
                    else "Webhook routing is ready but has no operator destination."
                ),
            ),
        ],
        blockers=blockers,
    )
