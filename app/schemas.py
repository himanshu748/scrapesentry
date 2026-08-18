from typing import Any, Dict, List, Literal

from pydantic import BaseModel, Field

from app.models import Collector, DataContract, PolicyMode


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
    layout: Literal["healthy", "broken"]


class RegisterCollectorAction(BaseModel):
    id: str
    name: str
    brightdata_collector_id: str
    inputs: List[Dict[str, Any]] = Field(default_factory=list)
    policy_mode: PolicyMode = PolicyMode.PROPOSE
    contract: DataContract

    def to_collector(self) -> Collector:
        return Collector(**self.model_dump())


class ErrorBody(BaseModel):
    code: str
    message: str


class ErrorEnvelope(BaseModel):
    error: ErrorBody
