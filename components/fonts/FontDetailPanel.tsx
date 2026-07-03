'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useFontStore } from '@/store/useFontStore';
import { useToast } from '@/components/ui/Toast';
import { getSuggestedPairings, allFonts } from '@/lib/fonts';
import { getContrastBadges, getContrastRatio } from '@/lib/contrast';
import { FAVORITE_KEYS, useLocalStorageList } from '@/lib/storage';
import type { Font, PreviewMode } from '@/lib/types';

const PREVIEW_TEXTS: Record<PreviewMode, string> = {
  sentence: 'The quick brown fox jumps over the lazy dog',
  paragraph:
    'Typography is the art and technique of arranging type to make written language legible, readable and appealing when displayed. The arrangement of type involves selecting typefaces, point sizes, line lengths, line spacing, and letter spacing.',
  alphabet: 'A B C D E F G H I J K L M N O P Q R S T U V W X Y Z\na b c d e f g h i j k l m n o p q r s t u v w x y z',
  numbers: '0 1 2 3 4 5 6 7 8 9\n! @ # $ % & * ( ) - + = [ ] { } ; : , . / ?',
  custom: '',
};

const WEIGHT_NAMES: Record<number, string> = {
  100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular',
  500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black',
};

function loadFont(font: Font) {
  if (typeof document === 'undefined') return;
  const linkId = `font-panel-${font.slug}`;
  if (document.getElementById(linkId)) return;
  const link = document.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  link.href = font.importUrl;
  document.head.appendChild(link);
}

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  id: string;
}

function SliderRow({ label, value, min, max, step = 1, unit = '', onChange, id }: SliderRowProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-mono text-text-muted w-20 flex-shrink-0">{label}</span>
      <input
        type="range"
        id={id}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 cursor-pointer"
        style={{ accentColor: '#E8FF57' }}
      />
      <span className="text-[10px] font-mono text-text-muted w-14 text-right tabular-nums">
        {value}{unit}
      </span>
    </div>
  );
}

interface CopyButtonProps {
  label: string;
  text: string;
  id: string;
  toastMessage?: string;
}

function CopyButton({ label, text, id, toastMessage = 'Copied!' }: CopyButtonProps) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    showToast(toastMessage);
    setTimeout(() => setCopied(false), 1500);
  }, [text, showToast]);

  return (
    <button
      id={id}
      onClick={handleCopy}
      className={`flex-1 text-[11px] font-mono py-2 px-3 rounded-input border transition-colors duration-150 text-left truncate ${
        copied
          ? 'border-accent/40 text-accent bg-accent/10'
          : 'border-border text-text-muted hover:text-text-primary hover:border-border-hover bg-surface'
      }`}
    >
      {copied ? '✓ Copied!' : label}
    </button>
  );
}

export function FontDetailPanel() {
  const router = useRouter();
  const {
    selectedFont,
    isPanelOpen,
    closePanel,
    setSelectedFont,
    customWeight, setCustomWeight,
    customSize, setCustomSize,
    customLetterSpacing, setCustomLetterSpacing,
    customLineHeight, setCustomLineHeight,
    customBackground, setCustomBackground,
    customBackgroundColor, setCustomBackgroundColor,
    customTextColor, setCustomTextColor,
    customItalic, setCustomItalic,
    previewMode, setPreviewMode,
    customPreviewText, setCustomPreviewText,
    setHeadingFont,
  } = useFontStore();
  const { toggle: toggleFavorite, has: isFavorite } = useLocalStorageList(FAVORITE_KEYS.fonts);
  const { showToast } = useToast();

  const panelRef = useRef<HTMLDivElement>(null);
  const [suggestedPairings, setSuggestedPairings] = useState<Font[]>([]);

  // Load font + suggested pairings when font changes
  useEffect(() => {
    if (!selectedFont) return;
    loadFont(selectedFont);
    setSuggestedPairings(
      getSuggestedPairings(selectedFont)
        .map((slug) => allFonts.find((f) => f.slug === slug))
        .filter(Boolean) as Font[]
    );
    // Sync URL only when on the homepage (shallow — no route change)
  }, [selectedFont]);

  // Keyboard: Escape closes; ← / → navigates fonts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!isPanelOpen) return;
      if (e.key === 'Escape') { closePanel(); return; }

      // Arrow navigation: find adjacent font in allFonts list
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && selectedFont) {
        const idx = allFonts.findIndex((f) => f.slug === selectedFont.slug);
        if (idx === -1) return;
        const next = e.key === 'ArrowRight'
          ? allFonts[idx + 1]
          : allFonts[idx - 1];
        if (next) setSelectedFont(next);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isPanelOpen, closePanel, selectedFont, setSelectedFont]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = isPanelOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isPanelOpen]);

  // Must define these callbacks before any early returns
  const handleDownloadTTF = useCallback(() => {
    if (!selectedFont) return;
    if (selectedFont.ttfUrl) {
      const link = document.createElement('a');
      link.href = selectedFont.ttfUrl;
      link.download = `${selectedFont.slug}.ttf`;
      link.click();
      showToast('Download started');
    } else {
      window.open(selectedFont.downloadUrl, '_blank');
      showToast('Opening download page');
    }
  }, [selectedFont, showToast]);

  const handleUsePairing = useCallback((pairedFont: Font) => {
    if (!selectedFont) return;
    setHeadingFont(selectedFont);
    router.push(`/pairs?h=${selectedFont.slug}&b=${pairedFont.slug}`);
  }, [selectedFont, setHeadingFont, router]);

  const handleFavorite = useCallback(() => {
    if (!selectedFont) return;
    const wasFav = isFavorite(selectedFont.slug);
    toggleFavorite(selectedFont.slug);
    showToast(wasFav ? 'Removed from favorites' : `${selectedFont.name} saved`);
  }, [selectedFont, toggleFavorite, isFavorite, showToast]);

  if (!selectedFont) return null;

  const font = selectedFont;
  const bgColor = customBackground === 'custom' ? customBackgroundColor : (customBackground === 'dark' ? '#0D0D0D' : '#F5F5F5');
  const textColor = customBackground === 'custom' ? customTextColor : (customBackground === 'dark' ? '#F2F2F2' : '#111111');
  const favorited = isFavorite(font.slug);
  const contrastRatio = getContrastRatio(textColor, bgColor);
  const contrastBadges = getContrastBadges(contrastRatio);

  const currentPreviewText = previewMode === 'custom' ? customPreviewText : PREVIEW_TEXTS[previewMode];

  // Clamp customWeight to an available weight
  const safeWeight = font.weights.includes(customWeight)
    ? customWeight
    : font.weights.reduce((p, c) => Math.abs(c - customWeight) < Math.abs(p - customWeight) ? c : p, font.weights[0] ?? 400);

  const cssImport = `@import url('${font.importUrl}');`;
  const cssFontFamily = `font-family: ${font.fontFamily};`;
  const nextjsImport = `import { ${font.name.replace(/ /g, '_')} } from 'next/font/google';`;
  const aiPrompt = `Use "${font.name}" as the primary typeface.\n\nTypography settings:\n- font-family: ${font.fontFamily}\n- font-weight: ${safeWeight}\n- font-size: ${customSize}px\n- letter-spacing: ${customLetterSpacing}px\n- line-height: ${customLineHeight}\n- font-style: ${customItalic ? 'italic' : 'normal'}\n- text color: ${textColor}\n- background color: ${bgColor}\n\nImport via:\n@import url('${font.importUrl}');\n\nApply it to a clean, modern interface and keep spacing readable for designers reviewing type samples.`;
  const variableCss = font.variableAxes.length > 0
    ? `font-variation-settings: ${font.variableAxes.map((a) => `'${a}' 400`).join(', ')};`
    : null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[90] bg-black/50 transition-opacity duration-300 ${
          isPanelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closePanel}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed top-0 right-0 bottom-0 z-[100] flex flex-col border-l border-border overflow-hidden"
        style={{
          width: '560px',
          maxWidth: '100vw',
          backgroundColor: '#0D0D0D',
          transform: isPanelOpen ? 'translateX(0)' : 'translateX(100%)',
          transitionProperty: 'transform',
          transitionTimingFunction: isPanelOpen ? 'cubic-bezier(0.32, 0.72, 0, 1)' : 'cubic-bezier(0.4, 0, 1, 1)',
          transitionDuration: isPanelOpen ? '300ms' : '220ms',
        }}
        role="dialog"
        aria-modal="true"
        aria-label={`${font.name} font detail`}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-border flex-shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <h2 className="font-sans font-bold text-2xl text-text-primary leading-tight truncate">{font.name}</h2>
              {/* Favorite button in header */}
              <button
                onClick={handleFavorite}
                className={`flex-shrink-0 p-1 rounded transition-colors ${
                  favorited ? 'text-accent' : 'text-text-muted hover:text-accent'
                }`}
                aria-label={favorited ? 'Remove from favorites' : 'Save to favorites'}
                title={favorited ? 'Remove from favorites' : 'Save font'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill={favorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>
            </div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-[10px] font-mono text-text-muted px-2 py-0.5 rounded border border-border bg-surface">
                {font.source === 'google-fonts' ? 'Google Fonts' : font.source}
              </span>
              <span className="text-[10px] font-mono text-text-muted px-2 py-0.5 rounded border border-border bg-surface">
                {font.license}
              </span>
              {font.isVariable && (
                <span className="text-[10px] font-mono text-accent px-2 py-0.5 rounded border border-accent/30">
                  Variable
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 ml-3 flex-shrink-0">
            {/* Arrow navigation hint */}
            <span className="text-[9px] font-mono text-text-subtle hidden lg:block mr-1">← →</span>
            <button
              onClick={closePanel}
              className="text-text-muted hover:text-text-primary transition-colors p-1.5 rounded"
              aria-label="Close panel"
              id="close-font-panel"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">

          {/* Live preview */}
          <div className="px-6 py-5 border-b border-border" style={{ backgroundColor: bgColor }}>
            {/* Preview mode tabs */}
            <div className="flex items-center gap-1 mb-4 overflow-x-auto scrollbar-hide">
              {(['sentence', 'paragraph', 'alphabet', 'numbers', 'custom'] as PreviewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setPreviewMode(mode)}
                  className={`text-[11px] font-mono px-2.5 py-1 rounded flex-shrink-0 border transition-none ${
                    previewMode === mode
                      ? 'border-accent/40 text-accent bg-accent/10'
                      : 'border-transparent text-text-muted hover:text-text-primary'
                  }`}
                  id={`preview-mode-${mode}`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>

            {/* Preview content */}
            {previewMode === 'custom' ? (
              <textarea
                value={customPreviewText}
                onChange={(e) => setCustomPreviewText(e.target.value)}
                placeholder="Type your text here…"
                className="w-full bg-transparent resize-none focus:outline-none"
                style={{
                  fontFamily: font.fontFamily,
                  fontSize: `${customSize}px`,
                  fontWeight: safeWeight,
                  letterSpacing: `${customLetterSpacing}px`,
                  lineHeight: customLineHeight,
                  fontStyle: customItalic ? 'italic' : 'normal',
                  color: textColor,
                  minHeight: '120px',
                }}
                rows={4}
              />
            ) : (
              <div
                style={{
                  fontFamily: font.fontFamily,
                  fontSize: `${customSize}px`,
                  fontWeight: safeWeight,
                  letterSpacing: `${customLetterSpacing}px`,
                  lineHeight: customLineHeight,
                  fontStyle: customItalic ? 'italic' : 'normal',
                  color: textColor,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  minHeight: '120px',
                }}
              >
                {currentPreviewText}
              </div>
            )}
          </div>

          {/* Customization controls */}
          <div className="px-6 py-5 border-b border-border space-y-3">
            <h3 className="text-[10px] font-mono text-text-muted uppercase tracking-widest mb-4">Customize</h3>

            <SliderRow label="Size" id="panel-size-slider" value={customSize} min={8} max={120} unit="px" onChange={setCustomSize} />
            <SliderRow label="Tracking" id="panel-tracking-slider" value={customLetterSpacing} min={-5} max={20} step={0.5} unit="px" onChange={setCustomLetterSpacing} />
            <SliderRow label="Leading" id="panel-leading-slider" value={customLineHeight} min={0.8} max={3.0} step={0.1} onChange={setCustomLineHeight} />

            {/* Background & Italic */}
            <div className="flex items-center gap-4 pt-1 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-text-muted">Background</span>
                {(['dark', 'light', 'custom'] as const).map((b) => (
                  <button
                    key={b}
                    onClick={() => setCustomBackground(b)}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-none ${
                      customBackground === b ? 'border-accent/40 text-accent bg-accent/10' : 'border-border text-text-muted'
                    }`}
                    id={`panel-bg-${b}`}
                  >
                    {b.charAt(0).toUpperCase() + b.slice(1)}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  id="panel-italic"
                  checked={customItalic}
                  onChange={(e) => setCustomItalic(e.target.checked)}
                  style={{ accentColor: '#E8FF57' }}
                />
                <span className="text-[10px] font-mono text-text-muted">Italic</span>
              </label>
            </div>

            {customBackground === 'custom' && (
              <div className="rounded-card border border-border bg-surface/50 p-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-text-muted">Background</span>
                    <input
                      type="color"
                      value={customBackgroundColor}
                      onChange={(e) => setCustomBackgroundColor(e.target.value)}
                      className="h-8 w-12 cursor-pointer rounded border border-border bg-transparent"
                      aria-label="Custom background color"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-text-muted">Text</span>
                    <input
                      type="color"
                      value={customTextColor}
                      onChange={(e) => setCustomTextColor(e.target.value)}
                      className="h-8 w-12 cursor-pointer rounded border border-border bg-transparent"
                      aria-label="Custom text color"
                    />
                  </label>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
                  <span className="text-[10px] font-mono text-text-primary mr-1">
                    {contrastRatio.toFixed(2)}:1
                  </span>
                  {contrastBadges.map((badge) => (
                    <span
                      key={badge.label}
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                        badge.pass
                          ? 'border-accent/30 text-accent bg-accent/10'
                          : 'border-border text-text-muted bg-background'
                      }`}
                    >
                      {badge.pass ? '✓' : '×'} {badge.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Available weights — clickable buttons (NOT a broken range slider) */}
          <div className="px-6 py-5 border-b border-border">
            <h3 className="text-[10px] font-mono text-text-muted uppercase tracking-widest mb-3">
              Weights <span className="normal-case text-text-subtle">({font.weights.length})</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {font.weights.map((w) => (
                <button
                  key={w}
                  onClick={() => setCustomWeight(w)}
                  className={`text-[11px] font-mono px-3 py-1.5 rounded border transition-none ${
                    safeWeight === w
                      ? 'border-accent/40 text-accent bg-accent/10'
                      : 'border-border text-text-muted hover:border-border-hover hover:text-text-primary bg-surface'
                  }`}
                >
                  {w}
                  <span className="text-[9px] opacity-60 ml-1">{WEIGHT_NAMES[w]}</span>
                </button>
              ))}
            </div>
            {/* Variable axes */}
            {font.variableAxes.length > 0 && (
              <p className="text-[10px] font-mono text-text-muted mt-2.5">
                Variable axes: {font.variableAxes.join(', ')}
              </p>
            )}
          </div>

          {/* Font info */}
          <div className="px-6 py-5 border-b border-border">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {[
                { label: 'Designer', value: font.designer || 'Unknown' },
                { label: 'Category', value: font.category },
                { label: 'Added', value: font.addedDate },
                { label: 'Languages', value: font.languages.slice(0, 4).join(', ') + (font.languages.length > 4 ? '…' : '') },
              ].map(({ label, value }) => (
                <div key={label}>
                  <span className="text-[9px] font-mono text-text-muted uppercase tracking-wider">{label}</span>
                  <p className="text-[12px] text-text-primary mt-0.5 leading-relaxed">{value}</p>
                </div>
              ))}
            </div>
            {font.description && (
              <p className="text-[12px] text-text-muted mt-4 leading-relaxed border-t border-border pt-3">{font.description}</p>
            )}
          </div>

          {/* Export */}
          <div className="px-6 py-5 border-b border-border">
            <h3 className="text-[10px] font-mono text-text-muted uppercase tracking-widest mb-3">Export</h3>

            <div className="space-y-2 mb-3">
              <div className="flex gap-2">
                <CopyButton id="copy-import" label="@import URL" text={cssImport} />
                <CopyButton id="copy-font-family" label="font-family CSS" text={cssFontFamily} />
              </div>
              <div className="flex gap-2">
                <CopyButton id="copy-nextjs" label="Next.js import" text={nextjsImport} />
                {variableCss ? (
                  <CopyButton id="copy-variable" label="font-variation-settings" text={variableCss} />
                ) : (
                  <button
                    id="download-ttf"
                    onClick={handleDownloadTTF}
                    className="flex-1 text-[11px] font-mono py-2 px-3 rounded-input border border-border text-text-muted hover:text-text-primary hover:border-border-hover bg-surface transition-colors duration-150 text-left"
                  >
                    ↓ Download .ttf
                  </button>
                )}
              </div>
              {variableCss && (
                <button
                  id="download-ttf"
                  onClick={handleDownloadTTF}
                  className="w-full text-[11px] font-mono py-2 px-3 rounded-input border border-border text-text-muted hover:text-text-primary hover:border-border-hover bg-surface transition-colors duration-150 text-left"
                >
                  ↓ Download .ttf
                </button>
              )}
              <CopyButton
                id="copy-ai-prompt"
                label="Copy as AI Prompt"
                text={aiPrompt}
                toastMessage="Prompt copied - paste into Cursor, v0, or Lovable"
              />
            </div>

            {/* CSS code preview */}
            <div className="bg-surface rounded-card border border-border p-3 mt-3">
              <p className="text-[10px] font-mono text-text-muted mb-1.5">Generated CSS</p>
              <pre className="text-[10px] font-mono text-text-primary overflow-x-auto scrollbar-hide leading-relaxed">
                <code>{`${cssImport}\n\nbody {\n  ${cssFontFamily}\n  font-weight: ${safeWeight};\n  letter-spacing: ${customLetterSpacing}px;\n  line-height: ${customLineHeight};\n}`}</code>
              </pre>
            </div>
          </div>

          {/* Suggested pairings */}
          {suggestedPairings.length > 0 && (
            <div className="px-6 py-5">
              <h3 className="text-[10px] font-mono text-text-muted uppercase tracking-widest mb-4">Pairs Well With</h3>
              <div className="space-y-2">
                {suggestedPairings.map((paired) => (
                  <div
                    key={paired.slug}
                    className="border border-border rounded-card p-3.5 hover:border-border-hover transition-colors duration-150 bg-surface"
                  >
                    <div className="mb-2.5">
                      <p className="text-xl leading-tight text-text-primary mb-1" style={{ fontFamily: font.fontFamily, fontWeight: 700 }}>
                        Heading in {font.name}
                      </p>
                      <p className="text-sm text-text-muted leading-relaxed" style={{ fontFamily: paired.fontFamily }}>
                        Body text in {paired.name}. Clear, readable, and complementary.
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-text-subtle">{font.name} + {paired.name}</span>
                      <button
                        onClick={() => handleUsePairing(paired)}
                        className="text-[10px] font-mono text-accent hover:text-accent/80 transition-colors"
                      >
                        Try this pair →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
