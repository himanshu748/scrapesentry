# ScrapeSentry prize scorecard

Updated from the official WeMakeDevs Scrape-Verse page and the working build on August 21, 2026. This is a readiness assessment, not a promise of a prize.

## Candid verdict

The product is submission quality. The submission package is not complete until a playable demo video is rendered and the verified Vercel preview is promoted to the public production domain. Current rubric score: **56.0/60 (93.3%)** before the final video and production promotion.

## Eligibility

| Official requirement | ScrapeSentry proof | Status |
|---|---|---:|
| Custom scraper created with Bright Data Scraper Studio | Custom collector `c_msxcshnz2bwrroekf3` | Complete |
| Publicly available web data | `https://books.toscrape.com/` with no login or personal data | Complete |
| At least one real create and run flow | Production jobs `j_msya3o2j2re7wkpeg4` and `j_msyad7l21v1fnqbljn` | Complete |
| Collector ID powers a real downstream product | MCP server, dashboard, protected API feed and scheduled health workflow | Complete |
| Self-Healing shown | Real job `ia_msya56gd1y2ucwwy0j`, approved production Version 2 and a successful post-heal collection | Complete |
| Example structured output | Raw provider output plus normalized evidence in `examples/` | Complete |
| AI assistance disclosed | README has a specific AI assistance disclosure | Complete |
| Public source repository | `https://github.com/himanshu748/scrapesentry` | Complete |
| Public working deployment | `https://scrapesentry-himanshu748.onrender.com/` returned HTTP 200 on August 21. The final Vercel production URL is still pending. | Complete |
| Clear README | Architecture, setup, live mode, MCP tools and safety model are documented | Complete |
| Demo video showing the working project | Narrated 3 minute cut is built from `docs/demo-script.md`. The public YouTube URL is still pending | Blocked |

## Six equally weighted judging criteria

| Criterion | Visible proof | Score | Last-mile action |
|---|---|---:|---|
| Potential impact | Quarantine stops silent data poisoning while the protected feed keeps serving the last known good snapshot | 9.2/10 | Show the feed stay clean during the deliberate break |
| Creativity and innovation | Scraper repair is treated like a guarded software release with contracts, approval, canary checks and production verification | 9.4/10 | Lead with "A scraper can return 200 OK and still poison production" |
| Technical excellence | Typed FastAPI and FastMCP service, provider adapter, state machine, idempotency, locks, 43 tests and CI | 9.6/10 | Show the public repository and green CI run |
| Use of Scraper Studio | Real custom Collector ID, provider collection IDs, Self-Healing job ID, production Version 2 and structured output powering the product | 9.5/10 | Keep one Collector ID visible through provider proof and downstream release |
| Reliability and self-healing | Four runnable failures, quarantine, last known good fallback, repair preview, human approval then canary and production gates | 9.7/10 | Record the complete red-to-green flow without cuts |
| Presentation | Story-led landing page, live failure lab, recovery theatre, provider receipts, docs, evidence and operator console | 8.6/10 | Render the final demo video and promote the verified Vercel preview |

## Automatic prize-track coverage

### Web-Slinger, Best Use of Bright Data

Current proof is competitive. Scraper Studio is central rather than incidental. The judge can see what changed, the real Self-Healing job, the stable Collector ID and the protected downstream API. The daily GitHub workflow also treats the Collector ID as a live production endpoint.

### Suit-Up, Best UI

Current proof is highly competitive. The landing page explains the false-success problem, runs four real contract failures and shows the complete guarded recovery. The interface recomposes at 360, 768, 1024 and 1440 pixels with no horizontal page overflow. The operator console exposes a recovery flight recorder, before-and-after output, release gates and the exact protected-feed state.

### Spider-Sense, Best Clean Code

Current proof is strong. Domain rules live in a typed service layer shared by FastAPI and MCP. Provider logic stays behind an adapter. Tests cover the contract engine, lifecycle, monitoring, API behavior and production response parsing. The public repository has green GitHub Actions CI on `main`.

### Daily Bugle, Best LinkedIn Post

The Day 1 and Day 2 LinkedIn posts satisfy the participation requirement only if the public post tags WeMakeDevs. The official rules say Bright Data does not have to be tagged for eligibility, though tagging both companies is useful. Keep the public post URLs as evidence.

## Memorable judge line

> A scraper can return 200 OK and still poison production. ScrapeSentry stopped 12 bad rows in under one second, served zero of them and released new data only after human approval plus canary and production verification.

## Remaining mandatory submission blockers

1. Upload the narrated demo video and put its YouTube URL in the README `## Demo` section.
   The shot list is `docs/demo-script.md`; `docs/demo/demo-capture.mp4` is the silent
   screen capture it was built from.
2. Promote the verified preview to `https://scrapesentry.vercel.app` so judges receive a
   stable unprotected URL.

## Remaining win-readiness work

1. Push the final source changes and confirm the public CI run is green.
2. Add `BRIGHTDATA_API_TOKEN` as a repository secret only if a deliberate live scheduled workflow is still desired.

No new core feature is more important than clearing the submission package and deployment gates. The project already addresses all six judging dimensions.
