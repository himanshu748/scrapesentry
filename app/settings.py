from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "ScrapeSentry"
    app_env: str = "demo"
    api_prefix: str = "/api"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3100"
    brightdata_api_token: str | None = None
    brightdata_collector_id: str = "c_msxcshnz2bwrroekf3"
    brightdata_base_url: str = "https://api.brightdata.com"
    brightdata_poll_timeout_seconds: int = Field(default=180, ge=10, le=900)
    monitor_enabled: bool = False
    monitor_interval_seconds: int = Field(default=60, ge=10, le=86400)
    supabase_url: str | None = None
    supabase_service_role_key: str | None = None
    fixture_dir: Path = Path(__file__).resolve().parents[1] / "tests" / "fixtures"
    live_evidence_path: Path = (
        Path(__file__).resolve().parents[1] / "examples" / "brightdata-live-run.json"
    )

    @property
    def parsed_cors_origins(self) -> List[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
