'use client';

import React, { useMemo, useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { useToast } from '@/components/ui/Toast';
import { FAVORITE_KEYS, useLocalStorageList } from '@/lib/storage';
import { paletteToCssVariables, paletteToTailwindConfig, palettes } from '@/lib/colorAssets';
import { getContrastRatio } from '@/lib/contrast';

const MOODS = ['all', 'warm', 'cool', 'monochrome', 'vibrant', 'muted', 'pastel'] as const;
const USE_CASES = ['all', 'UI', 'branding', 'data viz'] as const;

function Heart({ active }: { active: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

export default function PalettesPage() {
  const { showToast } = useToast();
  const { items: favorites, toggle, has } = useLocalStorageList(FAVORITE_KEYS.palettes);
  const [mood, setMood] = useState<typeof MOODS[number]>('all');
  const [useCase, setUseCase] = useState<typeof USE_CASES[number]>('all');

  const filtered = useMemo(() => palettes.filter((palette) => {
    if (mood !== 'all' && palette.mood !== mood) return false;
    if (useCase !== 'all' && palette.useCase !== useCase) return false;
    return true;
  }), [mood, useCase]);

  const copy = async (text: string, message: string) => {
    await navigator.clipboard.writeText(text);
    showToast(message);
  };

  return (
    <main id="main-content" className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-14 px-4 sm:px-6 py-6">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Color Palettes</h1>
            <p className="text-sm text-text-muted mt-1">240 free palettes. Copy swatches or CSS variables instantly.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={mood} onChange={(e) => setMood(e.target.value as typeof MOODS[number])} className="bg-surface border border-border rounded-input px-3 py-2 text-xs text-text-primary">
              {MOODS.map((item) => <option key={item} value={item}>{item === 'all' ? 'All moods' : item}</option>)}
            </select>
            <select value={useCase} onChange={(e) => setUseCase(e.target.value as typeof USE_CASES[number])} className="bg-surface border border-border rounded-input px-3 py-2 text-xs text-text-primary">
              {USE_CASES.map((item) => <option key={item} value={item}>{item === 'all' ? 'All use cases' : item}</option>)}
            </select>
            <span className="text-[10px] font-mono text-accent border border-accent/30 bg-accent/10 rounded-input px-2 py-2">
              All filters unlocked
            </span>
          </div>
        </div>

        <div className="mb-3 text-[11px] font-mono text-text-muted">{filtered.length} palettes · {favorites.length} saved</div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((palette) => {
            const favorite = has(palette.id);
            // WCAG: darkest vs lightest as body text/background proxy.
            const contrast = getContrastRatio(palette.colors[0], palette.colors[palette.colors.length - 1]);
            return (
              <div key={palette.id} className="rounded-card border border-border bg-surface overflow-hidden hover:border-border-hover transition-colors duration-150">
                <div className="grid grid-cols-5 h-28">
                  {palette.colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => copy(color, `${color} copied`)}
                      className="group relative"
                      style={{ backgroundColor: color }}
                      title={`Copy ${color}`}
                      aria-label={`Copy ${color}`}
                    >
                      <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-mono bg-background/80 text-text-primary px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        {color}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-3 px-3 py-3 border-t border-border">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">{palette.name}</p>
                    <p className="text-[10px] font-mono text-text-muted mt-0.5">
                      {palette.mood} · {palette.useCase} · {contrast.toFixed(1)}:1 contrast
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => copy(paletteToCssVariables(palette.colors), 'CSS variables copied')}
                      className="text-[10px] font-mono px-2 py-1.5 rounded-input border border-border text-text-muted hover:text-text-primary"
                      title="Copy CSS variables"
                    >
                      CSS
                    </button>
                    <button
                      onClick={() => copy(paletteToTailwindConfig(palette.name, palette.colors), 'Tailwind config copied')}
                      className="text-[10px] font-mono px-2 py-1.5 rounded-input border border-border text-text-muted hover:text-text-primary"
                      title="Copy Tailwind config snippet"
                    >
                      TW
                    </button>
                    <button
                      onClick={() => {
                        try {
                          window.localStorage.setItem('fontstash_active_palette', JSON.stringify(palette.colors));
                        } catch { /* ignore */ }
                        copy(paletteToCssVariables(palette.colors), `Palette saved — open Pairs to preview it`);
                      }}
                      className="text-[10px] font-mono px-2 py-1.5 rounded-input border border-accent/30 text-accent bg-accent/10 hover:bg-accent/20"
                      title="Preview this palette in Pairs"
                    >
                      Pairs →
                    </button>
                    <button
                      onClick={() => toggle(palette.id)}
                      className={`p-2 rounded ${favorite ? 'text-accent' : 'text-text-muted hover:text-accent'}`}
                      aria-label={favorite ? 'Remove palette favorite' : 'Save palette'}
                      aria-pressed={favorite}
                    >
                      <Heart active={favorite} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
