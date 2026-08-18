from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any, Dict, List

from pydantic import BaseModel

PRICE_FIELDS = ("price", "list_price")


class LiveRunEvidence(BaseModel):
    provider: str
    collector_name: str
    collector_id: str
    job_id: str
    target_url: str
    records: int
    failed_crawls: int
    pages: int
    success_rate: float
    job_time_ms: int
    spent_usd: float
    finished_at: str
    schema_fields: List[str]
    sample_rows: List[Dict[str, Any]]
    artifact: str
    artifact_sha256: str
    repair_job_id: str
    repair_status: str
    repair_preview_records: int
    repair_completed_steps: int
    repair_elapsed_seconds: float
    repair_finished_at: str


def normalize_brightdata_row(row: Dict[str, Any]) -> Dict[str, Any]:
    normalized = {key: value for key, value in row.items() if key != "input"}
    for field in PRICE_FIELDS:
        value = normalized.get(field)
        if isinstance(value, dict):
            normalized[field] = value.get("value")
    return normalized


def load_live_snapshot(path: Path) -> List[Dict[str, Any]]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(raw, list):
        raise ValueError("Bright Data evidence must be a JSON array")
    if any(not isinstance(row, dict) for row in raw):
        raise ValueError("Every Bright Data evidence row must be an object")
    return [normalize_brightdata_row(row) for row in raw]


def build_live_run_evidence(path: Path) -> LiveRunEvidence:
    rows = load_live_snapshot(path)
    day3_path = path.with_name("brightdata-day3-evidence.json")
    day3 = json.loads(day3_path.read_text(encoding="utf-8"))
    collection = day3["collection"]
    repair = day3["self_healing"]
    schema_fields = list(rows[0].keys()) if rows else []
    return LiveRunEvidence(
        provider="Bright Data Scraper Studio",
        collector_name="books.toscrape.com",
        collector_id="c_msxcshnz2bwrroekf3",
        job_id=collection["job_id"],
        target_url="https://books.toscrape.com/",
        records=len(rows),
        failed_crawls=collection["failed_crawls"],
        pages=collection["pages"],
        success_rate=collection["success_rate"],
        job_time_ms=collection["job_time_ms"],
        spent_usd=collection["spent_usd"],
        finished_at=collection["finished_at"],
        schema_fields=schema_fields,
        sample_rows=rows[:3],
        artifact="examples/brightdata-live-run.json",
        artifact_sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
        repair_job_id=repair["job_id"],
        repair_status=repair["status"],
        repair_preview_records=repair["preview_records"],
        repair_completed_steps=repair["completed_steps"],
        repair_elapsed_seconds=repair["elapsed_seconds"],
        repair_finished_at=repair["finished_at"],
    )
