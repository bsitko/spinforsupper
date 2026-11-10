"use client";
import { sendGAEvent } from "@next/third-parties/google";

// Sends a Google Analytics event. Does nothing when GA isn't configured (no NEXT_PUBLIC_GA_ID).
export function track(event: string, params: Record<string, string | number | boolean> = {}) {
  if (!process.env.NEXT_PUBLIC_GA_ID || typeof window === "undefined") return;
  try {
    sendGAEvent("event", event, params);
  } catch {
    /* analytics must never break the app */
  }
}
