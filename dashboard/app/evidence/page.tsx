import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { SiteFooter, SiteHeader } from "../components/NarrativeLanding";

export const metadata: Metadata = {
  title: "Production Evidence | ScrapeSentry",
  description: "Recorded Bright Data collection, Self-Healing and contract verification evidence behind ScrapeSentry."
};

const SOURCE_ROOT = "https://github.com/himanshu748/scrapesentry/blob/main";

function Identifier({ label, value }: { label: string; value: string }) {
  return <div className="evidence-identifier"><span>{label}</span><code>{value}</code></div>;
}

function Passed({ children }: { children: ReactNode }) {
  return <li><CheckCircle size={16} weight="fill" /><span>{children}</span><strong>Passed</strong></li>;
}

export default function EvidencePage() {
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <SiteHeader />
      <main className="evidence-page" id="main-content">
        <header className="evidence-page-hero">
          <div><h1>Production evidence.</h1><p>Every claim on this page is tied to a Bright Data provider job, a captured artifact or a passing verification gate.</p></div>
          <div className="evidence-disclosure"><ShieldCheck size={18} weight="fill" /> Recorded Bright Data production evidence</div>
          <Image src="/product/contract-gate-v2.png" alt="ScrapeSentry contract gate" width={957} height={1643} />
        </header>

        <section className="evidence-identity" aria-label="Provider identities">
          <Identifier label="Scraper Studio collector" value="c_msxcshnz2bwrroekf3" />
          <Identifier label="Production collection" value="j_msyad7l21v1fnqbljn" />
          <Identifier label="Self-Healing job" value="ia_msya56gd1y2ucwwy0j" />
          <div className="evidence-numbers"><span><strong>12</strong> records</span><span><strong>13</strong> pages</span><span><strong>0</strong> failed</span><span><strong>100%</strong> success</span></div>
        </section>

        <div className="evidence-page-layout">
          <aside className="evidence-chronology" aria-label="Evidence chronology">
            <h2>Evidence chronology</h2>
            <ol>
              <li><b>01</b><span>Collector created<small>Scraper Studio</small></span></li>
              <li><b>02</b><span>Self-Healing completed<small>10 AI steps</small></span></li>
              <li><b>03</b><span>Production v2 published<small>Human approved</small></span></li>
              <li><b>04</b><span>Fresh collection passed<small>12.3 seconds</small></span></li>
              <li><b>05</b><span>Artifact fingerprinted<small>SHA-256</small></span></li>
            </ol>
          </aside>

          <div className="evidence-ledger-main">
            <section className="receipt-panel">
              <div className="receipt-panel-heading"><span>01</span><h2>Provider receipt</h2><strong><CheckCircle size={15} weight="fill" /> Success</strong></div>
              <dl>
                <div><dt>Provider</dt><dd>Bright Data Scraper Studio</dd></div>
                <div><dt>Template</dt><dd>v2 production</dd></div>
                <div><dt>Trigger</dt><dd>Collection API</dd></div>
                <div><dt>Runtime</dt><dd>12.288 seconds</dd></div>
                <div><dt>Records</dt><dd>12</dd></div>
                <div><dt>Pages</dt><dd>13</dd></div>
                <div><dt>Failed crawls</dt><dd>0</dd></div>
                <div><dt>Success rate</dt><dd>100%</dd></div>
              </dl>
            </section>

            <section className="receipt-panel contract-receipt">
              <div className="receipt-panel-heading"><span>02</span><h2>Captured contract</h2><a href={`${SOURCE_ROOT}/examples/contract.json`} target="_blank" rel="noreferrer">Open contract</a></div>
              <table><thead><tr><th>Field</th><th>Type</th><th>Rule</th><th>Example</th></tr></thead><tbody>
                <tr><td>title</td><td>string</td><td>required</td><td>A Light in the Attic</td></tr>
                <tr><td>price</td><td>number</td><td>0 to 10000</td><td>51.77</td></tr>
                <tr><td>availability</td><td>string</td><td>allowed values</td><td>in_stock</td></tr>
                <tr><td>url</td><td>string</td><td>URL format</td><td>books.toscrape.com/…</td></tr>
                <tr><td>sku</td><td>string</td><td>unique</td><td>a897fe39b1053632</td></tr>
              </tbody></table>
            </section>

            <section className="evidence-fingerprint">
              <span>03 · Raw provider artifact SHA-256</span>
              <code>73227ac42860fb289bd98b8b2d8f82812bc84e2dcddfb784b7f9f66b468f5a13</code>
              <a href={`${SOURCE_ROOT}/examples/brightdata-live-run.json`} target="_blank" rel="noreferrer">Open raw artifact</a>
            </section>
          </div>

          <aside className="evidence-verification">
            <section><h2>Self-Healing receipt</h2><ol>
              <li><CheckCircle size={16} weight="fill" /><span>Job completed</span></li>
              <li><CheckCircle size={16} weight="fill" /><span>Successful diff</span></li>
              <li><CheckCircle size={16} weight="fill" /><span>One-row preview</span></li>
              <li><CheckCircle size={16} weight="fill" /><span>10 AI steps</span></li>
              <li><CheckCircle size={16} weight="fill" /><span>Production v2 published</span></li>
            </ol><code>ia_msya56gd1y2ucwwy0j</code></section>
            <section><h2>Release verification</h2><ul>
              <Passed>Contract score 100 / 100</Passed>
              <Passed>Zero blocking violations</Passed>
              <Passed>Schema preserved</Passed>
              <Passed>Fresh provider collection</Passed>
            </ul></section>
            <div className="evidence-actions"><Link className="primary-cta" href="/console">Open live console</Link><a href={`${SOURCE_ROOT}/examples/brightdata-day3-evidence.json`} target="_blank" rel="noreferrer">View source receipt</a></div>
          </aside>
        </div>
      </main>
      <SiteFooter collectorId="c_msxcshnz2bwrroekf3" />
    </>
  );
}
