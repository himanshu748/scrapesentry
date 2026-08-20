from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Literal

from pydantic import BaseModel, Field, field_validator


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class HealthStatus(str, Enum):
    GREEN = "green"
    YELLOW = "yellow"
    RED = "red"


class Severity(str, Enum):
    WARNING = "warning"
    BLOCKING = "blocking"


class DriftType(str, Enum):
    STRUCTURAL = "structural"
    QUALITY = "quality"
    SEMANTIC = "semantic"
    FRESHNESS = "freshness"
    EXECUTION = "execution"


class PolicyMode(str, Enum):
    OBSERVE = "observe"
    PROPOSE = "propose"
    GUARDED_AUTO = "guarded_auto"


class CollectorEnvironment(str, Enum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"


class RepairState(str, Enum):
    HEAL_PROPOSED = "heal_proposed"
    AWAITING_APPROVAL = "awaiting_approval"
    SHADOW_VERIFYING = "shadow_verifying"
    APPROVED = "approved"
    REJECTED = "rejected"
    PRODUCTION_VERIFYING = "production_verifying"
    RECOVERED = "recovered"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"


class FieldContract(BaseModel):
    type: Literal["any", "string", "number", "integer", "boolean", "object", "array"] = "any"
    required: bool = True
    nullable: bool = False
    max_null_rate: float = Field(default=0.0, ge=0.0, le=1.0)
    minimum: float | None = None
    maximum: float | None = None
    allowed_values: List[Any] | None = None
    format: Literal["url", "email", "datetime"] | None = None
    freshness_seconds: int | None = Field(default=None, gt=0)
    severity: Severity = Severity.BLOCKING


class CrossFieldPredicate(BaseModel):
    expression: str
    message: str
    severity: Severity = Severity.BLOCKING

    @field_validator("expression")
    @classmethod
    def validate_expression(cls, value: str) -> str:
        allowed = ("<=", ">=", "==", "!=", "<", ">")
        if not any(operator in value for operator in allowed):
            raise ValueError("predicate must contain a supported comparison operator")
        return value


class DataContract(BaseModel):
    version: int = Field(default=1, ge=1)
    fields: Dict[str, FieldContract]
    row_count_min: int = Field(default=1, ge=0)
    row_count_max: int | None = Field(default=None, ge=1)
    max_duplicate_rate: float = Field(default=0.0, ge=0.0, le=1.0)
    unique_fields: List[str] = Field(default_factory=list)
    predicates: List[CrossFieldPredicate] = Field(default_factory=list)
    canary_inputs: List[Dict[str, Any]] = Field(default_factory=list)


class Violation(BaseModel):
    rule: str
    severity: Severity
    drift_type: DriftType
    field: str | None = None
    expected: str
    observed: str
    message: str
    evidence: List[Dict[str, Any]] = Field(default_factory=list)


class HealthEvaluation(BaseModel):
    score: int = Field(ge=0, le=100)
    status: HealthStatus
    row_count: int
    violations: List[Violation]
    evaluated_at: datetime = Field(default_factory=utc_now)

    @property
    def blocking(self) -> bool:
        return any(item.severity == Severity.BLOCKING for item in self.violations)


class Collector(BaseModel):
    id: str
    name: str
    brightdata_collector_id: str
    inputs: List[Dict[str, Any]] = Field(default_factory=list)
    owner: str = Field(default="data-platform", min_length=1, max_length=80)
    environment: CollectorEnvironment = CollectorEnvironment.PRODUCTION
    failure_budget_minutes: int = Field(default=60, ge=1, le=43200)
    policy_mode: PolicyMode = PolicyMode.PROPOSE
    auto_approve_threshold: int = Field(default=95, ge=0, le=100)
    contract: DataContract
    status: HealthStatus = HealthStatus.GREEN
    health_score: int = 100
    last_run_at: datetime | None = None
    last_healthy_at: datetime | None = None
    active_incident_id: str | None = None


class RunRecord(BaseModel):
    id: str
    collector_id: str
    idempotency_key: str
    snapshot: List[Dict[str, Any]]
    evaluation: HealthEvaluation
    quarantined: bool
    provider_job_id: str | None = None
    source: Literal["demo", "brightdata", "canary", "production"] = "demo"
    created_at: datetime = Field(default_factory=utc_now)


class LastKnownGood(BaseModel):
    collector_id: str
    run_id: str
    snapshot: List[Dict[str, Any]]
    captured_at: datetime = Field(default_factory=utc_now)


class ProviderRepairEvidence(BaseModel):
    provider: str
    job_id: str | None = None
    trigger_status: str
    progress_status: str
    draft_status: Literal[
        "not_required", "awaiting_acceptance", "ready_for_review", "published"
    ]
    requires_publish: bool = False
    started_at: datetime
    completed_at: datetime | None = None
    published_at: datetime | None = None
    latency_seconds: float = Field(default=0, ge=0)


class RepairJob(BaseModel):
    id: str
    collector_id: str
    idempotency_key: str
    state: RepairState = RepairState.HEAL_PROPOSED
    prompt: str
    confidence: int = Field(default=0, ge=0, le=100)
    before_rows: List[Dict[str, Any]] = Field(default_factory=list)
    preview_rows: List[Dict[str, Any]] = Field(default_factory=list)
    preview_evaluation: HealthEvaluation | None = None
    diff_summary: List[str] = Field(default_factory=list)
    schema_changed: bool = False
    provider_evidence: ProviderRepairEvidence | None = None
    external_job: Dict[str, Any] | None = None
    failure_reason: str | None = None
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class AuditEvent(BaseModel):
    id: str
    collector_id: str
    kind: str
    title: str
    detail: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=utc_now)


class DashboardState(BaseModel):
    collector: Collector
    latest_run: RunRecord | None
    repair: RepairJob | None
    last_known_good: LastKnownGood | None
    timeline: List[AuditEvent]
    demo_layout: str


class FleetCollectorState(BaseModel):
    id: str
    name: str
    brightdata_collector_id: str
    owner: str
    environment: CollectorEnvironment
    policy_mode: PolicyMode
    status: HealthStatus
    health_score: int = Field(ge=0, le=100)
    contract_version: int = Field(ge=1)
    last_run_at: datetime | None = None
    active_incident_id: str | None = None
    incident_open_seconds: int = Field(default=0, ge=0)
    protected_records: int = Field(default=0, ge=0)


class FleetSummary(BaseModel):
    generated_at: datetime = Field(default_factory=utc_now)
    total_collectors: int = Field(ge=0)
    matching_collectors: int = Field(ge=0)
    healthy: int = Field(ge=0)
    degraded: int = Field(ge=0)
    broken: int = Field(ge=0)
    active_incidents: int = Field(ge=0)
    average_health_score: float = Field(ge=0, le=100)
    protected_records: int = Field(ge=0)
    failure_budget_seconds: int = Field(ge=0)
    incident_seconds: int = Field(ge=0)
    failure_budget_remaining_seconds: int = Field(ge=0)
    failure_budget_state: Literal["healthy", "at_risk", "exhausted"]
    collectors: List[FleetCollectorState]
