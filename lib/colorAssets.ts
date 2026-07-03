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

function rotateHex(hex: string, amount: number) {
  const clean = hex.replace('#', '');
  const value = parseInt(clean, 16);
  const shifted = (value + amount * 65793) % 0xFFFFFF;
  return `#${shifted.toString(16).padStart(6, '0').toUpperCase()}`;
}

export const palettes: Palette[] = Array.from({ length: 240 }, (_, index) => {
  const seed = paletteSeeds[index % paletteSeeds.length];
  const round = Math.floor(index / paletteSeeds.length);
  return {
    id: `palette-${index + 1}`,
    name: `${seed.name} ${round + 1}`,
    mood: seed.mood,
    useCase: seed.useCase,
    colors: seed.colors.map((color, colorIndex) => rotateHex(color, (round * 9) + (colorIndex * 3))),
  };
});

export const gradients: Gradient[] = Array.from({ length: 180 }, (_, index) => {
  const seed = gradientSeeds[index % gradientSeeds.length];
  const round = Math.floor(index / gradientSeeds.length);
  return {
    id: `gradient-${index + 1}`,
    name: `${seed.name} ${round + 1}`,
    mood: seed.mood,
    colors: seed.colors.map((color, colorIndex) => rotateHex(color, (round * 11) + (colorIndex * 5))),
  };
});

export function paletteToCssVariables(colors: string[]) {
  return colors.map((color, index) => `--color-${index + 1}: ${color};`).join('\n');
}

export function gradientToCss(colors: string[], angle: number, type: 'linear' | 'radial') {
  if (type === 'radial') return `background: radial-gradient(circle, ${colors.join(', ')});`;
  const stops = colors.map((color, index) => `${color} ${Math.round((index / Math.max(colors.length - 1, 1)) * 100)}%`).join(', ');
  return `background: linear-gradient(${angle}deg, ${stops});`;
}
