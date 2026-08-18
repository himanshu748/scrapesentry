import asyncio

from app.server import mcp


def test_mcp_exposes_the_continuous_monitor_cycle():
    tool_names = [tool.name for tool in asyncio.run(mcp.list_tools())]

    assert "run_monitor_cycle" in tool_names
    assert "confirm_provider_publish" in tool_names
    assert len(tool_names) == 15
