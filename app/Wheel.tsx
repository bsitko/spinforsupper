"use client";
import { useEffect, useRef, useState } from "react";
import type { Restaurant } from "@/lib/types";
import { THEMES, type Theme, type ThemeId } from "@/lib/themes";

// Pick slice colors so neighbors never match, including the last slice next to the first.
function sliceColor(theme: ThemeId, i: number, n: number): readonly [string, string] {
  const { slices, extra } = THEMES[theme];
  const k = slices.length;
  if (i === n - 1 && n > 1 && i % k === 0) return k > 2 ? slices[1] : extra;
  return slices[i % k];
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
  theme,
  disabled,
}: {
  items: Restaurant[];
  onResult: (r: Restaurant) => void;
  onPick: (r: Restaurant) => void;
  theme: ThemeId;
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

  const maxChars = 18;
  const room = R - 14 - 66; // space between label start and the SPIN hub
  const fontSize = n > 9 ? 13 : n > 6 ? 17 : 19;
  const t: Theme = THEMES[theme];

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
        <circle r={R + 8} fill={t.rim ?? "#1d1d2c"} />
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
              <path d={`M0 0 L${x0} ${y0} A${R} ${R} 0 ${large} 1 ${x1} ${y1} Z`} fill={sliceColor(theme, i, n)[0]} stroke={t.line} strokeWidth={2} />
              <g transform={`rotate(${mid - 90})`} pointerEvents="none">
                <text x={R - 14} y={0} textAnchor="end" dominantBaseline="middle" fontSize={Math.min(fontSize, room / (short(r.name, maxChars).length * 0.62))} fontWeight={800} fill={sliceColor(theme, i, n)[1]} style={t.textShadow ? { paintOrder: "stroke", stroke: "rgba(0,0,0,.25)", strokeWidth: 3 } : undefined}>
                  {short(r.name, maxChars)}
                </text>
              </g>
            </g>
          );
        })}
        {Array.from({ length: n }).map((_, i) => {
          const [x, y] = polar(R + 3, i * seg);
          return <circle key={i} cx={x} cy={y} r={4} fill={t.rim ? "#1d1d2c" : "#f7c548"} />;
        })}
      </svg>
      <button className="hub" onClick={spin} disabled={spinning || disabled || n < 2}>
        {spinning ? "…" : "SPIN"}
      </button>
    </div>
  );
}
