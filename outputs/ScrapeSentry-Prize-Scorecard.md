# ScrapeSentry prize scorecard

Updated from the WeMakeDevs Day 1 and Day 2 emails plus the official Scrape-Verse overview and rules on August 18, 2026. This is a readiness assessment, not a promise of a prize.

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
| Public source repository | Current workspace is not a Git repository | Blocked |
| Clear README | Architecture, setup, live mode, MCP tools and safety model are documented | Complete |
| Demo video showing the working project | Script exists but the video has not been recorded | Blocked |

## Six equally weighted judging criteria

| Criterion | Visible proof | Readiness | Last-mile action |
|---|---|---:|---|
| Potential impact | Quarantine stops silent data poisoning while the protected feed keeps serving the last known good snapshot | Strong | Show the feed stay clean during the deliberate break |
| Creativity and innovation | Scraper repair is treated like a guarded software release with contracts, approval, canary checks and production verification | Strong | Lead with "A scraper can return 200 OK and still poison production" |
| Technical excellence | Typed FastAPI and FastMCP service, provider adapter, state machine, idempotency, locks, tests and CI | Strong | Publish the repository and show green checks |
| Use of Scraper Studio | Real custom Collector ID, provider collection IDs, Self-Healing job ID, production Version 2 and daily live contract workflow | Strong | Show the same Collector ID from provider proof through downstream release |
| Reliability and self-healing | Controlled drift, quarantine, last known good fallback, repair preview, human approval, provider publish then canary and production gates | Strong | Record the complete red-to-green flow without cuts |
| Presentation | Recovery flight recorder, provider evidence, protected feed, release gates and MCP trace | Strong | Record a clean demo video and deploy a public judge URL |

## Automatic prize-track coverage

### Web-Slinger, Best Use of Bright Data

Current proof is competitive. Scraper Studio is central rather than incidental. The judge can see what changed, the real Self-Healing job, the stable Collector ID and the protected downstream API. The daily GitHub workflow also treats the Collector ID as a live production endpoint.

### Suit-Up, Best UI

Current proof is strong. The dashboard now exposes a recovery flight recorder above the fold, a before-and-after data diff, a contract gate, protected records, provider IDs and the exact release state. It tells the story without requiring logs.

### Spider-Sense, Best Clean Code

Current proof is strong. Domain rules live in a typed service layer shared by FastAPI and MCP. Provider logic stays behind an adapter. Tests cover the contract engine, lifecycle, monitoring, API behavior and production response parsing. Repository publication with passing CI is still required.

### Daily Bugle, Best LinkedIn Post

The Day 1 and Day 2 LinkedIn posts satisfy the participation requirement only if the public post tags WeMakeDevs. The official rules say Bright Data does not have to be tagged for eligibility, though tagging both companies is useful. Keep the public post URLs as evidence.

## Memorable judge line

> A scraper can return 200 OK and still poison production. ScrapeSentry stopped 12 bad rows in under one second, served zero of them and released new data only after human approval plus canary and production verification.

## Remaining mandatory submission blockers

1. Create and publish the source repository with visible commit history.
2. Record the working demo video.

## Remaining win-readiness work

1. Add `BRIGHTDATA_API_TOKEN` as a repository secret so the scheduled live workflow produces public run evidence.
2. Deploy the API and dashboard to public judge URLs.
3. If time permits, add a second niche public target. Books to Scrape is a valid custom Scraper Studio target but it is a tutorial sandbox, so a long-tail production source would strengthen the impact story.

No new core feature is more important than clearing the mandatory blockers. The project already addresses all six judging dimensions.
