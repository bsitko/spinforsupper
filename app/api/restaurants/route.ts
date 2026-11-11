import { NextRequest, NextResponse } from "next/server";
import { CUISINES } from "@/lib/cuisines";
import { demoRestaurants } from "@/lib/demo";
import { foodStyle } from "@/lib/style";
import { callsToday, fillTemplate, getBlocked, getSettings, recordSearch } from "@/lib/store";
import type { Restaurant, SearchResponse } from "@/lib/types";

const PRICE_ENUM = [
  "PRICE_LEVEL_FREE",
  "PRICE_LEVEL_INEXPENSIVE",
  "PRICE_LEVEL_MODERATE",
  "PRICE_LEVEL_EXPENSIVE",
  "PRICE_LEVEL_VERY_EXPENSIVE",
];

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.rating",
  "places.userRatingCount",
  "places.priceLevel",
  "places.googleMapsUri",
  "places.currentOpeningHours.openNow",
  "places.businessStatus",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.primaryTypeDisplayName",
  "places.primaryType",
  "places.types",
  "places.photos", // just the photo reference: no extra charge until a photo is actually loaded
].join(",");
// "Atmosphere" fields put each search in Google's higher price tier (Bill chose this, 2026-11-11):
// once one is asked for, the rest come at no extra cost, so we ask for all the useful ones.
const ATMOSPHERE_FIELDS = [
  "places.goodForChildren",
  "places.menuForChildren",
  "places.editorialSummary",
  "places.reservable",
  "places.dineIn",
  "places.takeout",
  "places.delivery",
  "places.outdoorSeating",
].join(",");
// Google's AI review summary. Same price tier; if Google ever rejects the field, we retry once without it.
const SUMMARY_FIELD = "places.reviewSummary";
let summaryOk = true;

// Basic abuse guard: each IP gets a limited number of Google searches per window (per server instance).
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 20;
const hits = new Map<string, number[]>();
function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > RATE_MAX;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const POOL_SIZE = 20;

// The list view: the wheel's places plus up to POOL_SIZE others that matched.
function makePool(wheel: Restaurant[], groups: Restaurant[][]): Restaurant[] {
  const ids = new Set(wheel.map((r) => r.id));
  const rest = roundRobin(groups, POOL_SIZE * 2).filter((r) => !ids.has(r.id));
  return [...wheel, ...rest].slice(0, Math.max(POOL_SIZE, wheel.length));
}

// Pick `count` items, taking turns between groups so every craving gets slices.
function roundRobin<T>(groups: T[][], count: number): T[] {
  const qs = groups.map(shuffle).filter((g) => g.length);
  const out: T[] = [];
  while (out.length < count && qs.some((q) => q.length)) {
    for (const q of qs) if (q.length && out.length < count) out.push(q.shift()!);
  }
  return out;
}

function toRestaurant(pl: any, cuisine: string): Restaurant {
  return {
    id: pl.id,
    name: pl.displayName?.text ?? "Unknown",
    address: pl.formattedAddress ?? "",
    rating: pl.rating,
    ratingCount: pl.userRatingCount,
    price: pl.priceLevel ? PRICE_ENUM.indexOf(pl.priceLevel) || undefined : undefined,
    kidFriendly:
      pl.goodForChildren === true || pl.menuForChildren === true ? true : pl.goodForChildren === false ? false : undefined,
    openNow: pl.currentOpeningHours?.openNow,
    phone: pl.nationalPhoneNumber,
    website: pl.websiteUri,
    category: pl.primaryTypeDisplayName?.text,
    ...(({ style, emoji }) => ({ style, styleEmoji: emoji }))(foodStyle(pl.primaryType, pl.types, cuisine, pl.primaryTypeDisplayName?.text)),
    cuisine,
    description: pl.editorialSummary?.text,
    reviewSummary: pl.reviewSummary?.text?.text
      ? {
          text: pl.reviewSummary.text.text,
          disclosure: pl.reviewSummary.disclosureText?.text || "Summarized with Gemini",
          reviewsUrl: pl.reviewSummary.reviewsUri,
          flagUrl: pl.reviewSummary.flagContentUri,
        }
      : undefined,
    serves: {
      reservable: pl.reservable,
      dineIn: pl.dineIn,
      takeout: pl.takeout,
      delivery: pl.delivery,
      outdoorSeating: pl.outdoorSeating,
    },
    photo: pl.photos?.[0]?.name,
    photoBy: pl.photos?.[0]?.authorAttributions?.[0]
      ? { name: pl.photos[0].authorAttributions[0].displayName, url: pl.photos[0].authorAttributions[0].uri }
      : undefined,
    mapsUrl: pl.googleMapsUri ?? `https://www.google.com/maps/place/?q=place_id:${pl.id}`,
  };
}

const VALID = new Set<string>(CUISINES.map((c) => c.id));

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const where = (p.get("where") || p.get("zip") || "").trim().slice(0, 80);
  const lat = parseFloat(p.get("lat") || "");
  const lng = parseFloat(p.get("lng") || "");
  let cuisines = (p.get("cuisines") || p.get("cuisine") || "any")
    .split(",")
    .filter((c) => VALID.has(c) && c !== "any")
    .slice(0, 4); // each craving is one billed Google call
  if (!cuisines.length) cuisines = ["any"];
  const prices = (p.get("prices") || "")
    .split(",")
    .map(Number)
    .filter((n) => n >= 1 && n <= 4);
  const kids = p.get("kids") === "1";
  const openNow = p.get("open") === "1";
  const minRating = [4, 4.5].includes(Number(p.get("stars"))) ? Number(p.get("stars")) : 0;
  const count = Math.min(Math.max(parseInt(p.get("count") || "8", 10) || 8, 2), 12);

  const hasLocation = where.length > 1 || (!isNaN(lat) && !isNaN(lng));
  if (!hasLocation) {
    return NextResponse.json({ error: "Type a zip or city, or use your location." }, { status: 400 });
  }

  const key = process.env.GOOGLE_PLACES_API_KEY;

  // Kid filter: drop places marked not kid-friendly; prefer confirmed ones, fall back to unknown.
  const kidFilter = (list: Restaurant[]) => {
    if (!kids) return list;
    const yes = list.filter((r) => r.kidFriendly === true);
    return yes.length >= Math.ceil(count / cuisines.length) ? yes : list.filter((r) => r.kidFriendly !== false);
  };

  const settings = await getSettings();
  // Book / Order links are filled in on the server so the affiliate templates live in one place (the admin panel).
  const withLinks = (list: Restaurant[]) =>
    list.map((r) => ({ ...r, bookUrl: fillTemplate(settings.bookTemplate, r), orderUrl: fillTemplate(settings.orderTemplate, r) }));
  const respond = (body: SearchResponse) =>
    NextResponse.json({ ...body, restaurants: withLinks(body.restaurants), pool: withLinks(body.pool) });

  // ---- Demo restaurants: no key, kill switch on, or today's Google budget used up ----
  const demo = (message: string): SearchResponse => {
    const all = demoRestaurants().filter(
      (r) => (prices.length === 0 || prices.includes(r.price!)) && (!kids || r.kidFriendly) && (!openNow || r.openNow) && (r.rating ?? 0) >= minRating
    );
    const groups = cuisines[0] === "any" ? [all] : cuisines.map((c) => all.filter((r) => r.cuisine === c));
    const wheel = shuffle(roundRobin(groups, count));
    return { source: "demo", restaurants: wheel, pool: makePool(wheel, groups), message };
  };
  const noKeyMsg = "Demo mode: these are made-up restaurants. Add a Google Places API key for real ones.";
  const restMsg = "We're taking a quick breather from live listings. These are sample spots; try again later!";
  if (!key) return respond(demo(noKeyMsg));
  if (settings.paused) {
    await recordSearch({ calls: 0, cravings: cuisines, served: "paused" });
    return respond(demo(restMsg));
  }
  if (settings.dailyCap > 0 && (await callsToday()) + cuisines.length > settings.dailyCap) {
    await recordSearch({ calls: 0, cravings: cuisines, served: "capped" });
    return respond(demo(restMsg));
  }

  // ---- Google Places API (New) Text Search: one search per craving ----
  async function search(cuisine: string) {
    const c = CUISINES.find((c) => c.id === cuisine);
    const what = !c || cuisine === "any" ? "restaurants" : "query" in c ? c.query : `${c.label} restaurants`;
    // "pizza restaurants in Austin, TX" / "restaurants in 60614": Google resolves the place itself.
    const reqBody: Record<string, unknown> = {
      textQuery: where ? `${what} in ${where}` : what,
      pageSize: 20,
      includedType: c && "type" in c ? c.type : "restaurant",
    };
    if (!where) reqBody.locationBias = { circle: { center: { latitude: lat, longitude: lng }, radius: 8000 } };
    if (prices.length) reqBody.priceLevels = prices.map((n) => PRICE_ENUM[n]);
    if (openNow) reqBody.openNow = true;
    if (minRating) reqBody.minRating = minRating; // Google filters for us, at no extra cost

    const call = (withSummary: boolean) =>
      fetch(process.env.PLACES_API_URL || "https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key!,
          "X-Goog-FieldMask": `${FIELD_MASK},${ATMOSPHERE_FIELDS}${withSummary ? `,${SUMMARY_FIELD}` : ""}`,
        },
        body: JSON.stringify(reqBody),
        cache: "no-store",
      });
    let res = await call(summaryOk);
    if (res.status === 400 && summaryOk) {
      const msg = await res.text();
      if (/reviewSummary/i.test(msg)) {
        console.error("Google rejected reviewSummary; turning it off.", msg);
        summaryOk = false;
        res = await call(false);
      } else throw new Error(`Places API 400: ${msg}`);
    }
    if (!res.ok) throw new Error(`Places API ${res.status}: ${await res.text()}`);
    return res.json() as Promise<{ places?: any[] }>;
  }

  // One page (up to 20 places) per craving. Each call is billed, so no extra pages.
  async function placesFor(cuisine: string): Promise<Restaurant[]> {
    const { places = [] } = await search(cuisine);
    return places.filter((pl) => !pl.businessStatus || pl.businessStatus === "OPERATIONAL").map((pl) => toRestaurant(pl, cuisine));
  }

  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Whoa, that's a lot of spinning! Try again in a few minutes." }, { status: 429 });
  }

  try {
    const [results, blocked] = await Promise.all([Promise.all(cuisines.map(placesFor)), getBlocked()]);
    await recordSearch({ calls: cuisines.length, cravings: cuisines, served: "google" });
    // Blocked places (admin panel) are dropped. The same place can show up under two cravings; keep it once.
    const seen = new Set<string>(Object.keys(blocked));
    const groups = results.map((list) => kidFilter(list.filter((r) => !seen.has(r.id) && seen.add(r.id))));
    const picked = shuffle(roundRobin(groups, count));
    const body: SearchResponse = { source: "google", restaurants: picked, pool: makePool(picked, groups) };
    if (!picked.length) body.message = "No restaurants matched. Try loosening the filters.";
    return respond(body);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Couldn't reach Google Places. Check the API key." }, { status: 502 });
  }
}
