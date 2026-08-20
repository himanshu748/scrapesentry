import Link from "next/link";
import { ShieldWarning } from "@phosphor-icons/react/dist/ssr";

export default function NotFound() {
  return (
    <main className="not-found-page">
      <ShieldWarning size={48} weight="regular" />
      <span>404 · Route quarantined</span>
      <h1>This page did not pass the contract.</h1>
      <p>The route may have moved or never existed. Return to the working ScrapeSentry experience.</p>
      <Link href="/">Return to ScrapeSentry</Link>
    </main>
  );
}
