// Wheel color themes. Each slice is [fill, label color].
type Slice = readonly [string, string];
export type Theme = { label: string; slices: readonly Slice[]; extra: Slice; line: string; rim?: string; textShadow?: boolean };

export const THEMES = {
  diner: {
    label: "Diner",
    slices: [["#ff6b35", "#fff"], ["#fff1e0", "#1d1d2c"], ["#e2432a", "#fff"], ["#ffcf86", "#1d1d2c"]],
    extra: ["#ffcf86", "#1d1d2c"],
    line: "#1d1d2c",
  },
  gameshow: {
    label: "Game show",
    slices: [["#ff6b35", "#fff"], ["#1d1d2c", "#fff"]],
    extra: ["#f7c548", "#1d1d2c"],
    line: "#1d1d2c",
    rim: "#f7c548",
  },
  sunset: {
    label: "Sunset",
    slices: [["#ff6b35", "#fff"], ["#ffb35c", "#1d1d2c"], ["#e8434f", "#fff"], ["#ff8f45", "#fff"]],
    extra: ["#ffb35c", "#1d1d2c"],
    line: "#1d1d2c",
  },
  rainbow: {
    label: "Rainbow",
    slices: ["#ff6b35", "#f7c548", "#2ec4b6", "#e71d36", "#7b2cbf", "#3a86ff", "#06d6a0", "#ff006e", "#fb8500", "#8338ec", "#118ab2", "#ef476f"].map(
      (c) => [c, "#fff"] as const
    ),
    extra: ["#3a86ff", "#fff"],
    line: "#fff",
    textShadow: true,
  },
} satisfies Record<string, Theme>;

export type ThemeId = keyof typeof THEMES;
export const THEME_IDS = Object.keys(THEMES) as ThemeId[];
