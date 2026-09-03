'use client';

import React, { useMemo, useEffect, useRef, useState, useCallback, useDeferredValue } from 'react';
import { useFontStore } from '@/store/useFontStore';
import { allFonts, searchFonts, filterFonts, sortFonts, getFontBySlug } from '@/lib/fonts';
import { FAVORITE_KEYS, useLocalStorageList } from '@/lib/storage';
import { useToast } from '@/components/ui/Toast';
import { FontCard } from './FontCard';

const INITIAL_RENDER_COUNT = 48;
const CARD_HEIGHT = 180;
const GRID_GAP = 12;
const ROW_HEIGHT = CARD_HEIGHT + GRID_GAP;
const OVERSCAN_ROWS = 6;

function getResponsiveColumnCount() {
  if (typeof window === 'undefined') return 3;
  if (window.innerWidth >= 1024) return 3;
  if (window.innerWidth >= 640) return 2;
  return 1;
}

function RecentlyViewedStrip() {
  const { recentlyViewed, openPanel } = useFontStore();
  const [loadedFonts, setLoadedFonts] = useState(false);

  useEffect(() => {
    if (recentlyViewed.length > 0) {
      setLoadedFonts(true);
    }
  }, [recentlyViewed]);

  if (!loadedFonts || recentlyViewed.length === 0) return null;

  const fonts = recentlyViewed
    .map((slug) => getFontBySlug(slug))
    .filter(Boolean)
    .slice(0, 8) as NonNullable<ReturnType<typeof getFontBySlug>>[];

  if (fonts.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-[9px] font-mono text-text-muted uppercase tracking-widest">Recently Viewed</span>
        <div className="flex-1 h-px bg-border" />
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {fonts.map((font) => (
          <button
            key={font.slug}
            onClick={() => openPanel(font)}
            className="flex-shrink-0 px-3 py-1.5 bg-surface border border-border rounded-input text-[11px] text-text-muted hover:text-text-primary hover:border-border-hover transition-colors font-sans"
          >
            {font.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export function FontGrid() {
  const {
    previewText,
    previewSize,
    previewBackground,
    searchQuery,
    activeCategories,
    activeMoods,
    activeWeights,
    activeLanguages,
    activeSources,
    variableOnly,
    sortBy,
    setNavigationSlugs,
  } = useFontStore();
  const { items: favorites } = useLocalStorageList(FAVORITE_KEYS.fonts);
  const { showToast } = useToast();

  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [shuffleKey, setShuffleKey] = useState(0);
  const scrollRootRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [columnCount, setColumnCount] = useState(getResponsiveColumnCount);
  const [virtualRange, setVirtualRange] = useState({ start: 0, end: INITIAL_RENDER_COUNT });

  // Defer expensive Fuse + filter work so typing stays responsive.
  const deferredQuery = useDeferredValue(searchQuery);

  // Compute filtered + sorted fonts
  const processedFonts = useMemo(() => {
    let fonts = deferredQuery.trim() ? searchFonts(deferredQuery) : allFonts;
    fonts = filterFonts(fonts, {
      categories: activeCategories,
      moods: activeMoods,
      weights: activeWeights,
      languages: activeLanguages,
      sources: activeSources,
      variableOnly,
    });
    fonts = sortFonts(fonts, sortBy);
    if (showFavoritesOnly) {
      fonts = fonts.filter((f) => favorites.includes(f.slug));
    }
    if (shuffleKey > 0) {
      // Deterministic shuffle per key so scroll position stays stable.
      const arr = [...fonts];
      let seed = shuffleKey * 2654435761;
      const rand = () => {
        seed ^= seed << 13;
        seed ^= seed >>> 17;
        seed ^= seed << 5;
        return ((seed >>> 0) % 1000) / 1000;
      };
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      fonts = arr;
    }
    return fonts;
  }, [deferredQuery, activeCategories, activeMoods, activeWeights, activeLanguages, activeSources, variableOnly, sortBy, showFavoritesOnly, favorites, shuffleKey]);

  // Expose filtered order to the detail panel for ←/→ navigation.
  useEffect(() => {
    setNavigationSlugs(processedFonts.map((f) => f.slug));
  }, [processedFonts, setNavigationSlugs]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('Search link copied — share it anywhere');
    } catch {
      showToast('Could not copy link');
    }
  }, [showToast]);

  // Reset mounted rows when filters change
  useEffect(() => {
    setVirtualRange({ start: 0, end: Math.min(INITIAL_RENDER_COUNT, processedFonts.length) });
  }, [processedFonts.length, deferredQuery, activeCategories, activeMoods, activeWeights, activeLanguages, activeSources, variableOnly, sortBy, showFavoritesOnly, shuffleKey]);

  useEffect(() => {
    const updateColumnCount = () => setColumnCount(getResponsiveColumnCount());
    updateColumnCount();
    window.addEventListener('resize', updateColumnCount);
    return () => window.removeEventListener('resize', updateColumnCount);
  }, []);

  const updateVirtualRange = useCallback(() => {
    const total = processedFonts.length;
    const scrollRoot = scrollRootRef.current;
    const grid = gridRef.current;
    if (!scrollRoot || !grid || total === 0) {
      setVirtualRange({ start: 0, end: Math.min(INITIAL_RENDER_COUNT, total) });
      return;
    }

    const gridTop = grid.offsetTop;
    const viewportHeight = scrollRoot.clientHeight || 800;
    const totalRows = Math.ceil(total / columnCount);
    const visibleTop = Math.max(0, scrollRoot.scrollTop - gridTop);
    const visibleBottom = Math.max(0, scrollRoot.scrollTop + viewportHeight - gridTop);
    const startRow = Math.max(0, Math.floor(visibleTop / ROW_HEIGHT) - OVERSCAN_ROWS);
    const endRow = Math.min(totalRows, Math.ceil(visibleBottom / ROW_HEIGHT) + OVERSCAN_ROWS);
    const start = Math.min(total, startRow * columnCount);
    const end = Math.min(total, Math.max((startRow + 1) * columnCount, endRow * columnCount));

    setVirtualRange((current) => (
      current.start === start && current.end === end ? current : { start, end }
    ));
  }, [columnCount, processedFonts.length]);

  useEffect(() => {
    let frame = 0;
    const scheduleUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        updateVirtualRange();
      });
    };

    scheduleUpdate();
    const scrollRoot = scrollRootRef.current;
    scrollRoot?.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      scrollRoot?.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, [updateVirtualRange]);

  const visibleFonts = processedFonts.slice(virtualRange.start, virtualRange.end);
  const totalRows = Math.ceil(processedFonts.length / columnCount);
  const totalGridHeight = totalRows > 0 ? (totalRows * CARD_HEIGHT) + ((totalRows - 1) * GRID_GAP) : 0;
  const offsetY = Math.floor(virtualRange.start / columnCount) * ROW_HEIGHT;

  return (
    <div ref={scrollRootRef} className="h-full overflow-y-scroll font-grid-scrollbar px-4 sm:px-6 py-6">
      {/* Recently viewed — only on initial unfiltered state */}
      {!deferredQuery && activeCategories.length === 0 && activeMoods.length === 0 && !showFavoritesOnly && (
        <RecentlyViewedStrip />
      )}

      {/* Toolbar */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="text-xs font-mono text-text-muted flex-shrink-0">
          {processedFonts.length.toLocaleString()} fonts
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShuffleKey((k) => k + 1)}
            className="flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded border border-border text-text-muted hover:border-border-hover hover:text-text-primary transition-colors"
            title="Shuffle results"
            aria-label="Shuffle results"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 3h5v5" />
              <path d="M4 20 21 3" />
              <path d="M21 16v5h-5" />
              <path d="m15 15 6 6" />
              <path d="M4 4l5 5" />
            </svg>
            Shuffle
          </button>
          <button
            onClick={handleCopyLink}
            className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded border border-border text-text-muted hover:border-border-hover hover:text-text-primary transition-colors"
            title="Copy shareable link for this search"
            aria-label="Copy shareable link"
          >
            Share
          </button>
          {favorites.length > 0 && (
            <button
              onClick={() => setShowFavoritesOnly((v) => !v)}
              aria-pressed={showFavoritesOnly}
              className={`flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded border transition-colors ${
                showFavoritesOnly
                  ? 'border-accent/40 text-accent bg-accent/10'
                  : 'border-border text-text-muted hover:border-border-hover hover:text-text-primary'
              }`}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill={showFavoritesOnly ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {showFavoritesOnly ? `Favorites (${favorites.length})` : `Saved (${favorites.length})`}
            </button>
          )}
        </div>
      </div>

      {/* Empty state */}
      {processedFonts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <p className="text-text-muted text-sm mb-2">
            {showFavoritesOnly
              ? 'No saved fonts yet'
              : deferredQuery
              ? 'No fonts match your search'
              : 'No fonts match these filters'}
          </p>
          <p className="text-text-subtle text-xs">
            {showFavoritesOnly ? 'Click the ♡ on any font card to save it' : 'Try adjusting your filters'}
          </p>
        </div>
      )}

      {/* Grid */}
      {processedFonts.length > 0 && (
        <div
          ref={gridRef}
          className="relative"
          style={{ height: `${totalGridHeight}px` }}
        >
          <div
            className="absolute left-0 right-0 top-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
            style={{ transform: `translateY(${offsetY}px)` }}
          >
            {visibleFonts.map((font) => (
              <FontCard
                key={font.id}
                font={font}
                previewText={previewText}
                previewSize={previewSize}
                previewBackground={previewBackground}
              />
            ))}
          </div>
        </div>
      )}

      {/* End of results */}
      {processedFonts.length > INITIAL_RENDER_COUNT && (
        <p className="text-center text-xs font-mono text-text-subtle mt-8 py-4 border-t border-border">
          End of {processedFonts.length.toLocaleString()} fonts
        </p>
      )}
    </div>
  );
}
