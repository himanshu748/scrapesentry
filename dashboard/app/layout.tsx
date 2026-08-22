import type { Metadata } from "next";
import { Instrument_Serif, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap"
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap"
});

const siteHost =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.VERCEL_PROJECT_PRODUCTION_URL ||
  process.env.VERCEL_URL ||
  "scrapesentry-himanshu748.onrender.com";
const siteUrl = siteHost.startsWith("http") ? siteHost : `https://${siteHost}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "ScrapeSentry | Stop Silent Scraper Failures",
  description: "Detect data drift, quarantine unsafe output and verify recovery before bad rows reach production.",
  applicationName: "ScrapeSentry",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "ScrapeSentry | Stop Silent Scraper Failures",
    description: "A guarded recovery control plane for production scrapers.",
    type: "website",
    url: "/",
    siteName: "ScrapeSentry",
    images: [{ url: "/product/contract-gate-v2.png", width: 957, height: 1643, alt: "ScrapeSentry contract scanner" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "ScrapeSentry | Stop Silent Scraper Failures",
    description: "Detect data drift, quarantine unsafe output and verify recovery before bad rows reach production.",
    images: ["/product/contract-gate-v2.png"]
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
