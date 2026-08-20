import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="legal-page">
      <Link className="legal-back" href="/">← Back to ScrapeSentry</Link>
      <span>Terms</span>
      <h1>Use the contract gate with data you are allowed to process.</h1>
      <p>ScrapeSentry is provided as a software project for monitoring scraper output and controlling recovery. You are responsible for the collectors, targets, credentials and data connected to your deployment.</p>
      <h2>Provider usage</h2>
      <p>Live Bright Data collections and Self Healing operations can consume credits. Configure live mode deliberately and keep usage controls appropriate for your account.</p>
      <h2>No automatic release</h2>
      <p>Repair candidates require operator approval and fresh verification. You remain responsible for reviewing changes before production use.</p>
      <h2>Availability</h2>
      <p>The public recovery experience demonstrates the product with recorded production evidence. It is not a service level commitment.</p>
    </main>
  );
}
