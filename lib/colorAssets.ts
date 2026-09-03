export interface Palette {
  id: string;
  name: string;
  colors: string[];
  mood: 'warm' | 'cool' | 'monochrome' | 'vibrant' | 'muted' | 'pastel';
  useCase: 'UI' | 'branding' | 'data viz';
}

export interface Gradient {
  id: string;
  name: string;
  colors: string[];
  mood: 'vibrant' | 'soft' | 'dark' | 'neon' | 'pastel';
}

const paletteSeeds = [
  { name: 'Midnight Slate', colors: ['#111827', '#1F2937', '#374151', '#E8FF57', '#F9FAFB'], mood: 'cool', useCase: 'UI' },
  { name: 'Warm Terracotta', colors: ['#2B1D18', '#8C3F2B', '#C86945', '#F2B880', '#FFF4E6'], mood: 'warm', useCase: 'branding' },
  { name: 'Signal Bloom', colors: ['#151515', '#FF4D6D', '#FFB703', '#2EC4B6', '#F8F9FA'], mood: 'vibrant', useCase: 'data viz' },
  { name: 'Soft Editorial', colors: ['#222222', '#6B705C', '#B7B7A4', '#DDBEA9', '#FFE8D6'], mood: 'muted', useCase: 'branding' },
  { name: 'Pastel Circuit', colors: ['#202124', '#B8F7D4', '#A7C7FF', '#FFD6A5', '#FFFFFF'], mood: 'pastel', useCase: 'UI' },
  { name: 'Mono Ink', colors: ['#0A0A0A', '#1F1F1F', '#4B4B4B', '#A3A3A3', '#FAFAFA'], mood: 'monochrome', useCase: 'UI' },
] as const;

const gradientSeeds = [
  { name: 'Electric Dusk', colors: ['#667EEA', '#764BA2'], mood: 'vibrant' },
  { name: 'Lime Signal', colors: ['#111111', '#E8FF57'], mood: 'neon' },
  { name: 'Rose Glass', colors: ['#FAD0C4', '#FFD1FF'], mood: 'pastel' },
  { name: 'Deep Console', colors: ['#050505', '#1F2937', '#0F766E'], mood: 'dark' },
  { name: 'Soft Aurora', colors: ['#A1C4FD', '#C2E9FB'], mood: 'soft' },
  { name: 'Heat Map', colors: ['#FF512F', '#F09819', '#F8FF57'], mood: 'vibrant' },
] as const;

function hexToHsl(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360 / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t: number) => {
    let tc = t;
    if (tc < 0) tc += 1;
    if (tc > 1) tc -= 1;
    if (tc < 1 / 6) return p + (q - p) * 6 * tc;
    if (tc < 1 / 2) return q;
    if (tc < 2 / 3) return p + (q - p) * (2 / 3 - tc) * 6;
    return p;
  };
  const to = (v: number) => Math.round(Math.min(255, Math.max(0, v * 255))).toString(16).padStart(2, '0').toUpperCase();
  return `#${to(channel(hue + 1 / 3))}${to(channel(hue))}${to(channel(hue - 1 / 3))}`;
}

// Perceptual shift: rotate hue + nudge saturation/lightness so
// `Midnight Slate 1..40` are actually distinct instead of near-duplicates.
function shiftColor(hex: string, round: number, colorIndex: number) {
  const [h, s, l] = hexToHsl(hex);
  // Neutrals (low saturation) shift lightness; colors rotate hue.
  if (s < 0.12) {
    const delta = ((round * 7 + colorIndex * 13) % 29) - 14;
    return hslToHex(h, s, Math.min(0.96, Math.max(0.04, l + delta / 100)));
  }
  const hueShift = (round * 47 + colorIndex * 23) % 360;
  const satShift = (((round + colorIndex) % 5) - 2) * 0.03;
  const lightShift = (((round * 3 + colorIndex) % 7) - 3) * 0.02;
  return hslToHex(h + hueShift, Math.min(0.95, Math.max(0.05, s + satShift)), Math.min(0.94, Math.max(0.06, l + lightShift)));
}

export const palettes: Palette[] = Array.from({ length: 240 }, (_, index) => {
  const seed = paletteSeeds[index % paletteSeeds.length];
  const round = Math.floor(index / paletteSeeds.length);
  return {
    id: `palette-${index + 1}`,
    name: `${seed.name} ${round + 1}`,
    mood: seed.mood,
    useCase: seed.useCase,
    colors: seed.colors.map((color, colorIndex) => shiftColor(color, round, colorIndex)),
  };
});

export const gradients: Gradient[] = Array.from({ length: 180 }, (_, index) => {
  const seed = gradientSeeds[index % gradientSeeds.length];
  const round = Math.floor(index / gradientSeeds.length);
  return {
    id: `gradient-${index + 1}`,
    name: `${seed.name} ${round + 1}`,
    mood: seed.mood,
    colors: seed.colors.map((color, colorIndex) => shiftColor(color, round * 2, colorIndex)),
  };
});

export function paletteToCssVariables(colors: string[]) {
  return colors.map((color, index) => `--color-${index + 1}: ${color};`).join('\n');
}

export function paletteToTailwindConfig(name: string, colors: string[]) {
  const key = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'palette';
  const entries = colors.map((color, index) => `        ${index + 1}: '${color}',`).join('\n');
  return `// tailwind.config.js — ${name}\ncolors: {\n  '${key}': {\n${entries}\n  },\n}`;
}

export function gradientToCss(colors: string[], angle: number, type: 'linear' | 'radial') {
  if (type === 'radial') return `background: radial-gradient(circle, ${colors.join(', ')});`;
  const stops = colors.map((color, index) => `${color} ${Math.round((index / Math.max(colors.length - 1, 1)) * 100)}%`).join(', ');
  return `background: linear-gradient(${angle}deg, ${stops});`;
}
