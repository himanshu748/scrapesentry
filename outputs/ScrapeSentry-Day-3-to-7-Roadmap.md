# ScrapeSentry Day 3 to Day 7 roadmap

The goal is not to add random features. Each day removes one reason a judge could doubt the product.

## Day 3: A real monitor plus a real Bright Data repair, complete

Theme: ScrapeSentry watches collectors without waiting for a dashboard click.

- Continuous interval scheduler for every registered collector
- Non-blocking checks so Bright Data polling does not freeze the API
- Manual monitor cycle through FastAPI and MCP
- Cycle telemetry: checks, incidents, errors, last run and next run
- One active incident per collector with reconfirmation events instead of alert spam
- Dashboard monitor status and manual cycle control
- Safe reset that stops and restarts the monitor without leaking a background task
- Typed provider repair evidence with job ID, progress state and measured latency
- Explicit `ready_for_review` to `published` Scraper Studio handoff
- Hard block against live production verification before publish confirmation
- Provider evidence and publish state in the dashboard plus MCP trace
- Live API collection `j_msyad7l21v1fnqbljn` verified at 12 records and 100/100 contract health
- Live Self-Healing `ia_msya56gd1y2ucwwy0j` completed with a successful diff and preview then published production Version 2 after approval
- Post-repair production `j_msyad7l21v1fnqbljn` passed the complete contract at 100/100
- Provider-observed NDJSON parsing and `pending_answer` approval handling

Acceptance proof:

- Changing the demo layout then running the monitor creates one incident.
- Running it again reconfirms the same incident.
- The protected feed keeps serving 12 verified rows.
- All 39 tests, TypeScript and the production build pass.
- A simulated live-adapter boundary test proves verification fails before publish and succeeds after confirmation.

## Day 4: Fleet mode and alert routing

Theme: Replace the last simulated integration doubt with provider-visible proof.

- Add the Bright Data API token to the deployment secret store
- Monitor three collectors in one cycle
- Add severity, owner and environment filters
- Send signed webhook notifications for new incidents and verified recovery
- Tie alert deduplication to the active incident ID

Acceptance proof:

- Three collectors can be monitored in one cycle.
- Only a new incident sends an alert.
- Recovery sends one closing notification.
- ScrapeSentry never claims the draft was published automatically.
- The dashboard links provider evidence to the audit timeline.

## Day 5: Fleet mode and alert routing

Theme: Prove this is a product for data teams, not a single scripted collector.

- Fleet overview for multiple collectors
- Severity, owner and environment filters
- Signed webhook notifications for new incidents and verified recovery
- Alert deduplication tied to the active incident ID
- Failure budget and fleet health summary

Acceptance proof:

- Three collectors can be monitored in one cycle.
- Only a new incident sends an alert.
- Recovery sends one closing notification.

## Day 6: Production hardening and public deployment

Theme: Make the repository easy to trust and the demo easy to open.

- Deploy FastAPI, Next.js and Supabase
- Add public readiness checks and deployment documentation
- Run Ruff, pytest, TypeScript, the Next.js build and a secret scan in CI
- Add rate limits and request correlation IDs
- Verify all README commands in a clean environment

Acceptance proof:

- Public dashboard and API URLs load without local setup.
- CI is green on the public repository.
- No credential appears in browser code, logs or committed files.

## Day 7: Submission-grade story

Theme: Turn strong engineering into a result judges remember.

- Record the continuous 90-second red-to-green demo
- Show the live Bright Data run and Self-Healing evidence
- Use the three memorable metrics: 12 protected, 0 served and under one second to detect
- Finish the Devpost copy, architecture image and AI-assistance disclosure
- Publish the final X thread and LinkedIn recap

Acceptance proof:

- A stranger can understand the problem, intervention and recovery in 90 seconds.
- Every prize criterion maps to one visible moment.
- Repository, deployment, video and submission links are all public and verified.
