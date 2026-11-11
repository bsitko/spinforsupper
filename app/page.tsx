"use client";
import { useEffect, useRef, useState } from "react";
import Wheel from "./Wheel";
import Logo from "./Logo";
import { track } from "@/lib/analytics";
import { CUISINES } from "@/lib/cuisines";
import { THEMES, THEME_IDS, type Theme, type ThemeId } from "@/lib/themes";
import type { Restaurant, SearchResponse } from "@/lib/types";
import { pickParams } from "@/lib/share";
import { loadFavorites, loadWheels, saveFavorites, saveWheels, type SavedWheel } from "@/lib/saved";

const dollars = (n?: number) => (n ? "$".repeat(n) : "");

function score(r: Restaurant) {
  if (!r.rating) return 0;
  const v = r.ratingCount ?? 0;
  const m = 50; // reviews needed before a rating is fully trusted
  return (v / (v + m)) * r.rating + (m / (v + m)) * 4;
}

export default function Home() {
  const [zip, setZip] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [cuisines, setCuisines] = useState<string[]>(["any"]);
  const [prices, setPrices] = useState<number[]>([]);
  const [kids, setKids] = useState(false);
  const [openNow, setOpenNow] = useState(true);
  const [stars, setStars] = useState(0); // minimum rating: 0 = any

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [source, setSource] = useState<"google" | "demo">("demo");
  const [admin, setAdmin] = useState(false);

  // Shows admin-only controls (like blocking a place) when you're logged in to /admin.
  useEffect(() => {
    fetch("/api/admin/me")
      .then((r) => r.json())
      .then((d) => setAdmin(!!d.admin))
      .catch(() => {});
  }, []);
  const [items, setItems] = useState<Restaurant[]>([]); // on the wheel
  const [pool, setPool] = useState<Restaurant[]>([]); // everything that matched, for the list
  const [view, setView] = useState<"wheel" | "list">("wheel");
  const [loadedAt, setLoadedAt] = useState(0);
  const lastQuery = useRef(""); // the last search sent to Google, to avoid paying for the same one twice
  const [shown, setShown] = useState<{ r: Restaurant; won: boolean } | null>(null);
  const stageRef = useRef<HTMLElement>(null);
  const [theme, setThemeState] = useState<ThemeId>("diner");
  const [favorites, setFavorites] = useState<Restaurant[]>([]);
  const [wheels, setWheels] = useState<SavedWheel[]>([]);
  const [savedOpen, setSavedOpen] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  function say(msg: string) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  }

  useEffect(() => {
    setFavorites(loadFavorites());
    setWheels(loadWheels());
  }, []);

  const isFav = (p: Restaurant) => favorites.some((f) => f.id === p.id);
  function toggleFav(p: Restaurant) {
    const next = isFav(p) ? favorites.filter((f) => f.id !== p.id) : [p, ...favorites];
    setFavorites(next);
    saveFavorites(next);
    track(isFav(p) ? "unfavorite" : "favorite", { place: p.name });
    say(isFav(p) ? "Removed from favorites" : "❤️ Saved to favorites");
  }

  function saveWheel() {
    const label = cuisines[0] === "any" ? "Anything" : cuisines.map((c) => CUISINES.find((x) => x.id === c)?.label ?? c).join(" + ");
    const where = zip.trim() || "near me";
    const name = prompt("Name this wheel", `${label} · ${where}`);
    if (name === null) return;
    const w: SavedWheel = { id: String(Date.now()), name: name.trim().slice(0, 60) || `${label} · ${where}`, items, pool, source, savedAt: Date.now() };
    const next = [w, ...wheels];
    setWheels(next);
    saveWheels(next);
    track("save_wheel");
    say("💾 Wheel saved");
  }

  function deleteWheel(id: string) {
    const next = wheels.filter((w) => w.id !== id);
    setWheels(next);
    saveWheels(next);
  }

  // Put a saved set back on the wheel. No search, so it costs nothing.
  function openSaved(list: Restaurant[], all: Restaurant[], src: "google" | "demo") {
    setItems(list.slice(0, 12));
    setPool(all);
    setSource(src);
    setNotice("");
    setError("");
    setView("wheel");
    setSavedOpen(false);
    lastQuery.current = "";
    setLoadedAt(Date.now());
  }
  function spinFavorites() {
    const a = [...favorites];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    track("spin_favorites");
    openSaved(a, favorites, favorites.every((f) => f.id.startsWith("demo-")) ? "demo" : "google");
  }

  // Share the winner: the phone's share sheet when there is one, otherwise copy a link.
  async function share(p: Restaurant) {
    const url = `${location.origin}/pick?${pickParams(p)}`;
    const text = `🎡 The wheel picked ${p.name}!`;
    track("share", { place: p.name });
    if (navigator.share) {
      try {
        await navigator.share({ title: text, text, url });
      } catch {}
      return;
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      say("🔗 Link copied! Paste it in your group chat.");
    } catch {
      prompt("Copy this link:", url);
    }
  }

  // Recolor the page's buttons and highlights to match the wheel theme.
  useEffect(() => {
    const t: Theme = THEMES[theme];
    const root = document.documentElement.style;
    root.setProperty("--accent", t.accent);
    root.setProperty("--accent-dark", t.accentDark);
  }, [theme]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("wheel-theme") as ThemeId | null;
      if (saved && saved in THEMES) setThemeState(saved);
    } catch {}
  }, []);

  function setTheme(t: ThemeId) {
    setThemeState(t);
    track("theme", { theme: t });
    try {
      localStorage.setItem("wheel-theme", t);
    } catch {}
  }

  // Scroll down to the results each time a new batch loads.
  useEffect(() => {
    if (loadedAt) stageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [loadedAt]);

  function useMyLocation() {
    if (!navigator.geolocation) return setError("Your browser can't share location. Type a zip or city instead.");
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setZip("");
        setLocating(false);
      },
      () => {
        setLocating(false);
        setError("Couldn't get your location. Type a zip or city instead.");
      },
      { timeout: 10000, maximumAge: 300000 }
    );
  }

  // "Surprise me" is on its own; picking any craving turns it off, and clearing them all turns it back on.
  function toggleCuisine(id: string) {
    setCuisines((cur) => {
      if (id === "any") return ["any"];
      const rest = cur.filter((c) => c !== "any");
      const next = rest.includes(id) ? rest.filter((c) => c !== id) : [...rest, id];
      return next.length ? next : ["any"];
    });
  }

  const togglePrice = (p: number) =>
    setPrices((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p].sort()));

  async function loadWheel() {
    const place = zip.trim();
    const useZip = place.length > 1;
    if (!useZip && !coords) return setError("Type a zip or city, or tap “Near me”.");
    setLoading(true);
    setError("");
    setShown(null);
    const qs = new URLSearchParams({
      ...(useZip ? { where: place } : { lat: String(coords!.lat), lng: String(coords!.lng) }),
      cuisines: cuisines.join(","),
      prices: prices.join(","),
      kids: kids ? "1" : "0",
      open: openNow ? "1" : "0",
      stars: String(stars),
      count: "8",
    });
    // Same filters as last time? Reshuffle what we already have instead of paying for another search.
    if (qs.toString() === lastQuery.current && pool.length >= 2) {
      reshuffle();
      setLoading(false);
      setLoadedAt(Date.now());
      return;
    }
    track("search", { location: useZip ? "typed" : "near_me", cravings: cuisines.join(","), prices: prices.join(",") || "any", kids, open_now: openNow });
    try {
      const res = await fetch(`/api/restaurants?${qs}`);
      const data = (await res.json()) as SearchResponse & { error?: string };
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setNotice(data.message || "");
      setSource(data.source);
      if (data.restaurants.length < 2) {
        setItems([]);
        setPool([]);
        setError("Not enough places matched. Loosen the filters a little.");
      } else {
        setItems(data.restaurants);
        setPool(data.pool?.length ? data.pool : data.restaurants);
        setLoadedAt(Date.now());
        lastQuery.current = qs.toString();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // New wheel from the places already found: free, no Google call.
  function reshuffle() {
    const a = [...pool];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    setItems(a.slice(0, 8));
    setShown(null);
    track("new_wheel");
  }

  // Count outbound clicks for the admin report (doesn't block navigation).
  function countClick(kind: string) {
    try {
      const body = JSON.stringify({ kind });
      if (!navigator.sendBeacon?.("/api/click", new Blob([body], { type: "application/json" }))) {
        fetch("/api/click", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } });
      }
    } catch {}
  }

  async function blockPlace(p: Restaurant) {
    if (!confirm(`Hide "${p.name}" from everyone's results?`)) return;
    const res = await fetch("/api/admin/block", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id, name: p.name }) });
    if (!res.ok) return alert("Couldn't block it. Are you still logged in?");
    setItems((cur) => cur.filter((x) => x.id !== p.id));
    setPool((cur) => cur.filter((x) => x.id !== p.id));
    setShown(null);
  }

  function veto() {
    if (!shown) return;
    track("veto", { place: shown.r.name });
    setItems((cur) => cur.filter((r) => r.id !== shown.r.id));
    setShown(null);
  }

  // Rank by rating, trusting ratings with more reviews (a 5.0 from 3 reviews shouldn't beat a 4.7 from 900).
  const ranked = [...pool].sort((a, b) => score(b) - score(a));

  const usingLocation = !!coords && !zip.trim();
  const r = shown?.r;

  return (
    <main>
      <header>
        <div className="topbar">
          <button type="button" className="theme-toggle" onClick={() => setSavedOpen(true)}>
            ❤️ Saved{favorites.length + wheels.length ? ` (${favorites.length + wheels.length})` : ""}
          </button>
          <ThemeMenu theme={theme} onPick={setTheme} />
        </div>
        <Logo className="logo" />
        <h1>
          Spin for <span>Supper</span>
        </h1>
        <p className="tag">
          Hungry? Let’s find you a place to eat.
          <small>Browse the best spots near you, or spin the wheel and let fate decide.</small>
        </p>
      </header>

      <section className="step">
        <h2>
          <b>1</b> Where are you?
        </h2>
        <div className="where">
          <input
            className="big-input"
            maxLength={80}
            placeholder="Zip or city"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadWheel()}
            aria-label="Zip code or city"
            autoComplete="postal-code"
          />
          <span className="or">or</span>
          <button type="button" className={`big ${usingLocation ? "on" : ""}`} onClick={useMyLocation} disabled={locating}>
            {locating ? "Finding you…" : usingLocation ? "📍 Got it!" : "📍 Near me"}
          </button>
        </div>
      </section>

      <section className="step">
        <h2>
          <b>2</b> Craving? <small>pick any</small>
        </h2>
        <div className="tiles">
          {CUISINES.map((c) => (
            <button type="button" key={c.id} className={`tile ${cuisines.includes(c.id) ? "on" : ""}`} onClick={() => toggleCuisine(c.id)} aria-pressed={cuisines.includes(c.id)}>
              <span className="emoji">{c.emoji}</span>
              {c.label}
            </button>
          ))}
        </div>
      </section>

      <section className="step">
        <h2>
          <b>3</b> Anything else?
        </h2>
        <div className="prices">
          {[1, 2, 3, 4].map((p) => (
            <button type="button" key={p} className={`big ${prices.includes(p) ? "on" : ""}`} onClick={() => togglePrice(p)}>
              {dollars(p)}
            </button>
          ))}
        </div>
        <div className="prices three" role="radiogroup" aria-label="Minimum rating">
          {[
            [0, "⭐ Any"],
            [4, "⭐ 4+"],
            [4.5, "⭐ 4.5+"],
          ].map(([v, label]) => (
            <button type="button" role="radio" key={v} aria-checked={stars === v} className={`big ${stars === v ? "on" : ""}`} onClick={() => setStars(v as number)}>
              {label}
            </button>
          ))}
        </div>
        <div className="prices two">
          <button type="button" className={`big ${kids ? "on" : ""}`} onClick={() => setKids(!kids)} aria-pressed={kids}>
            👶 Kids coming
          </button>
          <button type="button" className={`big ${openNow ? "on" : ""}`} onClick={() => setOpenNow(!openNow)} aria-pressed={openNow}>
            🕒 Open now
          </button>
        </div>
      </section>

      <button className="go" onClick={loadWheel} disabled={loading}>
        {loading ? "Finding food…" : items.length ? "🔄 Search again" : "Find me food!"}
      </button>
      {error && <p className="error">{error}</p>}

      {items.length >= 2 && (
        <section className="stage" ref={stageRef}>
          {notice && <p className="notice">{notice}</p>}
          <div className="views" role="tablist" aria-label="Show results as">
            <button type="button" role="tab" aria-selected={view === "wheel"} className={`big ${view === "wheel" ? "on" : ""}`} onClick={() => (setView("wheel"), track("view", { as: "wheel" }))}>
              🎡 Wheel
            </button>
            <button type="button" role="tab" aria-selected={view === "list"} className={`big ${view === "list" ? "on" : ""}`} onClick={() => (setView("list"), track("view", { as: "list" }))}>
              📋 List
            </button>
          </div>

          {view === "wheel" ? (
            <>
              <Wheel items={items} theme={theme} onResult={(r) => (setShown({ r, won: true }), track("spin_result", { place: r.name }))} onPick={(r) => setShown({ r, won: false })} />
              <p className="hint">Hit SPIN or flick the wheel · tap a slice to peek</p>
            </>
          ) : (
            <>
              <p className="hint list-hint">
                {ranked.length} places, best rated first · tap one for details
              </p>
              <ol className="picks">
                {ranked.map((p, i) => (
                  <li key={p.id}>
                    <button type="button" className="pick" onClick={() => setShown({ r: p, won: false })}>
                      <span className="rank">{i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</span>
                      <span className="pick-body">
                        <span className="pick-name">{p.name}</span>
                        <span className="pick-meta">
                          {[
                            p.rating ? `⭐ ${p.rating.toFixed(1)}${p.ratingCount ? ` (${p.ratingCount})` : ""}` : null,
                            dollars(p.price) || null,
                            p.style ? `${p.styleEmoji ?? ""} ${p.style}`.trim() : null,
                            p.kidFriendly ? "👶" : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                        {(p.description || p.reviewSummary) && <span className="pick-desc">{p.description || p.reviewSummary!.text}</span>}
                        {p.address && <span className="pick-addr">{p.address}</span>}
                      </span>
                      <span className="chev" aria-hidden>›</span>
                    </button>
                  </li>
                ))}
              </ol>
            </>
          )}

          {source === "google" && (
            <p className="attribution">
              Places data from <span translate="no">Google Maps</span>
            </p>
          )}

          <div className="duo regen">
            {view === "wheel" && pool.length > 2 && (
              <button type="button" className="big" onClick={reshuffle}>
                🔄 New wheel
              </button>
            )}
            <button type="button" className="big" onClick={saveWheel}>
              💾 Save this wheel
            </button>
          </div>
        </section>
      )}


      {r && (
        <div className="modal" onClick={() => setShown(null)}>
          <div className={`result ${shown.won ? "won" : ""}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={r.name}>
            {shown.won && (
              <div className="confetti" aria-hidden>
                {Array.from("🎉🍕🌮🍣🍔🥳🍜🎊").map((c, i) => (
                  <span key={i} style={{ left: `${(i * 13) % 100}%`, animationDelay: `${(i % 5) * 0.12}s` }}>
                    {c}
                  </span>
                ))}
              </div>
            )}
            <button className="close" onClick={() => setShown(null)} aria-label="Close">
              ✕
            </button>
            {r.photo && source === "google" && <Photo key={r.id} r={r} />}
            <p className="kicker">{shown.won ? "The wheel has spoken!" : "On the wheel"}</p>
            <h3>{r.name}</h3>
            {r.style && (
              <p className="style-chip">
                <span aria-hidden>{r.styleEmoji}</span> {r.style}
              </p>
            )}
            <p className="meta">
              {r.rating ? <span>⭐ {r.rating.toFixed(1)}{r.ratingCount ? ` (${r.ratingCount})` : ""}</span> : null}
              {r.price ? <span>{dollars(r.price)}</span> : null}
              {r.kidFriendly ? <span>👶 Kid-friendly</span> : null}
              {r.openNow === true ? <span className="open">Open now</span> : r.openNow === false ? <span className="closed">Closed</span> : null}
            </p>
            {r.description && <p className="blurb">{r.description}</p>}
            <Badges r={r} />
            {r.reviewSummary && (
              <div className="reviews">
                <p className="reviews-title">💬 What people say</p>
                <p>{r.reviewSummary.text}</p>
                <p className="reviews-foot">
                  {r.reviewSummary.disclosure}
                  {r.reviewSummary.reviewsUrl && (
                    <>
                      {" · "}
                      <a href={r.reviewSummary.reviewsUrl} target="_blank" rel="noreferrer">
                        Read reviews
                      </a>
                    </>
                  )}
                  {r.reviewSummary.flagUrl && (
                    <>
                      {" · "}
                      <a href={r.reviewSummary.flagUrl} target="_blank" rel="noreferrer">
                        Report
                      </a>
                    </>
                  )}
                </p>
              </div>
            )}
            <p className="addr">{r.address}</p>
            {source === "google" && (
              <p className="attribution">
                <span translate="no">Google Maps</span>
              </p>
            )}
            {r.phone && (
              <p className="addr">
                <a href={`tel:${r.phone}`}>{r.phone}</a>
              </p>
            )}
            <div className="actions">
              <a className="go" href={r.mapsUrl} target="_blank" rel="noreferrer" onClick={() => (track(shown.won ? "lets_go" : "open_listing", { place: r.name }), countClick("maps"))}>
                {shown.won ? "🗺️ Let’s go!" : "🗺️ See on Google"}
              </a>
              <div className="duo">
                <button className="big" onClick={() => share(r)}>
                  📤 Share
                </button>
                <button className={`big ${isFav(r) ? "on" : ""}`} onClick={() => toggleFav(r)} aria-pressed={isFav(r)}>
                  {isFav(r) ? "❤️ Saved" : "🤍 Save"}
                </button>
              </div>
              {(r.bookUrl || r.orderUrl) && (
                <div className="duo">
                  {r.bookUrl && (
                    <a className="big" href={r.bookUrl} target="_blank" rel="noreferrer sponsored" onClick={() => (track("book", { place: r.name }), countClick("book"))}>
                      📅 Book a table
                    </a>
                  )}
                  {r.orderUrl && (
                    <a className="big" href={r.orderUrl} target="_blank" rel="noreferrer sponsored" onClick={() => (track("order", { place: r.name }), countClick("order"))}>
                      🛵 Order delivery
                    </a>
                  )}
                </div>
              )}
              {r.website && (
                <a className="big" href={r.website} target="_blank" rel="noreferrer" onClick={() => (track("open_website", { place: r.name }), countClick("website"))}>
                  🌐 Website / menu
                </a>
              )}
              {shown.won && (
                <button className="big" onClick={veto}>
                  🙅 Nope, spin again
                </button>
              )}
              {admin && source === "google" && (
                <button className="big danger" onClick={() => blockPlace(r)}>
                  🚫 Block this place (admin)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {savedOpen && (
        <div className="modal" onClick={() => setSavedOpen(false)}>
          <div className="result saved" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Saved">
            <button className="close" onClick={() => setSavedOpen(false)} aria-label="Close">
              ✕
            </button>
            <h3>Saved</h3>
            <p className="hint">Kept on this device only.</p>

            <h4 className="list-title">❤️ Favorite places</h4>
            {favorites.length >= 2 && (
              <button className="go small" onClick={spinFavorites}>
                🎡 Spin my favorites
              </button>
            )}
            {favorites.length ? (
              <ul className="picks">
                {favorites.map((p) => (
                  <li key={p.id}>
                    <button type="button" className="pick" onClick={() => (setSavedOpen(false), setShown({ r: p, won: false }))}>
                      <span className="pick-body">
                        <span className="pick-name">{p.name}</span>
                        <span className="pick-meta">
                          {[p.rating ? `⭐ ${p.rating.toFixed(1)}` : null, dollars(p.price) || null, p.style ? `${p.styleEmoji ?? ""} ${p.style}`.trim() : null].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <span className="chev" aria-hidden>›</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty">Tap 🤍 Save on any place to keep it here.</p>
            )}

            <h4 className="list-title">🎡 Saved wheels</h4>
            {wheels.length ? (
              <ul className="picks">
                {wheels.map((w) => (
                  <li key={w.id} className="saved-row">
                    <button type="button" className="pick" onClick={() => (track("open_saved_wheel"), openSaved(w.items, w.pool, w.source))}>
                      <span className="pick-body">
                        <span className="pick-name">{w.name}</span>
                        <span className="pick-meta">
                          {w.items.length} places · {new Date(w.savedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      </span>
                      <span className="chev" aria-hidden>›</span>
                    </button>
                    <button type="button" className="del" aria-label={`Delete ${w.name}`} onClick={() => confirm(`Delete "${w.name}"?`) && deleteWheel(w.id)}>
                      🗑️
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty">After you find food, tap 💾 Save this wheel to keep it.</p>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}

      <footer className="site-footer">
        <p>Some Book and Order links may earn us a small commission, at no cost to you.</p>
        <p>
          <a href="/privacy">Privacy</a>
        </p>
      </footer>
    </main>
  );
}

function swatchBg(id: ThemeId) {
  const sl = THEMES[id].slices.slice(0, 4);
  return `conic-gradient(${sl.map((c, i) => `${c[0]} ${(i * 100) / sl.length}% ${((i + 1) * 100) / sl.length}%`).join(", ")})`;
}

// Small "Theme" button in the top corner that opens the color picker.
function ThemeMenu({ theme, onPick }: { theme: ThemeId; onPick: (t: ThemeId) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <div className="theme-menu" ref={ref}>
      <button type="button" className="theme-toggle" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen(!open)}>
        <span className="swatch sm" style={{ background: swatchBg(theme) }} />
        Theme <span aria-hidden>{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="theme-pop">
          <div className="themes" role="radiogroup" aria-label="Wheel colors">
            {THEME_IDS.map((id) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={theme === id}
                className={`theme ${theme === id ? "on" : ""}`}
                onClick={() => (onPick(id), setOpen(false))}
              >
                <span className="swatch" style={{ background: swatchBg(id) }} />
                {THEMES[id].label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// The restaurant's top Google photo. Hidden if it fails (paused, capped, or no photo).
function Photo({ r }: { r: Restaurant }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return (
    <figure className="photo">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/photo?name=${encodeURIComponent(r.photo!)}`} alt={r.name} onError={() => setOk(false)} />
      {r.photoBy && (
        <figcaption>
          Photo:{" "}
          {r.photoBy.url ? (
            <a href={r.photoBy.url} target="_blank" rel="noreferrer">
              {r.photoBy.name}
            </a>
          ) : (
            r.photoBy.name
          )}
        </figcaption>
      )}
    </figure>
  );
}

// Reservation / dine-in / takeout / delivery / patio, only for things Google says yes to.
const BADGES = [
  ["reservable", "📅 Takes reservations"],
  ["dineIn", "🍽️ Dine-in"],
  ["takeout", "🥡 Takeout"],
  ["delivery", "🛵 Delivery"],
  ["outdoorSeating", "☀️ Outdoor seating"],
] as const;

function Badges({ r }: { r: Restaurant }) {
  const on = BADGES.filter(([k]) => r.serves?.[k] === true);
  if (!on.length) return null;
  return (
    <ul className="badges">
      {on.map(([k, label]) => (
        <li key={k}>{label}</li>
      ))}
    </ul>
  );
}
