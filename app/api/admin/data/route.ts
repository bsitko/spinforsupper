import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { callsToday, getBlocked, getSettings, getStats, persistent } from "@/lib/store";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  const [settings, stats, blocked, today] = await Promise.all([getSettings(), getStats(14), getBlocked(), callsToday()]);
  return NextResponse.json({
    settings,
    stats,
    blocked,
    today,
    persistent,
    googleKey: !!process.env.GOOGLE_PLACES_API_KEY,
  });
}
