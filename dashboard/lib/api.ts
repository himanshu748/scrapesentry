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

export type Repair = {
  id: string;
  state: string;
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store"
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message || `Request failed with ${response.status}`);
  }
  return payload as T;
}
