import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://scrapesentry-himanshu748.onrender.com"),
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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
