from __future__ import annotations

import json
from uuid import uuid4

from app.runtime import Runtime
from app.seed import DEMO_COLLECTOR_ID, demo_collector
from app.settings import Settings


def main() -> None:
    settings = Settings(app_env="production")
    runtime = Runtime(settings)
    runtime.service.register_collector(demo_collector(settings.brightdata_collector_id))
    run = runtime.service.check_health(
        DEMO_COLLECTOR_ID,
        f"live-smoke-{uuid4().hex[:10]}",
        source="brightdata",
    )
    print(
        json.dumps(
            {
                "provider": "brightdata",
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
