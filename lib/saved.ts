import type { Restaurant } from "./types";

// Saved places and wheels live in this browser only (no accounts).
export type SavedWheel = { id: string; name: string; items: Restaurant[]; pool: Restaurant[]; source: "google" | "demo"; savedAt: number };

const FAV = "sfs-favorites";
const WHEELS = "sfs-wheels";
const HIDDEN = "sfs-hidden";

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
// "Not for us" places: never shown again on this device. Just id + name (for the undo list).
export type Hidden = { id: string; name: string };
export const loadHidden = () => read<Hidden>(HIDDEN);
export const saveHidden = (list: Hidden[]) => write(HIDDEN, list.slice(0, 300));
export const loadWheels = () => read<SavedWheel>(WHEELS);
export const saveWheels = (list: SavedWheel[]) =>
  write(WHEELS, list.slice(0, 30));
