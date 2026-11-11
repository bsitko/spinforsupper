import type { Restaurant } from "./types";

// Saved places and wheels live in this browser only (no accounts).
export type SavedWheel = { id: string; name: string; items: Restaurant[]; pool: Restaurant[]; source: "google" | "demo"; savedAt: number };

const FAV = "sfs-favorites";
const WHEELS = "sfs-wheels";

function read<T>(key: string): T[] {
  try {
    const v = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function write(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {}
}

export const loadFavorites = () => read<Restaurant>(FAV);
export const saveFavorites = (list: Restaurant[]) => write(FAV, list.slice(0, 100));
export const loadWheels = () => read<SavedWheel>(WHEELS);
export const saveWheels = (list: SavedWheel[]) =>
  write(WHEELS, list.slice(0, 30));
