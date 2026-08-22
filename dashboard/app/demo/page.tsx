import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "../components/NarrativeLanding";

export const metadata: Metadata = {
  title: "Demo | ScrapeSentry",
  description:
    "Three minute walkthrough: silent scraper drift detected, quarantined, repaired through Bright Data Self-Healing and released only after human approval and two verification gates."
};

const CHAPTERS = [
  { at: "0:00", title: "About the project", detail: "Why a 200 OK response is not proof that the data is safe." },
  { at: "0:27", title: "Tech stack and architecture", detail: "One typed service layer behind FastAPI and FastMCP." },
  { at: "0:59", title: "The fleet", detail: "One real Bright Data collector on contract v1." },
  { at: "1:11", title: "The silent break", detail: "price becomes price_text, availability becomes stock_label." },
  { at: "1:23", title: "Detection", detail: "Health 100 to 64, twelve rows quarantined in 47 ms." },
  { at: "1:35", title: "Downstream stays clean", detail: "Consumers keep the last verified rows, flagged stale." },
  { at: "1:50", title: "Self-Healing and the diff", detail: "The candidate is contract tested before approval." },
  { at: "2:12", title: "Approve, then verify twice", detail: "Canary and production gates against the same contract." },
  { at: "2:28", title: "Eighteen MCP tools", detail: "The same incident, resolvable from a coding agent." },
  { at: "2:38", title: "What I learned", detail: "Proving the repair is safe is the hard half." }
];

export default function DemoPage() {
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <SiteHeader />
      <main className="demo-page" id="main-content">
        <header className="demo-hero">
          <span className="section-kicker">Judge demo</span>
          <h1>Three minutes, one continuous recovery.</h1>
          <p>
            A real Bright Data collector breaks the way real sites break. Watch the contract catch it,
            hold every unsafe row, and release new data only after a human approves and both
            verification gates pass.
          </p>
          <div className="demo-actions">
            <Link className="primary-cta" href="/console">Try it yourself</Link>
            <a
              className="secondary-cta"
              href="https://github.com/himanshu748/scrapesentry"
              target="_blank"
              rel="noreferrer"
            >
              View source
            </a>
          </div>
        </header>

        <figure className="demo-player">
          <video controls preload="metadata" poster="/demo/poster.jpg" playsInline>
            <source src="/demo/scrapesentry-demo.mp4" type="video/mp4" />
            Your browser cannot play this video. Download it at /demo/scrapesentry-demo.mp4.
          </video>
          <figcaption>
            2 minutes 55 seconds. Narrated, no cuts through the recovery flow.
          </figcaption>
        </figure>

        <section className="demo-chapters" aria-label="Chapters">
          <h2>What happens, and when</h2>
          <ol>
            {CHAPTERS.map((chapter) => (
              <li key={chapter.at}>
                <b>{chapter.at}</b>
                <div>
                  <strong>{chapter.title}</strong>
                  <span>{chapter.detail}</span>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="demo-note" aria-label="What is recorded and what is live">
          <h2>What is recorded and what is live</h2>
          <p>
            The public deployment runs in demo mode against a captured Bright Data production run, so
            judging costs no provider credits. The provider evidence panel says so on screen rather
            than implying a live call.
          </p>
          <p>
            The underlying run is real: collector <code>c_msxcshnz2bwrroekf3</code>, collection job{" "}
            <code>j_msyad7l21v1fnqbljn</code> with twelve records across thirteen pages and zero failed
            crawls, and Self-Healing job <code>ia_msya56gd1y2ucwwy0j</code>, which published production
            Version 2. Every artifact is committed in the repository.
          </p>
          <Link className="secondary-cta" href="/evidence">Inspect the provider evidence</Link>
        </section>
      </main>
      <SiteFooter collectorId="c_msxcshnz2bwrroekf3" />
    </>
  );
}
