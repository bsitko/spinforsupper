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

// How each craving reads inside a combined search, and which Google place types count as that craving.
const SEARCH_WORD: Record<string, string> = { japanese: "sushi", breakfast: "breakfast", mediterranean: "mediterranean", bbq: "bbq" };
const CRAVING_TYPES: Record<string, string[]> = {
  american: ["american_restaurant", "hamburger_restaurant", "steak_house", "diner", "chicken_restaurant", "sandwich_shop"],
  pizza: ["pizza_restaurant"],
  mexican: ["mexican_restaurant"],
  italian: ["italian_restaurant"],
  chinese: ["chinese_restaurant"],
  japanese: ["japanese_restaurant", "sushi_restaurant", "ramen_restaurant"],
  thai: ["thai_restaurant"],
  indian: ["indian_restaurant"],
  mediterranean: ["mediterranean_restaurant", "greek_restaurant", "lebanese_restaurant", "turkish_restaurant", "middle_eastern_restaurant"],
  bbq: ["barbecue_restaurant"],
  breakfast: ["breakfast_restaurant", "brunch_restaurant", "diner"],
  seafood: ["seafood_restaurant"],
  vegetarian: ["vegetarian_restaurant", "vegan_restaurant"],
};
// Name words for places Google only types as plain "restaurant".
const CRAVING_WORDS: Record<string, RegExp> = {
  american: /burger|grill|diner|steak/i,
  pizza: /pizz/i,
  mexican: /taco|taquer|mexic|cantina|burrito/i,
  italian: /italia|trattoria|osteria|pasta/i,
  chinese: /china|chinese|wok|dumpling/i,
  japanese: /sushi|ramen|japan|izakaya/i,
  thai: /thai/i,
  indian: /india|tandoor|masala|curry/i,
  mediterranean: /mediterr|greek|gyro|falafel|kebab|shawarma/i,
  bbq: /bbq|barbe|smoke/i,
  breakfast: /breakfast|brunch|pancake|waffle/i,
  seafood: /seafood|oyster|crab|lobster|fish/i,
  vegetarian: /vegan|vegetarian|veggie|plant/i,
};
function matchesCraving(pl: any, id: string) {
  const types: string[] = [pl.primaryType, ...(pl.types || [])].filter(Boolean);
  if ((CRAVING_TYPES[id] || []).some((t) => types.includes(t))) return true;
  return CRAVING_WORDS[id]?.test(`${pl.displayName?.text ?? ""} ${pl.primaryTypeDisplayName?.text ?? ""}`) ?? false;
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
    .slice(0, 4); // food cravings share one Google search, so more would thin out each craving's share of the 20 results
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
  // Food cravings share one Google search; Cocktails needs its own (different place type).
  const batches: string[][] = [
    cuisines.filter((c) => c !== "cocktails"),
    cuisines.includes("cocktails") ? ["cocktails"] : [],
  ].filter((b) => b.length);
  if (settings.dailyCap > 0 && (await callsToday()) + batches.length > settings.dailyCap) {
    await recordSearch({ calls: 0, cravings: cuisines, served: "capped" });
    return respond(demo(restMsg));
  }

  // ---- Google Places API (New) Text Search: one search for all food cravings (+1 if Cocktails) ----
  async function search(batch: string[]) {
    const cuisine = batch[0];
    const c = batch.length === 1 ? CUISINES.find((c) => c.id === cuisine) : undefined;
    // Several cravings: "pizza or mexican or sushi restaurants in Austin".
    const what =
      batch.length > 1
        ? `${batch.map((id) => SEARCH_WORD[id] ?? id).join(" or ")} restaurants`
        : !c || cuisine === "any"
          ? "restaurants"
          : "query" in c
            ? c.query
            : `${c.label} restaurants`;
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
    let res = await call(summaryOk).catch(() => call(summaryOk)); // one retry on a network blip
    if (res.status >= 500) res = await call(summaryOk); // and one on a Google hiccup
    if (res.status === 400 && summaryOk) {
      const msg = await res.text();
      if (/reviewSummary/i.test(msg)) {
        console.error("Google rejected reviewSummary; turning it off.", msg);
        summaryOk = false;
        res = await call(false);
      } else throw new Error(`Places API 400: ${msg}`);
    }
    if (!res.ok) throw Object.assign(new Error(`Places API ${res.status}: ${await res.text()}`), { status: res.status });
    return res.json() as Promise<{ places?: any[] }>;
  }

  // One page (up to 20 places) per search; each call is billed, so no extra pages.
  // Returns one group per craving in the batch (so the wheel can take turns), plus places that fit none of them.
  async function placesFor(batch: string[]): Promise<Restaurant[][]> {
    const { places = [] } = await search(batch);
    const open = places.filter((pl) => !pl.businessStatus || pl.businessStatus === "OPERATIONAL");
    if (batch.length === 1) return [open.map((pl) => toRestaurant(pl, batch[0]))];
    const groups: Restaurant[][] = batch.map(() => []);
    const other: Restaurant[] = [];
    for (const pl of open) {
      const i = batch.findIndex((id) => matchesCraving(pl, id));
      if (i >= 0) groups[i].push(toRestaurant(pl, batch[i]));
      else other.push(toRestaurant(pl, ""));
    }
    return [...groups, other];
  }

  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Whoa, that's a lot of spinning! Try again in a few minutes." }, { status: 429 });
  }

  try {
    // One craving failing shouldn't sink the others; the blocklist (Redis) failing shouldn't sink anything.
    const [settled, blocked] = await Promise.all([
      Promise.allSettled(batches.map(placesFor)),
      getBlocked().catch((e) => (console.error("getBlocked failed", e), {} as Record<string, string>)),
    ]);
    const failures = settled.filter((r): r is PromiseRejectedResult => r.status === "rejected").map((r) => r.reason);
    for (const f of failures) console.error("Places search failed:", f?.message ?? f);
    if (failures.length === settled.length) {
      // Google says we're over quota (429): show sample spots with the friendly note instead of an error.
      if (failures.some((f) => f?.status === 429)) {
        await recordSearch({ calls: 0, cravings: cuisines, served: "quota" });
        return respond(demo(restMsg));
      }
      throw failures[0];
    }
    const results = settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    await recordSearch({ calls: batches.length, cravings: cuisines, served: "google" });
    // Blocked places (admin panel) are dropped. The same place can show up under two cravings; keep it once.
    const seen = new Set<string>(Object.keys(blocked));
    const groups = results.map((list) => kidFilter(list.filter((r) => !seen.has(r.id) && seen.add(r.id))));
    // Places that matched no specific craving (cuisine "") only fill in when the cravings run short.
    const main = groups.filter((g) => g[0]?.cuisine !== "");
    const extra = groups.filter((g) => g[0]?.cuisine === "");
    const first = roundRobin(main, count);
    const picked = shuffle([...first, ...roundRobin(extra, count - first.length)]);
    const body: SearchResponse = { source: "google", restaurants: picked, pool: makePool(picked, groups) };
    if (!picked.length) body.message = "No restaurants matched. Try loosening the filters.";
    return respond(body);
  } catch (e) {
    console.error(e);
    const status = (e as { status?: number })?.status;
    const why = status === 403 ? "the API key was refused" : status === 400 ? "Google didn't like the request" : status ? `Google error ${status}` : "no answer";
    return NextResponse.json({ error: `Couldn't reach Google Places (${why}). Try again in a moment.` }, { status: 502 });
  }
}
