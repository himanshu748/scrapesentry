from __future__ import annotations

from functools import lru_cache

from app.brightdata_client import DemoBrightDataAdapter, HttpBrightDataAdapter
from app.heal_orchestrator import ScrapeSentryService
from app.monitor import CollectorMonitor
from app.repository import InMemoryRepository
from app.seed import DEMO_COLLECTOR_ID, demo_collector
from app.settings import Settings, get_settings


class Runtime:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.repository = self._build_repository()
        self.adapter = self._build_adapter()
        self.service = ScrapeSentryService(self.repository, self.adapter)
        self.monitor = CollectorMonitor(
            self.service, interval_seconds=self.settings.monitor_interval_seconds
        )
        if self.settings.app_env == "demo":
            self.seed()
        else:
            self.register_configured_collector()

    def _build_repository(self):
        if self.settings.supabase_url and self.settings.supabase_service_role_key:
            from app.supabase_repository import SupabaseRepository

            return SupabaseRepository(
                self.settings.supabase_url, self.settings.supabase_service_role_key
            )
        return InMemoryRepository()

    def _build_adapter(self):
        if self.settings.app_env == "demo":
            return DemoBrightDataAdapter(
                self.settings.fixture_dir, self.settings.live_evidence_path
            )
        return HttpBrightDataAdapter(self.settings)

    def seed(self) -> None:
        self.service.register_collector(demo_collector(self.settings.brightdata_collector_id))
        self.service.check_health(DEMO_COLLECTOR_ID, "seed-healthy", source="demo")

    def register_configured_collector(self) -> None:
        if not self.service.list_collectors():
            self.service.register_collector(
                demo_collector(self.settings.brightdata_collector_id)
            )

    def reset(self) -> None:
        self.repository = self._build_repository()
        self.adapter = self._build_adapter()
        self.service = ScrapeSentryService(self.repository, self.adapter)
        self.monitor = CollectorMonitor(
            self.service, interval_seconds=self.settings.monitor_interval_seconds
        )
        if self.settings.app_env == "demo":
            self.seed()
        else:
            self.register_configured_collector()

    async def reset_async(self) -> None:
        restart_monitor = self.monitor.status().running
        await self.monitor.stop()
        self.reset()
        if restart_monitor:
            await self.monitor.start()


@lru_cache
def get_runtime() -> Runtime:
    return Runtime(get_settings())
