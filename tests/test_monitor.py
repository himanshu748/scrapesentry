import asyncio

from app.monitor import CollectorMonitor
from app.runtime import Runtime
from app.seed import DEMO_COLLECTOR_ID
from app.settings import Settings


def test_monitor_cycle_checks_collectors_and_counts_new_incidents():
    runtime = Runtime(Settings(app_env="demo"))
    runtime.service.set_demo_layout(DEMO_COLLECTOR_ID, "broken")
    monitor = CollectorMonitor(runtime.service, interval_seconds=60)

    status = asyncio.run(monitor.run_once())

    dashboard = runtime.service.dashboard(DEMO_COLLECTOR_ID)
    assert status.cycles_completed == 1
    assert status.checks_completed == 1
    assert status.incidents_detected == 1
    assert status.last_cycle_at is not None
    assert status.last_error is None
    assert dashboard.latest_run is not None
    assert dashboard.latest_run.quarantined is True


def test_background_monitor_starts_immediately_and_stops_cleanly():
    runtime = Runtime(Settings(app_env="demo"))
    monitor = CollectorMonitor(runtime.service, interval_seconds=60)

    async def exercise_monitor():
        await monitor.start()
        await asyncio.sleep(0.01)
        running = monitor.status()
        await monitor.stop()
        return running, monitor.status()

    running, stopped = asyncio.run(exercise_monitor())

    assert running.running is True
    assert running.cycles_completed == 1
    assert stopped.running is False
    assert stopped.cycles_completed == 1


def test_runtime_reset_restarts_an_active_monitor_without_leaking_old_state():
    runtime = Runtime(Settings(app_env="demo"))

    async def exercise_reset():
        await runtime.monitor.start()
        await asyncio.sleep(0.01)
        await runtime.reset_async()
        await asyncio.sleep(0.01)
        status = runtime.monitor.status()
        await runtime.monitor.stop()
        return status

    status = asyncio.run(exercise_reset())

    assert status.running is True
    assert status.cycles_completed == 1
    assert status.checks_completed == 1
