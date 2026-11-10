"use client";
import { useEffect, useRef, useState } from "react";
import Wheel from "./Wheel";
import { CUISINES } from "@/lib/cuisines";
import type { Restaurant, SearchResponse } from "@/lib/types";

const dollars = (n?: number) => (n ? "$".repeat(n) : "");

export default function Home() {
  const [zip, setZip] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [cuisine, setCuisine] = useState("any");
  const [prices, setPrices] = useState<number[]>([]);
  const [kids, setKids] = useState(false);
  const [openNow, setOpenNow] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [items, setItems] = useState<Restaurant[]>([]);
  const [shown, setShown] = useState<{ r: Restaurant; won: boolean } | null>(null);
  const stageRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (items.length >= 2) stageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [items]);

  function useMyLocation() {
    if (!navigator.geolocation) return setError("Your browser can't share location. Type a zip instead.");
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
        setError("Couldn't get your location. Type a zip instead.");
      },
      { timeout: 10000, maximumAge: 300000 }
    );
  }

  const togglePrice = (p: number) =>
    setPrices((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p].sort()));

  async function loadWheel() {
    const useZip = /^\d{5}$/.test(zip);
    if (!useZip && !coords) return setError("Type a 5-digit zip or tap “Near me”.");
    setLoading(true);
    setError("");
    setShown(null);
    const qs = new URLSearchParams({
      ...(useZip ? { zip } : { lat: String(coords!.lat), lng: String(coords!.lng) }),
      cuisine,
      prices: prices.join(","),
      kids: kids ? "1" : "0",
      open: openNow ? "1" : "0",
      count: "8",
    });
    try {
      const res = await fetch(`/api/restaurants?${qs}`);
      const data = (await res.json()) as SearchResponse & { error?: string };
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setNotice(data.message || "");
      if (data.restaurants.length < 2) {
        setItems([]);
        setError("Not enough places matched. Loosen the filters a little.");
      } else setItems(data.restaurants);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function veto() {
    if (!shown) return;
    setItems((cur) => cur.filter((r) => r.id !== shown.r.id));
    setShown(null);
  }

  const usingLocation = !!coords && !zip;
  const r = shown?.r;

  return (
    <main>
      <header>
        <h1>
          Where should
          <br />
          we <span>eat?</span>
        </h1>
      </header>

      <section className="step">
        <h2>
          <b>1</b> Where are you?
        </h2>
        <div className="where">
          <button type="button" className={`big ${usingLocation ? "on" : ""}`} onClick={useMyLocation} disabled={locating}>
            {locating ? "Finding you…" : usingLocation ? "📍 Got it!" : "📍 Near me"}
          </button>
          <input
            className="big-input"
            inputMode="numeric"
            maxLength={5}
            placeholder="Zip"
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, ""))}
            aria-label="Zip code"
          />
        </div>
      </section>

      <section className="step">
        <h2>
          <b>2</b> Craving?
        </h2>
        <div className="tiles">
          {CUISINES.map((c) => (
            <button type="button" key={c.id} className={`tile ${cuisine === c.id ? "on" : ""}`} onClick={() => setCuisine(c.id)}>
              <span className="emoji">{c.emoji}</span>
              {c.label}
            </button>
          ))}
        </div>
      </section>

      <section className="step">
        <h2>
          <b>3</b> Budget?
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
        {loading ? "Finding food…" : items.length ? "🔄 New wheel" : "Make my wheel!"}
      </button>
      {error && <p className="error">{error}</p>}

      {items.length >= 2 && (
        <section className="stage" ref={stageRef}>
          {notice && <p className="notice">{notice}</p>}
          <Wheel items={items} onResult={(r) => setShown({ r, won: true })} onPick={(r) => setShown({ r, won: false })} />
          <p className="hint">Hit SPIN · tap any slice to peek at it</p>
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
            <p className="kicker">{shown.won ? "The wheel has spoken!" : r.category || "On the wheel"}</p>
            <h3>{r.name}</h3>
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
              <a className="go" href={r.mapsUrl} target="_blank" rel="noreferrer">
                {shown.won ? "🗺️ Let’s go!" : "🗺️ See on Google"}
              </a>
              {r.website && (
                <a className="big" href={r.website} target="_blank" rel="noreferrer">
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
