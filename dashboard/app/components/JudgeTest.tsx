"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle,
  Database,
  Flask,
  LockKey,
  Play,
  ShieldCheck,
  WarningOctagon
} from "@phosphor-icons/react";
import { DashboardState, MonitorStatus, SafeOutput, request } from "../../lib/api";

const COLLECTOR_ID = "books-to-scrape";

type ScenarioId = "broken" | "quality" | "semantic" | "partial";

type Scenario = {
  id: ScenarioId;
  index: string;
  name: string;
  shortName: string;
  summary: string;
  signals: string[];
  sample: string;
  inputRows: number;
  guard: string;
};

type JudgeOutcome = {
  dashboard: DashboardState;
  safeOutput: SafeOutput;
  monitor: MonitorStatus;
  detectionSeconds?: number;
};

const SCENARIOS: Scenario[] = [
  {
    id: "broken",
    index: "01",
    name: "Selector drift",
    shortName: "selector drift",
    summary: "The source renames price and availability, while transport still returns 200.",
    signals: ["required fields", "schema shape"],
    sample: "price → price_text / availability → stock_label",
    inputRows: 12,
    guard: "Required fields must exist on every row."
  },
  {
    id: "quality",
    index: "02",
    name: "Quality collapse",
    shortName: "quality collapse",
    summary: "Prices become null and two products resolve to the same stable identity.",
    signals: ["null rate", "uniqueness"],
    sample: "price: null / duplicate sku + url",
    inputRows: 12,
    guard: "Null rate stays at 0% and identities stay unique."
  },
  {
    id: "semantic",
    index: "03",
    name: "Semantic corruption",
    shortName: "semantic corruption",
    summary: "Fields exist and keep their types, but the values become impossible.",
    signals: ["allowed values", "numeric range"],
    sample: 'availability: "coming_soon" / price: -99',
    inputRows: 12,
    guard: "Availability and price must stay inside allowed ranges."
  },
  {
    id: "partial",
    index: "04",
    name: "Partial crawl",
    shortName: "partial crawl",
    summary: "Every returned row is valid, but pagination stops after only four products.",
    signals: ["row count", "completeness"],
    sample: "expected: 12 rows / observed: 4 rows",
    inputRows: 4,
    guard: "The snapshot must contain exactly 12 product rows."
  }
];

function eventTime(state: DashboardState, kind: string) {
  return state.timeline.find((item) => item.kind === kind)?.created_at;
}

export function JudgeTest() {
  const [selected, setSelected] = useState<ScenarioId>("broken");
  const [status, setStatus] = useState<"idle" | "running" | "blocked" | "error">("idle");
  const [outcome, setOutcome] = useState<JudgeOutcome>();
  const [error, setError] = useState<string>();
  const reducedMotion = useReducedMotion();

  const scenario = useMemo(
    () => SCENARIOS.find((item) => item.id === selected) || SCENARIOS[0],
    [selected]
  );

  async function runScenario() {
    setStatus("running");
    setOutcome(undefined);
    setError(undefined);
    try {
      await request<DashboardState>("/api/demo/reset", { method: "POST" });
      await request("/api/demo/layout", {
        method: "POST",
        body: JSON.stringify({ layout: scenario.id })
      });
      const monitor = await request<MonitorStatus>("/api/monitor/run", { method: "POST" });
      const [dashboard, safeOutput] = await Promise.all([
        request<DashboardState>(`/api/collectors/${COLLECTOR_ID}/dashboard`),
        request<SafeOutput>(`/api/collectors/${COLLECTOR_ID}/safe-output`)
      ]);

      if (!dashboard.latest_run?.quarantined || !safeOutput.stale) {
        throw new Error("The policy engine did not quarantine the selected failure.");
      }

      const changedAt = eventTime(dashboard, "demo_layout_changed");
      const detectedAt = eventTime(dashboard, "snapshot_quarantined");
      const detectionSeconds = changedAt && detectedAt
        ? Math.max(0, (new Date(detectedAt).getTime() - new Date(changedAt).getTime()) / 1000)
        : undefined;
      setOutcome({ dashboard, safeOutput, monitor, detectionSeconds });
      setStatus("blocked");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The failure test could not complete.");
      setStatus("error");
    }
  }

  async function restoreBaseline() {
    setError(undefined);
    try {
      await request<DashboardState>("/api/demo/reset", { method: "POST" });
      setOutcome(undefined);
      setStatus("idle");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The baseline could not be restored.");
      setStatus("error");
    }
  }

  const violations = outcome?.dashboard.latest_run?.evaluation.violations || [];
  const score = outcome?.dashboard.latest_run?.evaluation.score;
  const protectedRows = outcome?.safeOutput.snapshot.length || 12;

  return (
    <section className="judge-lab" id="failure-lab" aria-labelledby="failure-lab-title">
      <motion.header
        className="judge-lab-heading"
        initial={reducedMotion ? false : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.55 }}
      >
        <div>
          <span className="section-index">Live failure lab · credit safe</span>
          <h2 id="failure-lab-title">Break it four different ways.</h2>
        </div>
        <p>Choose a real failure. ScrapeSentry will run the deployed Python contract engine, quarantine the unsafe snapshot and keep verified rows available. No provider credits are spent.</p>
      </motion.header>

      <div className="judge-lab-grid">
        <fieldset className="judge-scenarios">
          <legend>Failure library</legend>
          {SCENARIOS.map((item) => (
            <label className={selected === item.id ? "judge-scenario selected" : "judge-scenario"} key={item.id}>
              <input
                type="radio"
                name="judge-scenario"
                value={item.id}
                checked={selected === item.id}
                onChange={() => {
                  setSelected(item.id);
                  setOutcome(undefined);
                  setStatus("idle");
                  setError(undefined);
                }}
              />
              <span className="judge-scenario-index">{item.index}</span>
              <span className="judge-scenario-copy">
                <strong>{item.name}</strong>
                <code>{item.sample}</code>
                <span>{item.signals.map((signal) => <i key={signal}>{signal}</i>)}</span>
              </span>
              <span className="judge-radio" aria-hidden="true"><i /></span>
            </label>
          ))}
        </fieldset>

        <motion.div
          className={`judge-instrument judge-${status}`}
          key={`${selected}-${status}`}
          initial={reducedMotion ? false : { opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
          aria-live="polite"
        >
          <header className="judge-instrument-head">
            <span><Flask size={16} weight="regular" /> Test bench / {scenario.index}</span>
            <span className="judge-provider-dot"><i /> Recorded Bright Data evidence</span>
          </header>

          <div className="judge-machine-flow">
            <article className="judge-node judge-source-node">
              <span>Incoming snapshot</span>
              <Database size={24} weight="regular" />
              <strong>{outcome?.dashboard.latest_run?.evaluation.row_count ?? scenario.inputRows} rows</strong>
              <code>HTTP 200</code>
            </article>

            <div className="judge-flow-line" aria-hidden="true"><i /></div>

            <div className="judge-gate">
              <Image src="/product/contract-gate-v2.png" alt="" width={957} height={1643} />
              <span>
                {status === "running" ? <Flask size={17} /> : status === "blocked" ? <WarningOctagon size={17} /> : <ShieldCheck size={17} />}
                <strong>{status === "running" ? "Scanning" : status === "blocked" ? "Blocked" : "Armed"}</strong>
                <small>contract v1</small>
              </span>
              {status === "running" && <i className="judge-scan-beam" />}
            </div>

            <div className="judge-flow-line judge-flow-line-out" aria-hidden="true"><i /></div>

            <article className="judge-node judge-output-node">
              <span>Protected feed</span>
              <LockKey size={24} weight="regular" />
              <strong>{status === "blocked" ? `${protectedRows} safe` : "Ready"}</strong>
              <code>{status === "blocked" ? "0 unsafe served" : "last known good"}</code>
            </article>
          </div>

          {status !== "blocked" && (
            <div className="judge-idle-panel">
              <div>
                <span>Selected failure</span>
                <strong>{scenario.name}</strong>
                <p>{scenario.summary}</p>
                <p className="judge-guard"><ShieldCheck size={14} /> {scenario.guard}</p>
              </div>
              <button type="button" onClick={runScenario} disabled={status === "running"}>
                {status === "running" ? <Flask size={17} /> : <Play size={17} weight="fill" />}
                {status === "running" ? "Running contract engine" : `Run ${scenario.shortName}`}
              </button>
            </div>
          )}

          {status === "blocked" && outcome && (
            <motion.div
              className="judge-verdict"
              initial={reducedMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="judge-verdict-summary">
                <span><WarningOctagon size={19} weight="fill" /> Contract failed</span>
                <strong>{score}<small>/100</small></strong>
                <p>{violations.length} blocking signal{violations.length === 1 ? "" : "s"} found · detected in {outcome.detectionSeconds?.toFixed(3) || "0.000"}s</p>
              </div>
              <div className="judge-violations">
                {violations.slice(0, 4).map((violation, index) => (
                  <div key={`${violation.rule}-${violation.field}-${index}`}>
                    <span>0{index + 1}</span>
                    <p><strong>{violation.field || violation.rule}</strong><small>{violation.message}</small></p>
                    <code>{violation.rule}</code>
                  </div>
                ))}
              </div>
              <div className="judge-protection-receipt">
                <CheckCircle size={20} weight="fill" />
                <p><strong>{protectedRows} verified rows stayed live</strong><small>The failed snapshot is quarantined. Consumers receive the last known good output.</small></p>
                <span>0 unsafe</span>
              </div>
              <div className="judge-verdict-actions">
                <a href="/console">Open incident in console <ArrowRight size={16} weight="bold" /></a>
                <button type="button" onClick={restoreBaseline}>Restore baseline</button>
              </div>
            </motion.div>
          )}

          {error && <p className="judge-error"><WarningOctagon size={16} /> {error}</p>}

          <footer className="judge-instrument-foot">
            <span><i /> Deployed API</span>
            <span>Real contract rules</span>
            <span>Deterministic replay</span>
          </footer>
        </motion.div>
      </div>
    </section>
  );
}
