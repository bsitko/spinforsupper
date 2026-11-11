import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { readPick } from "@/lib/share";

export const runtime = "edge";

// The preview card that shows up when a winner link is pasted into a group chat.
export function GET(req: NextRequest) {
  const pick = readPick(Object.fromEntries(req.nextUrl.searchParams));
  const name = pick?.name ?? "Spin for Supper";
  const info = pick ? [pick.style, pick.rating && `Rated ${pick.rating}`, pick.price && "$".repeat(pick.price)].filter(Boolean).join("  ·  ") : "";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "70px 80px", background: "#fff8ef", color: "#1d1d2c", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", fontSize: 44, fontWeight: 800, color: "#ff6b35" }}>
          <svg width="56" height="56" viewBox="-10 -10 20 20" style={{ marginRight: 18 }}>
            <circle r="10" fill="#1d1d2c" />
            <path d="M0 0 L0 -9 A9 9 0 0 1 9 0 Z" fill="#ff6b35" />
            <path d="M0 0 L9 0 A9 9 0 0 1 0 9 Z" fill="#ffd166" />
            <path d="M0 0 L0 9 A9 9 0 0 1 -9 0 Z" fill="#ff6b35" />
            <path d="M0 0 L-9 0 A9 9 0 0 1 0 -9 Z" fill="#ffd166" />
            <circle r="2.5" fill="#fff8ef" />
          </svg>
          The wheel has spoken!
        </div>
        <div style={{ display: "flex", fontSize: name.length > 28 ? 84 : 108, fontWeight: 900, lineHeight: 1.02, marginTop: 24, letterSpacing: -3 }}>{name}</div>
        {info && <div style={{ display: "flex", fontSize: 44, fontWeight: 700, color: "#6b6b80", marginTop: 26 }}>{info}</div>}
        <div style={{ display: "flex", marginTop: "auto", fontSize: 36, fontWeight: 800 }}>
          Spin for <span style={{ color: "#ff6b35", marginLeft: 12 }}>Supper!</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
