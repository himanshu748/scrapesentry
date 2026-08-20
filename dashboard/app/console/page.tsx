import type { Metadata } from "next";
import { ScrapeSentryExperience } from "../page";

export const metadata: Metadata = {
  title: "Recovery Console | ScrapeSentry",
  description: "Operate contract monitoring, quarantine, repair approval and guarded recovery for a scraper collector."
};

export default function ConsolePage() {
  return <ScrapeSentryExperience surface="console" />;
}
