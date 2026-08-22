# ScrapeSentry 3 minute judge demo

A shot list for a single continuous screen recording. Timestamps are cumulative and
assume you speak at a normal pace. Every number in the narration was measured on the
local stack, not estimated. If a take runs long, cut shot 7 first and shot 2 second.

## Before you hit record

1. `make api` in one terminal, `cd dashboard && npm run dev` in another. Wait for `/health` to return `{"status":"ok"}`.
2. Open `http://localhost:3000/console` (or the Render URL) at 1440x900 or larger.
3. Click **Reset**. Confirm fleet score reads `100.0`, open incidents `0`, protected output `12`.
4. Open a second tab on the Bright Data collector stats page for `c_msxcshnz2bwrroekf3`. You only cut to it if you have time.
5. Hide notifications, hide bookmarks, set the browser to 100% zoom.

Naming note for narration: the MCP tool that calls Bright Data Self-Healing is
`propose_heal`. It triggers the provider self-heal job and stops at an approval gate,
so say "trigger the self-heal" out loud but show `propose_heal` on screen.

---

## 0:00 - 0:18 | Cold open, the problem

**On screen:** the Product landing page, hero visible.

**Say:** "A scraper can return HTTP 200 and still poison your database. Selectors drift,
a price becomes a string, a field disappears, and every downstream system keeps
consuming it. ScrapeSentry is CI/CD for Bright Data scrapers. It treats scraper output
as a versioned data product with a contract."

**Action:** click **Open live console**.

---

## 0:18 - 0:40 | Shot 1, the fleet (`list_collectors`)

**On screen:** Fleet Command panel.

**Say:** "This is the fleet view, backed by the `list_collectors` MCP tool and the same
typed service layer as the REST API. One registered collector: Books to Scrape,
Bright Data collector `c_msxcshnz2bwrroekf3`, owned by data-platform, running in
production against contract v1. Fleet score 100. Zero open incidents. Twelve records
under protection as last known good."

**Point to, in order:** the collector row, the collector ID under the name, the health
`100/100 Contract v1` cell, the `PROTECTED OUTPUT 12` tile, and the failure budget bar
reading `1h 0m remaining`.

---

## 0:40 - 0:55 | Shot 2, the evidence is real

**On screen:** Recovery flight recorder, stage 01 `Live baseline`.

**Say:** "The baseline is not a mock. This is a real Scraper Studio API run:
job `j_msyad7l21v1fnqbljn`, twelve structured records across thirteen pages, zero failed
crawls, 12.3 seconds, ten fields per row. The raw provider output is committed in the
repository."

**Point to:** `12 rows - j_msyad7l21v1fnqbljn` and the collector ID on the right.

---

## 0:55 - 1:20 | Shot 3, break it and detect the drift

**On screen:** console header.

**Action:** click **Simulate selector drift**. Do not cut. Let the page update live.

**Say:** "I am going to break the scraper the way a real site breaks it. The layout
changes, `price` becomes `price_text`, `availability` becomes `stock_label`. The HTTP
call still succeeds. Watch what the contract does."

**Then, as the numbers move, say:** "Health score drops from 100 to 64. Red. Two blocking
violations: required field `price` disappeared, required field `availability`
disappeared. All twelve rows are quarantined. Detection took under 50 milliseconds."

**Point to, in order:** `FLEET HEALTH 64 Red`, `RECORDS PROTECTED 12`,
`BAD ROWS SERVED 0`, `TIME TO DETECT <1s`, then the `DETECT / Incident evidence` panel
showing both violations with their drift type.

---

## 1:20 - 1:35 | Shot 4, downstream stays clean

**On screen:** Protected downstream feed, now tagged `FALLBACK ACTIVE`.

**Say:** "This is the part that matters. The latest scrape is quarantined at the contract
gate, and the downstream API keeps serving the last twelve verified rows with an explicit
freshness age and a stale flag. Consumers get honest old data instead of silent garbage."

**Point to:** `LATEST SCRAPE 12 rows Quarantined` on the left of the gate,
`DOWNSTREAM API 12 rows No poisoned data` on the right, and the snapshot age.

---

## 1:35 - 2:05 | Shot 5, trigger Self-Healing and read the diff

**Action:** click **Generate repair**, then scroll to the `REPAIR / Guarded recovery` panel.

**Say:** "Now ScrapeSentry hands the failure to Bright Data Self-Healing. It does not send
a vague 'it broke' message. It sends the rule-level violations as a repair prompt, then
tests whatever comes back against the same contract before a human is allowed to see an
approve button."

**Then, on the diff, say:** "Broken output: `price_text` is the string `£22.65`,
`stock_label` is `In stock`. Repaired output: `price` is the number `22.65`,
`availability` is `in_stock`. Schema preserved, all ten fields intact, preview scores
100 out of 100, provider confidence 98."

**Point to, in order:** the state chip `Awaiting approval`, the provider evidence block
(provider, job ID, progress `completed`, latency), the before/after diff rows, and
`schema preserved`.

**Say the honest line:** "The provider evidence panel is labeled. The public demo replays
a recorded Self-Healing run so judging costs no Bright Data credits. The real job,
`ia_msya56gd1y2ucwwy0j`, is on the Evidence page, and it published production Version 2."

---

## 2:05 - 2:25 | Shot 6, the human gate

**Action:** click **Approve repair**.

**Say:** "A repair never reaches production on its own. Approval is a recorded human
decision, and if the candidate had changed the output schema it would need a second
explicit override on top of this one. Every decision lands in the audit log with a
timestamp."

**Point to:** state chip moving to `Approved`, release gates 1 and 2 flipping from
`Waiting`, and the new `Repair approved` entry in the audit log.

---

## 2:25 - 2:45 | Shot 7, guarded verification

**Action:** click **Run guarded verification**.

**Say:** "Two gates, in order. Canary inputs must satisfy the contract, then a fresh
production collection must satisfy the same contract. Only when both pass does
ScrapeSentry declare recovery, close the incident and release the new snapshot to
downstream consumers."

**Point to:** all four release gates green, health back to `100 Green`, the
`Recovery verified` timeline entry, and the protected feed returning to `VERIFIED LIVE`
with a new run ID.

---

## 2:45 - 3:00 | Shot 8, agent-native close

**Action:** scroll to `AGENT-NATIVE OPERATIONS`.

**Say:** "The whole incident is available to a coding agent. Eighteen MCP tools:
`list_collectors`, `check_health`, `get_drift_report`, `propose_heal`, `approve_heal`,
`confirm_provider_publish`, `verify_recovery`. Same service layer, same safety rules,
whether the caller is a browser or an agent."

**Close on:** "A scraper can return 200 OK and still poison production. ScrapeSentry
stopped twelve bad rows in under a second, served zero of them, and released new data
only after human approval plus canary and production verification."

---

## Numbers you are allowed to say

All verified against a local run on 2026-08-22:

| Claim | Measured |
|---|---|
| Rows protected | 12 |
| Bad rows served | 0 |
| Health score under drift | 64/100, red |
| Blocking violations | 2 (`price`, `availability` required-field drift) |
| Time to detect | 0.047 s |
| Time to run both verification gates | 0.068 s |
| Repair preview contract score | 100/100 |
| Provider confidence | 98 |
| MCP tools exposed | 18 |

## Recording rules

- Do not cut between **Simulate selector drift** and **Run guarded verification**. A
  continuous take is the proof that the state machine is real.
- Do not say "live Self-Healing run" over the demo adapter. Say "recorded", and point at
  the Evidence page for the real job ID.
- If an action fails, the console shows an error banner with a request ID. Stop, hit
  **Reset**, start the take again rather than talking over a red banner.
