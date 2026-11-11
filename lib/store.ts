// Small persistence layer for the admin panel: usage counters, settings, blocklist, click counts.
// Uses Upstash Redis when configured (Vercel Marketplace sets the env vars); otherwise an in-memory
// fallback so the app still runs locally — that fallback resets on every deploy/cold start.
import { Redis } from "@upstash/redis";

export type Settings = {
  dailyCap: number; // max billed Google calls per day (Pacific time, like Google's quota). 0 = no cap.
  paused: boolean; // kill switch: no Google calls at all, demo restaurants only
  costPerCall: number; // USD, for the cost estimate
  bookTemplate: string; // "Book a table" link; {name} {address} {query} are filled in, URL-encoded
  orderTemplate: string; // "Order delivery" link, same placeholders
};

export const DEFAULT_SETTINGS: Settings = {
  dailyCap: 300,
  paused: false,
  costPerCall: 0.035,
  bookTemplate: "https://www.opentable.com/s?term={query}",
  orderTemplate: "https://www.doordash.com/search/store/{name}/",
};

const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;
export const persistent = !!redis;

// In-memory stand-in with the few Redis calls we use.
const mem = { kv: new Map<string, unknown>(), hashes: new Map<string, Map<string, number | string>>() };
function memHash(key: string) {
  if (!mem.hashes.has(key)) mem.hashes.set(key, new Map());
  return mem.hashes.get(key)!;
}

/** Day key in Pacific time, matching when Google resets daily quotas. */
export function dayKey(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(d); // YYYY-MM-DD
}

async function hincr(key: string, field: string, by = 1) {
  if (redis) {
    await redis.hincrby(key, field, by);
    await redis.expire(key, 60 * 60 * 24 * 120);
  } else {
    const h = memHash(key);
    h.set(field, Number(h.get(field) || 0) + by);
  }
}

async function hgetall(key: string): Promise<Record<string, number | string>> {
  if (redis) return ((await redis.hgetall(key)) as Record<string, number | string>) || {};
  return Object.fromEntries(memHash(key));
}

export async function getSettings(): Promise<Settings> {
  try {
    const saved = redis ? await redis.get<Partial<Settings>>("settings") : (mem.kv.get("settings") as Partial<Settings>);
    return { ...DEFAULT_SETTINGS, ...(saved || {}) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(patch: Partial<Settings>) {
  const next = { ...(await getSettings()), ...patch };
  if (redis) await redis.set("settings", next);
  else mem.kv.set("settings", next);
  return next;
}

/** Billed Google calls so far today. */
export async function callsToday() {
  const h = await hgetall(`stats:${dayKey()}`);
  return Number(h.calls || 0);
}

export async function recordSearch(opts: { calls: number; cravings: string[]; served: "google" | "demo" | "capped" | "paused" }) {
  const day = dayKey();
  try {
    await hincr(`stats:${day}`, "searches");
    if (opts.calls) await hincr(`stats:${day}`, "calls", opts.calls);
    await hincr(`stats:${day}`, opts.served);
    for (const c of opts.cravings) await hincr(`cravings:${day.slice(0, 7)}`, c);
  } catch (e) {
    console.error("recordSearch failed", e); // counters must never break searching
  }
}

export async function recordClick(kind: string) {
  try {
    await hincr(`clicks:${dayKey()}`, kind);
  } catch (e) {
    console.error("recordClick failed", e);
  }
}

export async function getStats(days = 14) {
  const out = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.now() - i * 86400000);
    const day = dayKey(d);
    const [s, c] = await Promise.all([hgetall(`stats:${day}`), hgetall(`clicks:${day}`)]);
    out.push({
      day,
      searches: Number(s.searches || 0),
      calls: Number(s.calls || 0),
      capped: Number(s.capped || 0) + Number(s.paused || 0),
      clicks: Object.fromEntries(Object.entries(c).map(([k, v]) => [k, Number(v)])),
    });
  }
  const month = dayKey().slice(0, 7);
  const cravings = Object.entries(await hgetall(`cravings:${month}`))
    .map(([k, v]) => [k, Number(v)] as [string, number])
    .sort((a, b) => b[1] - a[1]);
  return { days: out, cravings, month };
}

// Blocklist: Google place ID -> name (the name is only for the admin list).
export async function getBlocked(): Promise<Record<string, string>> {
  if (redis) return ((await redis.hgetall("blocked")) as Record<string, string>) || {};
  return Object.fromEntries(memHash("blocked")) as Record<string, string>;
}
export async function block(id: string, name: string) {
  if (redis) await redis.hset("blocked", { [id]: name });
  else memHash("blocked").set(id, name);
}
export async function unblock(id: string) {
  if (redis) await redis.hdel("blocked", id);
  else memHash("blocked").delete(id);
}

/** Fill a link template. Every placeholder value is URL-encoded. */
export function fillTemplate(template: string, r: { name: string; address?: string }) {
  if (!template) return undefined;
  const city = (r.address || "").split(",").slice(-3, -1).join(",").trim();
  const vals: Record<string, string> = { name: r.name, address: r.address || "", query: `${r.name} ${city}`.trim() };
  return template.replace(/\{(name|address|query)\}/g, (_, k) => encodeURIComponent(vals[k]));
}
