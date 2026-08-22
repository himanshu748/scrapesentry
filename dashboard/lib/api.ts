export type Health = "green" | "yellow" | "red";

export type Violation = {
  rule: string;
  severity: "warning" | "blocking";
  drift_type: string;
  field?: string;
  expected: string;
  observed: string;
  message: string;
  evidence: Record<string, unknown>[];
};

export type Evaluation = {
  score: number;
  status: Health;
  row_count: number;
  violations: Violation[];
  evaluated_at: string;
};

export type ProviderRepairEvidence = {
  provider: string;
  job_id?: string;
  trigger_status: string;
  progress_status: string;
  draft_status: "not_required" | "awaiting_acceptance" | "ready_for_review" | "published";
  requires_publish: boolean;
  started_at: string;
  completed_at?: string;
  published_at?: string;
  latency_seconds: number;
};

// Mirrors app/models.py RepairState.
export type RepairState =
  | "heal_proposed"
  | "awaiting_approval"
  | "shadow_verifying"
  | "approved"
  | "rejected"
  | "production_verifying"
  | "recovered"
  | "failed"
  | "rolled_back";

export type Repair = {
  id: string;
  state: RepairState;
  confidence: number;
  diff_summary: string[];
  schema_changed: boolean;
  before_rows: Record<string, unknown>[];
  preview_rows: Record<string, unknown>[];
  preview_evaluation?: Evaluation;
  provider_evidence?: ProviderRepairEvidence;
  failure_reason?: string;
};

export type DashboardState = {
  collector: {
    id: string;
    name: string;
    brightdata_collector_id: string;
    status: Health;
    health_score: number;
    policy_mode: string;
    last_run_at?: string;
    last_healthy_at?: string;
    active_incident_id?: string;
    contract: { version: number };
  };
  latest_run?: {
    id: string;
    provider_job_id?: string;
    quarantined: boolean;
    evaluation: Evaluation;
    created_at: string;
  };
  repair?: Repair;
  last_known_good?: {
    run_id: string;
    snapshot: Record<string, unknown>[];
    captured_at: string;
  };
  timeline: {
    id: string;
    kind: string;
    title: string;
    detail: string;
    created_at: string;
  }[];
  demo_layout: string;
};

export type LiveRunEvidence = {
  provider: string;
  collector_name: string;
  collector_id: string;
  job_id: string;
  target_url: string;
  records: number;
  failed_crawls: number;
  pages: number;
  success_rate: number;
  job_time_ms: number;
  spent_usd: number;
  finished_at: string;
  schema_fields: string[];
  sample_rows: Record<string, unknown>[];
  artifact: string;
  artifact_sha256: string;
  repair_job_id: string;
  repair_status: string;
  repair_preview_records: number;
  repair_completed_steps: number;
  repair_elapsed_seconds: number;
  repair_finished_at: string;
};

export type SafeOutput = {
  collector_id: string;
  run_id: string;
  snapshot: Record<string, unknown>[];
  age_seconds: number;
  stale: boolean;
  warning?: string;
};

export type MonitorStatus = {
  running: boolean;
  interval_seconds: number;
  cycles_completed: number;
  checks_completed: number;
  incidents_detected: number;
  last_cycle_at?: string;
  next_cycle_at?: string;
  last_error?: string;
};

export type FleetCollector = {
  id: string;
  name: string;
  brightdata_collector_id: string;
  owner: string;
  environment: "development" | "staging" | "production";
  policy_mode: string;
  status: Health;
  health_score: number;
  contract_version: number;
  last_run_at?: string;
  active_incident_id?: string;
  incident_open_seconds: number;
  protected_records: number;
};

export type FleetSummary = {
  generated_at: string;
  total_collectors: number;
  matching_collectors: number;
  healthy: number;
  degraded: number;
  broken: number;
  active_incidents: number;
  average_health_score: number;
  protected_records: number;
  failure_budget_seconds: number;
  incident_seconds: number;
  failure_budget_remaining_seconds: number;
  failure_budget_state: "healthy" | "at_risk" | "exhausted";
  collectors: FleetCollector[];
};

export type AlertStatus = {
  configured: boolean;
  destination?: string;
  event_kinds: string[];
  deliveries_attempted: number;
  deliveries_succeeded: number;
  deliveries_failed: number;
  configuration_error?: string;
  last_delivery?: {
    event_id: string;
    collector_id: string;
    kind: string;
    destination?: string;
    status: "delivered" | "failed";
    attempted_at: string;
    response_code?: number;
    error?: string;
  };
};

export type ReadinessCheck = {
  id: string;
  label: string;
  status: "ready" | "optional" | "missing";
  detail: string;
};

export type SystemReadiness = {
  mode: string;
  status: "judge_ready" | "production_ready" | "needs_configuration";
  judge_ready: boolean;
  production_ready: boolean;
  checks: ReadinessCheck[];
  blockers: string[];
};

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store"
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || `Request failed with ${response.status}`;
    const requestId = payload?.request_id || response.headers.get("x-request-id");
    throw new Error(`${message}${requestId ? ` · ${requestId}` : ""}`);
  }
  return payload as T;
}
