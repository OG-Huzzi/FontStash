'use client';

import { useEffect, useRef } from 'react';
import { useFontStore } from '@/store/useFontStore';

// Sync homepage filters/sort/search to the URL (?q=&cat=&mood=&sort=&var=1)
// so searches are shareable. Uses replaceState — no navigation, no reload.
// Preserves unrelated params (e.g. ?font=slug deep links).
export function useFilterParamsSync(enabled = true) {
  const searchQuery = useFontStore((s) => s.searchQuery);
  const activeCategories = useFontStore((s) => s.activeCategories);
  const activeMoods = useFontStore((s) => s.activeMoods);
  const sortBy = useFontStore((s) => s.sortBy);
  const variableOnly = useFontStore((s) => s.variableOnly);
  const hydrated = useRef(false);

  // Hydrate store from URL on first mount.
  useEffect(() => {
    if (!enabled || hydrated.current) return;
    hydrated.current = true;
    try {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('q');
      const cat = params.get('cat');
      const mood = params.get('mood');
      const sort = params.get('sort');
      const variable = params.get('var');
      const state = useFontStore.getState();
      if (q && q !== state.searchQuery) state.setSearchQuery(q.slice(0, 80));
      if (cat) {
        const cats = cat.split(',').filter(Boolean).slice(0, 5);
        cats.forEach((c) => {
          if (!useFontStore.getState().activeCategories.includes(c)) useFontStore.getState().toggleCategory(c);
        });
      }
      if (mood) {
        const moods = mood.split(',').filter(Boolean).slice(0, 8);
        moods.forEach((m) => {
          if (!useFontStore.getState().activeMoods.includes(m)) useFontStore.getState().toggleMood(m);
        });
      }
      if (sort && ['popular', 'newest', 'alpha-asc', 'alpha-desc'].includes(sort)) {
        useFontStore.getState().setSortBy(sort as typeof state.sortBy);
      }
      if (variable === '1' && !useFontStore.getState().variableOnly) {
        useFontStore.getState().setVariableOnly(true);
      }
    } catch {
      // ignore malformed URLs
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // Write store -> URL (debounced via rAF to avoid thrash on typing).
  useEffect(() => {
    if (!enabled || !hydrated.current) return;
    let frame = 0;
    frame = window.requestAnimationFrame(() => {
      try {
        const params = new URLSearchParams(window.location.search);
        if (searchQuery) params.set('q', searchQuery);
        else params.delete('q');
        if (activeCategories.length > 0) params.set('cat', activeCategories.join(','));
        else params.delete('cat');
        if (activeMoods.length > 0) params.set('mood', activeMoods.join(','));
        else params.delete('mood');
        if (sortBy && sortBy !== 'popular') params.set('sort', sortBy);
        else params.delete('sort');
        if (variableOnly) params.set('var', '1');
        else params.delete('var');
        const next = params.toString();
        const url = next ? `/?${next}` : '/';
        // Preserve ?font= handling: HomePageClient clears it after opening panel.
        if (window.location.pathname === '/' || window.location.pathname === '') {
          window.history.replaceState(null, '', url);
        }
      } catch {
        // ignore
      }
    });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [enabled, searchQuery, activeCategories, activeMoods, sortBy, variableOnly]);
}
