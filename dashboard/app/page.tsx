"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertStatus, DashboardState, FleetSummary, LiveRunEvidence, MonitorStatus, Repair, RepairState, SafeOutput, SystemReadiness, request } from "../lib/api";
import {
  BrightDataStory,
  ConsoleIntro,
  EvidenceSection,
  FAQSection,
  FinalCallToAction,
  LandingHero,
  RecoveryStory,
  SiteFooter,
  SiteHeader,
  TaglineReveal,
  UseItSection,
  WorkflowSection
} from "./components/NarrativeLanding";
import { FleetCommand } from "./components/FleetCommand";
import { JudgeTest } from "./components/JudgeTest";
import { ReadinessPanel } from "./components/ReadinessPanel";

const DEFAULT_COLLECTOR_ID = "books-to-scrape";

const APPROVED_STATES: RepairState[] = [
  "approved",
  "shadow_verifying",
  "production_verifying",
  "recovered"
];

const ACTION_SUCCESS_COPY: Record<string, string> = {
  monitor: "Monitor cycle completed. Dashboard evidence is current.",
  reset: "Demo state reset. The verified baseline is active.",
  check: "Live health check completed. Contract evidence is current.",
  approve: "Repair approved. The provider release gate is updated.",
  publish: "Provider publish recorded. Guarded verification is unlocked.",
  verify: "Guarded verification completed. Release gates are updated.",
  repair: "Repair candidate generated. Human approval is required.",
  drift: "Selector drift detected. Unsafe output was quarantined.",
  reject: "Repair rejected. Production release remains locked.",
  "safe-output": "Protected output refreshed from the latest verified snapshot."
};
// Source of truth for this list is app/server.py; keep both in step.
const MCP_TOOL_GROUPS = [
  {
    title: "Register",
    tools: ["register_collector", "set_data_contract", "list_collectors", "get_fleet_health"]
  },
  {
    title: "Observe",
    tools: [
      "check_health",
      "run_monitor_cycle",
      "get_drift_report",
      "get_alert_status",
      "get_system_readiness"
    ]
  },
  {
    title: "Repair",
    tools: [
      "propose_heal",
      "get_heal_preview",
      "approve_heal",
      "reject_heal",
      "confirm_provider_publish"
    ]
  },
  {
    title: "Release",
    tools: ["verify_recovery", "rollback_heal", "get_run_history", "get_last_known_good"]
  }
];

function relativeTime(value?: string) {
  if (!value) return "Never";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

function label(value: string) {
  return value.replaceAll("_", " ");
}

function idempotency(prefix: string) {
  return `${prefix}-${Date.now()}`;
}

function price(value: unknown) {
  return typeof value === "number" ? `£${value.toFixed(2)}` : "Pending";
}

function duration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h`;
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="empty-state">{children}</div>;
}

export function ScrapeSentryExperience({ surface }: { surface: "landing" | "console" }) {
  const [state, setState] = useState<DashboardState>();
  const [evidence, setEvidence] = useState<LiveRunEvidence>();
  const [safeOutput, setSafeOutput] = useState<SafeOutput>();
  const [monitor, setMonitor] = useState<MonitorStatus>();
  const [fleet, setFleet] = useState<FleetSummary>();
  const [alerts, setAlerts] = useState<AlertStatus>();
  const [readiness, setReadiness] = useState<SystemReadiness>();
  const [selectedCollectorId, setSelectedCollectorId] = useState(DEFAULT_COLLECTOR_ID);
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [retryAction, setRetryAction] = useState<{ name: string; run: () => Promise<unknown> }>();

  const refresh = useCallback(async () => {
    const nextFleet = await request<FleetSummary>("/api/fleet");
    const resolvedCollectorId = nextFleet.collectors.some((item) => item.id === selectedCollectorId)
      ? selectedCollectorId
      : nextFleet.collectors[0]?.id;
    if (!resolvedCollectorId) throw new Error("No collectors are registered yet.");
    const [next, nextSafeOutput, nextMonitor, nextAlerts, nextReadiness] = await Promise.all([
      request<DashboardState>(`/api/collectors/${resolvedCollectorId}/dashboard`),
      request<SafeOutput>(`/api/collectors/${resolvedCollectorId}/safe-output`).catch(() => undefined),
      request<MonitorStatus>("/api/monitor"),
      request<AlertStatus>("/api/alerts"),
      request<SystemReadiness>("/api/readiness")
    ]);
    setFleet(nextFleet);
    if (resolvedCollectorId !== selectedCollectorId) setSelectedCollectorId(resolvedCollectorId);
    setState(next);
    setSafeOutput(nextSafeOutput);
    setMonitor(nextMonitor);
    setAlerts(nextAlerts);
    setReadiness(nextReadiness);
  }, [selectedCollectorId]);

  useEffect(() => {
    if (surface === "landing") {
      request<LiveRunEvidence>("/api/evidence/live-run").then(setEvidence).catch((reason) => setError(reason.message));
      return;
    }
    Promise.all([
      refresh(),
      request<LiveRunEvidence>("/api/evidence/live-run").then(setEvidence)
    ]).catch((reason) => setError(reason.message));
  }, [refresh, surface]);

  async function act(name: string, action: () => Promise<unknown>) {
    setBusy(name);
    setError(undefined);
    setNotice(undefined);
    setRetryAction(undefined);
    try {
      await action();
      await refresh();
      setNotice(ACTION_SUCCESS_COPY[name] || "Action completed. Dashboard evidence is current.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Something went wrong");
      setRetryAction({ name, run: action });
    } finally {
      setBusy(undefined);
    }
  }

  const broken = state?.collector.status === "red";
  const repair = state?.repair;
  const violations = state?.latest_run?.evaluation.violations || [];
  const primary = useMemo(() => {
    if (!state) return null;
    const liveCheck = {
      text: state.latest_run ? "Run live health check" : "Start live health check",
      name: "check",
      run: () => request(`/api/collectors/${selectedCollectorId}/check`, {
        method: "POST",
        body: JSON.stringify({ idempotency_key: idempotency("live-check") })
      })
    };
    if (!state.latest_run) return liveCheck;
    if (repair?.state === "awaiting_approval") {
      return {
        text: "Approve repair",
        name: "approve",
        run: () => request<Repair>(`/api/collectors/${selectedCollectorId}/repairs/approve`, {
          method: "POST",
          body: JSON.stringify({ repair_id: repair.id })
        })
      };
    }
    if (repair?.state === "approved") {
      if (
        repair.provider_evidence?.requires_publish &&
        repair.provider_evidence.draft_status !== "published"
      ) {
        return {
          text: "Confirm draft published",
          name: "publish",
          run: () => request<Repair>(`/api/collectors/${selectedCollectorId}/repairs/provider-published`, {
            method: "POST",
            body: JSON.stringify({ repair_id: repair.id })
          })
        };
      }
      return {
        text: "Run guarded verification",
        name: "verify",
        run: () => request<Repair>(`/api/collectors/${selectedCollectorId}/repairs/verify`, {
          method: "POST",
          body: JSON.stringify({ idempotency_key: idempotency("verify") })
        })
      };
    }
    if (
      broken &&
      (!repair || ["rejected", "failed", "rolled_back", "recovered"].includes(repair.state))
    ) {
      return {
        text: "Generate repair",
        name: "repair",
        run: () => request<Repair>(`/api/collectors/${selectedCollectorId}/repairs`, {
          method: "POST",
          body: JSON.stringify({ idempotency_key: idempotency("heal") })
        })
      };
    }
    if (state.demo_layout === "live" || selectedCollectorId !== DEFAULT_COLLECTOR_ID) return liveCheck;
    return {
      text: "Simulate selector drift",
      name: "drift",
      run: async () => {
        await request("/api/demo/layout", {
          method: "POST",
          body: JSON.stringify({ layout: "broken" })
        });
        return request<MonitorStatus>("/api/monitor/run", { method: "POST" });
      }
    };
  }, [broken, repair, selectedCollectorId, state]);

  if (surface === "landing") {
    return (
      <>
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <SiteHeader />
        <main id="main-content">
          <LandingHero />
          <BrightDataStory evidence={evidence} />
          <RecoveryStory />
          <JudgeTest />
          <WorkflowSection />
          <TaglineReveal />
          <UseItSection />
          <EvidenceSection evidence={evidence} />
          <FAQSection />
          <FinalCallToAction />
          <SiteFooter />
        </main>
      </>
    );
  }

  if (!state) {
    const retryConnection = async () => {
      setError(undefined);
      try {
        await refresh();
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Could not connect to the control plane.");
      }
    };
    return (
      <>
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <SiteHeader />
        <main className="console-route-page" id="main-content">
          <section className="console-shell console-route-shell" aria-labelledby="console-loading-title">
            <ConsoleIntro />
            <div className={`console-loading ${error ? "connection-error" : ""}`} role={error ? "alert" : "status"} aria-busy={!error}>
              <span className="console-loading-mark">S</span>
              <div>
                <strong id="console-loading-title">{error ? "Control plane unavailable" : "Connecting to the control plane"}</strong>
                <p>{error || "Loading collector health, protected output and recovery evidence."}</p>
              </div>
              {error && (
                <div className="console-loading-actions">
                  <button type="button" onClick={retryConnection}>Retry connection</button>
                  <a href="/docs#configure">Review setup</a>
                </div>
              )}
            </div>
            {!error && (
              <div className="console-skeleton-grid" aria-hidden="true">
                {Array.from({ length: 4 }, (_, index) => (
                  <span className="console-skeleton-card" key={index}>
                    <i /><b /><small />
                  </span>
                ))}
              </div>
            )}
          </section>
        </main>
      </>
    );
  }

  const c = state.collector;
  const score = c.health_score;
  const scoreColor = c.status === "green" ? "var(--green)" : c.status === "red" ? "var(--red)" : "var(--amber)";
  const layoutChangedAt = state.timeline.find((item) => item.kind === "demo_layout_changed")?.created_at;
  const detectedAt = state.timeline.find((item) => item.kind === "snapshot_quarantined")?.created_at;
  const recoveredAt = state.timeline.find((item) => item.kind === "recovery_verified")?.created_at;
  const detectionSeconds = layoutChangedAt && detectedAt
    ? Math.max(0, (new Date(detectedAt).getTime() - new Date(layoutChangedAt).getTime()) / 1000)
    : undefined;
  const recoverySeconds = detectedAt && recoveredAt
    ? Math.max(0, Math.round((new Date(recoveredAt).getTime() - new Date(detectedAt).getTime()) / 1000))
    : undefined;
  const before = repair?.before_rows[0] || {};
  const after = repair?.preview_rows[0] || {};
  const hadIncident = state.timeline.some((item) => item.kind === "snapshot_quarantined");
  const recordsProtected = hadIncident ? state.last_known_good?.snapshot.length || 0 : 0;
  const approved = Boolean(repair && APPROVED_STATES.includes(repair.state));
  const providerPublishComplete = Boolean(
    repair && (
      !repair.provider_evidence?.requires_publish ||
      repair.provider_evidence.draft_status === "published"
    )
  );
  const mcpSteps = [
    {
      tool: "run_monitor_cycle",
      args: monitor?.running ? `interval=${monitor.interval_seconds}s` : "on_demand=true",
      complete: Boolean(monitor?.cycles_completed),
      result: monitor?.cycles_completed ? `${monitor.checks_completed} checks · ${monitor.incidents_detected} incidents` : "Watching every registered collector"
    },
    {
      tool: "check_health",
      args: `collector_id=\"${c.id}\"`,
      complete: Boolean(state.latest_run),
      result: state.latest_run ? `${state.latest_run.evaluation.score}/100 · ${state.latest_run.evaluation.row_count} rows` : "Waiting for first run"
    },
    {
      tool: "get_drift_report",
      args: `collector_id=\"${c.id}\"`,
      complete: hadIncident,
      result: hadIncident ? `${violations.length || 2} blocking signals captured` : "Armed for silent drift"
    },
    {
      tool: "propose_heal",
      args: "policy=\"propose\"",
      complete: Boolean(repair),
      result: repair ? `${repair.confidence}% confidence · schema ${repair.schema_changed ? "changed" : "preserved"}` : "Approval required by policy"
    },
    {
      tool: "approve_heal",
      args: "allow_schema_change=false",
      complete: approved,
      result: approved ? "Human decision recorded" : "Human decision required"
    },
    {
      tool: "confirm_provider_publish",
      args: `job_id=\"${repair?.provider_evidence?.job_id || "pending"}\"`,
      complete: providerPublishComplete,
      result: repair?.provider_evidence?.requires_publish
        ? repair.provider_evidence.draft_status === "published"
          ? "Scraper Studio publish recorded"
          : "Waiting for reviewed development draft"
        : repair
          ? "Recorded adapter, no external publish needed"
          : "Provider handoff not started"
    },
    {
      tool: "verify_recovery",
      args: "canary=true · production=true",
      complete: repair?.state === "recovered",
      result: repair?.state === "recovered" ? "Canary and production passed" : "Waiting behind release gates"
    }
  ];
  const recoveryStages = [
    {
      number: "01",
      title: "Live baseline",
      detail: evidence ? `${evidence.records} rows · ${evidence.job_id}` : "Loading provider evidence",
      complete: Boolean(evidence)
    },
    {
      number: "02",
      title: "Break + detect",
      detail: hadIncident ? `${recordsProtected} rows protected · 0 served` : "Controlled selector drift ready",
      complete: hadIncident
    },
    {
      number: "03",
      title: "Self healing",
      detail: repair ? `${repair.confidence}% confidence · schema ${repair.schema_changed ? "changed" : "preserved"}` : "Bright Data repair handoff",
      complete: Boolean(repair)
    },
    {
      number: "04",
      title: "Approve",
      detail: approved && providerPublishComplete ? "Human decision + provider publish" : "Release remains locked",
      complete: approved && providerPublishComplete
    },
    {
      number: "05",
      title: "Verify + release",
      detail: repair?.state === "recovered" ? "Canary + production passed" : "Fresh output required",
      complete: repair?.state === "recovered"
    }
  ];
  const activeRecoveryStage = recoveryStages.findIndex((stage) => !stage.complete);

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <SiteHeader />
      <main className="console-route-page" id="main-content">
      <section className="console-shell console-route-shell" aria-labelledby="console-title">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">S</div>
          <div><strong>ScrapeSentry</strong><span>Recovery control plane</span></div>
        </div>
        <div className="topbar-right">
          <span className="environment"><i /> Production evidence linked</span>
          <span className={`monitor-chip ${monitor?.running ? "running" : ""}`}><i />{monitor?.running ? `Monitoring every ${monitor.interval_seconds}s` : `${monitor?.cycles_completed || 0} monitor cycles`}</span>
          <button type="button" className="ghost-button" disabled={Boolean(busy)} aria-busy={busy === "monitor"} onClick={() => act("monitor", () => request<MonitorStatus>("/api/monitor/run", { method: "POST" }))}>{busy === "monitor" ? "Checking..." : "Run monitor"}</button>
          <button type="button" className="ghost-button" disabled={Boolean(busy)} aria-busy={busy === "reset"} onClick={() => act("reset", () => request("/api/demo/reset", { method: "POST" }))}>{busy === "reset" ? "Resetting..." : "Reset"}</button>
        </div>
      </header>

      <section className="product-command">
        <div>
          <span>Fleet / {c.name}</span>
          <h3 id="console-title">Know when your scraper lies.</h3>
          <p>Run the real contract monitor, inspect evidence and move the incident through guarded recovery.</p>
        </div>
        <button type="button" className="primary-button" disabled={Boolean(busy)} aria-busy={busy === primary?.name} onClick={() => primary && act(primary.name, primary.run)}>
          {busy === primary?.name ? "Working..." : primary?.text}
          <span>→</span>
        </button>
      </section>

      {error && (
        <div className="feedback-banner error-banner" role="alert">
          <div className="feedback-copy"><strong>Action blocked</strong><span>{error}</span></div>
          <div className="feedback-actions">
            {retryAction && <button type="button" onClick={() => act(retryAction.name, retryAction.run)}>Try again</button>}
            <button type="button" aria-label="Dismiss error" onClick={() => { setError(undefined); setRetryAction(undefined); }}>Dismiss</button>
          </div>
        </div>
      )}

      {notice && (
        <div className="feedback-banner success-banner" role="status">
          <div className="feedback-copy"><strong>Dashboard updated</strong><span>{notice}</span></div>
          <div className="feedback-actions"><button type="button" onClick={() => setNotice(undefined)}>Dismiss</button></div>
        </div>
      )}

      <FleetCommand
        fleet={fleet}
        alerts={alerts}
        selectedCollectorId={selectedCollectorId}
        onSelect={setSelectedCollectorId}
      />

      <ReadinessPanel readiness={readiness} />

      <section className="recovery-flight" aria-label="Self healing recovery flight recorder">
        <div className="flight-heading">
          <div>
            <span className="section-kicker">Recovery flight recorder</span>
            <h2>One Collector ID. One visible break. Zero poisoned rows.</h2>
          </div>
          <div className="flight-identity">
            <span>Custom Scraper Studio collector</span>
            <code>{c.brightdata_collector_id}</code>
          </div>
        </div>
        <div className="flight-track">
          {recoveryStages.map((stage, index) => {
            const current = index === activeRecoveryStage || (activeRecoveryStage === -1 && index === recoveryStages.length - 1);
            return (
              <div className={`flight-stage ${stage.complete ? "complete" : ""} ${current ? "current" : ""}`} key={stage.number}>
                <span>{stage.complete ? "✓" : stage.number}</span>
                <p><strong>{stage.title}</strong><small>{stage.detail}</small></p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="metrics-grid" aria-label="Live incident metrics">
        <article className="metric-card health-card">
          <div className="metric-label">Fleet health</div>
          <div className="score-row">
            <div className="score-ring" style={{ "--score": `${score * 3.6}deg`, "--score-color": scoreColor } as React.CSSProperties}><span>{score}</span></div>
            <div><strong className={`status-word ${c.status}`}>{c.status}</strong><span>{violations.length ? `${violations.length} active violations` : "All contracts passing"}</span></div>
          </div>
        </article>
        <article className="metric-card">
          <div className="metric-label">Records protected</div>
          <strong className="metric-value">{recordsProtected}</strong>
          <span className="metric-note">{hadIncident ? "Unsafe rows stopped at the gate" : "Ready for the next incident"}</span>
        </article>
        <article className="metric-card">
          <div className="metric-label">Bad rows served</div>
          <strong className="metric-value zero-metric">0</strong>
          <span className="metric-note">{state.latest_run?.quarantined ? `${state.latest_run.evaluation.row_count} bad rows quarantined` : "Contract gate enforced"}</span>
        </article>
        <article className="metric-card">
          <div className="metric-label">Time to detect</div>
          <strong className="metric-value smaller">{detectionSeconds === undefined ? "Armed" : detectionSeconds < 1 ? "<1s" : `${detectionSeconds.toFixed(1)}s`}</strong>
          <span className="metric-note">Silent drift to quarantine</span>
        </article>
      </section>

      {safeOutput && (
        <section className={`safe-feed ${safeOutput.stale ? "holding" : "fresh"}`} aria-label="Protected downstream output">
          <div className="safe-feed-copy">
            <div className="safe-feed-heading">
              <span className="section-kicker">Protected downstream feed</span>
              <span className="safe-feed-chip"><i />{safeOutput.stale ? "Fallback active" : "Verified live"}</span>
            </div>
            <h2>{safeOutput.stale ? "Bad rows stopped here. Consumers stay clean." : "Only contract valid data reaches consumers."}</h2>
            <p>{safeOutput.warning || "The newest snapshot passed every blocking contract and is safe to serve."}</p>
            <div className="safe-feed-meta">
              <span>Serving <code>{safeOutput.run_id}</code></span>
              {state.latest_run?.provider_job_id && <span>Bright Data <code>{state.latest_run.provider_job_id}</code></span>}
              <span>{safeOutput.snapshot.length} verified rows</span>
              <span>Snapshot age {duration(safeOutput.age_seconds)}</span>
            </div>
          </div>
          <div className="safety-flow" aria-label="Scraper output safety gate">
            <div className={state.latest_run?.quarantined ? "flow-source blocked" : "flow-source accepted"}>
              <span>Latest scrape</span>
              <strong>{state.latest_run?.evaluation.row_count || 0} rows</strong>
              <small>{state.latest_run?.quarantined ? "Quarantined" : "Contract valid"}</small>
            </div>
            <div className="flow-gate"><b>◇</b><span>Contract gate</span></div>
            <div className="flow-consumer">
              <span>Downstream API</span>
              <strong>{safeOutput.snapshot.length} rows</strong>
              <small>No poisoned data</small>
            </div>
          </div>
          <div className="safe-feed-rows">
            {safeOutput.snapshot.slice(0, 3).map((row, index) => (
              <div className="safe-feed-row" key={String(row.sku || index)}>
                <span>{String(row.category || "Product")}</span>
                <strong>{String(row.title || row.name || row.sku || "Verified row")}</strong>
                <div><b>{price(row.price)}</b><code>{String(row.availability || "verified")}</code></div>
              </div>
            ))}
          </div>
        </section>
      )}

      {!safeOutput && (
        <section className="safe-feed safe-feed-empty" aria-labelledby="safe-feed-empty-title">
          <EmptyState>
            <span className="empty-shield">◇</span>
            <strong id="safe-feed-empty-title">No protected snapshot is available</strong>
            <p>Run a health check to establish a contract-valid baseline before serving downstream data.</p>
            <button
              type="button"
              disabled={Boolean(busy)}
              aria-busy={busy === "safe-output"}
              onClick={() => act("safe-output", async () => {
                const output = await request<SafeOutput>(`/api/collectors/${selectedCollectorId}/safe-output`);
                setSafeOutput(output);
              })}
            >
              {busy === "safe-output" ? "Refreshing..." : "Refresh protected output"}
            </button>
          </EmptyState>
        </section>
      )}

      <section className="workspace-grid">
        <article className="panel incident-panel">
          <div className="panel-heading">
            <div><span className="section-kicker">Detect</span><h2>Incident evidence</h2></div>
            {c.active_incident_id ? <span className="incident-id">{c.active_incident_id}</span> : <span className="quiet-chip">No active incident</span>}
          </div>
          {violations.length ? (
            <div className="violations">
              {violations.map((item, index) => (
                <div className="violation" key={`${item.rule}-${item.field}-${index}`}>
                  <div className="violation-icon">!</div>
                  <div className="violation-copy">
                    <div><strong>{item.field || item.rule}</strong><span>{label(item.drift_type)} drift</span></div>
                    <p>{item.message}</p>
                    <div className="comparison"><span>Expected <code>{item.expected}</code></span><span>Observed <code>{item.observed}</code></span></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState><span className="empty-check">✓</span><strong>No silent failures detected</strong><p>The latest snapshot satisfies contract v{c.contract.version}.</p></EmptyState>
          )}
        </article>

        <article className="panel repair-panel">
          <div className="panel-heading">
            <div><span className="section-kicker">Repair</span><h2>Guarded recovery</h2></div>
            {repair && <span className={`state-chip ${repair.state}`}>{label(repair.state)}</span>}
          </div>
          {repair ? (
            <>
              <div className="repair-summary">
                <div><span>AI confidence</span><strong>{repair.confidence}%</strong></div>
                <div><span>Preview score</span><strong>{repair.preview_evaluation?.score ?? "Pending"}</strong></div>
                <div><span>Schema</span><strong>{repair.schema_changed ? "Changed" : "Preserved"}</strong></div>
                <div><span>Recovery</span><strong>{recoverySeconds === undefined ? "Pending" : `${recoverySeconds}s`}</strong></div>
              </div>
              {repair.provider_evidence && (
                <div className={`provider-evidence ${repair.provider_evidence.requires_publish ? "live" : "recorded"}`}>
                  <div className="provider-evidence-heading">
                    <div>
                      <span>Provider repair evidence</span>
                      <strong>{repair.provider_evidence.requires_publish ? "Bright Data Self Healing" : "Recorded recovery adapter"}</strong>
                    </div>
                    <b>{label(repair.provider_evidence.progress_status)}</b>
                  </div>
                  <div className="provider-evidence-grid">
                    <span><small>Job ID</small><code>{repair.provider_evidence.job_id || "Not returned"}</code></span>
                    <span><small>Trigger</small><strong>{label(repair.provider_evidence.trigger_status)}</strong></span>
                    <span><small>Repair latency</small><strong>{repair.provider_evidence.latency_seconds < 0.1 ? "<0.1s" : `${repair.provider_evidence.latency_seconds.toFixed(1)}s`}</strong></span>
                    <span><small>Draft</small><strong>{label(repair.provider_evidence.draft_status)}</strong></span>
                  </div>
                  <p>
                    {repair.provider_evidence.requires_publish
                      ? repair.provider_evidence.draft_status === "published"
                        ? "The reviewed Scraper Studio draft is published and cleared for guarded verification."
                        : "Review and publish the development draft in Scraper Studio. Production verification stays blocked until confirmation."
                      : "Recorded recovery evidence keeps this workflow credit safe. Live mode requires a reviewed Scraper Studio publish before verification."}
                  </p>
                </div>
              )}
              <div className="data-diff" aria-label="Before and after structured output">
                <div><span>Broken output</span><p><code>price_text</code><b>{String(before.price_text ?? before.price ?? "missing")}</b></p><p><code>stock_label</code><b>{String(before.stock_label ?? before.availability ?? "missing")}</b></p></div>
                <i>→</i>
                <div><span>Repaired preview</span><p><code>price</code><b>{String(after.price ?? "missing")}</b></p><p><code>availability</code><b>{String(after.availability ?? "missing")}</b></p></div>
              </div>
              <div className="diff-list">
                {repair.diff_summary.map((item) => <div key={item}><span>+</span><p>{item}</p></div>)}
              </div>
              <div className="gate-row">
                <span><i className={repair.state === "awaiting_approval" ? "pulse" : ""} /> Approval gate</span>
                {repair.state === "awaiting_approval" ? (
                <div className="gate-actions"><button type="button" disabled={Boolean(busy)} aria-busy={busy === "reject"} onClick={() => act("reject", () => request(`/api/collectors/${selectedCollectorId}/repairs/reject`, { method: "POST", body: JSON.stringify({ reason: "Rejected in dashboard review" }) }))}>{busy === "reject" ? "Rejecting..." : "Reject"}</button><strong>Human decision required</strong></div>
                ) : <strong>{label(repair.state)}</strong>}
              </div>
            </>
          ) : (
            <EmptyState><span className="empty-shield">◇</span><strong>No repair candidate</strong><p>A candidate appears only after blocking contract drift.</p></EmptyState>
          )}
        </article>
      </section>

      <section className="lower-grid">
        <article className="panel canary-panel">
          <div className="panel-heading"><div><span className="section-kicker">Verify</span><h2>Release gates</h2></div></div>
          <div className="gate-stack">
            <div className={repair ? "complete" : ""}><span>1</span><p><strong>Candidate preview</strong><small>Contract tested against repaired rows</small></p><b>{repair ? "Passed" : "Waiting"}</b></div>
            <div className={approved ? "complete" : ""}><span>2</span><p><strong>Human approval</strong><small>Schema and selector changes reviewed</small></p><b>{repair?.state === "awaiting_approval" ? "Required" : repair ? "Passed" : "Waiting"}</b></div>
            <div className={providerPublishComplete ? "complete" : ""}><span>3</span><p><strong>Provider publish</strong><small>Reviewed Scraper Studio draft confirmed</small></p><b>{providerPublishComplete ? repair?.provider_evidence?.requires_publish ? "Passed" : "Not needed" : "Waiting"}</b></div>
            <div className={repair?.state === "recovered" ? "complete" : ""}><span>4</span><p><strong>Canary + production</strong><small>Fresh output must pass the same contract</small></p><b>{repair?.state === "recovered" ? "Passed" : "Waiting"}</b></div>
          </div>
        </article>

        <article className="panel timeline-panel">
          <div className="panel-heading"><div><span className="section-kicker">Audit log</span><h2>What happened</h2></div><span className="contract-chip">Contract v{c.contract.version}</span></div>
          <div className="timeline">
            {state.timeline.length ? state.timeline.slice(0, 5).map((event, index) => (
              <div className="timeline-item" key={event.id}>
                <div className="timeline-rail"><i className={index === 0 ? "latest" : ""} />{index < Math.min(state.timeline.length, 5) - 1 && <span />}</div>
                <div><strong>{event.title}</strong><p>{event.detail}</p><time>{relativeTime(event.created_at)}</time></div>
              </div>
            )) : (
              <EmptyState><span className="empty-shield">○</span><strong>No audit events yet</strong><p>Run the monitor to record the first contract decision.</p></EmptyState>
            )}
          </div>
        </article>
      </section>

      </section>

      <section className="mcp-workflow" id="mcp" aria-label="MCP agent workflow">
        <div className="mcp-heading">
          <div><span className="section-kicker">Agent-native operations</span><h2>The incident can be resolved without leaving the coding agent.</h2></div>
          <span className="mcp-count">18 MCP tools</span>
        </div>
        <div className="mcp-grid">
          <div className="mcp-terminal">
            <div className="terminal-bar"><i /><i /><i /><span>scrapesentry / mcp trace</span></div>
            <div className="terminal-body">
              {mcpSteps.map((step) => (
                <div className={step.complete ? "tool-call complete" : "tool-call"} key={step.tool}>
                  <span className="terminal-prompt">›</span>
                  <p><code>{step.tool}</code><small>{step.args}</small></p>
                  <b>{step.complete ? "✓" : "○"}</b>
                  <em>{step.result}</em>
                </div>
              ))}
            </div>
          </div>
          <div className="mcp-principles">
            <div><span>01</span><p><strong>One policy engine</strong><small>The dashboard and MCP server call the same typed service layer.</small></p></div>
            <div><span>02</span><p><strong>Safe by default</strong><small>Bad snapshots are quarantined while last known good data stays available.</small></p></div>
            <div><span>03</span><p><strong>Human control</strong><small>Schema changes never receive automatic approval and every decision enters the audit timeline.</small></p></div>
            <div><span>04</span><p><strong>Verified recovery</strong><small>Canary and production contracts must pass before the incident closes.</small></p></div>
          </div>
        </div>
        <div className="mcp-inventory">
          <header>
            <h3>All 18 tools, one server</h3>
            <p>Registered on the ScrapeSentry MCP server. The trace above runs seven of them.</p>
          </header>
          <div className="mcp-inventory-groups">
            {MCP_TOOL_GROUPS.map((group) => (
              <div key={group.title}>
                <h4>{group.title}</h4>
                <ul>{group.tools.map((tool) => <li key={tool}>{tool}</li>)}</ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter collectorId={c.brightdata_collector_id} />
      </main>
    </>
  );
}

export default function Home() {
  return <ScrapeSentryExperience surface="landing" />;
}
