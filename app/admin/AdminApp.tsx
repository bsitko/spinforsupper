"use client";
import { useCallback, useEffect, useState } from "react";
import type { Settings } from "@/lib/store";

type Day = { day: string; searches: number; calls: number; photos: number; capped: number; quota?: number; clicks: Record<string, number> };
type Data = {
  settings: Settings;
  stats: { days: Day[]; cravings: [string, number][]; month: string };
  blocked: Record<string, string>;
  today: number;
  persistent: boolean;
  googleKey: boolean;
};

const money = (n: number) => `$${n.toFixed(2)}`;

export default function AdminApp({ loggedIn, configured }: { loggedIn: boolean; configured: boolean }) {
  const [authed, setAuthed] = useState(loggedIn);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [data, setData] = useState<Data | null>(null);
  const [draft, setDraft] = useState<Settings | null>(null);
  const [saved, setSaved] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/data", { cache: "no-store" });
    if (res.status === 401) return setAuthed(false);
    const d = (await res.json()) as Data;
    setData(d);
    setDraft(d.settings);
  }, []);

  useEffect(() => {
    if (authed) load();
  }, [authed, load]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return setErr(d.error || "Couldn't log in.");
    setPw("");
    setAuthed(true);
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthed(false);
    setData(null);
  }

  async function save(patch: Partial<Settings>, label = "Saved") {
    setSaved("");
    const res = await fetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return setSaved(d.error || "Couldn't save.");
    setData((cur) => (cur ? { ...cur, settings: d.settings } : cur));
    setDraft(d.settings);
    setSaved(label);
  }

  async function unblock(id: string) {
    await fetch("/api/admin/block", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }

  if (!configured) {
    return (
      <main className="admin">
        <h1>Admin</h1>
        <p className="card">
          Add an <code>ADMIN_PASSWORD</code> environment variable in Vercel (Settings → Environment Variables), redeploy, then come back here.
        </p>
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="admin">
        <h1>Admin</h1>
        <form className="card login" onSubmit={login}>
          <input className="big-input" type="password" placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus aria-label="Admin password" />
          <button className="go">Log in</button>
          {err && <p className="error">{err}</p>}
        </form>
      </main>
    );
  }

  if (!data || !draft) return <main className="admin"><h1>Admin</h1><p>Loading…</p></main>;

  const s = data.settings;
  const cost = (calls: number, photos = 0) => calls * s.costPerCall + photos * s.costPerPhoto;
  const todayPhotos = data.stats.days[0]?.photos ?? 0;
  const monthDays = data.stats.days.filter((d) => d.day.startsWith(data.stats.month));
  const monthCalls = monthDays.reduce((a, d) => a + d.calls, 0);
  const monthPhotos = monthDays.reduce((a, d) => a + (d.photos || 0), 0);
  const capPct = s.dailyCap ? Math.min(100, Math.round((data.today / s.dailyCap) * 100)) : 0;
  const clickTotals = data.stats.days.reduce<Record<string, number>>((acc, d) => {
    for (const [k, v] of Object.entries(d.clicks)) acc[k] = (acc[k] || 0) + v;
    return acc;
  }, {});
  const blocked = Object.entries(data.blocked);

  return (
    <main className="admin">
      <div className="admin-head">
        <h1>Admin</h1>
        <div>
          <a href="/" className="link">View site</a> · <button className="link" onClick={logout}>Log out</button>
        </div>
      </div>

      {!data.persistent && (
        <p className="card warn">
          <b>Storage isn&apos;t connected</b>, so counts and settings reset whenever the site redeploys. In Vercel: Storage → Upstash for Redis → Create → connect it to this
          project, then redeploy.
        </p>
      )}
      {!data.googleKey && <p className="card warn">No Google Places key is set, so everyone sees demo restaurants.</p>}

      {(data.stats.days[0]?.quota ?? 0) > 0 && (
        <p className="card warn">
          Google turned down {data.stats.days[0].quota} searches today because of a quota set in Google Cloud. Visitors saw sample spots. Check Places API (New) → Quotas.
        </p>
      )}
      {s.paused && <p className="card warn">Paused: everyone is seeing sample spots.</p>}
      {s.dailyCap > 0 && data.today + 1 > s.dailyCap && <p className="card warn">Today&apos;s cap of {s.dailyCap} calls is used up, so visitors see sample spots until midnight Pacific.</p>}

      {/* ---- Today ---- */}
      <section className="card">
        <h2>Today</h2>
        <div className="tiles3">
          <div className="stat"><span className="n">{data.stats.days[0]?.searches ?? 0}</span>searches</div>
          <div className="stat"><span className="n">{data.today}</span>Google calls</div>
          <div className="stat"><span className="n">{todayPhotos}</span>photos</div>
          <div className="stat"><span className="n">{money(cost(data.today, todayPhotos))}</span>est. cost</div>
        </div>
        {s.dailyCap > 0 && (
          <div className="meter" aria-label={`${capPct}% of daily cap used`}>
            <div style={{ width: `${capPct}%` }} />
            <span>{data.today} of {s.dailyCap} daily calls ({capPct}%)</span>
          </div>
        )}
        <p className="muted">
          This month so far: {monthCalls} calls and {monthPhotos} photos, about {money(cost(monthCalls, monthPhotos))} before Google&apos;s free allowance. Days reset at midnight Pacific, like Google&apos;s quota.
        </p>
      </section>

      {/* ---- Controls ---- */}
      <section className="card">
        <h2>Spending controls</h2>
        <div className={`kill ${s.paused ? "on" : ""}`}>
          <div>
            <b>{s.paused ? "Live listings are PAUSED" : "Live listings are on"}</b>
            <p className="muted">When paused, nobody triggers Google calls. Visitors see sample restaurants and a friendly note.</p>
          </div>
          <button className={`big ${s.paused ? "" : "danger"}`} onClick={() => save({ paused: !s.paused }, s.paused ? "Resumed" : "Paused")}>
            {s.paused ? "▶ Resume" : "⏸ Pause"}
          </button>
        </div>
        <label className="field">
          <span>Daily cap on Google calls (0 = no cap)</span>
          <input type="number" min={0} value={draft.dailyCap} onChange={(e) => setDraft({ ...draft, dailyCap: Number(e.target.value) })} />
        </label>
        <label className="field">
          <span>Estimated cost per call (USD)</span>
          <input type="number" min={0} step={0.001} value={draft.costPerCall} onChange={(e) => setDraft({ ...draft, costPerCall: Number(e.target.value) })} />
        </label>
        <button className="go small" onClick={() => save({ dailyCap: draft.dailyCap, costPerCall: draft.costPerCall })}>Save limits</button>
      </section>

      {/* ---- History ---- */}
      <section className="card">
        <h2>Last 14 days</h2>
        <div className="scroll">
          <table>
            <thead>
              <tr><th>Day</th><th>Searches</th><th>Google calls</th><th>Photos</th><th>Est. cost</th><th>Hit cap / paused</th><th>Google said no</th><th>Book</th><th>Order</th><th>Maps</th></tr>
            </thead>
            <tbody>
              {data.stats.days.map((d) => (
                <tr key={d.day}>
                  <td>{d.day}</td><td>{d.searches}</td><td>{d.calls}</td><td>{d.photos || 0}</td><td>{money(cost(d.calls, d.photos || 0))}</td><td>{d.capped}</td><td>{d.quota || 0}</td>
                  <td>{d.clicks.book || 0}</td><td>{d.clicks.order || 0}</td><td>{d.clicks.maps || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.stats.cravings.length > 0 && (
          <p className="muted">
            Top cravings this month: {data.stats.cravings.slice(0, 6).map(([c, n]) => `${c} (${n})`).join(", ")}
          </p>
        )}
      </section>

      {/* ---- Tip jar ---- */}
      <section className="card">
        <h2>Tip jar</h2>
        <p className="muted">
          Paste your Ko-fi or Buy Me a Coffee page link. A &quot;☕ Buy us a coffee&quot; link then shows in the footer and on the About page. Leave empty to hide it.
        </p>
        <label className="field">
          <span>Tip link</span>
          <input value={draft.tipUrl} onChange={(e) => setDraft({ ...draft, tipUrl: e.target.value })} placeholder="https://ko-fi.com/yourname" />
        </label>
        <button className="go small" onClick={() => save({ tipUrl: draft.tipUrl })}>Save tip link</button>
        <p className="muted">Tip link clicks, last 14 days: {clickTotals.tip || 0}</p>
      </section>

      {/* ---- Affiliate links ---- */}
      <section className="card">
        <h2>Book &amp; Order links</h2>
        <p className="muted">
          These power the &quot;Book a table&quot; and &quot;Order delivery&quot; buttons. Paste your affiliate link here once a program approves you. Use{" "}
          <code>{"{name}"}</code>, <code>{"{query}"}</code> (name + city) or <code>{"{address}"}</code> where the restaurant should go. Leave empty to hide the button.
        </p>
        <label className="field">
          <span>Book a table</span>
          <input value={draft.bookTemplate} onChange={(e) => setDraft({ ...draft, bookTemplate: e.target.value })} placeholder="https://…{query}" />
        </label>
        <label className="field">
          <span>Order delivery</span>
          <input value={draft.orderTemplate} onChange={(e) => setDraft({ ...draft, orderTemplate: e.target.value })} placeholder="https://…{name}" />
        </label>
        <button className="go small" onClick={() => save({ bookTemplate: draft.bookTemplate, orderTemplate: draft.orderTemplate })}>Save links</button>
        <p className="muted">
          Clicks, last 14 days: Book {clickTotals.book || 0} · Order {clickTotals.order || 0} · Google Maps {clickTotals.maps || 0} · Website {clickTotals.website || 0}
        </p>
      </section>

      {/* ---- Blocklist ---- */}
      <section className="card">
        <h2>Blocked places</h2>
        <p className="muted">To block a place, open it on the main site while logged in here and tap &quot;Block this place&quot;.</p>
        {blocked.length === 0 ? (
          <p>Nothing blocked.</p>
        ) : (
          <ul className="blocked">
            {blocked.map(([id, name]) => (
              <li key={id}>
                <span>{name}</span>
                <button className="link" onClick={() => unblock(id)}>Unblock</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {saved && <p className="toast" onAnimationEnd={() => setSaved("")}>{saved}</p>}
    </main>
  );
}
