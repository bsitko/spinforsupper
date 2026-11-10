"use client";
import { useEffect, useRef, useState } from "react";
import Wheel from "./Wheel";
import Logo from "./Logo";
import { track } from "@/lib/analytics";
import { CUISINES } from "@/lib/cuisines";
import { THEMES, THEME_IDS, type Theme, type ThemeId } from "@/lib/themes";
import type { Restaurant, SearchResponse } from "@/lib/types";

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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [items, setItems] = useState<Restaurant[]>([]); // on the wheel
  const [pool, setPool] = useState<Restaurant[]>([]); // everything that matched, for the list
  const [view, setView] = useState<"wheel" | "list">("wheel");
  const [loadedAt, setLoadedAt] = useState(0);
  const lastQuery = useRef(""); // the last search sent to Google, to avoid paying for the same one twice
  const [shown, setShown] = useState<{ r: Restaurant; won: boolean } | null>(null);
  const stageRef = useRef<HTMLElement>(null);
  const [theme, setThemeState] = useState<ThemeId>("diner");

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
        <Logo className="logo" />
        <h1>
          Spin for
          <br />
          <span>Supper!</span>
        </h1>
        <p className="tag">Can’t decide where to eat? Let the wheel pick.</p>
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
          <b>3</b> Budget? <small>pick any</small>
        </h2>
        <div className="prices">
          {[1, 2, 3, 4].map((p) => (
            <button type="button" key={p} className={`big ${prices.includes(p) ? "on" : ""}`} onClick={() => togglePrice(p)}>
              {dollars(p)}
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
                        {p.address && <span className="pick-addr">{p.address}</span>}
                      </span>
                      <span className="chev" aria-hidden>›</span>
                    </button>
                  </li>
                ))}
              </ol>
            </>
          )}

          {view === "wheel" && pool.length > 2 && (
            <button type="button" className="big regen" onClick={reshuffle}>
              🔄 New wheel
            </button>
          )}
        </section>
      )}

      <section className="theme-picker">
        <h2 className="list-title">Pick a theme</h2>
        <div className="themes" role="radiogroup" aria-label="Wheel colors">
          {THEME_IDS.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={theme === id}
              className={`theme ${theme === id ? "on" : ""}`}
              onClick={() => setTheme(id)}
            >
              <span className="swatch" style={{ background: `conic-gradient(${THEMES[id].slices.slice(0, 4).map((s, i, a) => `${s[0]} ${(i * 100) / a.length}% ${((i + 1) * 100) / a.length}%`).join(", ")})` }} />
              {THEMES[id].label}
            </button>
          ))}
        </div>
      </section>

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
            <p className="addr">{r.address}</p>
            {r.phone && (
              <p className="addr">
                <a href={`tel:${r.phone}`}>{r.phone}</a>
              </p>
            )}
            <div className="actions">
              <a className="go" href={r.mapsUrl} target="_blank" rel="noreferrer" onClick={() => track(shown.won ? "lets_go" : "open_listing", { place: r.name })}>
                {shown.won ? "🗺️ Let’s go!" : "🗺️ See on Google"}
              </a>
              {r.website && (
                <a className="big" href={r.website} target="_blank" rel="noreferrer" onClick={() => track("open_website", { place: r.name })}>
                  🌐 Website / menu
                </a>
              )}
              {shown.won && (
                <button className="big" onClick={veto}>
                  🙅 Nope, spin again
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
