from copy import deepcopy
from pathlib import Path

from app.contracts import build_repair_prompt, evaluate_contract
from app.live_evidence import load_live_snapshot
from app.models import DataContract, FieldContract, HealthStatus
from app.seed import demo_contract


def _healthy_rows():
    return load_live_snapshot(Path(__file__).parents[1] / "examples" / "brightdata-live-run.json")


def test_healthy_fixture_passes_contract():
    evaluation = evaluate_contract(_healthy_rows(), demo_contract())

    assert evaluation.status == HealthStatus.GREEN
    assert evaluation.score == 100
    assert evaluation.violations == []


def test_missing_fields_are_blocking_and_actionable():
    rows = _healthy_rows()
    for row in rows:
        row["price_text"] = f"${row.pop('price')}"
        row["stock_label"] = row.pop("availability")

    evaluation = evaluate_contract(rows, demo_contract())
    prompt = build_repair_prompt(evaluation)

    assert evaluation.status == HealthStatus.RED
    assert evaluation.blocking
    assert {item.field for item in evaluation.violations} >= {"price", "availability"}
    assert "price" in prompt
    assert "availability" in prompt


def test_cross_field_predicate_catches_semantic_drift():
    rows = deepcopy(_healthy_rows())
    rows[0]["price"] = rows[0]["list_price"] + 10

    evaluation = evaluate_contract(rows, demo_contract())

    assert any(item.rule == "cross_field_predicate" for item in evaluation.violations)
    assert evaluation.status == HealthStatus.RED


def test_nullable_field_still_enforces_its_quality_threshold():
    contract = DataContract(
        fields={"value": FieldContract(type="string", nullable=True, max_null_rate=0.25)}
    )

    evaluation = evaluate_contract(
        [{"value": None}, {"value": None}, {"value": "ok"}, {"value": "ok"}],
        contract,
    )

    assert any(item.rule == "null_rate" for item in evaluation.violations)
