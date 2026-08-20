from __future__ import annotations

from typing import Any, Dict, List

from mcp.server.fastmcp import FastMCP

from app.models import Collector, CollectorEnvironment, DataContract, HealthStatus, PolicyMode
from app.readiness import build_system_readiness
from app.runtime import get_runtime

mcp = FastMCP("ScrapeSentry")


def _json(model: Any) -> Any:
    if hasattr(model, "model_dump"):
        return model.model_dump(mode="json")
    if isinstance(model, list):
        return [_json(item) for item in model]
    return model


@mcp.tool()
def register_collector(
    collector_id: str,
    name: str,
    brightdata_collector_id: str,
    contract: Dict[str, Any],
    inputs: List[Dict[str, Any]] | None = None,
    policy_mode: str = "propose",
) -> Dict[str, Any]:
    """Register a Scraper Studio collector with a versioned data contract."""
    collector = Collector(
        id=collector_id,
        name=name,
        brightdata_collector_id=brightdata_collector_id,
        inputs=inputs or [],
        policy_mode=PolicyMode(policy_mode),
        contract=DataContract.model_validate(contract),
    )
    return _json(get_runtime().service.register_collector(collector))


@mcp.tool()
def set_data_contract(collector_id: str, contract: Dict[str, Any]) -> Dict[str, Any]:
    """Create a newer contract version for a collector."""
    return _json(
        get_runtime().service.set_data_contract(collector_id, DataContract.model_validate(contract))
    )


@mcp.tool()
def list_collectors() -> List[Dict[str, Any]]:
    """List collector health, policy and contract versions."""
    return _json(get_runtime().service.list_collectors())


@mcp.tool()
def get_fleet_health(
    status: str | None = None,
    environment: str | None = None,
    owner: str | None = None,
) -> Dict[str, Any]:
    """Summarize fleet health, open incidents, protected rows and failure budget."""
    return _json(
        get_runtime().service.get_fleet_health(
            HealthStatus(status) if status else None,
            CollectorEnvironment(environment) if environment else None,
            owner,
        )
    )


@mcp.tool()
def get_alert_status() -> Dict[str, Any]:
    """Return signed webhook routing configuration and delivery health."""
    return _json(get_runtime().alert_router.status())


@mcp.tool()
def get_system_readiness() -> Dict[str, Any]:
    """Report judge readiness, production readiness and missing configuration."""
    return _json(build_system_readiness(get_runtime()))


@mcp.tool()
def check_health(collector_id: str, idempotency_key: str) -> Dict[str, Any]:
    """Run a collector, evaluate its contract and quarantine bad output."""
    return _json(get_runtime().service.check_health(collector_id, idempotency_key))


@mcp.tool()
async def run_monitor_cycle() -> Dict[str, Any]:
    """Check every registered collector once and return monitor status."""
    return _json(await get_runtime().monitor.run_once())


@mcp.tool()
def get_drift_report(collector_id: str) -> Dict[str, Any]:
    """Return rule-level violations, evidence and repair guidance."""
    return _json(get_runtime().service.get_drift_report(collector_id))


@mcp.tool()
def propose_heal(collector_id: str, idempotency_key: str) -> Dict[str, Any]:
    """Request a Bright Data Self-Healing candidate without approving production."""
    return _json(get_runtime().service.propose_heal(collector_id, idempotency_key))


@mcp.tool()
def get_heal_preview(collector_id: str) -> Dict[str, Any]:
    """Return the candidate preview, contract result and schema warning."""
    return _json(get_runtime().service.get_heal_preview(collector_id))


@mcp.tool()
def approve_heal(
    collector_id: str, repair_id: str | None = None, allow_schema_change: bool = False
) -> Dict[str, Any]:
    """Approve a candidate for canary and production verification."""
    return _json(
        get_runtime().service.approve_heal(
            collector_id, repair_id, allow_schema_change=allow_schema_change
        )
    )


@mcp.tool()
def confirm_provider_publish(
    collector_id: str, repair_id: str | None = None
) -> Dict[str, Any]:
    """Confirm a reviewed Scraper Studio draft was published before verification."""
    return _json(
        get_runtime().service.confirm_provider_publish(collector_id, repair_id)
    )


@mcp.tool()
def reject_heal(collector_id: str, reason: str = "Rejected by reviewer") -> Dict[str, Any]:
    """Reject a repair proposal without changing production."""
    return _json(get_runtime().service.reject_heal(collector_id, reason))


@mcp.tool()
def verify_recovery(collector_id: str, idempotency_key: str) -> Dict[str, Any]:
    """Run canary and production contract verification after approval."""
    return _json(get_runtime().service.verify_recovery(collector_id, idempotency_key))


@mcp.tool()
def rollback_heal(collector_id: str, reason: str = "Rollback requested") -> Dict[str, Any]:
    """Roll back the latest repair through the configured adapter."""
    return _json(get_runtime().service.rollback_heal(collector_id, reason))


@mcp.tool()
def get_run_history(collector_id: str) -> List[Dict[str, Any]]:
    """Return recent checks and production verification runs."""
    return _json(get_runtime().service.get_run_history(collector_id))


@mcp.tool()
def get_last_known_good(collector_id: str) -> Dict[str, Any] | None:
    """Return the last contract-valid output that remains safe to serve."""
    return _json(get_runtime().service.get_last_known_good(collector_id))


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()
