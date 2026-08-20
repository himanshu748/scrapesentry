import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <Link className="legal-back" href="/">← Back to ScrapeSentry</Link>
      <span>Privacy</span>
      <h1>Your scraper data stays under your control.</h1>
      <p>ScrapeSentry processes scraper output to evaluate contracts, quarantine unsafe records and verify recovery. The public experience uses recorded Bright Data production evidence and does not request personal information.</p>
      <h2>Credentials</h2>
      <p>Provider and operator credentials belong in server environment variables. They are never placed in browser code, public artifacts or client storage.</p>
      <h2>Operational data</h2>
      <p>Production deployments may retain contract results, incident evidence and approval history in the storage system configured by the operator.</p>
      <h2>Contact</h2>
      <p>Open a repository issue for privacy questions about this project.</p>
    </main>
  );
}
