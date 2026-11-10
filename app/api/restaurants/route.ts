import { NextRequest, NextResponse } from "next/server";
import { CUISINES } from "@/lib/cuisines";
import { demoRestaurants } from "@/lib/demo";
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
  "places.goodForChildren",
  "places.menuForChildren",
  "places.currentOpeningHours.openNow",
  "places.businessStatus",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.primaryTypeDisplayName",
].join(",");

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
    cuisine,
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
    .slice(0, 6);
  if (!cuisines.length) cuisines = ["any"];
  const prices = (p.get("prices") || "")
    .split(",")
    .map(Number)
    .filter((n) => n >= 1 && n <= 4);
  const kids = p.get("kids") === "1";
  const openNow = p.get("open") === "1";
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

  // ---- Demo mode: no key configured ----
  if (!key) {
    const all = demoRestaurants().filter(
      (r) => (prices.length === 0 || prices.includes(r.price!)) && (!kids || r.kidFriendly) && (!openNow || r.openNow)
    );
    const groups = cuisines[0] === "any" ? [all] : cuisines.map((c) => all.filter((r) => r.cuisine === c));
    const wheel = shuffle(roundRobin(groups, count));
    const body: SearchResponse = {
      source: "demo",
      restaurants: wheel,
      pool: makePool(wheel, groups),
      message: "Demo mode: these are made-up restaurants. Add a Google Places API key for real ones.",
    };
    return NextResponse.json(body);
  }

  // ---- Google Places API (New) Text Search: one search per craving ----
  async function search(cuisine: string, pageToken?: string) {
    const label = CUISINES.find((c) => c.id === cuisine)?.label;
    const what = cuisine === "any" || !label ? "restaurants" : `${label} restaurants`;
    // "pizza restaurants in Austin, TX" / "restaurants in 60614": Google resolves the place itself.
    const reqBody: Record<string, unknown> = {
      textQuery: where ? `${what} in ${where}` : what,
      pageSize: 20,
      includedType: "restaurant",
    };
    if (!where) reqBody.locationBias = { circle: { center: { latitude: lat, longitude: lng }, radius: 8000 } };
    if (prices.length) reqBody.priceLevels = prices.map((n) => PRICE_ENUM[n]);
    if (openNow) reqBody.openNow = true;
    if (pageToken) reqBody.pageToken = pageToken;

    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key!,
        "X-Goog-FieldMask": FIELD_MASK + ",nextPageToken",
      },
      body: JSON.stringify(reqBody),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Places API ${res.status}: ${await res.text()}`);
    return res.json() as Promise<{ places?: any[]; nextPageToken?: string }>;
  }

  async function placesFor(cuisine: string): Promise<Restaurant[]> {
    const first = await search(cuisine);
    let places = first.places || [];
    // With a single craving, grab a second page so the random pick has more variety.
    if (cuisines.length === 1 && first.nextPageToken) {
      try {
        places = places.concat((await search(cuisine, first.nextPageToken)).places || []);
      } catch {
        /* one page is fine */
      }
    }
    return places.filter((pl) => !pl.businessStatus || pl.businessStatus === "OPERATIONAL").map((pl) => toRestaurant(pl, cuisine));
  }

  try {
    const results = await Promise.all(cuisines.map(placesFor));
    // The same place can show up under two cravings; keep it in the first group only.
    const seen = new Set<string>();
    const groups = results.map((list) => kidFilter(list.filter((r) => !seen.has(r.id) && seen.add(r.id))));
    const picked = shuffle(roundRobin(groups, count));
    const body: SearchResponse = { source: "google", restaurants: picked, pool: makePool(picked, groups) };
    if (!picked.length) body.message = "No restaurants matched. Try loosening the filters.";
    return NextResponse.json(body);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Couldn't reach Google Places. Check the API key." }, { status: 502 });
  }
}
