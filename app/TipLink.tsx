"use client";
import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";

// "☕ Buy us a coffee": only shows once a tip link is saved in /admin.
export default function TipLink({ big }: { big?: boolean }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => setUrl(d.tipUrl || ""))
      .catch(() => {});
  }, []);
  if (!url) return null;
  const click = () => {
    track("tip_click");
    try {
      navigator.sendBeacon?.("/api/click", new Blob([JSON.stringify({ kind: "tip" })], { type: "application/json" }));
    } catch {}
  };
  return (
    <a className={big ? "go small tip" : "tip"} href={url} target="_blank" rel="noreferrer" onClick={click}>
      ☕ Buy us a coffee
    </a>
  );
}
