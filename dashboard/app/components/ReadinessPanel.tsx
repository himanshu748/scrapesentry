import { SystemReadiness } from "../../lib/api";

function words(value: string) {
  if (value === "judge_ready") return "recovery ready";
  return value.replaceAll("_", " ");
}

export function ReadinessPanel({ readiness }: { readiness?: SystemReadiness }) {
  if (!readiness) return null;

  const missing = readiness.checks.filter((check) => check.status === "missing").length;
  const headline = readiness.production_ready
    ? "Every production boundary is active."
    : readiness.judge_ready
      ? "The recovery path is complete. Production status stays honest."
      : "The engine is running, but deployment controls are incomplete.";

  return (
    <section className={`system-readiness ${readiness.status}`} aria-labelledby="readiness-title">
      <div className="readiness-heading">
        <div>
          <span className="section-kicker">System readiness</span>
          <h2 id="readiness-title">{headline}</h2>
          <p>
            {readiness.production_ready
              ? "Live provider access, durable history and the operator boundary are configured."
              : readiness.judge_ready
                ? "Recorded production evidence powers a complete credit safe workflow. Live deployment requirements remain visible below."
                : `${missing} required control${missing === 1 ? " is" : "s are"} still missing.`}
          </p>
        </div>
        <div className="readiness-verdict">
          <i />
          <span>{words(readiness.status)}</span>
          <small>{readiness.mode === "demo" ? "recorded evidence" : `${readiness.mode} mode`}</small>
        </div>
      </div>

      <div className="readiness-track" aria-label="Deployment readiness checks" tabIndex={0}>
        {readiness.checks.map((check, index) => (
          <div className={`readiness-check ${check.status}`} key={check.id}>
            <span>{check.status === "ready" ? "✓" : check.status === "missing" ? "!" : String(index + 1).padStart(2, "0")}</span>
            <p><strong>{check.label}</strong><small>{check.detail}</small></p>
            <b>{check.status}</b>
          </div>
        ))}
      </div>

      {readiness.blockers.length > 0 && (
        <div className="readiness-blockers">
          <span>Production checklist</span>
          <p>{readiness.blockers.join(" ")}</p>
        </div>
      )}
    </section>
  );
}
