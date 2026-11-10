// Wheel color themes. Each slice is [fill, label color].
type Slice = readonly [string, string];
// accent / accentDark recolor the page's buttons and highlights to match the wheel.
export type Theme = {
  label: string;
  slices: readonly Slice[];
  extra: Slice;
  line: string;
  rim?: string;
  textShadow?: boolean;
  accent: string;
  accentDark: string;
};

const ORANGE = { accent: "#ff6b35", accentDark: "#c94a1c" };

export const THEMES = {
  diner: {
    ...ORANGE,
    label: "Diner",
    slices: [["#ff6b35", "#fff"], ["#fff1e0", "#1d1d2c"], ["#e2432a", "#fff"], ["#ffcf86", "#1d1d2c"]],
    extra: ["#ffcf86", "#1d1d2c"],
    line: "#1d1d2c",
  },
  gameshow: {
    ...ORANGE,
    label: "Game show",
    slices: [["#ff6b35", "#fff"], ["#1d1d2c", "#fff"]],
    extra: ["#f7c548", "#1d1d2c"],
    line: "#1d1d2c",
    rim: "#f7c548",
  },
  sunset: {
    ...ORANGE,
    label: "Sunset",
    slices: [["#ff6b35", "#fff"], ["#ffb35c", "#1d1d2c"], ["#e8434f", "#fff"], ["#ff8f45", "#fff"]],
    extra: ["#ffb35c", "#1d1d2c"],
    line: "#1d1d2c",
  },
  rainbow: {
    ...ORANGE,
    label: "Rainbow",
    slices: ["#ff6b35", "#f7c548", "#2ec4b6", "#e71d36", "#7b2cbf", "#3a86ff", "#06d6a0", "#ff006e", "#fb8500", "#8338ec", "#118ab2", "#ef476f"].map(
      (c) => [c, "#fff"] as const
    ),
    extra: ["#3a86ff", "#fff"],
    line: "#fff",
    textShadow: true,
  },
  ocean: {
    label: "Ocean",
    accent: "#1479a3",
    accentDark: "#0b4f6c",
    slices: [["#1479a3", "#fff"], ["#d9f1f7", "#0b3142"], ["#0b4f6c", "#fff"], ["#7cc6d6", "#0b3142"]],
    extra: ["#7cc6d6", "#0b3142"],
    line: "#0b3142",
  },
  garden: {
    label: "Garden",
    accent: "#2f8f4e",
    accentDark: "#1d5e32",
    slices: [["#2f8f4e", "#fff"], ["#eaf5d8", "#1d2b1f"], ["#1d5e32", "#fff"], ["#a9d18e", "#1d2b1f"]],
    extra: ["#a9d18e", "#1d2b1f"],
    line: "#1d2b1f",
  },
  berry: {
    label: "Berry",
    accent: "#b8336a",
    accentDark: "#7d1f47",
    slices: [["#b8336a", "#fff"], ["#fde2ec", "#3a1028"], ["#6a2c8f", "#fff"], ["#f49cbb", "#3a1028"]],
    extra: ["#f49cbb", "#3a1028"],
    line: "#3a1028",
  },
  midnight: {
    label: "Midnight",
    accent: "#5b5fe0",
    accentDark: "#34379c",
    slices: [["#5b5fe0", "#fff"], ["#1d1d2c", "#fff"], ["#8f93ff", "#1d1d2c"], ["#34379c", "#fff"]],
    extra: ["#8f93ff", "#1d1d2c"],
    line: "#1d1d2c",
    rim: "#f7c548",
  },
} satisfies Record<string, Theme>;

export type ThemeId = keyof typeof THEMES;
export const THEME_IDS = Object.keys(THEMES) as ThemeId[];
