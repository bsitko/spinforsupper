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

// Second line on each slice: "★4.6 · $$ · Mexican"
function sliceInfo(r: Restaurant) {
  const type = r.style || "";
  return [r.rating ? `★${r.rating.toFixed(1)}` : "", r.price ? "$".repeat(r.price) : "", short(type, 12)].filter(Boolean).join(" · ");
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
  const [rotation, setRotationState] = useState(0);
  // Kept in a ref too, so a spin that starts right after a drag sees the exact latest angle.
  const rotRef = useRef(0);
  const setRotation = (deg: number) => {
    rotRef.current = deg;
    setRotationState(deg);
  };
  const [spinning, setSpinning] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const n = items.length;
  const seg = 360 / n;
  const R = 200;

  // dir 1 = clockwise, -1 = counterclockwise; turns = how many full laps before landing.
  function spin(dir: 1 | -1 = 1, turns = 5 + Math.floor(Math.random() * 3)) {
    if (spinning || n < 2) return;
    const winner = Math.floor(Math.random() * n);
    const offset = seg * (0.15 + Math.random() * 0.7); // land well inside the slice
    const targetAngle = winner * seg + offset; // angle of the point that ends at the pointer
    const rotation = rotRef.current;
    const currentMod = ((rotation % 360) + 360) % 360;
    const wantMod = (360 - targetAngle) % 360;
    let delta = wantMod - currentMod;
    if (delta < 0) delta += 360;
    if (dir === -1) delta -= 360;
    setRotation(rotation + dir * turns * 360 + delta);
    setSpinning(true);
    timer.current = setTimeout(() => {
      setSpinning(false);
      onResult(items[winner]);
    }, SPIN_MS);
  }

  // ---- Drag to turn the wheel; flick it to spin ----
  const wrapRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ last: number; moved: number; start: number; samples: { t: number; a: number }[] } | null>(null);
  const justDragged = useRef(false);

  function angleAt(e: React.PointerEvent) {
    const b = wrapRef.current!.getBoundingClientRect();
    return (Math.atan2(e.clientY - (b.top + b.height / 2), e.clientX - (b.left + b.width / 2)) * 180) / Math.PI;
  }

  function onPointerDown(e: React.PointerEvent) {
    if (spinning || disabled || n < 2 || (e.target as Element).closest(".hub")) return;
    const a = angleAt(e);
    drag.current = { last: a, moved: 0, start: rotRef.current, samples: [{ t: e.timeStamp, a: 0 }] };
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const a = angleAt(e);
    let step = a - d.last;
    if (step > 180) step -= 360; // crossing the ±180° seam
    if (step < -180) step += 360;
    d.last = a;
    d.moved += step;
    if (Math.abs(d.moved) > 4 && !wrapRef.current!.hasPointerCapture(e.pointerId)) wrapRef.current!.setPointerCapture(e.pointerId);
    d.samples.push({ t: e.timeStamp, a: d.moved });
    d.samples = d.samples.filter((s) => e.timeStamp - s.t < 120);
    setRotation(rotRef.current + step);
  }

  function onPointerUp(e: React.PointerEvent) {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (Math.abs(d.moved) > 4) {
      justDragged.current = true; // swallow the click that follows a drag
      setTimeout(() => (justDragged.current = false), 50);
    }
    const first = d.samples[0];
    const dt = e.timeStamp - first.t;
    const v = dt > 0 ? (d.moved - first.a) / dt : 0; // degrees per ms
    // A real flick (faster than ~300°/s) spins the wheel in that direction; a slow drag just leaves it there.
    if (Math.abs(v) > 0.3) spin(v > 0 ? 1 : -1, Math.round(Math.min(8, Math.max(3, Math.abs(v) * 5))));
  }

  const maxChars = 18;
  const room = R - 14 - 66; // space between label start and the SPIN hub
  const fontSize = n > 9 ? 13 : n > 6 ? 17 : 19;
  const t: Theme = THEMES[theme];

  return (
    <div
      className="wheel-wrap"
      ref={wrapRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      // Up-and-down swipes scroll the page (touch-action: pan-y); the browser then cancels the drag, so undo any nudge.
      onPointerCancel={() => {
        if (drag.current) setRotation(drag.current.start);
        drag.current = null;
      }}
    >
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
              onClick={() => !spinning && !justDragged.current && onPick(r)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !spinning && onPick(r)}
            >
              <path d={`M0 0 L${x0} ${y0} A${R} ${R} 0 ${large} 1 ${x1} ${y1} Z`} fill={sliceColor(theme, i, n)[0]} stroke={t.line} strokeWidth={2} />
              <g transform={`rotate(${mid - 90})`} pointerEvents="none">
{(() => {
                  const [, ink] = sliceColor(theme, i, n);
                  const name = short(r.name, maxChars);
                  const nameSize = Math.min(fontSize, room / (name.length * 0.62));
                  const info = sliceInfo(r);
                  const infoSize = Math.min(fontSize * 0.72, room / (Math.max(info.length, 1) * 0.58));
                  const shadow = t.textShadow ? { paintOrder: "stroke" as const, stroke: "rgba(0,0,0,.25)", strokeWidth: 3 } : undefined;
                  // Small slices (lots of places) only have room for the name.
                  const showInfo = info && n <= 10;
                  return (
                    <>
                      <text x={R - 14} y={showInfo ? -infoSize * 0.6 : 0} textAnchor="end" dominantBaseline="middle" fontSize={nameSize} fontWeight={800} fill={ink} style={shadow}>
                        {name}
                      </text>
                      {showInfo && (
                        <text x={R - 14} y={nameSize * 0.75} textAnchor="end" dominantBaseline="middle" fontSize={infoSize} fontWeight={600} fill={ink} opacity={0.85} style={shadow}>
                          {info}
                        </text>
                      )}
                    </>
                  );
                })()}
              </g>
            </g>
          );
        })}
        {Array.from({ length: n }).map((_, i) => {
          const [x, y] = polar(R + 3, i * seg);
          return <circle key={i} cx={x} cy={y} r={4} fill={t.rim ? "#1d1d2c" : "#f7c548"} />;
        })}
      </svg>
      <button className="hub" onClick={() => spin()} disabled={spinning || disabled || n < 2}>
        {spinning ? "…" : "SPIN"}
      </button>
    </div>
  );
}
