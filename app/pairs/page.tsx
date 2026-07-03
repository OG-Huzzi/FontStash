'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { useToast } from '@/components/ui/Toast';
import { allFonts, curatedPairings, getPairingScore } from '@/lib/fonts';
import type { Font } from '@/lib/types';


function loadFont(font: Font) {
  if (typeof document === 'undefined') return;
  const linkId = `font-pairs-${font.slug}`;
  if (document.getElementById(linkId)) return;
  const link = document.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  link.href = font.importUrl;
  document.head.appendChild(link);
}

const MOCKUP_TYPES = ['Landing', 'Article', 'Dashboard', 'Card'] as const;
type MockupType = typeof MOCKUP_TYPES[number];

/* ─── Mockup components ─── */

function LandingMockup({ hFont, bFont }: { hFont: Font | null; bFont: Font | null }) {
  return (
    <div className="p-6 bg-surface rounded-card border border-border">
      <p className="text-[10px] font-mono text-accent mb-3 uppercase tracking-widest">→ Now in beta</p>
      <h2
        className="text-3xl font-bold text-text-primary leading-tight mb-3"
        style={{ fontFamily: hFont?.fontFamily || 'inherit' }}
      >
        Design tools for<br />modern creators
      </h2>
      <p
        className="text-sm text-text-muted leading-relaxed mb-5"
        style={{ fontFamily: bFont?.fontFamily || 'inherit' }}
      >
        Build beautiful products faster with our design system. Trusted by 10,000+ designers worldwide.
      </p>
      <div className="flex gap-2">
        <div className="px-4 py-2 bg-accent rounded text-background text-xs font-semibold" style={{ fontFamily: bFont?.fontFamily || 'inherit' }}>
          Get started free
        </div>
        <div className="px-4 py-2 border border-border rounded text-text-muted text-xs" style={{ fontFamily: bFont?.fontFamily || 'inherit' }}>
          View demo
        </div>
      </div>
    </div>
  );
}

function ArticleMockup({ hFont, bFont }: { hFont: Font | null; bFont: Font | null }) {
  return (
    <div className="p-6 bg-surface rounded-card border border-border">
      <p className="text-[10px] font-mono text-accent mb-2">Design · 5 min read</p>
      <h2
        className="text-2xl font-bold text-text-primary mb-3 leading-snug"
        style={{ fontFamily: hFont?.fontFamily || 'inherit' }}
      >
        The Art of White Space in Modern Typography
      </h2>
      <p
        className="text-sm text-text-muted leading-relaxed mb-4"
        style={{ fontFamily: bFont?.fontFamily || 'inherit' }}
      >
        White space is often called negative space, but it&apos;s far from negative. In typographic design,
        it breathes life into layouts and guides the reader&apos;s eye through the content effortlessly.
      </p>
      <div className="flex items-center gap-3 pt-3 border-t border-border">
        <div className="w-6 h-6 rounded-full bg-border flex-shrink-0" />
        <span className="text-[11px] font-mono text-text-muted">Jane Smith · June 2026</span>
      </div>
    </div>
  );
}

function DashboardMockup({ hFont, bFont }: { hFont: Font | null; bFont: Font | null }) {
  const bars = [32, 48, 40, 64, 44, 56];
  return (
    <div className="p-5 bg-surface rounded-card border border-border">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[11px] text-text-muted mb-1" style={{ fontFamily: bFont?.fontFamily || 'inherit' }}>Monthly Revenue</p>
          <p className="text-3xl font-bold text-text-primary" style={{ fontFamily: hFont?.fontFamily || 'inherit' }}>$48,291</p>
        </div>
        <span className="text-[10px] text-accent border border-accent/30 bg-accent/10 px-2 py-0.5 rounded">+12.3%</span>
      </div>
      <div className="flex items-end gap-2 h-16">
        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((m, i) => (
          <div key={m} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full rounded-sm bg-accent/30 transition-all" style={{ height: `${bars[i]}px` }} />
            <span className="text-[8px] font-mono text-text-subtle">{m}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CardMockup({ hFont, bFont }: { hFont: Font | null; bFont: Font | null }) {
  return (
    <div className="p-5 bg-surface rounded-card border border-border">
      <div className="w-full h-24 rounded bg-border/40 mb-4 flex items-center justify-center">
        <span className="text-[10px] font-mono text-text-subtle">Image placeholder</span>
      </div>
      <p className="text-[9px] font-mono text-accent uppercase tracking-wider mb-1.5">Product</p>
      <h3
        className="text-lg font-bold text-text-primary mb-1.5 leading-snug"
        style={{ fontFamily: hFont?.fontFamily || 'inherit' }}
      >
        Premium Design Kit
      </h3>
      <p
        className="text-xs text-text-muted leading-relaxed mb-3"
        style={{ fontFamily: bFont?.fontFamily || 'inherit' }}
      >
        Everything you need to build stunning interfaces. 200+ components.
      </p>
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-text-primary" style={{ fontFamily: hFont?.fontFamily || 'inherit' }}>$49</span>
        <div className="px-3 py-1 bg-accent rounded text-background text-[11px] font-medium" style={{ fontFamily: bFont?.fontFamily || 'inherit' }}>Buy now</div>
      </div>
    </div>
  );
}

/* ─── Font Picker ─── */

function FontPicker({
  label,
  selectedFont,
  onSelect,
}: {
  label: string;
  selectedFont: Font | null;
  onSelect: (f: Font) => void;
}) {
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? allFonts.filter((f) => (
          f.name.toLowerCase().includes(q) ||
          f.category.toLowerCase().includes(q) ||
          f.designer.toLowerCase().includes(q)
        ))
      : allFonts;
  }, [query]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (f: Font) => {
    onSelect(f);
    setQuery('');
    setShowDropdown(false);
  };

  const displayValue = showDropdown ? query : (selectedFont?.name ?? query);

  return (
    <div ref={wrapperRef} className="relative">
      <p className="text-[9px] font-mono text-text-muted uppercase tracking-widest mb-2">{label}</p>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); }}
          onFocus={() => { setQuery(''); setShowDropdown(true); }}
          placeholder={`Search ${label.toLowerCase()}…`}
          className="w-full bg-surface border border-border rounded-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-hover"
          id={`pairs-${label.toLowerCase().replace(/\s+/g, '-')}-search`}
        />
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-card z-20 max-h-52 overflow-y-auto scrollbar-thin shadow-2xl">
            <div className="sticky top-0 z-10 px-3 py-2 border-b border-border bg-surface text-[10px] font-mono text-text-muted flex items-center justify-between">
              <span>{results.length.toLocaleString()} matches</span>
              <span>Full catalog search</span>
            </div>
            {results.length === 0 ? (
              <p className="px-3 py-4 text-xs text-text-muted text-center">No fonts found</p>
            ) : (
              results.map((f) => (
                <button
                  key={f.slug}
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(f); }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors border-b border-border last:border-0 ${
                    selectedFont?.slug === f.slug
                      ? 'text-accent bg-accent/10'
                      : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
                  }`}
                >
                  <span className="font-sans">{f.name}</span>
                  <span className="font-mono text-[9px] ml-2 text-text-subtle">{f.category}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
      {selectedFont && (
        <div className="mt-2 p-3 rounded-card border border-border bg-surface/50">
          <p
            className="text-xl text-text-primary leading-tight"
            style={{ fontFamily: selectedFont.fontFamily, fontWeight: 700 }}
          >
            {selectedFont.name}
          </p>
          <p className="text-[10px] font-mono text-text-muted mt-1">
            {selectedFont.category} · {selectedFont.weights.length} weights
            {selectedFont.isVariable && ' · Variable'}
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Main page ─── */

function PairsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [headingFont, setHeadingFontState] = useState<Font | null>(null);
  const [bodyFont, setBodyFontState] = useState<Font | null>(null);
  const [mockupType, setMockupType] = useState<MockupType>('Landing');
  const [shareCopied, setShareCopied] = useState(false);

  // Load fonts from URL params on mount
  useEffect(() => {
    const h = searchParams.get('h');
    const b = searchParams.get('b');
    if (h) {
      const f = allFonts.find((font) => font.slug === h);
      if (f) { setHeadingFontState(f); loadFont(f); }
    }
    if (b) {
      const f = allFonts.find((font) => font.slug === b);
      if (f) { setBodyFontState(f); loadFont(f); }
    }
  }, [searchParams]);

  const setHeadingFont = useCallback(
    (f: Font) => {
      setHeadingFontState(f);
      loadFont(f);
      router.replace(`/pairs?h=${f.slug}${bodyFont ? `&b=${bodyFont.slug}` : ''}`, { scroll: false });
    },
    [bodyFont, router]
  );

  const setBodyFont = useCallback(
    (f: Font) => {
      setBodyFontState(f);
      loadFont(f);
      router.replace(`/pairs?${headingFont ? `h=${headingFont.slug}&` : ''}b=${f.slug}`, { scroll: false });
    },
    [headingFont, router]
  );

  const applyPair = useCallback((heading: Font, body: Font) => {
    setHeadingFontState(heading);
    setBodyFontState(body);
    loadFont(heading);
    loadFont(body);
    router.replace(`/pairs?h=${heading.slug}&b=${body.slug}`, { scroll: false });
    showToast(`${heading.name} + ${body.name} selected`);
  }, [router, showToast]);

  const pairingScore = useMemo(() => {
    if (!headingFont || !bodyFont) return null;
    return getPairingScore(headingFont, bodyFont);
  }, [headingFont, bodyFont]);

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/pairs?h=${headingFont?.slug || ''}&b=${bodyFont?.slug || ''}`;
    await navigator.clipboard.writeText(url);
    setShareCopied(true);
    showToast('Share link copied!');
    setTimeout(() => setShareCopied(false), 2000);
  }, [headingFont, bodyFont, showToast]);

  const handleCopyPrompt = useCallback(async () => {
    const prompt = `Create typography for a ${mockupType.toLowerCase()} mockup using this font pairing.\n\nHeading font: ${headingFont?.name ?? 'Select a heading font'}\n- font-family: ${headingFont?.fontFamily ?? 'inherit'}\n- suggested weight: 700\n- import: ${headingFont?.importUrl ?? 'choose after selecting'}\n\nBody font: ${bodyFont?.name ?? 'Select a body font'}\n- font-family: ${bodyFont?.fontFamily ?? 'inherit'}\n- suggested weight: 400\n- line-height: 1.6\n- import: ${bodyFont?.importUrl ?? 'choose after selecting'}\n\nUse the heading for primary titles and the body font for paragraphs, metadata, and controls. Keep the composition readable, modern, and suitable for designers reviewing font pairings.`;
    await navigator.clipboard.writeText(prompt);
    showToast('Prompt copied - paste into Cursor, v0, or Lovable');
  }, [headingFont, bodyFont, mockupType, showToast]);

  const handlePickCuratedPair = useCallback(() => {
    const pair = curatedPairings[Math.floor(Math.random() * curatedPairings.length)];
    const h = allFonts.find((f) => f.slug === pair.heading);
    const b = allFonts.find((f) => f.slug === pair.body);
    if (h) { setHeadingFontState(h); loadFont(h); }
    if (b) { setBodyFontState(b); loadFont(b); }
    if (h && b) router.replace(`/pairs?h=${h.slug}&b=${b.slug}`, { scroll: false });
  }, [router]);

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-14">
        {/* Page header */}
        <div className="border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-sans font-bold text-xl text-text-primary">Font Pairing Explorer</h1>
            <p className="text-sm text-text-muted mt-0.5">Find the perfect heading + body font combination</p>
          </div>
          <button
            onClick={handlePickCuratedPair}
            className="text-[11px] font-mono py-2 px-3 rounded-input border border-border text-text-muted bg-surface hover:border-border-hover hover:text-text-primary transition-colors hidden sm:block"
            id="pick-curated-pair"
          >
            Pick curated pair
          </button>
        </div>

        <div className="flex flex-col lg:flex-row">
          {/* Left column */}
          <div className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-border p-5 flex-shrink-0 space-y-5">
            <FontPicker label="Heading Font" selectedFont={headingFont} onSelect={setHeadingFont} />
            <FontPicker label="Body Font" selectedFont={bodyFont} onSelect={setBodyFont} />

            {/* Pairing score */}
            {pairingScore && (
              <div className="border border-border rounded-card p-3 bg-surface">
                <p className="text-[9px] font-mono text-text-muted uppercase tracking-widest mb-1.5">Pairing Score</p>
                <p className={`text-sm font-bold mb-1 ${
                  pairingScore.score === 'Complementary' ? 'score-complementary' :
                  pairingScore.score === 'Conflicting' ? 'score-conflicting' : 'score-neutral'
                }`}>
                  {pairingScore.score}
                </p>
                <p className="text-[11px] text-text-muted leading-relaxed">{pairingScore.reason}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              {(headingFont || bodyFont) && (
                <button
                  onClick={handleShare}
                  className={`flex-1 text-[11px] font-mono py-2 px-3 rounded-input border transition-colors ${
                    shareCopied ? 'border-accent/40 text-accent bg-accent/10' : 'border-border text-text-muted bg-surface hover:border-border-hover'
                  }`}
                  id="pairs-share"
                >
                  {shareCopied ? '✓ Copied!' : 'Copy share link ↗'}
                </button>
              )}
              {(headingFont || bodyFont) && (
                <button
                  onClick={handleCopyPrompt}
                  className="flex-1 text-[11px] font-mono py-2 px-3 rounded-input border border-accent/40 text-accent bg-accent/10 hover:bg-accent/15 transition-colors"
                  id="pairs-ai-prompt"
                >
                  Copy AI Prompt
                </button>
              )}
              <button
                onClick={handlePickCuratedPair}
                className="text-[11px] font-mono py-2 px-3 rounded-input border border-border text-text-muted bg-surface hover:border-border-hover transition-colors sm:hidden"
              >
                Pick pair
              </button>
            </div>
          </div>

          {/* Right column */}
          <div className="flex-1 p-5 overflow-hidden">
            {/* Mockup tabs */}
            <div className="flex items-center gap-1.5 mb-5">
              {MOCKUP_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => setMockupType(type)}
                  className={`text-[11px] font-mono px-3 py-1.5 rounded border transition-none ${
                    mockupType === type
                      ? 'border-accent/40 text-accent bg-accent/10'
                      : 'border-border text-text-muted hover:text-text-primary'
                  }`}
                  id={`mockup-${type.toLowerCase()}`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Mockup preview */}
            <div className="mb-8 animate-fade-in" key={mockupType}>
              {mockupType === 'Landing'   && <LandingMockup hFont={headingFont} bFont={bodyFont} />}
              {mockupType === 'Article'   && <ArticleMockup hFont={headingFont} bFont={bodyFont} />}
              {mockupType === 'Dashboard' && <DashboardMockup hFont={headingFont} bFont={bodyFont} />}
              {mockupType === 'Card'      && <CardMockup hFont={headingFont} bFont={bodyFont} />}
            </div>

            {/* Empty state */}
            {!headingFont && !bodyFont && (
              <div className="text-center py-8 text-text-muted">
                <p className="text-sm mb-1">Pick a heading and body font to see them come alive</p>
                <p className="text-[11px] font-mono text-text-subtle">or choose a curated pair below ↓</p>
              </div>
            )}

            {/* Curated pairings */}
            <div>
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-[9px] font-mono text-text-muted uppercase tracking-widest">Curated Pairings</h2>
                <span className="text-[10px] font-mono text-accent border border-accent/30 bg-accent/10 rounded px-2 py-1">
                  {curatedPairings.length.toLocaleString()} usable pairs
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {curatedPairings.map((pair) => {
                  const h = allFonts.find((f) => f.slug === pair.heading);
                  const b = allFonts.find((f) => f.slug === pair.body);
                  if (!h || !b) return null;
                  const isActive = headingFont?.slug === h.slug && bodyFont?.slug === b.slug;
                  return (
                    <button
                      key={`${pair.heading}-${pair.body}`}
                      onClick={() => applyPair(h, b)}
                      className={`w-full text-left border rounded-card p-4 bg-surface transition-colors duration-150 ${
                        isActive ? 'border-accent/40 bg-accent/5' : 'border-border hover:border-border-hover'
                      }`}
                      aria-pressed={isActive}
                    >
                      <p className="text-[9px] font-mono text-accent mb-2 uppercase tracking-wider">{pair.label}</p>
                      <p className="text-lg font-bold text-text-primary leading-snug mb-1" style={{ fontFamily: h.fontFamily }}>
                        {h.name}
                      </p>
                      <p className="text-[12px] text-text-muted leading-relaxed" style={{ fontFamily: b.fontFamily }}>
                        {b.name} — body text sample
                      </p>
                      <span
                        className={`mt-3 inline-block text-[10px] font-mono transition-colors ${
                          isActive ? 'text-accent' : 'text-text-muted hover:text-accent'
                        }`}
                      >
                        {isActive ? '✓ Active' : 'Use this pair →'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function PairsPage() {
  return (
    <Suspense>
      <PairsPageContent />
    </Suspense>
  );
}
