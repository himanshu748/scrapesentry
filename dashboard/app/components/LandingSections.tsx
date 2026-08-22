"use client";

import Image from "next/image";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle,
  GithubLogo,
  List,
  Play,
  SealCheck,
  ShieldCheck,
  TerminalWindow,
  UserCheck,
  WarningOctagon,
  Wrench
} from "@phosphor-icons/react";
import type { LiveRunEvidence } from "../../lib/api";

const RECOVERY_STATES = [
  {
    id: "detect",
    label: "Detect",
    title: "The contract breaks",
    detail: "Required price and availability fields disappear from every row.",
    image: "/product/broken-v2.jpg",
    tone: "danger",
    Icon: WarningOctagon
  },
  {
    id: "quarantine",
    label: "Quarantine",
    title: "Unsafe output stops",
    detail: "Twelve bad rows are blocked while the last known good snapshot stays available.",
    image: "/product/broken-v2.jpg",
    tone: "warning",
    Icon: ShieldCheck
  },
  {
    id: "repair",
    label: "Repair",
    title: "A candidate is prepared",
    detail: "Bright Data Self-Healing restores the contract without changing the schema.",
    image: "/product/repair-v2.jpg",
    tone: "neutral",
    Icon: Wrench
  },
  {
    id: "approve",
    label: "Approve",
    title: "A human keeps control",
    detail: "Production remains locked until the repair and provider publish are approved.",
    image: "/product/approved-v2.jpg",
    tone: "neutral",
    Icon: UserCheck
  },
  {
    id: "verify",
    label: "Verify",
    title: "Safe output returns",
    detail: "Canary and production checks pass before the protected feed is released.",
    image: "/product/recovered-v2.jpg",
    tone: "success",
    Icon: SealCheck
  }
] as const;

const WORKFLOW = [
  {
    title: "Detect",
    detail: "Contract rules identify structural drift before consumers see it.",
    Icon: WarningOctagon
  },
  {
    title: "Quarantine",
    detail: "Unsafe rows stop while verified data remains available.",
    Icon: ShieldCheck
  },
  {
    title: "Repair",
    detail: "A tested candidate is prepared for review.",
    Icon: Wrench
  },
  {
    title: "Approve",
    detail: "Humans review changes and provider evidence.",
    Icon: UserCheck
  },
  {
    title: "Verify",
    detail: "Fresh canary and production output must pass.",
    Icon: CheckCircle
  }
] as const;

export function SiteHeader() {
  return (
    <header className="site-header">
      <a className="site-brand" href="#top" aria-label="ScrapeSentry home">
        <span className="site-mark">S</span>
        <strong>ScrapeSentry</strong>
      </a>
      <nav className="desktop-nav" aria-label="Primary navigation">
        <a href="#product">Product</a>
        <a href="#how-it-works">How it works</a>
        <a href="#mcp">MCP</a>
      </nav>
      <div className="site-actions">
        <a className="github-link" href="https://github.com/himanshu748/scrapesentry" target="_blank" rel="noreferrer">
          <GithubLogo size={18} weight="regular" />
          GitHub
          <ArrowUpRight size={14} />
        </a>
        <a className="nav-cta" href="#console">
          <span className="nav-cta-full">Open live console</span>
          <span className="nav-cta-short">Console</span>
          <ArrowRight size={16} weight="bold" />
        </a>
        <details className="mobile-menu">
          <summary aria-label="Open navigation"><List size={22} /></summary>
          <nav aria-label="Mobile navigation">
            <a href="#product">Product</a>
            <a href="#how-it-works">How it works</a>
            <a href="#mcp">MCP</a>
            <a href="https://github.com/himanshu748/scrapesentry" target="_blank" rel="noreferrer">GitHub</a>
          </nav>
        </details>
      </div>
    </header>
  );
}

export function LandingHero() {
  return (
    <section className="landing-hero" id="top">
      <div className="hero-copy">
        <h1>Scrapers fail silently. ScrapeSentry does not.</h1>
        <p>Detect data drift, quarantine unsafe output and verify recovery before bad rows reach production.</p>
        <div className="hero-actions">
          <a className="secondary-cta" href="#product"><Play size={17} weight="fill" /> Watch recovery</a>
          <a className="primary-cta" href="#console">Open live console <ArrowRight size={17} weight="bold" /></a>
        </div>
      </div>
      <div className="hero-product" aria-label="Verified ScrapeSentry dashboard capture">
        <div className="product-window-bar">
          <span className="mini-brand"><span>S</span> ScrapeSentry</span>
          <span>Production evidence linked</span>
        </div>
        <div className="hero-product-viewport">
          <Image
            src="/product/baseline-v2.jpg"
            alt="ScrapeSentry live console showing a healthy scraper baseline and protected downstream feed"
            fill
            priority
            sizes="(max-width: 767px) 100vw, 58vw"
          />
        </div>
      </div>
    </section>
  );
}

export function RecoveryStory() {
  const [activeId, setActiveId] = useState<(typeof RECOVERY_STATES)[number]["id"]>("detect");
  const active = RECOVERY_STATES.find((state) => state.id === activeId) || RECOVERY_STATES[0];

  function moveRecoveryFocus(nextIndex: number) {
    const next = RECOVERY_STATES[(nextIndex + RECOVERY_STATES.length) % RECOVERY_STATES.length];
    setActiveId(next.id);
    requestAnimationFrame(() => document.getElementById(`recovery-tab-${next.id}`)?.focus());
  }

  return (
    <section className="recovery-story" id="product">
      <div className="story-heading">
        <h2>From 200 OK to safe output.</h2>
        <p>ScrapeSentry turns raw scraper health into a guarded release decision.</p>
      </div>
      <div className="state-switcher" role="tablist" aria-label="Recovery states">
        {RECOVERY_STATES.map(({ id, label, Icon, tone }) => (
          <button
            className={`state-tab ${tone}`}
            type="button"
            role="tab"
            id={`recovery-tab-${id}`}
            aria-selected={activeId === id}
            aria-controls="recovery-state-panel"
            tabIndex={activeId === id ? 0 : -1}
            key={id}
            onClick={() => setActiveId(id)}
            onKeyDown={(event) => {
              const index = RECOVERY_STATES.findIndex((state) => state.id === id);
              if (["ArrowRight", "ArrowDown"].includes(event.key)) {
                event.preventDefault();
                moveRecoveryFocus(index + 1);
              } else if (["ArrowLeft", "ArrowUp"].includes(event.key)) {
                event.preventDefault();
                moveRecoveryFocus(index - 1);
              } else if (event.key === "Home") {
                event.preventDefault();
                moveRecoveryFocus(0);
              } else if (event.key === "End") {
                event.preventDefault();
                moveRecoveryFocus(RECOVERY_STATES.length - 1);
              }
            }}
          >
            <Icon size={19} weight={activeId === id ? "fill" : "regular"} />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <div
        className="state-stage"
        id="recovery-state-panel"
        role="tabpanel"
        aria-labelledby={`recovery-tab-${active.id}`}
        aria-live="polite"
      >
        <div className="state-copy">
          <span className={`state-signal ${active.tone}`}>{active.label}</span>
          <h3>{active.title}</h3>
          <p>{active.detail}</p>
          <span className="state-rule">Every transition uses recorded product evidence.</span>
        </div>
        <figure className="state-media" key={active.id}>
          <Image
            src={active.image}
            alt={`Recorded ScrapeSentry ${active.label.toLowerCase()} state`}
            fill
            loading="eager"
            sizes="(max-width: 767px) 100vw, 68vw"
          />
        </figure>
      </div>
    </section>
  );
}

export function EvidenceSection({ evidence }: { evidence?: LiveRunEvidence }) {
  const metrics = evidence ? [
    ["Records", String(evidence.records)],
    ["Pages", `${evidence.pages}/${evidence.pages}`],
    ["Failed crawls", String(evidence.failed_crawls)],
    ["Success", `${evidence.success_rate.toFixed(0)}%`],
    ["Runtime", `${(evidence.job_time_ms / 1000).toFixed(1)}s`]
  ] : [];

  return (
    <section className="evidence-section" aria-labelledby="evidence-title">
      <div className="evidence-copy">
        <span className="proof-label">Live Bright Data proof</span>
        <h2 id="evidence-title">Every change is tested before it ships.</h2>
        <p>The collector, production job and artifact hash stay visible so every recovery claim can be traced.</p>
        {evidence ? (
          <div className="evidence-identity">
            <span>Collector <code>{evidence.collector_id}</code></span>
            <span>Run <code>{evidence.job_id}</code></span>
          </div>
        ) : <div className="evidence-loading" aria-busy="true">Loading verified provider evidence</div>}
      </div>
      <div className="evidence-instrument">
        <div className="evidence-metrics" aria-label="Bright Data run metrics">
          {metrics.length ? metrics.map(([name, value]) => (
            <div key={name}><span>{name}</span><strong>{value}</strong></div>
          )) : Array.from({ length: 5 }, (_, index) => <div className="metric-skeleton" key={index} />)}
        </div>
        <div className="evidence-receipt">
          <span>Self-Healing job</span>
          <code>{evidence?.repair_job_id || "Loading job receipt"}</code>
          <strong>{evidence?.repair_status || "Checking provider"}</strong>
        </div>
      </div>
    </section>
  );
}

export function WorkflowSection() {
  return (
    <section className="workflow-section" id="how-it-works">
      <div className="workflow-intro">
        <h2>A guarded workflow you can rely on.</h2>
        <p>Every incident follows the same release policy from detection to verified recovery.</p>
        <a href="#console">Use the live console <ArrowRight size={16} weight="bold" /></a>
      </div>
      <ol className="workflow-rail">
        {WORKFLOW.map(({ title, detail, Icon }) => (
          <li key={title}>
            <Icon size={23} weight="regular" />
            <div><strong>{title}</strong><p>{detail}</p></div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function ConsoleIntro() {
  return (
    <div className="console-intro">
      <span className="proof-label">Live product</span>
      <h2>Operate the recovery, not a mockup.</h2>
      <p>The controls below call the same typed policy engine exposed through the MCP server.</p>
      <span className="console-icon"><TerminalWindow size={24} weight="regular" /></span>
    </div>
  );
}

export function FinalCallToAction() {
  return (
    <section className="final-cta">
      <div><h2>Stop silent failures before they ship.</h2><p>Open the live console and run ScrapeSentry against a real recovery state.</p></div>
      <div>
        <a className="secondary-cta" href="#product"><Play size={17} weight="fill" /> Watch recovery</a>
        <a className="primary-cta" href="#console">Open live console <ArrowRight size={17} weight="bold" /></a>
      </div>
    </section>
  );
}
