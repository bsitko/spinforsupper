"use client";
import { useEffect, useRef, useState } from "react";
import type { Restaurant } from "@/lib/types";

// [slice fill, label color]
const PALETTES = {
  diner: [["#ff6b35", "#fff"], ["#fff1e0", "#1d1d2c"], ["#e2432a", "#fff"], ["#ffcf86", "#1d1d2c"]],
  gameshow: [["#ff6b35", "#fff"], ["#1d1d2c", "#fff"]],
  sunset: [["#ff6b35", "#fff"], ["#ffb35c", "#1d1d2c"], ["#e8434f", "#fff"], ["#ff8f45", "#fff"]],
} as const;
const PALETTE = PALETTES.diner;

// Pick slice colors so neighbors never match, including the last slice next to the first.
function sliceColor(i: number, n: number): readonly [string, string] {
  const k = PALETTE.length;
  if (i === n - 1 && n > 1 && i % k === 0) return k > 2 ? PALETTE[1] : ["#f7c548", "#1d1d2c"];
  return PALETTE[i % k];
}
const SPIN_MS = 5200;

function polar(r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [r * Math.cos(rad), r * Math.sin(rad)];
}

function short(name: string, n: number) {
  return name.length > n ? name.slice(0, n - 1).trimEnd() + "…" : name;
}

export default function Wheel({
  items,
  onResult,
  onPick,
  disabled,
}: {
  items: Restaurant[];
  onResult: (r: Restaurant) => void;
  onPick: (r: Restaurant) => void;
  disabled?: boolean;
}) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const n = items.length;
  const seg = 360 / n;
  const R = 200;

  function spin() {
    if (spinning || n < 2) return;
    const winner = Math.floor(Math.random() * n);
    const offset = seg * (0.15 + Math.random() * 0.7); // land well inside the slice
    const targetAngle = winner * seg + offset; // angle of the point that ends at the pointer
    const currentMod = ((rotation % 360) + 360) % 360;
    const wantMod = (360 - targetAngle) % 360;
    let delta = wantMod - currentMod;
    if (delta < 0) delta += 360;
    const turns = 5 + Math.floor(Math.random() * 3);
    setRotation(rotation + turns * 360 + delta);
    setSpinning(true);
    timer.current = setTimeout(() => {
      setSpinning(false);
      onResult(items[winner]);
    }, SPIN_MS);
  }

  const maxChars = n > 9 ? 13 : 14;
  const fontSize = n > 9 ? 13 : n > 6 ? 17 : 19;

  return (
    <div className="wheel-wrap">
      <div className="pointer" aria-hidden />
      <svg
        viewBox="-210 -210 420 420"
        className="wheel"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.8, 0.12, 1)` : "none",
        }}
        role="img"
        aria-label={`Wheel with ${n} restaurants`}
      >
        <circle r={R + 8} fill="#1d1d2c" />
        {items.map((r, i) => {
          const a0 = i * seg;
          const a1 = (i + 1) * seg;
          const [x0, y0] = polar(R, a0);
          const [x1, y1] = polar(R, a1);
          const large = seg > 180 ? 1 : 0;
          const mid = a0 + seg / 2;
          return (
            <g
              key={r.id}
              className="slice"
              role="button"
              tabIndex={spinning ? -1 : 0}
              aria-label={`See ${r.name}`}
              onClick={() => !spinning && onPick(r)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !spinning && onPick(r)}
            >
              <path d={`M0 0 L${x0} ${y0} A${R} ${R} 0 ${large} 1 ${x1} ${y1} Z`} fill={sliceColor(i, n)[0]} stroke="#1d1d2c" strokeWidth={2} />
              <g transform={`rotate(${mid - 90})`} pointerEvents="none">
                <text x={R - 14} y={0} textAnchor="end" dominantBaseline="middle" fontSize={fontSize} fontWeight={800} fill={sliceColor(i, n)[1]}>
                  {short(r.name, maxChars)}
                </text>
              </g>
            </g>
          );
        })}
        {Array.from({ length: n }).map((_, i) => {
          const [x, y] = polar(R + 3, i * seg);
          return <circle key={i} cx={x} cy={y} r={4} fill="#f7c548" />;
        })}
      </svg>
      <button className="hub" onClick={spin} disabled={spinning || disabled || n < 2}>
        {spinning ? "…" : "SPIN"}
      </button>
    </div>
  );
}
