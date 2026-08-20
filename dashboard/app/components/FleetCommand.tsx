import { AlertStatus, FleetSummary } from "../../lib/api";

function minutes(seconds: number) {
  if (seconds < 60) return "<1m";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export function FleetCommand({
  fleet,
  alerts,
  selectedCollectorId,
  onSelect
}: {
  fleet?: FleetSummary;
  alerts?: AlertStatus;
  selectedCollectorId: string;
  onSelect: (collectorId: string) => void;
}) {
  if (!fleet) return null;
  const budgetUsed = fleet.failure_budget_seconds
    ? Math.min(100, (fleet.incident_seconds / fleet.failure_budget_seconds) * 100)
    : 0;

  return (
    <section className="fleet-command" aria-labelledby="fleet-title">
      <div className="fleet-command-heading">
        <div>
          <span className="section-kicker">Fleet command</span>
          <h2 id="fleet-title">Every registered collector, one operating picture.</h2>
        </div>
        <label>
          <span>Inspect collector</span>
          <select
            value={selectedCollectorId}
            onChange={(event) => onSelect(event.target.value)}
          >
            {fleet.collectors.map((collector) => (
              <option value={collector.id} key={collector.id}>{collector.name}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="fleet-scoreboard" aria-label="Fleet health summary" tabIndex={0}>
        <div><span>Registered</span><strong>{fleet.total_collectors}</strong><small>real collector configuration{fleet.total_collectors === 1 ? "" : "s"}</small></div>
        <div><span>Fleet score</span><strong>{fleet.average_health_score.toFixed(1)}</strong><small>{fleet.healthy} healthy · {fleet.degraded} degraded</small></div>
        <div className={fleet.active_incidents ? "fleet-alert" : ""}><span>Open incidents</span><strong>{fleet.active_incidents}</strong><small>{fleet.broken} blocking contract{fleet.broken === 1 ? "" : "s"}</small></div>
        <div><span>Protected output</span><strong>{fleet.protected_records}</strong><small>last known good records</small></div>
      </div>

      <div className="fleet-register">
        <div className="fleet-register-head">
          <span>Collector</span><span>Owner</span><span>Environment</span><span>Health</span><span>Incident</span>
        </div>
        {fleet.collectors.map((collector) => (
          <button
            type="button"
            className={collector.id === selectedCollectorId ? "fleet-row selected" : "fleet-row"}
            key={collector.id}
            onClick={() => onSelect(collector.id)}
            aria-pressed={collector.id === selectedCollectorId}
          >
            <span><i className={`fleet-status ${collector.status}`} /><b>{collector.name}</b><code>{collector.brightdata_collector_id}</code></span>
            <span>{collector.owner}</span>
            <span>{collector.environment}</span>
            <span><b>{collector.health_score}/100</b><small>contract v{collector.contract_version}</small></span>
            <span>{collector.active_incident_id ? minutes(collector.incident_open_seconds) : "Clear"}</span>
          </button>
        ))}
      </div>

      <div className={`failure-budget ${fleet.failure_budget_state}`}>
        <div>
          <span>Failure budget</span>
          <strong>{minutes(fleet.failure_budget_remaining_seconds)} remaining</strong>
        </div>
        <div className="failure-budget-track" aria-label={`${budgetUsed.toFixed(0)}% of failure budget consumed`}>
          <i style={{ width: `${budgetUsed}%` }} />
        </div>
        <small>{minutes(fleet.incident_seconds)} consumed across active incidents</small>
      </div>

      <div className={alerts?.configured ? "alert-routing configured" : "alert-routing"}>
        <i />
        <div>
          <span>Signed incident routing</span>
          <strong>{alerts?.configured ? `Delivering to ${alerts.destination}` : "No operator destination configured"}</strong>
        </div>
        <p>New incidents and verified recoveries are deduplicated then signed with HMAC SHA256.</p>
        <b>{alerts?.last_delivery ? `${alerts.last_delivery.status} · ${alerts.last_delivery.kind.replaceAll("_", " ")}` : alerts?.configured ? "Awaiting first incident" : "Production ready"}</b>
      </div>
    </section>
  );
}
