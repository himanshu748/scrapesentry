from __future__ import annotations

import json
import operator
import re
from datetime import datetime, timezone
from typing import Any, Callable, Dict, Iterable, List, Tuple
from urllib.parse import urlparse

from app.models import (
    CrossFieldPredicate,
    DataContract,
    DriftType,
    FieldContract,
    HealthEvaluation,
    HealthStatus,
    Severity,
    Violation,
)

TYPE_CHECKS: Dict[str, Callable[[Any], bool]] = {
    "any": lambda value: True,
    "string": lambda value: isinstance(value, str),
    "number": lambda value: isinstance(value, (int, float)) and not isinstance(value, bool),
    "integer": lambda value: isinstance(value, int) and not isinstance(value, bool),
    "boolean": lambda value: isinstance(value, bool),
    "object": lambda value: isinstance(value, dict),
    "array": lambda value: isinstance(value, list),
}

PREDICATE_PATTERN = re.compile(r"^\s*([A-Za-z_][\w.]*)\s*(<=|>=|==|!=|<|>)\s*([A-Za-z_][\w.]*)\s*$")
PREDICATE_OPERATORS: Dict[str, Callable[[Any, Any], bool]] = {
    "<=": operator.le,
    ">=": operator.ge,
    "==": operator.eq,
    "!=": operator.ne,
    "<": operator.lt,
    ">": operator.gt,
}


def _sample(
    rows: List[Dict[str, Any]], indexes: Iterable[int], fields: List[str]
) -> List[Dict[str, Any]]:
    evidence: List[Dict[str, Any]] = []
    for index in list(indexes)[:3]:
        evidence.append({"row": index, **{field: rows[index].get(field) for field in fields}})
    return evidence


def _parse_datetime(value: Any) -> datetime | None:
    if not isinstance(value, str):
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    except ValueError:
        return None


def _valid_format(value: Any, format_name: str) -> bool:
    if not isinstance(value, str):
        return False
    if format_name == "url":
        parsed = urlparse(value)
        return parsed.scheme in {"http", "https"} and bool(parsed.netloc)
    if format_name == "email":
        return re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", value) is not None
    if format_name == "datetime":
        return _parse_datetime(value) is not None
    return True


def _field_violations(
    rows: List[Dict[str, Any]], field_name: str, spec: FieldContract, now: datetime
) -> List[Violation]:
    violations: List[Violation] = []
    present_indexes = [index for index, row in enumerate(rows) if field_name in row]
    if spec.required and len(present_indexes) == 0:
        return [
            Violation(
                rule="required_field",
                severity=spec.severity,
                drift_type=DriftType.STRUCTURAL,
                field=field_name,
                expected="field present",
                observed="field missing from every row",
                message=f"Required field '{field_name}' disappeared from the snapshot.",
                evidence=_sample(rows, range(len(rows)), [field_name]),
            )
        ]

    null_indexes = [index for index, row in enumerate(rows) if row.get(field_name) is None]
    null_rate = len(null_indexes) / len(rows) if rows else 0.0
    allowed_null_rate = spec.max_null_rate if spec.nullable else 0.0
    if null_rate > allowed_null_rate:
        violations.append(
            Violation(
                rule="null_rate",
                severity=spec.severity,
                drift_type=DriftType.QUALITY,
                field=field_name,
                expected=f"<= {allowed_null_rate:.1%}",
                observed=f"{null_rate:.1%}",
                message=f"Null rate for '{field_name}' exceeded its contract.",
                evidence=_sample(rows, null_indexes, [field_name]),
            )
        )

    value_indexes = [index for index, row in enumerate(rows) if row.get(field_name) is not None]
    invalid_type_indexes = [
        index for index in value_indexes if not TYPE_CHECKS[spec.type](rows[index][field_name])
    ]
    if invalid_type_indexes:
        violations.append(
            Violation(
                rule="field_type",
                severity=spec.severity,
                drift_type=DriftType.STRUCTURAL,
                field=field_name,
                expected=spec.type,
                observed=f"{len(invalid_type_indexes)} invalid values",
                message=f"Field '{field_name}' no longer matches type '{spec.type}'.",
                evidence=_sample(rows, invalid_type_indexes, [field_name]),
            )
        )

    typed_indexes = [index for index in value_indexes if index not in invalid_type_indexes]
    if spec.minimum is not None:
        bad = [index for index in typed_indexes if rows[index][field_name] < spec.minimum]
        if bad:
            violations.append(_range_violation(rows, field_name, spec, bad, f">= {spec.minimum}"))
    if spec.maximum is not None:
        bad = [index for index in typed_indexes if rows[index][field_name] > spec.maximum]
        if bad:
            violations.append(_range_violation(rows, field_name, spec, bad, f"<= {spec.maximum}"))
    if spec.allowed_values is not None:
        bad = [
            index for index in typed_indexes if rows[index][field_name] not in spec.allowed_values
        ]
        if bad:
            violations.append(
                Violation(
                    rule="allowed_values",
                    severity=spec.severity,
                    drift_type=DriftType.SEMANTIC,
                    field=field_name,
                    expected=json.dumps(spec.allowed_values, default=str),
                    observed=f"{len(bad)} unexpected values",
                    message=f"Field '{field_name}' contains an unexpected category.",
                    evidence=_sample(rows, bad, [field_name]),
                )
            )
    if spec.format:
        bad = [
            index
            for index in typed_indexes
            if not _valid_format(rows[index][field_name], spec.format)
        ]
        if bad:
            violations.append(
                Violation(
                    rule="format",
                    severity=spec.severity,
                    drift_type=DriftType.QUALITY,
                    field=field_name,
                    expected=spec.format,
                    observed=f"{len(bad)} malformed values",
                    message=f"Field '{field_name}' contains malformed {spec.format} values.",
                    evidence=_sample(rows, bad, [field_name]),
                )
            )
    if spec.freshness_seconds:
        stale = []
        for index in typed_indexes:
            parsed = _parse_datetime(rows[index][field_name])
            if parsed is None or (now - parsed).total_seconds() > spec.freshness_seconds:
                stale.append(index)
        if stale:
            violations.append(
                Violation(
                    rule="freshness",
                    severity=spec.severity,
                    drift_type=DriftType.FRESHNESS,
                    field=field_name,
                    expected=f"age <= {spec.freshness_seconds}s",
                    observed=f"{len(stale)} stale or invalid timestamps",
                    message=f"Field '{field_name}' is stale.",
                    evidence=_sample(rows, stale, [field_name]),
                )
            )
    return violations


def _range_violation(
    rows: List[Dict[str, Any]], field_name: str, spec: FieldContract, bad: List[int], expected: str
) -> Violation:
    return Violation(
        rule="numeric_range",
        severity=spec.severity,
        drift_type=DriftType.SEMANTIC,
        field=field_name,
        expected=expected,
        observed=f"{len(bad)} out-of-range values",
        message=f"Field '{field_name}' left its expected range.",
        evidence=_sample(rows, bad, [field_name]),
    )


def _predicate_violation(
    rows: List[Dict[str, Any]], predicate: CrossFieldPredicate
) -> Violation | None:
    match = PREDICATE_PATTERN.match(predicate.expression)
    if not match:
        return Violation(
            rule="predicate_config",
            severity=Severity.BLOCKING,
            drift_type=DriftType.EXECUTION,
            expected="supported field comparison",
            observed=predicate.expression,
            message="The contract contains an unsupported predicate.",
        )
    left, symbol, right = match.groups()
    comparator = PREDICATE_OPERATORS[symbol]
    bad = []
    for index, row in enumerate(rows):
        if row.get(left) is None or row.get(right) is None:
            continue
        try:
            if not comparator(row[left], row[right]):
                bad.append(index)
        except TypeError:
            bad.append(index)
    if not bad:
        return None
    return Violation(
        rule="cross_field_predicate",
        severity=predicate.severity,
        drift_type=DriftType.SEMANTIC,
        expected=predicate.expression,
        observed=f"{len(bad)} rows failed",
        message=predicate.message,
        evidence=_sample(rows, bad, [left, right]),
    )


def evaluate_contract(
    rows: List[Dict[str, Any]], contract: DataContract, now: datetime | None = None
) -> HealthEvaluation:
    evaluated_at = now or datetime.now(timezone.utc)
    violations: List[Violation] = []
    count = len(rows)
    if count < contract.row_count_min or (
        contract.row_count_max is not None and count > contract.row_count_max
    ):
        violations.append(
            Violation(
                rule="row_count",
                severity=Severity.BLOCKING,
                drift_type=DriftType.QUALITY,
                expected=f"{contract.row_count_min}..{contract.row_count_max or 'unbounded'}",
                observed=str(count),
                message="Snapshot row count is outside the expected range.",
            )
        )

    for field_name, spec in contract.fields.items():
        violations.extend(_field_violations(rows, field_name, spec, evaluated_at))

    if rows:
        canonical = [json.dumps(row, sort_keys=True, default=str) for row in rows]
        duplicate_rate = (len(canonical) - len(set(canonical))) / len(canonical)
        if duplicate_rate > contract.max_duplicate_rate:
            violations.append(
                Violation(
                    rule="duplicate_rate",
                    severity=Severity.BLOCKING,
                    drift_type=DriftType.QUALITY,
                    expected=f"<= {contract.max_duplicate_rate:.1%}",
                    observed=f"{duplicate_rate:.1%}",
                    message="Duplicate rows exceeded the contract threshold.",
                )
            )

    for field_name in contract.unique_fields:
        seen: Dict[Any, int] = {}
        duplicate_indexes = []
        for index, row in enumerate(rows):
            value = row.get(field_name)
            if value is None:
                continue
            if value in seen:
                duplicate_indexes.append(index)
            else:
                seen[value] = index
        if duplicate_indexes:
            violations.append(
                Violation(
                    rule="unique_field",
                    severity=Severity.BLOCKING,
                    drift_type=DriftType.QUALITY,
                    field=field_name,
                    expected="unique values",
                    observed=f"{len(duplicate_indexes)} duplicates",
                    message=f"Field '{field_name}' is no longer unique.",
                    evidence=_sample(rows, duplicate_indexes, [field_name]),
                )
            )

    for predicate in contract.predicates:
        violation = _predicate_violation(rows, predicate)
        if violation:
            violations.append(violation)

    penalty = sum(18 if item.severity == Severity.BLOCKING else 6 for item in violations)
    score = max(0, 100 - penalty)
    if any(item.severity == Severity.BLOCKING for item in violations):
        status = HealthStatus.RED
    elif violations:
        status = HealthStatus.YELLOW
    else:
        status = HealthStatus.GREEN
    return HealthEvaluation(
        score=score,
        status=status,
        row_count=count,
        violations=violations,
        evaluated_at=evaluated_at,
    )


def schema_signature(rows: List[Dict[str, Any]]) -> Tuple[str, ...]:
    fields = set()
    for row in rows:
        fields.update(row.keys())
    return tuple(sorted(fields))


def build_repair_prompt(evaluation: HealthEvaluation) -> str:
    details = []
    for violation in evaluation.violations:
        field = f" field '{violation.field}'" if violation.field else ""
        details.append(
            f"- {violation.rule}{field}: expected {violation.expected}; "
            f"observed {violation.observed}."
        )
    joined = "\n".join(details)
    return (
        "Repair this Scraper Studio collector without changing the output schema. "
        "Preserve field meanings and return contract-valid structured rows.\n" + joined
    )[:1000]
