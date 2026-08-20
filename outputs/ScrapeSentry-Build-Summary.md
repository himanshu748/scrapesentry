# ScrapeSentry build summary

## Status

The local hackathon MVP is built and verified.

## What works

- FastMCP server with 18 lifecycle, fleet, alert and readiness tools
- FastAPI dashboard API with structured error envelopes
- deterministic contract evaluation for structure, quality, semantics and freshness
- green, yellow and red scoring with evidence samples
- quarantine plus last known good output retention
- safe-output endpoint with stale age and warning
- protected downstream feed panel showing the quarantine barrier, retained rows, snapshot age and safe-output warning
- judge scorecard with records protected, bad rows served, measured time to detect and verified recovery time
- correctly correlated layout-change audit events so incident timing belongs to the active collector
- Bright Data Collection API and Self-Healing API adapter
- live production smoke test: 12 records, 100/100 contract score and zero violations
- actual API collection `j_msyad7l21v1fnqbljn`: 12 records, 13 pages, 100% success and 12.3 seconds
- actual Self-Healing job `ia_msya56gd1y2ucwwy0j`: successful diff, 10 completed AI steps, one-row preview and published production Version 2
- post-repair production job `j_msyad7l21v1fnqbljn` verified Version 2 at 100/100 with zero violations
- JSON and NDJSON response parsing based on the observed live provider response
- real `pending_answer` handling plus approved draft acceptance through `resume_automation_job`
- typed provider repair evidence with job ID, trigger state, progress state, draft state and latency
- hard production-verification block until a live Scraper Studio draft is confirmed published
- demo adapter with healthy, broken and repaired recorded fixtures
- approval-gated repair state machine
- schema-change override protection
- canary and production verification
- idempotency, retries, timeouts and per-collector locks
- opt-in continuous monitoring with non-blocking collector checks, cycle telemetry and duplicate incident suppression
- Supabase PostgREST repository and migration
- polished Next.js dashboard with provider evidence, before/after values, approval, rejection, publish handoff, release gates, recovery timing and audit history
- verified Bright Data production artifact with 12 Books to Scrape records, 100% success and zero failed crawls
- production-evidence panel with collector ID, job ID, run statistics, schema, samples and SHA-256 fingerprint
- judge-facing MCP execution trace that follows detection, repair, approval, provider publish and verification
- 90-second recording script mapped to all six judging criteria
- Docker Compose startup with API readiness gating
- GitHub Actions checks for Ruff, pytest, TypeScript and the Next.js production build
- Dockerfiles, environment templates and MCP client configs
- server-only dashboard proxy with production operator authentication
- request correlation IDs, mutation throttling and explicit judge versus production readiness

## Verification results

- Backend: 39 tests passed
- Python: Ruff passed
- Dashboard: TypeScript passed
- Dashboard: Next.js production build passed
- MCP: 18 tools registered
- Browser: complete break to repair to approval to recovered flow passed
- Browser: protected feed changed from verified live to fallback active then back to verified live
- Browser console: zero errors after the completed flow
- Responsive browser: desktop and 360 px mobile passed with no horizontal overflow
- Dependency audit: zero production vulnerabilities

## Run

Terminal 1:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
uvicorn app.api:app --reload --port 8000
```

Terminal 2:

```bash
cd dashboard
npm install
npm run dev
```

Open `http://localhost:3000` then click:

1. Simulate selector drift
2. Generate repair
3. Approve repair
4. Run guarded verification

In live mode, step 4 becomes **Confirm draft published** until the reviewed Scraper Studio development draft is published. Guarded verification appears only after that confirmation.

## External steps still needed

These need the entrant's accounts or final submission decisions:

- configure a Bright Data API token for direct Collection API calls from a deployed backend
- add `BRIGHTDATA_API_TOKEN` to the deployment secret store without committing it
- apply the Supabase migration if persistent production storage is wanted
- deploy the API and dashboard publicly
- record the demo video
- create the public repository and submit its URL

The code does not claim that a live Bright Data draft is published automatically. Bright Data's documented workflow requires reviewing and publishing the development draft before production verification.
