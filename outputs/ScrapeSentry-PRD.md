# PRD: ScrapeSentry

> CI/CD for self-healing web scrapers: detect bad data, propose a repair, shadow-test it, approve it and recover without silently poisoning downstream systems.

## 1. Product thesis

Scrapers rarely fail cleanly. They often keep returning HTTP 200 responses while individual fields become null, malformed, duplicated, stale or semantically wrong. Downstream systems discover the damage later.

ScrapeSentry gives coding agents a safe control plane for Bright Data Scraper Studio collectors. It continuously validates their structured output against explicit data contracts, asks Bright Data's Self-Healing flow to propose repairs, tests candidates against canary inputs and exposes approval, verification, rollback and audit history through MCP.

The key distinction is safety: a red health score may initiate a repair proposal, but it does not silently deploy unverified scraper code.

## 2. Target user

Developers and data teams running recurring scraping pipelines who want their coding agent to own scraper reliability while preserving human control over production changes.

## 3. Core value proposition

- Detect failures before malformed data reaches production.
- Diagnose exactly which data-contract rules were violated.
- Turn the diagnosis into a specific Bright Data Self-Healing prompt.
- Shadow-test the proposed repair on canary URLs.
- Approve, reject, verify or roll back the change from any MCP-compatible coding agent.
- Serve the last known good output while a broken collector is quarantined.
- Preserve an auditable timeline of runs, drift, proposals, approvals and recovery.

## 4. Safe repair lifecycle

```text
healthy
  -> degraded | broken
  -> heal_proposed
  -> awaiting_approval
  -> shadow_verifying
  -> approved | rejected
  -> production_verifying
  -> recovered | failed
  -> rolled_back (when needed)
```

Policy modes:

- `observe`: detect and report only.
- `propose`: automatically request a repair preview, but require approval before deployment. This is the default.
- `guarded_auto`: approve only when every required canary contract passes, confidence exceeds a configured threshold and no output-schema change is detected.

Schema-changing repairs always require explicit approval.

## 5. Data contracts and health scoring

Each collector has a versioned contract:

- Required and optional fields.
- Field types and formats.
- Maximum null rate per field.
- Expected row-count range.
- Uniqueness rules and duplicate-rate thresholds.
- Numeric or categorical range constraints.
- Freshness and staleness limits.
- Cross-field predicates, such as `sale_price <= list_price`.
- Canary input URLs used for safe verification.
- Severity per rule: warning or blocking.

Every run produces:

- Numeric health score from 0–100.
- Status: green, yellow or red.
- Contract violations with expected and observed values.
- Drift classification: structural, quality, semantic, freshness or execution.
- Confidence and evidence samples.
- A generated repair prompt describing the affected fields and correct output.

Blocking violations quarantine the new output. Downstream clients receive the last known good snapshot plus a freshness warning until recovery succeeds.

## 6. MCP tools

| Tool | Purpose |
|---|---|
| `register_collector` | Register a custom Scraper Studio collector and its canary inputs. |
| `set_data_contract` | Create or update the collector's versioned validation contract. |
| `list_collectors` | List collectors, status, score, contract version and last run time. |
| `check_health` | Run or fetch a collector, evaluate its output, persist evidence and quarantine bad output. |
| `get_drift_report` | Return rule-level violations, evidence samples and generated repair guidance. |
| `propose_heal` | Start Bright Data Self-Healing with a specific prompt and return job state. |
| `get_heal_preview` | Return the proposed repair status, preview output, diff summary and schema-change warning. |
| `approve_heal` | Approve a candidate repair after policy or human review. |
| `reject_heal` | Discard a proposed repair without modifying production. |
| `verify_recovery` | Run canary and production verification and return before/after evidence. |
| `rollback_heal` | Restore the previous known-good scraper version when supported. |
| `get_run_history` | Return runs, scores, violations, repair events, approvals and recovery times. |
| `get_last_known_good` | Serve the most recent contract-valid structured output and its age. |

## 7. Dashboard

The dashboard is the trust and approval surface, not a separate manual workflow.

Required screens:

1. Fleet overview with collector status, score, last healthy run, recovery time and active incident.
2. Incident detail showing violated contracts and representative bad rows.
3. Repair review with before/after structured output, proposed code diff summary, schema-change warning and approve/reject controls.
4. Verification view showing canary results and confidence.
5. Timeline of detection, proposal, approval, deployment, verification and rollback events.

The visual state transition from red to verified green must be understandable without reading logs.

## 8. Architecture

- **MCP server:** Python and FastMCP.
- **API:** FastAPI endpoints for dashboard reads and approval actions.
- **Bright Data adapter:**
  - Collection API for triggering collectors and downloading structured snapshots.
  - AI Scraper Studio/Self-Healing flow for repair proposals.
  - Explicit support for the awaiting-approval state, preview result, approval/rejection, polling and production verification.
- **Contract engine:** Pure typed Python module with deterministic scoring.
- **Repair orchestrator:** Idempotent state machine with retry/backoff, timeouts and per-collector locking.
- **Storage:** Supabase/Postgres for collectors, contract versions, runs, violations, snapshots, repair jobs and audit events.
- **Dashboard:** Next.js with server-side data fetching or polling.
- **Scheduler:** Lightweight cron or worker that calls `check_health`; Bright Data remains responsible for scraping infrastructure.

All Bright Data calls live behind an adapter so contract tests can use recorded fixtures without consuming credits.

## 9. Safety and reliability requirements

- Never treat `awaiting_approval` as a failure.
- Never mutate production during `observe` or `propose` mode.
- Never auto-approve an output-schema change.
- Require an idempotency key for checks and repair commands.
- Lock each collector so overlapping checks cannot launch duplicate repairs.
- Redact API keys and sensitive headers from logs.
- Use bounded polling, timeouts and exponential backoff.
- Store evidence and decisions for every state transition.
- Clearly distinguish a failed run from a successful run containing bad data.
- Use only publicly available, non-login-protected, non-paywalled data for the hackathon demonstration.

## 10. Deterministic demo

Use a public demo storefront controlled by the team with two switchable layouts and the same semantic content.

1. Start with layout A. ScrapeSentry shows 12 contract-valid products and the downstream price feed is green.
2. Switch to layout B so price and availability move while the page still returns successfully.
3. The next check detects semantic and structural violations, quarantines the bad snapshot and keeps serving the last known good data.
4. A coding agent calls the MCP tools to inspect the evidence and start a targeted Self-Healing proposal.
5. Show Bright Data's preview and the ScrapeSentry before/after contract comparison.
6. Approve the candidate through MCP or the dashboard.
7. Run canary verification, deploy and verify production.
8. Show 12 valid rows again, a green status, the downstream graph continuing safely and the full audit timeline.

Report two memorable metrics:

- Time to detect.
- Time to verified recovery.

Use one or two additional real public collectors as supporting evidence, but keep the controlled layout change as the main live demo so it cannot fail unpredictably.

## 11. Hackathon judging strategy

The official six criteria are weighted equally and the demo is scored as strongly as the code.

| Criterion | What ScrapeSentry must demonstrate |
|---|---|
| Potential impact | Preventing bad scraper data from silently reaching production systems. |
| Creativity and innovation | Treating scraper repair like CI/CD: contracts, quarantine, shadow verification, approval and rollback. |
| Technical excellence | Complete typed implementation, deterministic tests, idempotent orchestration, clear errors and a maintainable repository. |
| Use of Scraper Studio | A custom collector, agent-driven runs, Self-Healing proposals, preview/approval and structured output powering the product. |
| Reliability and self-healing | Detection of website changes and data-quality failures followed by verified recovery. |
| Presentation | A concise story from broken page to protected downstream feed and verified green recovery. |

### Prize-specific targets

- **Web-Slinger / Best Use of Bright Data:** Make the custom Scraper Studio collector, coding-agent workflow, Self-Healing process and downstream structured output the center of the demo.
- **Suit-Up / Best UI:** Make repair evidence and approval feel finished, legible and safe. The iPad is awarded to every member of the winning team.
- **Spider-Sense / Best Clean Code:** Optimize for a repository a new maintainer can run on Monday: small modules, typed boundaries, tests, fixtures, migrations, setup docs and clear edge-case handling. The Keychron keyboard is awarded to every member of the winning team.
- **LinkedIn swag:** Share the build on LinkedIn and tag WeMakeDevs. The organizers state that ten participants receive a swag box.
- **X:** Useful for visibility, but no separate X-posting prize is listed.

Every eligible project is automatically considered for all three judged tracks.

## 12. Submission requirements

- Public source-code repository.
- Clear README.
- Example structured output.
- Demo video showing the working project.
- Clear explanation of how Bright Data Scraper Studio is used.
- Disclosure of AI coding-assistant usage.
- Repository and demo created primarily during the hackathon period.

## 13. Hackathon scope

### Must ship

- One custom Scraper Studio collector.
- Versioned data contracts.
- Deterministic green/yellow/red scoring.
- Quarantine and last-known-good behavior.
- Repair proposal, preview, explicit approval and post-deployment verification.
- MCP tools for the complete judge-visible workflow.
- Polished fleet and incident/repair dashboard.
- Recorded fixtures and unit/integration tests.
- Public demo deployment, README, example output and demo video.

### Stretch goals

- Guarded automatic approval.
- Rollback through the API or documented IDE version workflow.
- Webhook/Slack notifications.
- Multiple collector fleet analytics.

### Out of scope

- Billing and multi-tenant authentication.
- Scraping backends other than Bright Data.
- Long-term analytics beyond the incident timeline.
- General-purpose observability unrelated to scraper output.

## 14. Success criteria

- Detect the controlled break in one scheduled check.
- Generate a field-specific repair prompt with supporting evidence.
- Never publish the invalid snapshot downstream.
- Expose the repair preview and approval state correctly.
- Pass all blocking canary contracts before production verification.
- Restore valid output and record time to verified recovery.
- Complete the full demo flow in under 90 seconds.
- A new developer can run tests and understand the architecture from the README.

---

# Codex build prompt

```text
Build a production-quality hackathon MVP called "ScrapeSentry". It is CI/CD
for Bright Data Scraper Studio collectors: detect data-contract violations,
quarantine bad output, ask Bright Data Self-Healing to propose a repair,
shadow-test the candidate, require approval and verify recovery.

Stack:
- Python 3.12, FastMCP, FastAPI, Pydantic v2
- Supabase/Postgres persistence
- Next.js dashboard
- pytest with recorded Bright Data fixtures

Project structure:
- app/server.py                  FastMCP entrypoint
- app/api.py                     FastAPI dashboard API
- app/models.py                  typed domain models and state enums
- app/contracts.py               deterministic contract evaluation
- app/scoring.py                 green/yellow/red scoring and evidence
- app/brightdata_client.py       Bright Data Collection and AI Flow adapter
- app/heal_orchestrator.py       idempotent repair state machine
- app/repository.py              storage interface
- app/supabase_repository.py     Supabase implementation
- app/settings.py                environment configuration
- dashboard/                     Next.js trust and approval UI
- tests/fixtures/                recorded healthy, broken and repaired outputs
- tests/                         unit and workflow tests

Implement these MCP tools:
- register_collector
- set_data_contract
- list_collectors
- check_health
- get_drift_report
- propose_heal
- get_heal_preview
- approve_heal
- reject_heal
- verify_recovery
- rollback_heal
- get_run_history
- get_last_known_good

Contract rules must support required fields, type/format validation, null-rate
thresholds, row-count range, duplicate rate, uniqueness, numeric/categorical
ranges, freshness and simple cross-field predicates. Each evaluation returns
a 0-100 score, green/yellow/red status, typed violations and evidence samples.

Model the Bright Data repair lifecycle accurately. A heal may enter
awaiting_approval and return preview rows. Do not treat that as failure. Keep
observe, propose and guarded_auto policy modes. Default to propose. Never
auto-approve schema changes. Approval must be a separate operation, followed
by canary and production verification.

Use per-collector locks, idempotency keys, bounded polling, exponential
backoff, timeouts and safe error envelopes. Store every run, contract
evaluation, proposal, approval/rejection, verification and rollback in an
append-only audit timeline. Redact credentials from all output.

When a blocking contract fails, quarantine the new snapshot and serve the
last known good output with its age and a warning. Never silently forward bad
data.

Build a polished dashboard with:
1. Fleet overview.
2. Incident and contract-violation detail.
3. Before/after repair preview with approve/reject controls.
4. Canary verification results.
5. Full incident timeline.

Prioritize one end-to-end workflow over broad features. Provide a deterministic
demo storefront fixture with layout A and layout B, plus recorded API fixtures,
so the complete break -> diagnose -> propose -> preview -> approve -> verify ->
recover flow can be demonstrated without depending on a random third-party
site change.

Add:
- Supabase migrations
- .env.example
- Dockerfile or simple local run commands
- MCP client configs for Codex, Claude Code and Cursor
- architecture diagram in the README
- example structured outputs
- AI-assistant disclosure
- tests covering scoring, quarantine, idempotency, awaiting-approval handling,
  schema-change rejection, verification failure and successful recovery

Do not claim a repair is deployed until production verification passes. Keep
modules small, typed and easy for a judge to inspect.
```
