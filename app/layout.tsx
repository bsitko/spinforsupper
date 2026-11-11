import type { Metadata, Viewport } from "next";
import { GoogleAnalytics, GoogleTagManager } from "@next/third-parties/google";
import "./globals.css";

const site =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: "Spin for Supper",
  description: "Can't decide? Spin the wheel and let fate pick dinner.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ff6b35" };

// Site-verification tags for affiliate networks, Google Search Console, etc.
// Paste the whole tag(s) from the program into the VERIFY_META_TAGS env var in Vercel, e.g.
// <meta name="impact-site-verification" value="abc123">  (several tags are fine)
function verifyTags() {
  // Impact (affiliate network) verification for spinforsupper, added 2026-11-11. The value is public by design.
  const raw = `<meta name='impact-site-verification' value='5f2cf2a4-1b7d-4562-89b0-7a53f3141479'> ${process.env.VERIFY_META_TAGS || ""}`;
  const tags: { name: string; value: string }[] = [];
  for (const m of raw.matchAll(/<meta\b[^>]*>/gi)) {
    const attr = (k: string) => m[0].match(new RegExp(`${k}\\s*=\\s*["']([^"']*)["']`, "i"))?.[1];
    const name = attr("name") || attr("property");
    const value = attr("content") ?? attr("value");
    if (name && value) tags.push({ name, value });
  }
  return tags;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {verifyTags().map((t) =>
          // Some networks (Impact) check a "value" attribute instead of "content", so send both.
          <meta key={t.name} name={t.name} content={t.value} {...({ value: t.value } as object)} />
        )}
      </head>
      {/* Google Tag Manager is optional: use it to add other tags (Meta Pixel, ads, etc.) without code changes. */}
      {process.env.NEXT_PUBLIC_GTM_ID && <GoogleTagManager gtmId={process.env.NEXT_PUBLIC_GTM_ID} />}
      <body>{children}</body>
      {process.env.NEXT_PUBLIC_GA_ID && <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />}
    </html>
  );
}
