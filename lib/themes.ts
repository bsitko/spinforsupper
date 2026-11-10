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
  ketchup: {
    label: "Ketchup & Mustard",
    accent: "#d62828",
    accentDark: "#8f1a1a",
    slices: [["#d62828", "#fff"], ["#ffd23f", "#3a1d00"]],
    extra: ["#fff8ef", "#3a1d00"],
    line: "#3a1d00",
    rim: "#3a1d00",
  },
  neapolitan: {
    label: "Neapolitan",
    accent: "#e5708f",
    accentDark: "#7b4a32",
    slices: [["#f4a6b9", "#4a2a1e"], ["#fff6e0", "#4a2a1e"], ["#7b4a32", "#fff"]],
    extra: ["#f4a6b9", "#4a2a1e"],
    line: "#4a2a1e",
    rim: "#4a2a1e",
  },
  watermelon: {
    label: "Watermelon",
    accent: "#ef476f",
    accentDark: "#1f7a3a",
    slices: [["#ef476f", "#fff"], ["#ff8fa3", "#1d1d2c"], ["#ef476f", "#fff"], ["#ffb3c1", "#1d1d2c"]],
    extra: ["#ff8fa3", "#1d1d2c"],
    line: "#1d1d2c",
    rim: "#2d9b4e",
  },
  retro: {
    label: "50s Diner",
    accent: "#e63973",
    accentDark: "#a01f4f",
    slices: [["#4ecdc4", "#1d1d2c"], ["#e63973", "#fff"], ["#fff", "#1d1d2c"], ["#1d1d2c", "#fff"]],
    extra: ["#ffe66d", "#1d1d2c"],
    line: "#1d1d2c",
    rim: "#c0c6cc",
  },
  avocado: {
    label: "Avocado Toast",
    accent: "#6a994e",
    accentDark: "#3e5e2b",
    slices: [["#a7c957", "#2b2a1e"], ["#f2e8cf", "#2b2a1e"], ["#6a994e", "#fff"], ["#c08552", "#fff"]],
    extra: ["#f2e8cf", "#2b2a1e"],
    line: "#2b2a1e",
    rim: "#8b5a2b",
  },
  arcade: {
    label: "Arcade",
    accent: "#ff2bd6",
    accentDark: "#8a00b8",
    slices: [["#ff2bd6", "#fff"], ["#120e2e", "#39ff14"], ["#00e5ff", "#120e2e"], ["#120e2e", "#ffe600"]],
    extra: ["#ffe600", "#120e2e"],
    line: "#00e5ff",
    rim: "#120e2e",
  },
} satisfies Record<string, Theme>;

export type ThemeId = keyof typeof THEMES;
export const THEME_IDS = Object.keys(THEMES) as ThemeId[];
