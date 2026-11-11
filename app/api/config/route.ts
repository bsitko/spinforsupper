import { NextResponse } from "next/server";
import { getSettings } from "@/lib/store";

// Public bits of the admin settings that the page needs before any search (just the tip link for now).
export const dynamic = "force-dynamic";
export async function GET() {
  const s = await getSettings();
  return NextResponse.json({ tipUrl: s.tipUrl || "" }, { headers: { "Cache-Control": "public, max-age=60" } });
}
