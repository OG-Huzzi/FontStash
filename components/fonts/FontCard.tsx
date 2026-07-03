'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useFontStore } from '@/store/useFontStore';
import { useToast } from '@/components/ui/Toast';
import { FAVORITE_KEYS, useLocalStorageList } from '@/lib/storage';
import type { Font, PreviewBackground } from '@/lib/types';

interface FontCardProps {
  font: Font;
  previewText: string;
  previewSize: number;
  previewBackground: PreviewBackground;
}

function getPrimaryFontFamily(font: Font) {
  return font.fontFamily.split(',')[0]?.trim() || `'${font.name}'`;
}

function loadFont(font: Font, weight: number): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  const linkId = `font-${font.slug}`;
  const existingLink = document.getElementById(linkId) as HTMLLinkElement | null;

  const loadFace = async () => {
    try {
      await document.fonts?.load(`${weight} 32px ${getPrimaryFontFamily(font)}`);
    } catch {
      // If a provider misses a specific face, still render with the fallback stack.
    }
  };

  if (existingLink) return loadFace();

  const link = document.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  link.href = font.importUrl;

  return new Promise((resolve) => {
    link.onload = async () => {
      await loadFace();
      resolve();
    };
    link.onerror = () => resolve();
    document.head.appendChild(link);
  });
}

const SOURCE_LABELS: Record<string, string> = {
  'google-fonts': 'Google',
  'bunny-fonts': 'Bunny',
  'font-squirrel': 'Squirrel',
  'open-foundry': 'Foundry',
};

const CATEGORY_LABELS: Record<string, string> = {
  'sans-serif': 'Sans',
  'serif': 'Serif',
  'monospace': 'Mono',
  'display': 'Display',
  'handwriting': 'Script',
};

export function FontCard({ font, previewText, previewSize, previewBackground }: FontCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { markFontLoaded, isFontLoaded, openPanel, addToCompare } = useFontStore();
  const { toggle: toggleFavorite, has: isFavorite } = useLocalStorageList(FAVORITE_KEYS.fonts);
  const { showToast } = useToast();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [copied, setCopied] = useState(false);
  const [heartPop, setHeartPop] = useState(false);

  const isDark = previewBackground !== 'light';
  const fontKey = font.slug;
  const favorited = isFavorite(fontKey);

  // Pick nearest available weight to 400
  const previewWeight = font.weights.includes(400)
    ? 400
    : font.weights.reduce((prev, curr) =>
        Math.abs(curr - 400) < Math.abs(prev - 400) ? curr : prev,
      font.weights[0] ?? 400);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (isFontLoaded(fontKey)) {
      setIsLoaded(true);
      return;
    }

    let cancelled = false;
    let idleId: number | null = null;
    let timeoutId: number | null = null;
    const win = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const loadPreviewFont = () => {
              loadFont(font, previewWeight).finally(() => {
                if (cancelled) return;
                markFontLoaded(fontKey);
                setIsLoaded(true);
              });
            };

            if (win.requestIdleCallback) {
              idleId = win.requestIdleCallback(loadPreviewFont, { timeout: 500 });
            } else {
              timeoutId = window.setTimeout(loadPreviewFont, 0);
            }
            observer.disconnect();
          }
        });
      },
      { rootMargin: '200px' }
    );

    if (cardRef.current) observer.observe(cardRef.current);
    return () => {
      cancelled = true;
      observer.disconnect();
      if (idleId !== null && win.cancelIdleCallback) win.cancelIdleCallback(idleId);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [font, fontKey, previewWeight, markFontLoaded, isFontLoaded]);

  const handleCopyFamily = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      await navigator.clipboard.writeText(font.fontFamily);
      setCopied(true);
      showToast('Copied font-family to clipboard');
      setTimeout(() => setCopied(false), 1500);
    },
    [font.fontFamily, showToast]
  );

  const handleAddToCompare = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const result = addToCompare(font);
      if (result === 'limit') {
        showToast('Max 4 fonts in compare');
      } else if (result === 'duplicate') {
        showToast(`${font.name} already in compare`);
      } else {
        showToast(`${font.name} added to compare`);
      }
    },
    [addToCompare, font, showToast]
  );

  const handleFavorite = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      toggleFavorite(fontKey);
      setHeartPop(true);
      setTimeout(() => setHeartPop(false), 350);
      showToast(favorited ? `Removed from favorites` : `${font.name} saved`);
    },
    [toggleFavorite, fontKey, favorited, font.name, showToast]
  );

  // Colors based on state
  const isDarkMode = isDark;
  const cardBg = isHovered
    ? (isDarkMode ? '#141414' : '#EFEFEF')
    : (isDarkMode ? '#111111' : '#FAFAFA');
  const borderColor = isHovered
    ? '#2A2A2A'
    : (isDarkMode ? '#1F1F1F' : '#E0E0E0');
  const textColor = isDarkMode ? '#F2F2F2' : '#111111';
  const displaySize = Math.min(previewSize, 52);

  return (
    <div
      ref={cardRef}
      className="font-card-shell relative rounded-card border cursor-pointer flex flex-col overflow-hidden group"
      style={{
        height: '180px',
        backgroundColor: cardBg,
        borderColor: borderColor,
        transition: 'background-color 150ms ease, border-color 150ms ease',
      }}
      onClick={() => openPanel(font)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      aria-label={`View ${font.name} font details`}
      onKeyDown={(e) => e.key === 'Enter' && openPanel(font)}
    >
      {/* Preview area */}
      <div className="flex-1 flex items-center px-4 pt-4 pb-2 overflow-hidden">
        {!isLoaded ? (
          <div className="w-full space-y-2">
            <div className="h-8 rounded animate-skeleton-pulse" style={{ width: '75%' }} />
            <div className="h-4 rounded animate-skeleton-pulse" style={{ width: '50%' }} />
          </div>
        ) : (
          <p
            className="leading-tight overflow-hidden text-ellipsis whitespace-nowrap max-w-full"
            style={{
              fontFamily: font.fontFamily,
              fontSize: `${displaySize}px`,
              color: textColor,
              fontWeight: previewWeight,
            }}
          >
            {previewText || 'The quick brown fox'}
          </p>
        )}
      </div>

      {/* Glyph preview overlay on hover */}
      {isHovered && isLoaded && (
        <div
          className="absolute bottom-10 left-0 right-0 px-4 py-1 animate-fade-in pointer-events-none"
          style={{ backgroundColor: isDarkMode ? 'rgba(17,17,17,0.95)' : 'rgba(240,240,240,0.95)' }}
        >
          <p
            className="text-[9px] leading-relaxed tracking-widest truncate"
            style={{
              fontFamily: font.fontFamily,
              color: isDarkMode ? '#444444' : '#AAAAAA',
            }}
          >
            A B C D E F G H I J K L M N O P Q R S T U V W X Y Z 0 1 2 3 4 5 6 7 8 9
          </p>
        </div>
      )}

      {/* Bottom bar */}
      <div
        className="flex items-center justify-between px-3 py-2 flex-shrink-0"
        style={{ borderTop: `1px solid ${isDarkMode ? '#1F1F1F' : '#E0E0E0'}` }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="text-[12px] font-sans font-medium truncate"
            style={{ color: textColor }}
          >
            {font.name}
          </span>
          <span className="text-[9px] font-mono text-text-muted px-1.5 py-0.5 rounded bg-surface/60 border border-border flex-shrink-0 hidden sm:block">
            {CATEGORY_LABELS[font.category] || font.category}
          </span>
          {font.isVariable && (
            <span className="text-[9px] font-mono text-accent/80 px-1 py-0.5 rounded border border-accent/20 flex-shrink-0 hidden md:block">
              VAR
            </span>
          )}
        </div>

        <div className="flex items-center gap-0.5 flex-shrink-0">
          <span className="text-[9px] font-mono text-text-subtle mr-1 hidden lg:block">
            {SOURCE_LABELS[font.source] || font.source}
          </span>

          {/* Copy CSS */}
          <button
            onClick={handleCopyFamily}
            className="p-1.5 text-text-muted hover:text-text-primary transition-colors rounded"
            title="Copy font-family CSS"
            aria-label="Copy font-family CSS"
          >
            {copied ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#E8FF57" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              </svg>
            )}
          </button>

          {/* Add to compare */}
          <button
            onClick={handleAddToCompare}
            className="p-1.5 text-text-muted hover:text-text-primary transition-colors rounded"
            title="Add to compare"
            aria-label="Add to compare"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="4" height="16" x="3" y="4" rx="1" />
              <rect width="4" height="16" x="17" y="4" rx="1" />
              <path d="M7 12h10" />
            </svg>
          </button>

          <button
            onClick={handleFavorite}
            className={`p-1.5 transition-colors rounded ${
              favorited ? 'text-accent' : 'text-text-muted hover:text-accent'
            }`}
            title={favorited ? 'Remove from favorites' : 'Save font'}
            aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
          >
            <svg
              width="12" height="12" viewBox="0 0 24 24"
              fill={favorited ? 'currentColor' : 'none'}
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className={heartPop ? 'heart-pop' : ''}
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
