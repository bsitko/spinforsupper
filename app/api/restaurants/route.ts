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

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const zip = (p.get("zip") || "").trim();
  const lat = parseFloat(p.get("lat") || "");
  const lng = parseFloat(p.get("lng") || "");
  const cuisine = p.get("cuisine") || "any";
  const prices = (p.get("prices") || "")
    .split(",")
    .map(Number)
    .filter((n) => n >= 1 && n <= 4);
  const kids = p.get("kids") === "1";
  const openNow = p.get("open") === "1";
  const count = Math.min(Math.max(parseInt(p.get("count") || "8", 10) || 8, 2), 12);

  const hasLocation = /^\d{5}$/.test(zip) || (!isNaN(lat) && !isNaN(lng));
  if (!hasLocation) {
    return NextResponse.json({ error: "Enter a 5-digit zip or use your location." }, { status: 400 });
  }

  const key = process.env.GOOGLE_PLACES_API_KEY;

  // ---- Demo mode: no key configured ----
  if (!key) {
    let list = demoRestaurants().filter(
      (r) =>
        (cuisine === "any" || r.cuisine === cuisine) &&
        (prices.length === 0 || prices.includes(r.price!)) &&
        (!kids || r.kidFriendly) &&
        (!openNow || r.openNow)
    );
    const body: SearchResponse = {
      source: "demo",
      restaurants: shuffle(list).slice(0, count),
      message: "Demo mode: these are made-up restaurants. Add a Google Places API key for real ones.",
    };
    return NextResponse.json(body);
  }

  // ---- Google Places API (New) Text Search ----
  const label = CUISINES.find((c) => c.id === cuisine)?.label;
  const what = cuisine === "any" || !label ? "restaurants" : `${label} restaurants`;
  const textQuery = zip ? `${what} near ${zip}` : what;

  const reqBody: Record<string, unknown> = {
    textQuery,
    pageSize: 20,
    includedType: "restaurant",
  };
  if (!zip) {
    reqBody.locationBias = { circle: { center: { latitude: lat, longitude: lng }, radius: 8000 } };
  }
  if (prices.length) reqBody.priceLevels = prices.map((n) => PRICE_ENUM[n]);
  if (openNow) reqBody.openNow = true;

  async function fetchPage(pageToken?: string) {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key!,
        "X-Goog-FieldMask": FIELD_MASK + ",nextPageToken",
      },
      body: JSON.stringify(pageToken ? { ...reqBody, pageToken } : reqBody),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Places API ${res.status}: ${await res.text()}`);
    return res.json() as Promise<{ places?: any[]; nextPageToken?: string }>;
  }

  try {
    // Grab up to 2 pages (40 places) so the random pick has more variety.
    const first = await fetchPage();
    let places = first.places || [];
    if (first.nextPageToken) {
      try {
        places = places.concat((await fetchPage(first.nextPageToken)).places || []);
      } catch {
        /* one page is fine */
      }
    }

    let list: Restaurant[] = places
      .filter((pl) => !pl.businessStatus || pl.businessStatus === "OPERATIONAL")
      .map((pl) => ({
        id: pl.id,
        name: pl.displayName?.text ?? "Unknown",
        address: pl.formattedAddress ?? "",
        rating: pl.rating,
        ratingCount: pl.userRatingCount,
        price: pl.priceLevel ? PRICE_ENUM.indexOf(pl.priceLevel) || undefined : undefined,
        kidFriendly:
          pl.goodForChildren === true || pl.menuForChildren === true
            ? true
            : pl.goodForChildren === false
              ? false
              : undefined,
        openNow: pl.currentOpeningHours?.openNow,
        phone: pl.nationalPhoneNumber,
        website: pl.websiteUri,
        category: pl.primaryTypeDisplayName?.text,
        mapsUrl: pl.googleMapsUri ?? `https://www.google.com/maps/place/?q=place_id:${pl.id}`,
      }));

    if (kids) {
      // Drop places Google says aren't kid-friendly; put confirmed ones first.
      const yes = list.filter((r) => r.kidFriendly === true);
      const maybe = list.filter((r) => r.kidFriendly === undefined);
      list = yes.length >= count ? yes : [...shuffle(yes), ...shuffle(maybe)];
    }

    const picked = kids ? list.slice(0, count) : shuffle(list).slice(0, count);
    const body: SearchResponse = { source: "google", restaurants: shuffle(picked) };
    if (!picked.length) body.message = "No restaurants matched. Try loosening the filters.";
    return NextResponse.json(body);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Couldn't reach Google Places. Check the API key." }, { status: 502 });
  }
}
