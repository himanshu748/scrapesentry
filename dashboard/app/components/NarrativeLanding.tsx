"use client";

import { createScope, createTimeline, stagger } from "animejs";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import {
  ArrowClockwise,
  ArrowRight,
  CaretDown,
  CheckCircle,
  List,
  LockKey,
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

const VERIFIED_ROWS = INCOMING_ROWS.filter((_, index) => index !== 7).slice(0, 6);

const GUARD_STEPS = [
  {
    id: "detect",
    label: "Detect",
    eyebrow: "Contract engine",
    title: "The contract breaks before the request does.",
    detail: "ScrapeSentry checks shape, type, completeness and business rules. A null price becomes a blocking signal, even when the provider returns 200.",
    readout: "price: expected number, received null",
    Icon: Scan
  },
  {
    id: "quarantine",
    label: "Quarantine",
    eyebrow: "Protected feed",
    title: "Unsafe rows lose the right to ship.",
    detail: "The failed snapshot is isolated. Consumers continue reading the last known good output while evidence stays available for inspection.",
    readout: "12 rows blocked · 12 verified rows still served",
    Icon: LockKey
  },
  {
    id: "repair",
    label: "Repair",
    eyebrow: "Bright Data Self Healing",
    title: "A repair candidate is prepared, never assumed.",
    detail: "The provider proposes a candidate against the existing collector. ScrapeSentry checks its output against the same versioned contract.",
    readout: "candidate v2 · schema preserved · confidence 96%",
    Icon: Wrench
  },
  {
    id: "approve",
    label: "Approve",
    eyebrow: "Human gate",
    title: "Production waits for a deliberate decision.",
    detail: "The diff, provider receipt and schema impact stay visible. Approval is recorded before verification can begin.",
    readout: "awaiting operator approval",
    Icon: UserCheck
  },
  {
    id: "verify",
    label: "Verify",
    eyebrow: "Guarded release",
    title: "Recovery is declared only after fresh proof.",
    detail: "Canary and production runs must both satisfy the contract. Only then does the protected feed advance to the repaired snapshot.",
    readout: "canary passed · production passed · feed released",
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
        .set(".concept-incoming-row", { opacity: 0.25, x: 22 })
        .set(".concept-output-row", { opacity: 0, x: -16 })
        .set(".concept-quarantine", { opacity: 0, y: -10 })
        .set(".machine-progress i", { scaleX: 0 })
        .add(".concept-incoming-row", {
          opacity: [0.2, 1],
          x: [22, 0],
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
          x: [-16, 0],
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
      <div className="concept-scanner-heading"><span>Contract scanner</span></div>
      <button className="concept-replay" type="button" onClick={() => setScanKey((value) => value + 1)}>
        <ArrowClockwise size={14} /> Replay
      </button>
      <div className="concept-flow">
        <section className="concept-output" aria-label="Verified output">
          <div className="concept-flow-label">Verified output</div>
          {VERIFIED_ROWS.map((row, index) => (
            <div className="concept-output-row" key={row[0]}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <code>{'{'} &quot;title&quot;: &quot;{row[1]}&quot;, &quot;price&quot;: {row[2]} {'}'}</code>
              <CheckCircle size={12} weight="fill" />
            </div>
          ))}
        </section>

        <div className="concept-machine" aria-hidden="true">
          <Image
            src="/product/contract-gate-v2.png"
            alt=""
            width={957}
            height={1643}
            priority
          />
          <div className="machine-scan-beam" />
          <div className="machine-display">
            <strong>Validating<br />contract</strong>
            <b>12 / 12</b>
            <span className="machine-progress">{Array.from({ length: 7 }, (_, index) => <i key={index} />)}</span>
          </div>
        </div>

        <section className="concept-incoming" aria-label="Incoming rows">
          <div className="concept-flow-label">Incoming rows</div>
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
      </div>
      <svg className="concept-reject-route" viewBox="0 0 1000 560" preserveAspectRatio="none" aria-hidden="true">
        <path d="M 545 318 L 545 430 Q 545 470 590 470 L 694 470" />
        <path d="M 685 460 L 696 470 L 685 480" />
      </svg>
      <div className="concept-quarantine">
        <span>Quarantined (contract violation)</span>
        <div><code>08</code><strong>{'{'} &quot;title&quot;: &quot;The Coming Woman&quot;, &quot;price&quot;: null, &quot;availability&quot;: null {'}'}</strong><WarningOctagon size={14} weight="fill" /></div>
        <small>Missing required fields: price, availability</small>
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
        <h1>
          <span className="hero-heading-line">Scrapers fail</span>
          <span className="hero-heading-line">silently.</span>
          <span className="hero-heading-line">ScrapeSentry</span>
          <span className="hero-heading-line">does not.</span>
        </h1>
        <p>ScrapeSentry watches a Bright Data collector, blocks broken output and keeps the last verified rows live while the repair moves through human approval.</p>
        <div className="hero-actions">
          <a className="primary-cta" href="/console">Open live console <ArrowRight size={17} weight="bold" /></a>
          <a className="secondary-cta" href="#product"><Play size={17} weight="fill" /> Watch it recover</a>
        </div>
        <p className="hero-proof"><ShieldCheck size={16} weight="fill" /> Bright Data production evidence · 12 rows protected · 0 unsafe rows served</p>
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

  return (
    <section className="concept-workflow" id="how-it-works" aria-labelledby="guarded-title">
      <motion.div
        className="concept-workflow-heading"
        initial={reducedMotion ? false : { opacity: 0, y: 22 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
      >
        <h2 id="guarded-title">One broken field. Five guarded decisions.</h2>
        <p>Zero poisoned rows reached consumers.</p>
      </motion.div>

      <div className="concept-pipeline" role="tablist" aria-label="Guarded recovery steps">
        <div className="pipeline-rail" aria-hidden="true" />
        <div className="pipeline-record pipeline-failed">
          <span>01</span>
          <code>{'{'}<br />&nbsp;&nbsp;&quot;title&quot;: &quot;The Coming Woman&quot;,<br />&nbsp;&nbsp;&quot;price&quot;: null,<br />&nbsp;&nbsp;&quot;availability&quot;: null,<br />&nbsp;&nbsp;&quot;rating&quot;: 4.0<br />{'}'}</code>
          <strong><WarningOctagon size={15} weight="fill" /> Contract: failed</strong>
        </div>

        {GUARD_STEPS.map(({ label, eyebrow, Icon }, index) => (
          <button
            className={"pipeline-gate" + (active === index ? " active" : "") + (index === 3 ? " approval-gate" : "")}
            type="button"
            role="tab"
            id={"guard-step-" + index}
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
            <span className="pipeline-step-label"><b>0{index + 1}</b> {label}<small>{eyebrow}</small></span>
            <span className="pipeline-machine">
              <Image src="/product/contract-gate-v2.png" alt="" width={957} height={1643} />
              <span className="pipeline-screen"><Icon size={20} weight="regular" /><strong>{label}</strong></span>
              {index === 3 && <i className="pipeline-lever"><span /></i>}
            </span>
          </button>
        ))}

        <div className="pipeline-record pipeline-verified">
          <span>01</span>
          <code>{'{'}<br />&nbsp;&nbsp;&quot;title&quot;: &quot;The Coming Woman&quot;,<br />&nbsp;&nbsp;&quot;price&quot;: 17.93,<br />&nbsp;&nbsp;&quot;availability&quot;: &quot;in_stock&quot;,<br />&nbsp;&nbsp;&quot;rating&quot;: 4.0<br />{'}'}</code>
          <strong><CheckCircle size={15} weight="fill" /> Contract: verified</strong>
        </div>
      </div>

      <div className="pipeline-quarantine">
        <span><LockKey size={18} weight="regular" /><strong>Quarantined evidence</strong><small>Unsafe rows isolated</small></span>
        <code>{'{'} &quot;price&quot;: null, &quot;availability&quot;: null, … {'}'}</code>
        <code>{'{'} &quot;rating&quot;: null, … {'}'}</code>
        <code>{'{'} &quot;source&quot;: &quot;&quot;, … {'}'}</code>
        <code>…</code>
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
          <span>01 · Evaluate it here</span>
          <h3>Run the complete recovery without spending provider credits.</h3>
          <ol>
            <li><b>Break</b><small>Simulate selector drift against recorded production rows.</small></li>
            <li><b>Approve</b><small>Inspect the candidate and record the human decision.</small></li>
            <li><b>Verify</b><small>Pass canary and production gates before release.</small></li>
          </ol>
          <p><ShieldCheck size={16} weight="fill" /> Interactive hosted workflow · recorded Bright Data evidence</p>
        </article>

        <article className="adoption-lane adoption-live-lane">
          <span>02 · Connect your collector</span>
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
        <span className="section-index">03 · THE RECEIPT</span>
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
      <span className="proof-label">04 · THE WORKING SYSTEM</span>
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
