import type { Restaurant } from "./types";

// Google's documented Maps URL: works for real place IDs and falls back to a name search for anything else.
export function mapsLink(name: string, address: string, id?: string) {
  const q = new URLSearchParams({ api: "1", query: [name, address].filter(Boolean).join(", ") });
  if (id && /^[\w-]{10,}$/.test(id)) q.set("query_place_id", id);
  return `https://www.google.com/maps/search/?${q}`;
}

// The share link carries just enough to draw the card: no lookups, so sharing costs nothing.
export function pickParams(r: Restaurant) {
  const q = new URLSearchParams({ n: r.name.slice(0, 80), a: r.address.slice(0, 120) });
  if (r.id) q.set("id", r.id.slice(0, 200));
  if (r.rating) q.set("r", r.rating.toFixed(1));
  if (r.price) q.set("p", String(r.price));
  if (r.style) q.set("s", r.style.slice(0, 30));
  if (r.styleEmoji) q.set("e", r.styleEmoji);
  return q;
}

export type Pick = { name: string; address: string; id?: string; rating?: string; price?: number; style?: string; emoji?: string };

export function readPick(sp: Record<string, string | string[] | undefined>): Pick | null {
  const g = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  };
  const name = g("n")?.slice(0, 80);
  if (!name) return null;
  const rating = g("r");
  const price = Number(g("p"));
  return {
    name,
    address: g("a")?.slice(0, 120) ?? "",
    id: g("id")?.slice(0, 200),
    rating: rating && /^\d(\.\d)?$/.test(rating) ? rating : undefined,
    price: price >= 1 && price <= 4 ? price : undefined,
    style: g("s")?.slice(0, 30),
    emoji: g("e") ? Array.from(g("e")!).slice(0, 2).join("") : undefined,
  };
}
