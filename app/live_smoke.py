from __future__ import annotations

import json
import os
from uuid import uuid4

from app.models import Collector, DataContract, FieldContract, PolicyMode
from app.runtime import Runtime
from app.seed import demo_collector
from app.settings import Settings

BOOKS_PROFILE = "books"
GITHUB_CHANGELOG_PROFILE = "github-changelog"


def github_changelog_collector(brightdata_collector_id: str) -> Collector:
    return Collector(
        id=GITHUB_CHANGELOG_PROFILE,
        name="GitHub Changelog",
        brightdata_collector_id=brightdata_collector_id,
        inputs=[{"url": "https://github.blog/changelog/"}],
        owner="data-platform",
        environment="production",
        failure_budget_minutes=60,
        policy_mode=PolicyMode.OBSERVE,
        contract=DataContract(
            version=1,
            row_count_min=10,
            row_count_max=100,
            max_duplicate_rate=0.0,
            unique_fields=["release_id", "url"],
            fields={
                "release_id": FieldContract(type="string"),
                "title": FieldContract(type="string"),
                "published_at": FieldContract(type="string", format="datetime"),
                "category": FieldContract(type="string"),
                "summary": FieldContract(type="string"),
                "url": FieldContract(type="string", format="url"),
            },
        ),
    )


def live_collector(settings: Settings, profile: str) -> Collector:
    if profile == BOOKS_PROFILE:
        return demo_collector(settings.brightdata_collector_id)
    if profile == GITHUB_CHANGELOG_PROFILE:
        return github_changelog_collector(settings.brightdata_collector_id)
    raise ValueError(f"Unknown live scraper profile: {profile}")


def main() -> None:
    settings = Settings(app_env="production")
    profile = os.environ.get("BRIGHTDATA_LIVE_PROFILE", BOOKS_PROFILE).strip()
    collector = live_collector(settings, profile)
    runtime = Runtime(settings)
    runtime.service.register_collector(collector)
    run = runtime.service.check_health(
        collector.id,
        f"live-smoke-{uuid4().hex[:10]}",
        source="brightdata",
    )
    print(
        json.dumps(
            {
                "provider": "brightdata",
                "profile": profile,
                "collector_id": collector.brightdata_collector_id,
                "collection_id": getattr(runtime.adapter, "last_collection_id", None),
                "records": run.evaluation.row_count,
                "score": run.evaluation.score,
                "status": run.evaluation.status.value,
                "quarantined": run.quarantined,
                "violations": len(run.evaluation.violations),
            }
        )
    )
    if run.quarantined:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
