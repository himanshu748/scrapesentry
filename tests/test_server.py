import asyncio

from app.server import mcp


def test_mcp_exposes_the_continuous_monitor_cycle():
    tool_names = [tool.name for tool in asyncio.run(mcp.list_tools())]

    assert "run_monitor_cycle" in tool_names
    assert "confirm_provider_publish" in tool_names
    assert "get_fleet_health" in tool_names
    assert "get_alert_status" in tool_names
    assert "get_system_readiness" in tool_names
    assert len(tool_names) == 18
