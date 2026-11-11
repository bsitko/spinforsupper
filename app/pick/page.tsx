import type { Metadata } from "next";
import Logo from "../Logo";
import { mapsLink, readPick } from "@/lib/share";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  const pick = readPick(sp);
  if (!pick) return { title: "Spin for Supper" };
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (typeof v === "string") q.set(k, v);
  const title = `The wheel picked ${pick.name}!`;
  const description = [pick.style, pick.rating && `★${pick.rating}`, pick.address].filter(Boolean).join(" · ");
  return {
    title: `${title} | Spin for Supper`,
    description,
    robots: { index: false },
    openGraph: { title, description, images: [{ url: `/api/og?${q}`, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [`/api/og?${q}`] },
  };
}

export default async function PickPage({ searchParams }: Props) {
  const pick = readPick(await searchParams);
  return (
    <main className="pick-page">
      <a href="/" aria-label="Spin for Supper home">
        <Logo className="logo" />
      </a>
      {pick ? (
        <div className="result shared">
          <p className="kicker">The wheel has spoken!</p>
          <h3>{pick.name}</h3>
          {pick.style && (
            <p className="style-chip">
              <span aria-hidden>{pick.emoji}</span> {pick.style}
            </p>
          )}
          <p className="meta">
            {pick.rating && <span>⭐ {pick.rating}</span>}
            {pick.price && <span>{"$".repeat(pick.price)}</span>}
          </p>
          {pick.address && <p className="addr">{pick.address}</p>}
          <div className="actions">
            <a className="go" href={mapsLink(pick.name, pick.address, pick.id)} target="_blank" rel="noreferrer">
              🗺️ Let’s go!
            </a>
            <a className="big" href="/">
              🎡 Spin your own wheel
            </a>
          </div>
        </div>
      ) : (
        <div className="actions">
          <a className="go" href="/">
            🎡 Spin a wheel
          </a>
        </div>
      )}
    </main>
  );
}
