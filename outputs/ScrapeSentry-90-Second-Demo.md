# ScrapeSentry 90-second judge demo

## Before recording

- Start the FastAPI server on port 8000.
- Start the dashboard on port 3000.
- Reset the demo so the health score is 100 and the collector is green.
- Keep the Bright Data production run page available in a second tab.
- Use a 1440p browser window with notifications hidden.

## Shot list and narration

### 0:00 to 0:12, prove the data is real

Show the green production-evidence panel.

Say: "ScrapeSentry is CI/CD for web scrapers. This is a real Bright Data Scraper Studio API run against Books to Scrape: 12 structured records, 13 pages, zero failed crawls and a 100 percent success rate. The Self-Healing job beside it is real too."

Point to the collection job `j_msyad7l21v1fnqbljn`, Self-Healing job `ia_msya56gd1y2ucwwy0j`, ten-field schema and provider stats.

### 0:12 to 0:25, create a silent failure

Click **Simulate selector drift**. The action changes the captured layout then runs the same monitor cycle exposed through FastAPI, MCP and the background scheduler.

Say: "Scrapers often keep returning successful responses while their data silently breaks. The monitor catches price and availability drift, creates one incident and quarantines all 12 unsafe rows."

Point to the judge scorecard: **12 records protected**, **0 bad rows served** and **under one second to detect**. Then point to **Fallback active** in the protected downstream feed. Show that the latest 12 rows are quarantined while the downstream API still serves 12 verified rows with an explicit freshness age.

### 0:25 to 0:43, generate a guarded repair

Click **Generate repair**.

Say: "The coding agent can inspect the evidence through MCP and ask Bright Data Self-Healing for a targeted repair. ScrapeSentry records the provider job, progress and repair latency, then tests the preview against the same contract before anyone can approve it."

Point to the clearly labeled provider evidence, AI confidence, preview score, schema preservation and the before-and-after values.

### 0:43 to 0:57, enforce human control

Click **Approve repair**.

Say: "A repair proposal never changes production on its own. The real job paused for approval, Bright Data published Version 2 only after that decision and the next API run still had to pass the full contract."

Point to the approval gate, provider publish gate and MCP trace. The deterministic demo labels its adapter as recorded and marks external publish as not needed.

### 0:57 to 1:13, verify recovery

Click **Run guarded verification**.

Say: "ScrapeSentry runs the candidate against canary inputs first, then verifies a fresh production snapshot. Recovery is declared only when both gates pass."

Point to the green health score, four resolved release gates and recovered timeline event. Show the protected feed returning to **Verified live** with the newly verified run ID.

### 1:13 to 1:30, close with impact

Scroll to the MCP execution trace.

Say: "Fifteen MCP tools let a coding agent detect drift, inspect evidence, propose repairs, record the provider publish, verify recovery and serve last known good data. Bad scraper output never silently reaches production."

End on the product name and line: "Scrape anything. Ship trustworthy data."

## Judging criteria coverage

| Criterion | Proof in the video |
|---|---|
| Potential impact | Quarantine and last known good output at 0:12 to 0:25 |
| Creativity | CI/CD framing and approval gate at 0:25 to 0:57 |
| Technical excellence | Contracts, scheduled monitoring, typed evidence and release gates throughout |
| Scraper Studio usage | Real collector proof at 0:00 to 0:12 and Self-Healing at 0:25 to 0:43 |
| Reliability | Canary plus production verification at 0:57 to 1:13 |
| Presentation | One continuous red-to-green story under 90 seconds |

## Recording rule

Do not cut away during the four-button recovery flow. A continuous interaction proves the state transitions are real and repeatable.
