import type { Metadata } from "next";
import Link from "next/link";
import { CopyCodeButton } from "../components/CopyCodeButton";
import { SiteFooter, SiteHeader } from "../components/NarrativeLanding";

export const metadata: Metadata = {
  title: "Connect Your Collector | ScrapeSentry Docs",
  description: "Connect an existing Bright Data collector to ScrapeSentry and operate it through MCP."
};

const INSTALL = `python -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'`;

const ENVIRONMENT = `APP_ENV=production
BRIGHTDATA_API_TOKEN=your_server_side_token
BRIGHTDATA_COLLECTOR_ID=c_msxcshnz2bwrroekf3
OPERATOR_API_TOKEN=use_a_long_private_value`;

const START = `uvicorn app.api:app --port 8000
python -m app.server`;

const MCP = `{
  "mcpServers": {
    "scrapesentry": {
      "command": "python",
      "args": ["-m", "app.server"],
      "cwd": "/absolute/path/to/scrapesentry",
      "env": { "APP_ENV": "production" }
    }
  }
}`;

const SAFE_OUTPUT = `curl \
  -H "Authorization: Bearer $OPERATOR_API_TOKEN" \
  http://127.0.0.1:8000/api/collectors/books-to-scrape/safe-output`;

function CodeBlock({ value }: { value: string }) {
  return (
    <div className="docs-code">
      <CopyCodeButton value={value} />
      <pre tabIndex={0}><code>{value}</code></pre>
    </div>
  );
}

export default function DocsPage() {
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <SiteHeader />
      <main className="docs-page" id="main-content">
        <header className="docs-hero">
          <h1>Connect your collector.</h1>
          <p>Put ScrapeSentry in front of an existing Bright Data collector in five steps. The collector stays the source while ScrapeSentry becomes its contract and recovery layer.</p>
          <div><Link className="primary-cta" href="/console">Open live console</Link><a className="secondary-cta" href="https://github.com/himanshu748/scrapesentry" target="_blank" rel="noreferrer">View source</a></div>
        </header>

        <div className="docs-layout">
          <aside className="docs-index" aria-label="Documentation sections">
            <strong>Quick start</strong>
            <nav>
              <a href="#install">1. Install</a>
              <a href="#configure">2. Configure</a>
              <a href="#contract">3. Define the contract</a>
              <a href="#connect">4. Connect MCP</a>
              <a href="#consume">5. Consume safe output</a>
            </nav>
          </aside>

          <article className="docs-content">
            <div className="docs-warning" role="note"><strong>Keep Bright Data tokens on the server.</strong><span>Never place provider or operator secrets in a <code>NEXT_PUBLIC_</code> variable.</span></div>

            <section id="install">
              <span>01</span><div><h2>Install the service</h2><p>Clone the public repository, create a Python environment and install the typed FastAPI plus FastMCP service.</p><CodeBlock value={INSTALL} /></div>
            </section>
            <section id="configure">
              <span>02</span><div><h2>Configure the collector</h2><p>Point the server at the existing Scraper Studio collector. Live collection and Self-Healing consume provider credits, so monitoring remains opt-in.</p><CodeBlock value={ENVIRONMENT} /></div>
            </section>
            <section id="contract">
              <span>03</span><div><h2>Define the data contract</h2><p>Edit <code>examples/contract.json</code> with required fields, types, row limits, null thresholds and business rules. Then start the API and MCP server.</p><CodeBlock value={START} /><p className="docs-note">The included contract is already grounded in the production Books to Scrape output and its 12-row baseline.</p></div>
            </section>
            <section id="connect">
              <span>04</span><div><h2>Connect your coding agent</h2><p>Add the local MCP server to Codex, Claude Code or Cursor. All agent actions use the same policy engine as the console.</p><CodeBlock value={MCP} /></div>
            </section>
            <section id="consume">
              <span>05</span><div><h2>Consume protected output</h2><p>Downstream systems read the safe-output endpoint. If a scrape is quarantined, this endpoint keeps serving the last verified snapshot with its age and warning.</p><CodeBlock value={SAFE_OUTPUT} /></div>
            </section>
          </article>

          <aside className="docs-outcomes" aria-label="Expected result">
            <h2>What happens next</h2>
            <ol>
              <li>The collector runs through Bright Data.</li>
              <li>Every row is checked against the approved contract.</li>
              <li>Blocking drift moves the new snapshot into quarantine.</li>
              <li>The last verified snapshot remains available.</li>
              <li>Repair waits for approval, canary and production proof.</li>
            </ol>
            <div><strong>Requirements</strong><span>Python 3.10+</span><span>Node 20+</span><span>One Scraper Studio collector</span><span>Server-side Bright Data token</span></div>
            <Link href="/evidence">Inspect production evidence</Link>
          </aside>
        </div>
      </main>
      <SiteFooter collectorId="c_msxcshnz2bwrroekf3" />
    </>
  );
}
