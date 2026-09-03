'use client';

import React, { useMemo, useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { useToast } from '@/components/ui/Toast';
import { gradientToCss, gradients } from '@/lib/colorAssets';
import { FAVORITE_KEYS, useLocalStorageList } from '@/lib/storage';

const MOODS = ['all', 'vibrant', 'soft', 'dark', 'neon', 'pastel'] as const;
const COUNTS = ['all', '2-color', '3-color', 'multi'] as const;

export default function GradientsPage() {
  const { showToast } = useToast();
  const { items: favorites, toggle, has } = useLocalStorageList(FAVORITE_KEYS.gradients);
  const [mood, setMood] = useState<typeof MOODS[number]>('all');
  const [count, setCount] = useState<typeof COUNTS[number]>('all');
  const [selectedId, setSelectedId] = useState(gradients[0]?.id ?? '');
  const [angle, setAngle] = useState(135);
  const [type, setType] = useState<'linear' | 'radial'>('linear');

  const filtered = useMemo(() => gradients.filter((gradient) => {
    if (mood !== 'all' && gradient.mood !== mood) return false;
    if (count === '2-color' && gradient.colors.length !== 2) return false;
    if (count === '3-color' && gradient.colors.length !== 3) return false;
    if (count === 'multi' && gradient.colors.length < 4) return false;
    return true;
  }), [mood, count]);

  const selected = gradients.find((gradient) => gradient.id === selectedId) ?? filtered[0] ?? gradients[0];
  const selectedCss = selected ? gradientToCss(selected.colors, angle, type) : '';

  const copyCss = async () => {
    await navigator.clipboard.writeText(selectedCss);
    showToast('Gradient CSS copied');
  };

  const downloadPng = () => {
    if (!selected) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 630;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        showToast('Could not export PNG');
        return;
      }
      if (type === 'radial') {
        const grad = ctx.createRadialGradient(600, 315, 50, 600, 315, 700);
        selected.colors.forEach((color, i) => {
          grad.addColorStop(i / Math.max(selected.colors.length - 1, 1), color);
        });
        ctx.fillStyle = grad;
      } else {
        const rad = ((angle - 90) * Math.PI) / 180;
        const x = Math.cos(rad);
        const y = Math.sin(rad);
        const grad = ctx.createLinearGradient(600 - x * 600, 315 - y * 315, 600 + x * 600, 315 + y * 315);
        selected.colors.forEach((color, i) => {
          grad.addColorStop(i / Math.max(selected.colors.length - 1, 1), color);
        });
        ctx.fillStyle = grad;
      }
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selected.id}.png`;
      a.click();
      showToast('Gradient PNG downloaded');
    } catch {
      showToast('Could not export PNG');
    }
  };

  return (
    <main id="main-content" className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-14 px-4 sm:px-6 py-6">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Gradients</h1>
            <p className="text-sm text-text-muted mt-1">180 generated gradients with editable angle and CSS export.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={mood} onChange={(e) => setMood(e.target.value as typeof MOODS[number])} className="bg-surface border border-border rounded-input px-3 py-2 text-xs text-text-primary">
              {MOODS.map((item) => <option key={item} value={item}>{item === 'all' ? 'All moods' : item}</option>)}
            </select>
            <select value={count} onChange={(e) => setCount(e.target.value as typeof COUNTS[number])} className="bg-surface border border-border rounded-input px-3 py-2 text-xs text-text-primary">
              {COUNTS.map((item) => <option key={item} value={item}>{item === 'all' ? 'All color counts' : item}</option>)}
            </select>
            <span className="text-[10px] font-mono text-accent border border-accent/30 bg-accent/10 rounded-input px-2 py-2">
              All filters unlocked
            </span>
          </div>
        </div>

        {selected && (
          <div className="mb-5 rounded-card border border-border bg-surface p-4 grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="min-h-40 rounded-card border border-border" style={{ background: selectedCss.replace('background: ', '').replace(';', '') }} />
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">{selected.name}</p>
                <p className="text-[10px] font-mono text-text-muted mt-0.5">{selected.mood} · {selected.colors.length} colors</p>
              </div>
              <div className="flex gap-1">
                {(['linear', 'radial'] as const).map((option) => (
                  <button
                    key={option}
                    onClick={() => setType(option)}
                    className={`text-[11px] font-mono px-3 py-1.5 rounded-input border ${
                      type === option ? 'border-accent/40 text-accent bg-accent/10' : 'border-border text-text-muted'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <label className="block">
                <div className="mb-1 flex items-center justify-between text-[10px] font-mono text-text-muted">
                  <span>Angle</span><span>{angle}deg</span>
                </div>
                <input type="range" min={0} max={360} value={angle} onChange={(e) => setAngle(Number(e.target.value))} className="w-full" style={{ accentColor: '#E8FF57' }} />
              </label>
              <button onClick={copyCss} className="w-full text-[11px] font-mono py-2 px-3 rounded-input border border-accent/40 text-accent bg-accent/10">
                Copy CSS
              </button>
              <button onClick={downloadPng} className="w-full text-[11px] font-mono py-2 px-3 rounded-input border border-border text-text-muted bg-surface hover:text-text-primary hover:border-border-hover">
                ↓ Download PNG
              </button>
              <pre className="text-[10px] font-mono text-text-muted whitespace-pre-wrap border border-border rounded-card p-2 bg-background">{selectedCss}</pre>
            </div>
          </div>
        )}

        <div className="mb-3 text-[11px] font-mono text-text-muted">{filtered.length} gradients · {favorites.length} saved</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((gradient) => {
            const favorite = has(gradient.id);
            const css = gradientToCss(gradient.colors, 135, 'linear').replace('background: ', '').replace(';', '');
            return (
              <button
                key={gradient.id}
                onClick={() => setSelectedId(gradient.id)}
                className={`text-left rounded-card border bg-surface overflow-hidden hover:border-border-hover transition-colors duration-150 ${
                  selected?.id === gradient.id ? 'border-accent/40' : 'border-border'
                }`}
              >
                <div className="h-28" style={{ background: css }} />
                <div className="flex items-center justify-between gap-3 px-3 py-3 border-t border-border">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{gradient.name}</p>
                    <p className="text-[10px] font-mono text-text-muted mt-0.5">{gradient.mood} · {gradient.colors.length} colors</p>
                  </div>
                  <span
                    onClick={(e) => { e.stopPropagation(); toggle(gradient.id); }}
                    className={`p-2 rounded ${favorite ? 'text-accent' : 'text-text-muted hover:text-accent'}`}
                    role="button"
                    aria-label={favorite ? 'Remove gradient favorite' : 'Save gradient'}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill={favorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}
