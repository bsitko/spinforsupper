import { NextRequest, NextResponse } from "next/server";
import { callsToday, getSettings, recordPhoto } from "@/lib/store";

// One restaurant photo, loaded only when someone opens a place's popup.
// Google bills each photo, so this follows the admin pause switch and daily cap, and keeps the API key on the server.
const VALID = /^places\/[\w-]+\/photos\/[\w-]+$/;

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name") || "";
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key || !VALID.test(name)) return new NextResponse(null, { status: 404 });

  const settings = await getSettings();
  if (settings.paused || (settings.dailyCap > 0 && (await callsToday()) >= settings.dailyCap)) {
    return new NextResponse(null, { status: 404 });
  }

  const base = process.env.PLACES_PHOTO_BASE || "https://places.googleapis.com/v1";
  try {
    const res = await fetch(`${base}/${name}/media?maxWidthPx=800&maxHeightPx=600&skipHttpRedirect=true`, {
      headers: { "X-Goog-Api-Key": key },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Places photo ${res.status}`);
    const { photoUri } = (await res.json()) as { photoUri?: string };
    if (!photoUri) throw new Error("no photoUri");
    await recordPhoto();
    // The browser keeps this for an hour, so reopening the same popup doesn't bill again.
    return NextResponse.redirect(photoUri, { status: 302, headers: { "Cache-Control": "private, max-age=3600" } });
  } catch (e) {
    console.error(e);
    return new NextResponse(null, { status: 404 });
  }
}
