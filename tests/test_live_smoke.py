import json
from pathlib import Path

import pytest

from app.contracts import evaluate_contract
from app.live_smoke import (
    BOOKS_PROFILE,
    GITHUB_CHANGELOG_PROFILE,
    live_collector,
)
from app.settings import Settings


def test_github_changelog_contract_accepts_recorded_production_output():
    artifact = Path("examples/brightdata-live-run-2.json")
    rows = json.loads(artifact.read_text(encoding="utf-8"))
    collector = live_collector(
        Settings(brightdata_collector_id="c_test_changelog"),
        GITHUB_CHANGELOG_PROFILE,
    )

    evaluation = evaluate_contract(rows, collector.contract)

    assert evaluation.status.value == "green"
    assert evaluation.row_count == 51
    assert evaluation.violations == []


def test_live_collector_keeps_the_books_profile_as_default_contract():
    collector = live_collector(
        Settings(brightdata_collector_id="c_test_books"),
        BOOKS_PROFILE,
    )

    assert collector.id == "books-to-scrape"
    assert collector.brightdata_collector_id == "c_test_books"
    assert collector.contract.row_count_min == 12
    assert collector.contract.row_count_max == 12


def test_live_collector_rejects_unknown_profiles():
    with pytest.raises(ValueError, match="Unknown live scraper profile"):
        live_collector(Settings(), "unknown")
