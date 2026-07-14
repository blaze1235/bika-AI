export type Palette = {
  id: string;
  name: string;
  /** Primary color used in light mode. */
  light: string;
  /** Primary color used in dark mode. */
  dark: string;
};

export const PRESET_PALETTES: Palette[] = [
  { id: "forest", name: "Лесной (по умолчанию)", light: "#147a52", dark: "#3fcb8c" },
  { id: "ocean", name: "Океан", light: "#0f6ea8", dark: "#4fb8f0" },
  { id: "terracotta", name: "Терракота", light: "#c54706", dark: "#ff9a33" },
  { id: "plum", name: "Слива", light: "#7c3aed", dark: "#b794f6" },
  { id: "amber", name: "Янтарь", light: "#a5620a", dark: "#fbbf24" },
];

const DEFAULT_PALETTE = PRESET_PALETTES[0];

export const PALETTE_ACTIVE_KEY = "palette_active_id";
export const PALETTE_CUSTOM_KEY = "palette_custom";

const HEX_RE = /^#([0-9a-fA-F]{6})$/;

export function isValidHex(hex: string): boolean {
  return HEX_RE.test(hex);
}

export function parseCustomPalettes(raw: string | undefined): Palette[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is Palette =>
        p &&
        typeof p.id === "string" &&
        typeof p.name === "string" &&
        isValidHex(p.light) &&
        isValidHex(p.dark)
    );
  } catch {
    return [];
  }
}

export function resolveActivePalette(settings: Record<string, string>): Palette {
  const activeId = settings[PALETTE_ACTIVE_KEY];
  if (!activeId) return DEFAULT_PALETTE;
  const custom = parseCustomPalettes(settings[PALETTE_CUSTOM_KEY]);
  const all = [...PRESET_PALETTES, ...custom];
  return all.find((p) => p.id === activeId) ?? DEFAULT_PALETTE;
}

/** Relative luminance (0-1) of a #rrggbb hex color, used to pick readable text. */
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastText(hex: string): string {
  return luminance(hex) > 0.55 ? "#14170f" : "#ffffff";
}

/** CSS custom-property overrides for the active palette, injected in <head>. */
export function paletteCss(palette: Palette): string {
  const lightOn = contrastText(palette.light);
  const darkOn = contrastText(palette.dark);
  return `
:root {
  --primary: ${palette.light} !important;
  --primary-strong: color-mix(in srgb, ${palette.light} 82%, black) !important;
  --primary-soft: color-mix(in srgb, ${palette.light} 12%, white) !important;
  --on-primary: ${lightOn} !important;
}
.dark {
  --primary: ${palette.dark} !important;
  --primary-strong: color-mix(in srgb, ${palette.dark} 85%, white) !important;
  --primary-soft: color-mix(in srgb, ${palette.dark} 14%, transparent) !important;
  --on-primary: ${darkOn} !important;
}
`;
}
