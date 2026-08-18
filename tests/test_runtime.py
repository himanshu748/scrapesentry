from app.runtime import Runtime
from app.seed import DEMO_COLLECTOR_ID
from app.settings import Settings


def test_production_runtime_registers_configured_collector_without_triggering_it():
    runtime = Runtime(
        Settings(
            app_env="production",
            brightdata_api_token="test-token",
            brightdata_collector_id="c_live_test",
        )
    )

    collectors = runtime.service.list_collectors()

    assert len(collectors) == 1
    assert collectors[0].id == DEMO_COLLECTOR_ID
    assert collectors[0].brightdata_collector_id == "c_live_test"
    assert runtime.service.dashboard(DEMO_COLLECTOR_ID).latest_run is None
