# ScrapeSentry submission draft

## Project links

- Source code: https://github.com/himanshu748/scrapesentry
- Live demo: https://scrapesentry-himanshu748.onrender.com
- API health: https://scrapesentry-api-himanshu748.onrender.com/health
- CI: https://github.com/himanshu748/scrapesentry/actions/workflows/ci.yml
- Demo video: recording script is ready in `outputs/ScrapeSentry-90-Second-Demo.md`
- Bright Data target: https://books.toscrape.com/

## One-line pitch

ScrapeSentry is CI/CD for web scrapers: it detects silent data drift, quarantines unsafe rows, keeps the last known good feed online and releases a Bright Data Self-Healing repair only after human approval plus canary and production verification.

## The problem

A scraper can return HTTP 200 while selectors drift, required fields disappear and values silently change meaning. Conventional uptime monitoring misses this failure mode, so corrupt data can reach search, pricing, analytics and AI systems before anyone notices.

## The solution

ScrapeSentry treats every scraper output as a versioned data product with an executable contract. A failed contract opens one incident, quarantines the new snapshot and keeps the last known good rows available through a protected API. It then coordinates a guarded recovery flow:

1. Detect structural, semantic and cross-field drift.
2. Preserve evidence and quarantine every unsafe row.
3. Ask Bright Data Self-Healing for a targeted repair.
4. Validate the preview against the same contract.
5. Require explicit human approval for production release.
6. Run canary and fresh production checks before declaring recovery.

The FastAPI dashboard and 18-tool MCP server use the same typed policy engine, so operators and coding agents cannot bypass the safety gates.

## Verified Bright Data use

Scraper Studio is the production data plane, not a decorative integration.

- Custom collector: `c_msxcshnz2bwrroekf3`
- Successful production collection: `j_msyad7l21v1fnqbljn`
- Real Self-Healing job: `ia_msya56gd1y2ucwwy0j`
- Approved production version: Version 2
- Result: 12 structured records across 13 pages, 0 failed crawls and 100 percent success
- Runtime: 12.3 seconds
- Cost for the verified run: $0

The raw output and provider metadata are committed in `examples/`. The dashboard shows the collector ID, collection job ID, Self-Healing job ID, output schema and SHA-256 artifact fingerprint.

## Measured impact

In the repeatable judge scenario, ScrapeSentry detects the deliberate selector drift in under one second, protects 12 records and serves 0 bad rows. The downstream endpoint stays available by returning the last known good snapshot with an explicit freshness age and quarantine warning.

## What makes it different

Most scraper tools focus on extraction or automatic selector repair. ScrapeSentry focuses on safe release. A repair is treated like a production code change: evidence first, then preview validation, human approval, canary verification and production verification. Recovery is a proven state transition rather than an optimistic status message.

## How it was built

- Bright Data Scraper Studio Collection API and Self-Healing API
- Python, FastAPI, FastMCP and Pydantic
- Next.js and TypeScript operator dashboard
- Contract engine with required fields, type checks, null-rate checks, regex rules, enum rules and cross-field comparisons
- Idempotent commands and per-collector locks
- Optional Supabase audit persistence
- GitHub Actions CI plus an opt-in daily live collector contract check
- Render Blueprint for a two-service public deployment
- Server-only operator proxy with mutation authentication, rate limiting and request IDs

## Reliability proof

- 37 automated Python tests cover contracts, provider parsing, state transitions, idempotency, monitoring, authentication, alert routing and API behavior.
- TypeScript validation and the Next.js production build pass.
- GitHub Actions CI is public and green on `main`.
- The demo runs through baseline, break, quarantine, repair, approval, canary and production release without page reloads.
- Latest broken output never replaces the last known good snapshot.
- Repeated failures reuse the active incident rather than producing alert storms.
- The deployed Render flow was exercised end to end with no browser console errors.

## AI assistance disclosure

Codex was used to refine the product specification, implement the application, generate deterministic fixtures and run the verification workflow. Product direction, scope decisions, Bright Data integration choices and final submission review remain the entrant's responsibility.

## Known limitations

- The public judge deployment runs in deterministic demo mode so it cannot consume paid Bright Data credits or depend on third-party uptime during judging.
- Live mode requires a private `BRIGHTDATA_API_TOKEN` and triggers the same contract engine against the configured collector.
- Live rollback stops with an explicit error because version rollback belongs to Bright Data's Versions workflow. ScrapeSentry never claims that an unverified rollback completed.
- The included Supabase schema is optional. The free public demo uses in-memory state and resets safely after a service restart.

## Suggested submission tagline

A scraper can return 200 OK and still poison production. ScrapeSentry stopped 12 bad rows in under one second, served zero of them and released new data only after human approval plus canary and production verification.
