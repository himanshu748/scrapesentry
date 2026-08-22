"use client";

import { createScope, createTimeline, stagger } from "animejs";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import {
  ArrowClockwise,
  ArrowRight,
  CaretDown,
  CheckCircle,
  List,
  Play,
  Scan,
  SealCheck,
  ShieldCheck,
  TerminalWindow,
  UserCheck,
  WarningOctagon,
  Wrench
} from "@phosphor-icons/react";
import type { LiveRunEvidence } from "../../lib/api";

const INCOMING_ROWS = [
  ["001", "A Light in the Attic", "51.77", "In stock"],
  ["002", "Tipping the Velvet", "53.74", "In stock"],
  ["003", "Soumission", "50.10", "In stock"],
  ["004", "Sharp Objects", "47.82", "In stock"],
  ["005", "Sapiens", "54.23", "In stock"],
  ["006", "The Requiem Red", "22.65", "In stock"],
  ["007", "The Dirty Little Secrets", "33.34", "In stock"],
  ["008", "The Coming Woman", "null", "undefined"],
  ["009", "The Boys in the Boat", "22.60", "In stock"],
  ["010", "The Black Maria", "52.15", "In stock"],
  ["011", "Starving Hearts", "13.99", "In stock"],
  ["012", "Shakespeare's Sonnets", "20.66", "In stock"]
] as const;

const BRIGHTDATA_COLLECTOR_ID = "c_msxcshnz2bwrroekf3";

const VERIFIED_ROWS = [
  ["001", "A Light in the Attic", "51.77", "In stock"],
  ["002", "Tipping the Velvet", "53.74", "In stock"],
  ["003", "Soumission", "50.10", "In stock"],
  ["004", "Sharp Objects", "47.82", "In stock"],
  ["005", "Sapiens", "54.23", "In stock"],
  ["006", "The Requiem Red", "22.65", "In stock"],
  ["007", "The Dirty Little Secrets", "33.34", "In stock"],
  ["008", "The Coming Woman", "17.93", "In stock"],
  ["009", "The Boys in the Boat", "22.60", "In stock"],
  ["010", "The Black Maria", "52.15", "In stock"],
  ["011", "Starving Hearts", "13.99", "In stock"],
  ["012", "Shakespeare's Sonnets", "20.66", "In stock"]
] as const;

const GUARD_STEPS = [
  {
    id: "baseline",
    label: "Establish the baseline",
    eyebrow: "Verified production output",
    title: "Safe data becomes the fallback before anything breaks.",
    detail: "A contract-valid Bright Data run is stored as the last known good snapshot. Consumers now have a safe state to keep reading through an incident.",
    readout: "12 verified rows serving, contract score 100/100",
    image: "/product/baseline-v3.jpg",
    position: "center top",
    alt: "ScrapeSentry console showing a healthy collector and verified production baseline",
    Icon: ShieldCheck
  },
  {
    id: "detect",
    label: "Detect and contain",
    eyebrow: "Contract engine",
    title: "The contract breaks before the request does.",
    detail: "Missing fields drop the score to 64. The new snapshot is quarantined in under a second while the verified feed stays live.",
    readout: "12 unsafe rows blocked, 0 unsafe rows served",
    image: "/product/detect-v3.jpg",
    position: "center center",
    alt: "ScrapeSentry console showing selector drift, a failed contract and quarantined rows",
    Icon: Scan
  },
  {
    id: "repair",
    label: "Prepare a repair",
    eyebrow: "Bright Data Self Healing",
    title: "A repair candidate is prepared, never assumed.",
    detail: "The provider proposes a candidate against the existing collector. ScrapeSentry checks its output against the same versioned contract.",
    readout: "candidate ready, schema preserved, confidence 98%",
    image: "/product/repair-v3.jpg",
    position: "center center",
    alt: "ScrapeSentry console showing the generated repair candidate and field mapping preview",
    Icon: Wrench
  },
  {
    id: "approve",
    label: "Require approval",
    eyebrow: "Human release gate",
    title: "Production waits for a deliberate decision.",
    detail: "The diff, provider receipt and schema impact stay visible. Approval is recorded before verification can begin.",
    readout: "awaiting operator approval",
    image: "/product/approved-v3.jpg",
    position: "center center",
    alt: "ScrapeSentry console showing a repair approved by a human operator",
    Icon: UserCheck
  },
  {
    id: "verify",
    label: "Verify and release",
    eyebrow: "Canary and production",
    title: "Recovery is declared only after fresh proof.",
    detail: "Canary and production runs must both satisfy the contract. Only then does the protected feed advance to the repaired snapshot.",
    readout: "canary passed, production passed, feed released",
    image: "/product/recovered-v3.jpg",
    position: "center center",
    alt: "ScrapeSentry console showing verified recovery and a healthy protected feed",
    Icon: SealCheck
  }
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="site-header concept-header">
      <a className="site-brand" href="/" aria-label="ScrapeSentry home">
        <span className="site-mark-concept"><ShieldCheck size={27} weight="regular" /></span>
        <strong>ScrapeSentry</strong>
      </a>
      <nav className="desktop-nav" aria-label="Primary navigation">
        <a href="/" aria-current={pathname === "/" ? "page" : undefined}>Product</a>
        <a href="/console" aria-current={pathname === "/console" ? "page" : undefined}>Console</a>
        <a href="/docs" aria-current={pathname === "/docs" ? "page" : undefined}>Docs</a>
        <a href="/evidence" aria-current={pathname === "/evidence" ? "page" : undefined}>Evidence</a>
      </nav>
      <div className="site-actions">
        <a className="concept-console-link" href="/console" aria-label="Open live console">
          <TerminalWindow size={22} weight="regular" />
        </a>
        <details className="mobile-menu">
          <summary aria-label="Open navigation"><List size={22} /></summary>
          <nav aria-label="Mobile navigation">
            <a href="/">Product</a>
            <a href="/console">Console</a>
            <a href="/docs">Docs</a>
            <a href="/evidence">Evidence</a>
          </nav>
        </details>
      </div>
    </header>
  );
}

function ContractScanner() {
  const root = useRef<HTMLDivElement>(null);
  const [scanKey, setScanKey] = useState(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!root.current || reducedMotion) return;
    const scope = createScope({ root }).add(() => {
      const timeline = createTimeline({
        defaults: { duration: 460, ease: "out(3)" }
      });
      timeline
        .set(".concept-incoming-row", { opacity: 0.25, x: -22 })
        .set(".concept-output-row", { opacity: 0, x: 16 })
        .set(".concept-quarantine", { opacity: 0, y: -10 })
        .set(".machine-progress i", { scaleX: 0 })
        .add(".concept-incoming-row", {
          opacity: [0.2, 1],
          x: [-22, 0],
          delay: stagger(34)
        }, 0)
        .add(".machine-scan-beam", {
          y: ["-160%", "160%"],
          opacity: [0, 1, 0],
          duration: 1180,
          ease: "inOut(2)"
        }, 170)
        .add(".concept-invalid", {
          x: [0, -9, 6, 0],
          duration: 360,
          ease: "inOut(3)"
        }, 760)
        .add(".concept-quarantine", {
          opacity: [0, 1],
          y: [-10, 0],
          duration: 320
        }, 900)
        .add(".concept-invalid", {
          opacity: [1, 0.35],
          scale: [1, 0.985],
          duration: 280
        }, 980)
        .add(".concept-output-row", {
          opacity: [0, 1],
          x: [16, 0],
          delay: stagger(44)
        }, 1060)
        .add(".machine-progress i", {
          scaleX: [0, 1],
          transformOrigin: "0 50%",
          delay: stagger(28),
          duration: 260
        }, 1110);
    });
    return () => scope.revert();
  }, [reducedMotion, scanKey]);

  return (
    <div className="concept-scanner" ref={root} aria-label="Animated scraper contract scanner">
      <div className="concept-scanner-heading"><span>ScrapeSentry contract gate</span></div>
      <button className="concept-replay" type="button" onClick={() => setScanKey((value) => value + 1)}>
        <ArrowClockwise size={14} /> Replay
      </button>
      <div className="concept-flow">
        <section className="concept-incoming" aria-label="New Bright Data snapshot with 12 candidate rows">
          <span className="concept-mobile-step"><b>01</b> Candidate snapshot</span>
          <div className="concept-flow-label"><span>New snapshot · 12 rows</span><code>{BRIGHTDATA_COLLECTOR_ID}</code></div>
          <div className="concept-incoming-head"><span>#</span><span>Title</span><span>Price</span><span>Availability</span></div>
          {INCOMING_ROWS.map((row, index) => (
            <div className={"concept-incoming-row" + (index === 7 ? " concept-invalid" : "")} key={row[0]}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{row[1]}</strong>
              <code>{row[2] === "null" ? "null" : "£" + row[2]}</code>
              <em>{row[3] === "undefined" ? "null" : "in_stock"}</em>
            </div>
          ))}
        </section>

        <div className="concept-machine" aria-hidden="true">
          <span className="concept-mobile-step"><b>02</b> Contract gate</span>
          <Image
            src="/product/contract-gate-v2.png"
            alt=""
            width={957}
            height={1643}
            loading="eager"
          />
          <div className="machine-scan-beam" />
          <div className="machine-display">
            <strong>Validating<br />contract</strong>
            <b>12 / 12</b>
            <span className="machine-progress">{Array.from({ length: 7 }, (_, index) => <i key={index} />)}</span>
          </div>
        </div>

        <section className="concept-output" aria-label="Last known good snapshot with 12 verified rows">
          <span className="concept-mobile-step"><b>03</b> Protected feed</span>
          <div className="concept-flow-label"><span>Last known good · 12 rows</span><code>prior verified run</code></div>
          {VERIFIED_ROWS.map((row, index) => (
            <div className="concept-output-row" key={row[0]}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <code>{'{'} &quot;title&quot;: &quot;{row[1]}&quot;, &quot;price&quot;: {row[2]} {'}'}</code>
              <CheckCircle size={12} weight="fill" />
            </div>
          ))}
        </section>
      </div>
      <svg className="concept-reject-route" viewBox="0 0 1000 560" preserveAspectRatio="none" aria-hidden="true">
        <path d="M 500 318 L 500 430 Q 500 470 455 470 L 382 470" />
        <path d="M 392 460 L 381 470 L 392 480" />
      </svg>
      <div className="concept-quarantine">
        <span>Entire new snapshot quarantined</span>
        <div><code>08</code><strong>{'{'} &quot;title&quot;: &quot;The Coming Woman&quot;, &quot;price&quot;: null, &quot;availability&quot;: null {'}'}</strong><WarningOctagon size={14} weight="fill" /></div>
        <small>1 blocking example shown · all 12 candidate rows held</small>
      </div>
    </div>
  );
}

export function LandingHero() {
  const reducedMotion = useReducedMotion();
  return (
    <section className="landing-hero landing-hero-concept" id="top">
      <motion.div
        className="hero-copy"
        initial={reducedMotion ? false : { opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
      >
        <span className="hero-kicker">CI/CD for Bright Data scrapers</span>
        <h1>
          <span className="hero-heading-line">Scrapers fail silently.</span>
          <span className="hero-heading-line">ScrapeSentry does not.</span>
        </h1>
        <p>Bright Data collects the web. If one row breaks the contract, ScrapeSentry holds the new snapshot and keeps the last 12 verified rows serving.</p>
        <div className="hero-actions">
          <a className="primary-cta" href="#failure-lab"><Play size={17} weight="fill" /> Run the failure lab</a>
          <a className="secondary-cta" href="/console">Explore the console <ArrowRight size={17} weight="bold" /></a>
        </div>
      </motion.div>
      <motion.div
        className="hero-concept-stage"
        initial={reducedMotion ? false : { opacity: 0, x: 34 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.82, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
      >
        <ContractScanner />
      </motion.div>
    </section>
  );
}

export function BrightDataStory({ evidence }: { evidence?: LiveRunEvidence }) {
  const collectorId = evidence?.collector_id || BRIGHTDATA_COLLECTOR_ID;
  const collectionId = evidence?.job_id || "Loading production receipt";
  const repairId = evidence?.repair_job_id || "Loading Self Healing receipt";
  const records = evidence?.records || 12;

  const route = [
    { label: "Collect", detail: "Scraper Studio returns structured product rows.", Icon: Scan },
    { label: "Enforce", detail: "The versioned contract checks fields, types and quality.", Icon: ShieldCheck },
    { label: "Repair", detail: "Self Healing prepares a candidate when drift blocks release.", Icon: Wrench },
    { label: "Approve", detail: "A human reviews the diff before provider publish.", Icon: UserCheck },
    { label: "Release", detail: "Canary and production must both pass before the feed advances.", Icon: SealCheck }
  ] as const;

  return (
    <section className="brightdata-story" id="bright-data" aria-labelledby="brightdata-title">
      <div className="brightdata-story-heading">
        <span className="brightdata-wordmark">Bright Data Scraper Studio</span>
        <h2 id="brightdata-title">Bright Data collects. ScrapeSentry decides what ships.</h2>
        <p>Your existing collector stays the production data source. ScrapeSentry adds contract enforcement, controlled Self Healing and a protected downstream feed.</p>
      </div>

      <div className="brightdata-architecture">
        <article className="brightdata-source">
          <div><Scan size={23} weight="regular" /><span>Production data plane</span></div>
          <strong>{evidence?.collector_name || "Books to Scrape catalog"}</strong>
          <code>{collectorId}</code>
          <dl>
            <div><dt>Public target</dt><dd>{evidence?.target_url || "books.toscrape.com"}</dd></div>
            <div><dt>Collection API</dt><dd>{collectionId}</dd></div>
            <div><dt>Structured output</dt><dd>{records} records across {evidence?.pages || 13} pages</dd></div>
          </dl>
        </article>

        <div className="brightdata-route" aria-label="Bright Data recovery lifecycle">
          <ol>
            {route.map(({ label, detail, Icon }) => (
              <li key={label}>
                <span><Icon size={18} weight="regular" /></span>
                <strong>{label}</strong>
                <small>{detail}</small>
              </li>
            ))}
          </ol>
          <div className="brightdata-repair-receipt">
            <span>Self Healing API</span>
            <code>{repairId}</code>
            <strong>{evidence?.repair_status || "Recorded production repair"}</strong>
          </div>
        </div>

        <article className="brightdata-outcome">
          <SealCheck size={25} weight="fill" />
          <span>Protected API feed</span>
          <strong>{records} verified</strong>
          <small>0 unsafe rows served</small>
          <a href="/evidence">Inspect provider evidence <ArrowRight size={15} weight="bold" /></a>
        </article>
      </div>

      <div className="brightdata-boundary" aria-label="Bright Data security boundary">
        <span>Browser</span><strong>Failure lab and operator console</strong>
        <ArrowRight size={16} aria-hidden="true" />
        <span>Server</span><strong>Collector ID, private token and provider actions</strong>
      </div>
    </section>
  );
}

export function RecoveryStory() {
  const reducedMotion = useReducedMotion();
  return (
    <section className="receipt-story" id="product" aria-labelledby="false-success-title">
      <motion.div
        className="receipt-story-copy"
        initial={reducedMotion ? false : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.45 }}
        transition={{ duration: 0.62 }}
      >
        <span className="section-index">Data under interrogation</span>
        <h2 id="false-success-title">A 200 response can still be a data failure.</h2>
        <p>HTTP success means nothing if the payload breaks your contract.</p>
        <ArrowRight className="receipt-story-arrow" size={34} weight="thin" />
      </motion.div>
      <motion.div
        className="receipt-canvas"
        initial={reducedMotion ? false : { opacity: 0, y: 34 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.68, delay: 0.08 }}
      >
        <article className="receipt-sheet http-sheet">
          <span className="receipt-pin">HTTP layer</span>
          <strong>HTTP/1.1 200 OK</strong>
          <code>date: Thu, 20 Aug 2026 08:54:16 GMT</code>
          <code>content-type: application/json</code>
          <code>content-length: 45231</code>
          <code>server: brightdata</code>
          <p><CheckCircle size={20} weight="regular" /> Receipt: success</p>
        </article>
        <ArrowRight className="receipt-transfer" size={28} weight="thin" aria-hidden="true" />
        <article className="receipt-sheet contract-sheet">
          <span className="receipt-pin">Data contract</span>
          <code>{'{'}<br />&nbsp;&nbsp;&quot;title&quot;: &quot;The Coming Woman&quot;,<br />&nbsp;&nbsp;<mark>&quot;price&quot;: null</mark> <em>Required: number</em><br />&nbsp;&nbsp;<mark>&quot;availability&quot;: null</mark> <em>Required: string</em><br />&nbsp;&nbsp;&quot;rating&quot;: 4.0<br />{'}'}</code>
          <svg viewBox="0 0 30 260" preserveAspectRatio="none" aria-hidden="true"><path d="M14 0 L19 38 L9 68 L18 104 L11 137 L20 174 L12 211 L16 260" /></svg>
          <p><WarningOctagon size={20} weight="regular" /> Contract: failed</p>
        </article>
      </motion.div>
    </section>
  );
}

export function WorkflowSection() {
  const [active, setActive] = useState(0);
  const reducedMotion = useReducedMotion();

  function selectStep(next: number, focus = false) {
    const normalized = (next + GUARD_STEPS.length) % GUARD_STEPS.length;
    setActive(normalized);
    if (focus) {
      requestAnimationFrame(() => document.getElementById("guard-step-" + normalized)?.focus());
    }
  }

  const activeStep = GUARD_STEPS[active];

  return (
    <section className="recovery-theatre" id="how-it-works" aria-labelledby="guarded-title">
      <motion.div
        className="recovery-theatre-heading"
        initial={reducedMotion ? false : { opacity: 0, y: 22 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
      >
        <div>
          <span className="section-index">The complete recovery</span>
          <h2 id="guarded-title">Watch one incident become safe data again.</h2>
        </div>
        <p>Five captured console states show the real operating path from a trusted baseline to a verified release. The invariant never changes: broken rows do not reach consumers.</p>
      </motion.div>

      <div className="recovery-theatre-shell">
        <div className="recovery-theatre-tabs" role="tablist" aria-label="Guarded recovery states">
          {GUARD_STEPS.map(({ label, eyebrow, Icon }, index) => (
            <button
              className={"recovery-theatre-tab" + (active === index ? " active" : "")}
              type="button"
              role="tab"
              id={"guard-step-" + index}
              aria-controls="recovery-story-panel"
              aria-selected={active === index}
              tabIndex={active === index ? 0 : -1}
              key={label}
              onClick={() => selectStep(index)}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                  event.preventDefault();
                  selectStep(index + 1, true);
                } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                  event.preventDefault();
                  selectStep(index - 1, true);
                } else if (event.key === "Home") {
                  event.preventDefault();
                  selectStep(0, true);
                } else if (event.key === "End") {
                  event.preventDefault();
                  selectStep(GUARD_STEPS.length - 1, true);
                }
              }}
            >
              <span className="recovery-tab-icon"><Icon size={19} weight={active === index ? "fill" : "regular"} /></span>
              <span><strong>{label}</strong><small>{eyebrow}</small></span>
              <ArrowRight size={16} weight="bold" />
            </button>
          ))}
        </div>

        <div
          className="recovery-story-panel"
          id="recovery-story-panel"
          role="tabpanel"
          aria-labelledby={"guard-step-" + active}
        >
          <div className="recovery-story-copy">
            <span>{activeStep.eyebrow}</span>
            <h3>{activeStep.title}</h3>
            <p>{activeStep.detail}</p>
            <code><CheckCircle size={15} weight="fill" /> {activeStep.readout}</code>
          </div>

          <div className="recovery-story-frame">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                className="recovery-story-image"
                key={activeStep.id}
                initial={reducedMotion ? false : { opacity: 0, scale: 0.985, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 1.008, y: -8 }}
                transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
              >
                <Image
                  src={activeStep.image}
                  alt={activeStep.alt}
                  fill
                  sizes="(max-width: 900px) 100vw, 70vw"
                  style={{ objectPosition: activeStep.position }}
                />
              </motion.div>
            </AnimatePresence>
            <div className="recovery-story-proof" aria-label="Protected feed invariant">
              <span><small>Protected feed</small><strong>12 verified rows</strong></span>
              <span><small>Unsafe rows served</small><strong>0</strong></span>
              <span><small>Evidence source</small><strong>Captured console state</strong></span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const TAGLINE_LINES = [
  ["Bad", "scraper", "data", "stops."],
  ["Verified", "rows", "keep", "moving."]
] as const;

export function TaglineReveal() {
  const root = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!root.current) return;
    const words = Array.from(root.current.querySelectorAll<HTMLElement>("[data-reveal-word]"));
    if (reducedMotion) {
      words.forEach((word) => word.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.65 });
    words.forEach((word) => observer.observe(word));
    return () => observer.disconnect();
  }, [reducedMotion]);

  let wordIndex = 0;
  return (
    <section className="tagline-reveal" ref={root} aria-labelledby="tagline-title">
      <span className="section-index">The protected feed</span>
      <h2 id="tagline-title">
        {TAGLINE_LINES.map((line, lineIndex) => (
          <span className="tagline-line" key={lineIndex}>
            {line.map((word, lineWordIndex) => {
              const delay = wordIndex++ * 64;
              return <span data-reveal-word style={{ transitionDelay: `${delay}ms` }} key={word}>{word}{lineWordIndex === line.length - 1 ? "" : " "}</span>;
            })}
          </span>
        ))}
      </h2>
      <p>The newest scrape earns its way into production. Until it passes, consumers keep receiving the last verified snapshot.</p>
    </section>
  );
}

const MCP_CONFIG = `{
  "mcpServers": {
    "scrapesentry": {
      "command": "python",
      "args": ["-m", "app.server"]
    }
  }
}`;

export function UseItSection() {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "selected">("idle");

  async function copyConfig() {
    try {
      await navigator.clipboard.writeText(MCP_CONFIG);
      setCopyState("copied");
    } catch {
      const config = document.getElementById("mcp-client-config");
      const selection = window.getSelection();
      if (config && selection) {
        const range = document.createRange();
        range.selectNodeContents(config);
        selection.removeAllRanges();
        selection.addRange(range);
        setCopyState("selected");
      }
    }
    window.setTimeout(() => setCopyState("idle"), 5000);
  }

  return (
    <section className="adoption-section" id="use-it" aria-labelledby="adoption-title">
      <div className="adoption-heading">
        <span className="section-index">From demo to daily workflow</span>
        <h2 id="adoption-title">Bring one collector. Leave with a protected data product.</h2>
        <p>ScrapeSentry wraps the Bright Data collector you already run. It does not replace your scraper or expose its credentials in the browser.</p>
        <div className="adoption-actions">
          <a className="primary-cta" href="/console">Try the hosted recovery <ArrowRight size={17} weight="bold" /></a>
          <a className="secondary-cta" href="https://github.com/himanshu748/scrapesentry" target="_blank" rel="noreferrer">Get the source</a>
        </div>
      </div>

      <div className="adoption-lanes">
        <article className="adoption-lane adoption-demo-lane">
          <span>Evaluate it here</span>
          <h3>Run the complete recovery without spending provider credits.</h3>
          <ol>
            <li><b>Break</b><small>Simulate selector drift against recorded production rows.</small></li>
            <li><b>Approve</b><small>Inspect the candidate and record the human decision.</small></li>
            <li><b>Verify</b><small>Pass canary and production gates before release.</small></li>
          </ol>
          <p><ShieldCheck size={16} weight="fill" /> Interactive hosted workflow with recorded Bright Data evidence</p>
        </article>

        <article className="adoption-lane adoption-live-lane">
          <span>Connect your collector</span>
          <h3>Run the same policy engine from your coding agent.</h3>
          <ol>
            <li><b>Configure</b><small>Set the collector ID and Bright Data token on the server.</small></li>
            <li><b>Contract</b><small>Register the fields, types and quality thresholds that must hold.</small></li>
            <li><b>Connect</b><small>Start the MCP server and add it to Codex, Claude Code or Cursor.</small></li>
          </ol>
          <div className="adoption-code-head">
            <span>MCP client config</span>
            <button type="button" onClick={copyConfig}>{copyState === "idle" ? <TerminalWindow size={14} /> : <CheckCircle size={14} weight="fill" />} {copyState === "copied" ? "Copied" : copyState === "selected" ? "Selected, press Ctrl+C" : "Copy config"}</button>
          </div>
          <pre id="mcp-client-config" tabIndex={0}><code>{MCP_CONFIG}</code></pre>
        </article>
      </div>
    </section>
  );
}

export function EvidenceSection({ evidence }: { evidence?: LiveRunEvidence }) {
  const entries = evidence ? [
    ["Provider", evidence.provider],
    ["Collector", evidence.collector_id],
    ["Production run", evidence.job_id],
    ["Records", String(evidence.records)],
    ["Pages", String(evidence.pages)],
    ["Failed crawls", String(evidence.failed_crawls)],
    ["Runtime", (evidence.job_time_ms / 1000).toFixed(1) + "s"],
    ["Artifact hash", evidence.artifact_sha256.slice(0, 16) + "…"]
  ] : [];

  return (
    <section className="evidence-ledger-section" aria-labelledby="evidence-title">
      <div className="ledger-heading">
        <span className="section-index">Production evidence</span>
        <h2 id="evidence-title">Every recovery leaves a receipt.</h2>
        <p>Provider identity, job output, contract evidence and the protected artifact remain traceable. This is recorded Bright Data production evidence, not a fabricated success state.</p>
      </div>
      <div className="evidence-ledger">
        <div className="ledger-stamp">
          <ShieldCheck size={27} weight="fill" />
          <span>BRIGHT DATA</span>
          <strong>PRODUCTION EVIDENCE</strong>
          <small>{evidence ? new Date(evidence.finished_at).toLocaleDateString("en-GB") : "Loading receipt"}</small>
        </div>
        <div className="ledger-entries" aria-busy={!evidence}>
          {entries.length ? entries.map(([label, value], index) => (
            <div className="ledger-entry" key={label}>
              <span>0{index + 1}</span>
              <small>{label}</small>
              <code title={value}>{value}</code>
            </div>
          )) : Array.from({ length: 8 }, (_, index) => <div className="ledger-entry ledger-skeleton" key={index} />)}
        </div>
        <div className="ledger-verdict">
          <div><CheckCircle size={21} weight="fill" /><span>100% success</span></div>
          <strong>{evidence?.records || "0"} records</strong>
          <small>{evidence?.repair_status || "Verifying provider receipt"}</small>
        </div>
      </div>
    </section>
  );
}

export function ConsoleIntro() {
  return (
    <div className="console-intro">
      <span className="proof-label">The working system</span>
      <h2>Operate the recovery, not a mockup.</h2>
      <p>Simulate drift, create a repair, record human approval and run guarded verification against the same typed policy engine exposed through MCP.</p>
      <span className="console-icon"><TerminalWindow size={24} /></span>
    </div>
  );
}

const FAQS = [
  {
    question: "Does a 200 response mean the scraper is healthy?",
    answer: "No. HTTP success only confirms delivery. ScrapeSentry checks the returned fields, types and business rules before any row can reach consumers."
  },
  {
    question: "What happens when a contract fails?",
    answer: "Unsafe output enters quarantine immediately. The protected feed continues serving the last verified snapshot with freshness and incident context attached."
  },
  {
    question: "Can a repair publish itself?",
    answer: "No. ScrapeSentry prepares a candidate, shows the data diff and waits for human approval before provider publish and verification can continue."
  },
  {
    question: "How does Bright Data fit into the recovery?",
    answer: "The existing Scraper Studio collector remains the production data source. ScrapeSentry monitors its output and records Self Healing evidence without replacing the collector."
  },
  {
    question: "Does the public recovery run consume credits?",
    answer: "No. The hosted experience replays verified Bright Data production evidence. Live collections run only when a token stored on the server is deliberately configured."
  },
  {
    question: "Can a coding agent operate the same workflow?",
    answer: "Yes. The MCP server exposes detection, evidence, repair, approval and verification through the same typed policy engine used by the dashboard."
  }
] as const;

export function FAQSection() {
  return (
    <section className="faq-section" id="faq" aria-labelledby="faq-title">
      <div className="faq-heading">
        <span className="section-index">Questions before trust</span>
        <h2 id="faq-title">What the contract gate guarantees.</h2>
        <p>Clear answers about provider access, recovery control and what reaches production.</p>
      </div>
      <div className="faq-list">
        {FAQS.map((item, index) => (
          <details key={item.question} open={index === 0}>
            <summary><span>0{index + 1}</span>{item.question}<CaretDown size={18} weight="bold" /></summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function FinalCallToAction() {
  return (
    <section className="final-cta final-cta-v2">
      <div>
        <span className="section-index">THE CONTRACT IS THE PRODUCT</span>
        <h2>Scrape anything. Ship trustworthy data.</h2>
        <p>Break a collector, watch ScrapeSentry contain it and release only verified output.</p>
        <small>Public recovery runs use recorded provider evidence. Live credentials stay on the server.</small>
      </div>
      <div>
        <a className="secondary-cta" href="#top"><ArrowClockwise size={17} /> Replay story</a>
        <a className="primary-cta" href="/console">Open live console <ArrowRight size={17} weight="bold" /></a>
      </div>
    </section>
  );
}

export function SiteFooter({ collectorId }: { collectorId?: string }) {
  return (
    <footer className="site-footer">
      <a className="footer-brand" href="/">ScrapeSentry</a>
      <p>Powered by Bright Data Scraper Studio and Self Healing</p>
      <nav aria-label="Footer navigation">
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <a href="/docs">Docs</a>
        <a href="/evidence">Evidence</a>
        <a href="https://github.com/himanshu748/scrapesentry" target="_blank" rel="noreferrer">GitHub</a>
        <a href="#top">Back to top</a>
      </nav>
      {collectorId && <code>{collectorId}</code>}
    </footer>
  );
}
