'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { useFontStore } from '@/store/useFontStore';
import { allFonts, searchFontsInList } from '@/lib/fonts';
import { ensureFontStylesheet } from '@/lib/fontLoader';
import { useToast } from '@/components/ui/Toast';
import type { Font } from '@/lib/types';

const WEIGHT_NAMES: Record<number, string> = {
  100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular',
  500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black',
};

function loadFont(font: Font) {
  void ensureFontStylesheet(font);
}

/* ─── Add Font Modal ─── */
function AddFontModal({
  onAdd,
  onClose,
  existingSlugs,
}: {
  onAdd: (f: Font) => void;
  onClose: () => void;
  existingSlugs: string[];
}) {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const base = query.trim() ? searchFontsInList(allFonts, query, 80) : allFonts.slice(0, 40);
    return base.filter((f) => !existingSlugs.includes(f.slug)).slice(0, 40);
  }, [query, existingSlugs]);

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-surface border border-border rounded-card w-full max-w-md shadow-2xl z-10 flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-border flex items-center justify-between flex-shrink-0">
          <h3 className="font-sans font-semibold text-text-primary text-sm">Add font to compare</h3>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors p-1"
            id="close-add-font-modal"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 flex-shrink-0">
          <input
            type="text"
            id="add-font-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search fonts…"
            className="w-full bg-background border border-border rounded-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-hover"
            autoFocus
          />
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-3">
          {results.length === 0 ? (
            <p className="text-center text-xs text-text-muted py-6">No fonts found</p>
          ) : (
            results.map((f) => (
              <button
                key={f.slug}
                onClick={() => { onAdd(f); loadFont(f); onClose(); }}
                className="w-full text-left px-3 py-2.5 rounded hover:bg-background transition-colors flex items-center justify-between"
              >
                <span className="text-sm text-text-primary font-sans">{f.name}</span>
                <span className="font-mono text-[10px] text-text-muted">{f.category}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Font Column ─── */
interface FontColumnProps {
  font: Font;
  previewText: string;
  size: number;
  weight: number;
  tracking: number;
  lineHeight: number;
  background: 'dark' | 'light';
  onRemove: () => void;
}

function FontColumn({ font, previewText, size, weight, tracking, lineHeight, background, onRemove }: FontColumnProps) {
  const isDark = background === 'dark';
  const bgColor = isDark ? '#111111' : '#FAFAFA';
  const textColor = isDark ? '#F2F2F2' : '#111111';
  const metaColor = isDark ? '#444444' : '#AAAAAA';

  // Snap weight to nearest available
  const availableWeight = font.weights.length > 0
    ? (font.weights.includes(weight)
        ? weight
        : font.weights.reduce((p, c) => Math.abs(c - weight) < Math.abs(p - weight) ? c : p))
    : weight;

  return (
    <div className="flex-1 min-w-[200px] border-r border-border last:border-r-0 flex flex-col min-h-0">
      {/* Column header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0 bg-surface/50">
        <div className="min-w-0">
          <p className="font-sans font-semibold text-sm text-text-primary truncate">{font.name}</p>
          <p className="font-mono text-[10px] text-text-muted mt-0.5">{font.category} · {font.weights.length} weights</p>
        </div>
        <button
          onClick={onRemove}
          className="text-text-muted hover:text-text-primary transition-colors p-1 flex-shrink-0 ml-2"
          aria-label={`Remove ${font.name}`}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Preview area */}
      <div className="flex-1 p-5 overflow-hidden" style={{ backgroundColor: bgColor, minHeight: '220px' }}>
        <p
          style={{
            fontFamily: font.fontFamily,
            fontSize: `${size}px`,
            fontWeight: availableWeight,
            letterSpacing: `${tracking}px`,
            lineHeight: lineHeight,
            color: textColor,
            wordBreak: 'break-word',
          }}
        >
          {previewText || 'The quick brown fox'}
        </p>
        {/* Mini glyph row */}
        <p
          className="mt-3 text-[10px] tracking-widest"
          style={{ fontFamily: font.fontFamily, color: metaColor }}
        >
          A B C D E F G H I J K L M N 0 1 2 3
        </p>
      </div>

      {/* Metadata footer */}
      <div className="px-4 py-3 border-t border-border flex-shrink-0 space-y-1.5 bg-surface/30">
        {[
          { label: 'Weights', value: font.weights.join(' · ') },
          { label: 'Variable', value: font.isVariable ? 'Yes' : 'No' },
          { label: 'Source', value: font.source === 'google-fonts' ? 'Google Fonts' : font.source },
          { label: 'License', value: font.license },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-start gap-2">
            <span className="text-[9px] font-mono text-text-muted uppercase w-14 flex-shrink-0 pt-0.5">{label}</span>
            <span className="text-[10px] font-mono text-text-primary leading-relaxed">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main page ─── */

export default function ComparePage() {
  const { comparedFonts, addToCompare, removeFromCompare, clearCompare } = useFontStore();
  const { showToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [previewText, setPreviewText] = useState('The quick brown fox');
  const [size, setSize] = useState(36);
  const [weight, setWeight] = useState(400);
  const [tracking, setTracking] = useState(0);
  const [lineHeight, setLineHeight] = useState(1.3);
  const [background, setBackground] = useState<'dark' | 'light'>('dark');

  // Hydrate from shareable ?fonts=a,b,c (frontend-only, no backend).
  useEffect(() => {
    try {
      const slugs = new URLSearchParams(window.location.search).get('fonts');
      if (!slugs) return;
      if (useFontStore.getState().comparedFonts.length > 0) return;
      slugs.split(',').filter(Boolean).slice(0, 4).forEach((slug) => {
        const font = allFonts.find((f) => f.slug === slug);
        if (font) useFontStore.getState().addToCompare(font);
      });
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep URL in sync so comparisons are shareable.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (comparedFonts.length > 0) params.set('fonts', comparedFonts.map((f) => f.slug).join(','));
      else params.delete('fonts');
      const next = params.toString();
      window.history.replaceState(null, '', next ? `${window.location.pathname}?${next}` : window.location.pathname);
    } catch { /* ignore */ }
  }, [comparedFonts]);

  // Load fonts that are already in compare (e.g. from store persistence or card buttons)
  useEffect(() => {
    comparedFonts.forEach(loadFont);
  }, [comparedFonts]);

  const handleAdd = useCallback(
    (font: Font) => {
      const result = addToCompare(font);
      if (result === 'limit') showToast('Max 4 fonts in compare');
      else if (result === 'duplicate') showToast(`${font.name} already added`);
    },
    [addToCompare, showToast]
  );

  const handleExport = useCallback(async () => {
    const text = comparedFonts
      .map((f) =>
        `${f.name}\nCategory: ${f.category}\nWeights: ${f.weights.join(', ')}\nVariable: ${f.isVariable ? `yes (${f.variableAxes.join(', ')})` : 'no'}\nSource: ${f.source}\nImport: ${f.importUrl}\nCSS: font-family: ${f.fontFamily};\n`
      )
      .join('\n---\n');
    await navigator.clipboard.writeText(text);
    showToast('Comparison copied to clipboard');
  }, [comparedFonts, showToast]);

  const handleShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('Compare link copied — share it anywhere');
    } catch {
      showToast('Could not copy link');
    }
  }, [showToast]);

  const controlClass = 'flex items-center gap-2';
  const labelClass = 'text-[10px] font-mono text-text-muted flex-shrink-0';

  return (
    <main id="main-content" className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="pt-14 flex flex-col flex-1">
        {/* Page header */}
        <div className="border-b border-border px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="font-sans font-bold text-xl text-text-primary">Compare Fonts</h1>
            <p className="text-sm text-text-muted mt-0.5">Compare up to 4 fonts side by side</p>
          </div>
          <div className="flex items-center gap-2">
            {comparedFonts.length > 0 && (
              <>
                <button
                  onClick={handleShare}
                  className="text-[11px] font-mono py-2 px-3 rounded-input border border-border text-text-muted bg-surface hover:border-border-hover transition-colors"
                  id="compare-share"
                >
                  Share
                </button>
                <button
                  onClick={handleExport}
                  className="text-[11px] font-mono py-2 px-3 rounded-input border border-border text-text-muted bg-surface hover:border-border-hover transition-colors"
                  id="compare-export"
                >
                  Export
                </button>
                <button
                  onClick={clearCompare}
                  className="text-[11px] font-mono py-2 px-3 rounded-input border border-border text-text-muted hover:text-text-primary transition-colors"
                  id="compare-clear"
                >
                  Clear all
                </button>
              </>
            )}
            {comparedFonts.length < 4 && (
              <button
                onClick={() => setShowModal(true)}
                className="text-[11px] font-mono py-2 px-3 rounded-input border border-accent/40 text-accent bg-accent/10 hover:bg-accent/20 transition-colors"
                id="compare-add-font"
              >
                + Add font
              </button>
            )}
          </div>
        </div>

        {/* Shared controls toolbar */}
        <div className="border-b border-border px-5 py-2.5 flex items-center gap-3 flex-shrink-0 flex-wrap bg-surface/30">
          {/* Preview text */}
          <input
            type="text"
            id="compare-preview-text"
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            className="bg-transparent text-sm text-text-primary focus:outline-none flex-1 min-w-32"
            placeholder="Preview text…"
          />

          <div className="w-px h-4 bg-border hidden sm:block" />

          {/* Size */}
          <div className={`${controlClass} hidden sm:flex`}>
            <span className={labelClass}>Size</span>
            <input type="range" id="compare-size" min={10} max={80} value={size}
              onChange={(e) => setSize(Number(e.target.value))} className="w-16" style={{ accentColor: '#E8FF57' }} />
            <span className={`${labelClass} tabular-nums`}>{size}px</span>
          </div>

          <div className="w-px h-4 bg-border hidden sm:block" />

          {/* Weight */}
          <div className={`${controlClass} hidden sm:flex`}>
            <span className={labelClass}>Weight</span>
            <input type="range" id="compare-weight" min={100} max={900} step={100} value={weight}
              onChange={(e) => setWeight(Number(e.target.value))} className="w-16" style={{ accentColor: '#E8FF57' }} />
            <span className={`${labelClass} tabular-nums`}>{WEIGHT_NAMES[weight] || weight}</span>
          </div>

          <div className="w-px h-4 bg-border hidden md:block" />

          {/* Tracking — was missing before, now added */}
          <div className={`${controlClass} hidden md:flex`}>
            <span className={labelClass}>Tracking</span>
            <input type="range" id="compare-tracking" min={-3} max={15} step={0.5} value={tracking}
              onChange={(e) => setTracking(Number(e.target.value))} className="w-16" style={{ accentColor: '#E8FF57' }} />
            <span className={`${labelClass} tabular-nums`}>{tracking}px</span>
          </div>

          <div className="w-px h-4 bg-border hidden md:block" />

          {/* Line height */}
          <div className={`${controlClass} hidden md:flex`}>
            <span className={labelClass}>Leading</span>
            <input type="range" id="compare-lineheight" min={0.8} max={3} step={0.1} value={lineHeight}
              onChange={(e) => setLineHeight(Number(e.target.value))} className="w-16" style={{ accentColor: '#E8FF57' }} />
            <span className={`${labelClass} tabular-nums`}>{lineHeight.toFixed(1)}</span>
          </div>

          <div className="w-px h-4 bg-border" />

          {/* Background */}
          <div className="flex gap-1" role="group" aria-label="Compare background">
            {(['dark', 'light'] as const).map((b) => (
              <button
                key={b}
                onClick={() => setBackground(b)}
                aria-pressed={background === b}
                className={`text-[10px] font-mono px-2 py-1 rounded border transition-none ${
                  background === b ? 'border-accent/40 text-accent bg-accent/10' : 'border-border text-text-muted'
                }`}
                id={`compare-bg-${b}`}
              >
                {b.charAt(0).toUpperCase() + b.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Compare columns */}
        {comparedFonts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-surface border border-border flex items-center justify-center mb-5">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333333" strokeWidth="1.5" strokeLinecap="round">
                <rect width="6" height="18" x="2" y="3" rx="1" />
                <rect width="6" height="18" x="10" y="3" rx="1" />
                <rect width="6" height="18" x="18" y="3" rx="1" />
              </svg>
            </div>
            <p className="text-text-muted text-sm mb-1.5">No fonts selected for comparison</p>
            <p className="text-text-subtle text-[11px] font-mono mb-5">Add up to 4 fonts to compare them side by side</p>
            <button
              onClick={() => setShowModal(true)}
              className="text-[12px] font-mono py-2 px-5 rounded-input border border-accent/40 text-accent bg-accent/10 hover:bg-accent/20 transition-colors"
            >
              + Add your first font
            </button>
          </div>
        ) : (
          <div className="flex flex-1 overflow-x-auto">
            {comparedFonts.map((font) => (
              <FontColumn
                key={font.id}
                font={font}
                previewText={previewText}
                size={size}
                weight={weight}
                tracking={tracking}
                lineHeight={lineHeight}
                background={background}
                onRemove={() => removeFromCompare(font.id)}
              />
            ))}
            {comparedFonts.length < 4 && (
              <div className="w-48 flex-shrink-0 flex items-center justify-center border-l border-dashed border-border/40">
                <button
                  onClick={() => setShowModal(true)}
                  className="flex flex-col items-center gap-2 text-text-muted hover:text-text-primary transition-colors p-8"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v8M8 12h8" />
                  </svg>
                  <span className="text-[10px] font-mono">Add font</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <AddFontModal
          onAdd={handleAdd}
          onClose={() => setShowModal(false)}
          existingSlugs={comparedFonts.map((f) => f.slug)}
        />
      )}
    </main>
  );
}
