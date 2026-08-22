from typing import Any, Dict, List, Literal

from pydantic import BaseModel, Field

from app.models import Collector, CollectorEnvironment, DataContract, PolicyMode


class IdempotentAction(BaseModel):
    idempotency_key: str = Field(min_length=3, max_length=120)


class ApproveAction(BaseModel):
    repair_id: str | None = None
    allow_schema_change: bool = False


class ProviderPublishAction(BaseModel):
    repair_id: str | None = None


class RejectAction(BaseModel):
    reason: str = Field(default="Rejected by reviewer", min_length=3, max_length=300)


class RollbackAction(BaseModel):
    reason: str = Field(default="Rollback requested", min_length=3, max_length=300)


class DemoLayoutAction(BaseModel):
    layout: Literal["healthy", "broken", "quality", "semantic", "partial"]


class RegisterCollectorAction(BaseModel):
    id: str
    name: str
    brightdata_collector_id: str
    inputs: List[Dict[str, Any]] = Field(default_factory=list)
    owner: str = Field(default="data-platform", min_length=1, max_length=80)
    environment: CollectorEnvironment = CollectorEnvironment.PRODUCTION
    failure_budget_minutes: int = Field(default=60, ge=1, le=43200)
    policy_mode: PolicyMode = PolicyMode.PROPOSE
    contract: DataContract

    def to_collector(self) -> Collector:
        return Collector(**self.model_dump())


class ErrorBody(BaseModel):
    code: str
    message: str
    details: list[dict] | None = None


class ErrorEnvelope(BaseModel):
    error: ErrorBody
    request_id: str | None = None
