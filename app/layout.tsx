import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Where Should We Eat?",
  description: "Can't decide? Spin the wheel and let fate pick dinner.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ff6b35" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
