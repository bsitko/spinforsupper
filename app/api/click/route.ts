import { NextRequest, NextResponse } from "next/server";
import { recordClick } from "@/lib/store";

const KINDS = new Set(["book", "order", "maps", "website", "tip"]);

// Counts outbound clicks for the admin report. Fire-and-forget from the browser.
export async function POST(req: NextRequest) {
  const { kind } = (await req.json().catch(() => ({}))) as { kind?: string };
  if (kind && KINDS.has(kind)) await recordClick(kind);
  return new NextResponse(null, { status: 204 });
}
