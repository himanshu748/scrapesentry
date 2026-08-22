import { CaretDown, CheckCircle, Database, Wrench } from "@phosphor-icons/react/dist/ssr";
import { SystemReadiness } from "../../lib/api";

export function ReadinessPanel({ readiness }: { readiness?: SystemReadiness }) {
  if (!readiness) return null;

  const checks = new Map(readiness.checks.map((check) => [check.id, check]));
  const demoReady = readiness.judge_ready || readiness.production_ready;
  const evidenceReady = checks.get("provider")?.status === "ready" && checks.get("evidence")?.status === "ready";
  const hardeningChecks = readiness.checks.filter((check) => check.status !== "ready");

  return (
    <section className={`system-readiness ${readiness.status}`} id="system-status" aria-labelledby="readiness-title">
      <div className="readiness-heading">
        <div>
          <span className="section-kicker">System status</span>
          <h2 id="readiness-title">{demoReady ? "Recovery is ready to test." : "Recovery needs configuration."}</h2>
          <p>{demoReady
            ? "Bright Data evidence is linked. Broken output is quarantined. Human-approved recovery passes canary and production verification."
            : "Connect production evidence before testing the guarded recovery path."}</p>
        </div>
        <div className="readiness-verdict">
          <i />
          <span>{demoReady ? "Ready to test" : "Setup required"}</span>
          <small>{readiness.mode === "demo" ? "Recorded production evidence" : `${readiness.mode} environment`}</small>
        </div>
      </div>

      <div className="readiness-summary" aria-label="Current product status">
        <article className={demoReady ? "verified" : "pending"}>
          <CheckCircle size={24} weight="fill" aria-hidden="true" />
          <span>Demo ready</span>
          <strong>{demoReady ? "Recovery loop verified" : "Evidence required"}</strong>
          <small>Detect, quarantine, repair, approve and release.</small>
        </article>
        <article className={evidenceReady ? "verified" : "pending"}>
          <Database size={24} weight="fill" aria-hidden="true" />
          <span>Bright Data verified</span>
          <strong>{evidenceReady ? "Real provider evidence linked" : "Provider evidence missing"}</strong>
          <small>Collector identity and production receipts stay visible.</small>
        </article>
        <article className={readiness.production_ready ? "verified" : "required"}>
          <Wrench size={24} weight="fill" aria-hidden="true" />
          <span>Hosted operations</span>
          <strong>{readiness.production_ready ? "Customer traffic ready" : "Required before customer traffic"}</strong>
          <small>Durable history, authentication and incident routing.</small>
        </article>
      </div>

      {(hardeningChecks.length > 0 || readiness.blockers.length > 0) && (
        <details className="deployment-disclosure">
          <summary>
            <span><strong>Hosted production controls</strong><small>Required before customer traffic</small></span>
            <CaretDown size={16} aria-hidden="true" />
          </summary>
          <div className="deployment-disclosure-body">
            <div>
              <h3>The recorded test workflow is complete.</h3>
              <p>These controls are still required for a durable, authenticated and continuously monitored hosted service. They do not block the current recorded test environment.</p>
            </div>
            <ul>
              {hardeningChecks.map((check) => (
                <li key={check.id}><strong>{check.label}</strong><span>{check.detail}</span></li>
              ))}
            </ul>
            <p className="deployment-credentials">Live customer traffic also requires server-side <code>BRIGHTDATA_API_TOKEN</code>, <code>OPERATOR_API_TOKEN</code> and <code>APP_ENV=production</code>.</p>
          </div>
        </details>
      )}
    </section>
  );
}
