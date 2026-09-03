'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Font, SortOption, PreviewMode, PreviewBackground, AddToCompareResult } from '@/lib/types';
import { FAVORITE_KEYS } from '@/lib/storage';

function readFavoriteSlugs(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(FAVORITE_KEYS.fonts);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function writeFavoriteSlugs(slugs: string[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FAVORITE_KEYS.fonts, JSON.stringify(slugs));
    window.dispatchEvent(new CustomEvent('fontstash-storage', { detail: { key: FAVORITE_KEYS.fonts } }));
  } catch {
    // Quota / private mode — store state still updates in memory.
  }
}

interface FontStore {
  // Preview
  previewText: string;
  previewSize: number;
  previewBackground: PreviewBackground;

  // Filters
  activeCategories: string[];
  activeMoods: string[];
  activeWeights: number[];
  activeLanguages: string[];
  activeSources: string[];
  variableOnly: boolean;
  sortBy: SortOption;
  searchQuery: string;

  // Selected font (detail panel)
  selectedFont: Font | null;
  isPanelOpen: boolean;

  // Customization (detail panel)
  customWeight: number;
  customSize: number;
  customLetterSpacing: number;
  customLineHeight: number;
  customBackground: PreviewBackground;
  customBackgroundColor: string;
  customTextColor: string;
  customItalic: boolean;
  previewMode: PreviewMode;
  customPreviewText: string;

  // Compare
  comparedFonts: Font[];

  // Pairs
  headingFont: Font | null;
  bodyFont: Font | null;

  // Favorites (persisted, single source of truth: FAVORITE_KEYS.fonts)
  favorites: string[]; // font slugs

  // Recently viewed (persisted, max 12)
  recentlyViewed: string[]; // font slugs

  // Filtered-list navigation for the detail panel arrows (transient)
  navigationSlugs: string[];

  // Performance (not persisted)
  loadedFonts: Set<string>;

  // Actions — Preview
  setPreviewText: (text: string) => void;
  setPreviewSize: (size: number) => void;
  setPreviewBackground: (bg: PreviewBackground) => void;

  // Actions — Filters
  toggleCategory: (category: string) => void;
  toggleMood: (mood: string) => void;
  toggleWeight: (weight: number) => void;
  toggleLanguage: (language: string) => void;
  toggleSource: (source: string) => void;
  setVariableOnly: (value: boolean) => void;
  setSortBy: (sort: SortOption) => void;
  setSearchQuery: (query: string) => void;
  clearAllFilters: () => void;

  // Actions — Panel
  openPanel: (font: Font) => void;
  closePanel: () => void;
  setSelectedFont: (font: Font | null) => void;

  // Actions — Customization
  setCustomWeight: (weight: number) => void;
  setCustomSize: (size: number) => void;
  setCustomLetterSpacing: (spacing: number) => void;
  setCustomLineHeight: (height: number) => void;
  setCustomBackground: (bg: PreviewBackground) => void;
  setCustomBackgroundColor: (color: string) => void;
  setCustomTextColor: (color: string) => void;
  setCustomItalic: (italic: boolean) => void;
  setPreviewMode: (mode: PreviewMode) => void;
  setCustomPreviewText: (text: string) => void;

  // Actions — Compare
  addToCompare: (font: Font) => AddToCompareResult;
  removeFromCompare: (fontId: string) => void;
  clearCompare: () => void;

  // Actions — Pairs
  setHeadingFont: (font: Font | null) => void;
  setBodyFont: (font: Font | null) => void;

  // Actions — Favorites
  toggleFavorite: (slug: string) => void;
  isFavorite: (slug: string) => boolean;

  // Actions — Recently viewed
  addRecentlyViewed: (slug: string) => void;

  // Actions — Panel navigation
  setNavigationSlugs: (slugs: string[]) => void;

  // Actions — Font loading
  markFontLoaded: (fontSlug: string) => void;
  isFontLoaded: (fontSlug: string) => boolean;
}

export const useFontStore = create<FontStore>()(
  persist(
    (set, get) => ({
      // Preview defaults
      previewText: 'The quick brown fox',
      previewSize: 32,
      previewBackground: 'dark',

      // Filter defaults
      activeCategories: [],
      activeMoods: [],
      activeWeights: [],
      activeLanguages: [],
      activeSources: [],
      variableOnly: false,
      sortBy: 'popular',
      searchQuery: '',

      // Panel
      selectedFont: null,
      isPanelOpen: false,

      // Customization
      customWeight: 400,
      customSize: 48,
      customLetterSpacing: 0,
      customLineHeight: 1.5,
      customBackground: 'dark',
      customBackgroundColor: '#111111',
      customTextColor: '#F2F2F2',
      customItalic: false,
      previewMode: 'sentence',
      customPreviewText: '',

      // Compare & Pairs
      comparedFonts: [],
      headingFont: null,
      bodyFont: null,

      // Favorites & recently viewed (persisted)
      // Initialize favorites from the same key the UI hooks use so there is
      // exactly one source of truth (fontstash_favorites_fonts).
      favorites: readFavoriteSlugs(),
      recentlyViewed: [],

      // Filtered-list navigation (set by FontGrid on every filter change)
      navigationSlugs: [],

      // Performance (not persisted — rebuilt per session)
      loadedFonts: new Set(),

      // Preview actions
      setPreviewText: (text) => set({ previewText: text }),
      setPreviewSize: (size) => set({ previewSize: size }),
      setPreviewBackground: (bg) => set({ previewBackground: bg }),

      // Filter actions
      toggleCategory: (category) =>
        set((state) => ({
          activeCategories: state.activeCategories.includes(category)
            ? state.activeCategories.filter((c) => c !== category)
            : [...state.activeCategories, category],
        })),
      toggleMood: (mood) =>
        set((state) => ({
          activeMoods: state.activeMoods.includes(mood)
            ? state.activeMoods.filter((m) => m !== mood)
            : [...state.activeMoods, mood],
        })),
      toggleWeight: (weight) =>
        set((state) => ({
          activeWeights: state.activeWeights.includes(weight)
            ? state.activeWeights.filter((w) => w !== weight)
            : [...state.activeWeights, weight],
        })),
      toggleLanguage: (language) =>
        set((state) => ({
          activeLanguages: state.activeLanguages.includes(language)
            ? state.activeLanguages.filter((l) => l !== language)
            : [...state.activeLanguages, language],
        })),
      toggleSource: (source) =>
        set((state) => ({
          activeSources: state.activeSources.includes(source)
            ? state.activeSources.filter((s) => s !== source)
            : [...state.activeSources, source],
        })),
      setVariableOnly: (value) => set({ variableOnly: value }),
      setSortBy: (sort) => set({ sortBy: sort }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      clearAllFilters: () =>
        set({
          activeCategories: [],
          activeMoods: [],
          activeWeights: [],
          activeLanguages: [],
          activeSources: [],
          variableOnly: false,
          sortBy: 'popular',
          searchQuery: '',
        }),

      // Panel actions
      openPanel: (font) => {
        const availableWeight = font.weights.includes(400) ? 400 : font.weights[0] || 400;
        set({ selectedFont: font, isPanelOpen: true, customWeight: availableWeight });
        get().addRecentlyViewed(font.slug);
      },
      closePanel: () => set({ isPanelOpen: false }),
      setSelectedFont: (font) => set({ selectedFont: font }),

      // Customization actions
      setCustomWeight: (weight) => set({ customWeight: weight }),
      setCustomSize: (size) => set({ customSize: size }),
      setCustomLetterSpacing: (spacing) => set({ customLetterSpacing: spacing }),
      setCustomLineHeight: (height) => set({ customLineHeight: height }),
      setCustomBackground: (bg) => set({ customBackground: bg }),
      setCustomBackgroundColor: (color) => set({ customBackgroundColor: color }),
      setCustomTextColor: (color) => set({ customTextColor: color }),
      setCustomItalic: (italic) => set({ customItalic: italic }),
      setPreviewMode: (mode) => set({ previewMode: mode }),
      setCustomPreviewText: (text) => set({ customPreviewText: text }),

      // Compare actions
      addToCompare: (font) => {
        const state = get();
        if (state.comparedFonts.find((f) => f.id === font.id)) return 'duplicate';
        if (state.comparedFonts.length >= 4) return 'limit';
        set({ comparedFonts: [...state.comparedFonts, font] });
        return 'added';
      },
      removeFromCompare: (fontId) =>
        set((state) => ({ comparedFonts: state.comparedFonts.filter((f) => f.id !== fontId) })),
      clearCompare: () => set({ comparedFonts: [] }),

      // Pairs actions
      setHeadingFont: (font) => set({ headingFont: font }),
      setBodyFont: (font) => set({ bodyFont: font }),

      // Favorites actions (single source of truth — mirrors FAVORITE_KEYS.fonts)
      toggleFavorite: (slug) =>
        set((state) => {
          const next = state.favorites.includes(slug)
            ? state.favorites.filter((s) => s !== slug)
            : [...state.favorites, slug];
          writeFavoriteSlugs(next);
          return { favorites: next };
        }),
      isFavorite: (slug) => get().favorites.includes(slug),

      // Recently viewed
      addRecentlyViewed: (slug) =>
        set((state) => {
          const filtered = state.recentlyViewed.filter((s) => s !== slug);
          return { recentlyViewed: [slug, ...filtered].slice(0, 12) };
        }),

      // Panel navigation list (filtered slugs for ←/→)
      setNavigationSlugs: (slugs) => set({ navigationSlugs: slugs }),

      // Font loading
      markFontLoaded: (fontSlug) =>
        set((state) => {
          const newSet = new Set(state.loadedFonts);
          newSet.add(fontSlug);
          return { loadedFonts: newSet };
        }),
      isFontLoaded: (fontSlug) => get().loadedFonts.has(fontSlug),
    }),
    {
      name: 'fontstash-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist user preferences — not transient UI state
      partialize: (state) => ({
        favorites: state.favorites,
        recentlyViewed: state.recentlyViewed,
        previewText: state.previewText,
        previewSize: state.previewSize,
        previewBackground: state.previewBackground,
        sortBy: state.sortBy,
      }),
      // Merge any favorites saved via useLocalStorageList (same key) so
      // pre-existing divergent copies converge on the union, not stale data.
      onRehydrateStorage: () => (rehydrated) => {
        if (!rehydrated) return;
        try {
          const fromKey = readFavoriteSlugs();
          const merged = Array.from(new Set([...(rehydrated.favorites ?? []), ...fromKey]));
          if (merged.length !== (rehydrated.favorites ?? []).length) {
            useFontStore.setState({ favorites: merged });
            writeFavoriteSlugs(merged);
          }
        } catch {
          // ignore
        }
      },
    }
  )
);

// Keep store favorites in sync when UI toggles via useLocalStorageList
// (FontCard / panels use the hook, not the store action).
if (typeof window !== 'undefined') {
  const syncFromKey = () => {
    try {
      const fromKey = readFavoriteSlugs();
      const current = useFontStore.getState().favorites;
      if (fromKey.length === current.length && fromKey.every((s) => current.includes(s))) return;
      useFontStore.setState({ favorites: fromKey });
    } catch {
      // ignore
    }
  };
  window.addEventListener('fontstash-storage', (e) => {
    const detail = (e as CustomEvent)?.detail as { key?: string } | undefined;
    if (!detail || detail.key === FAVORITE_KEYS.fonts) syncFromKey();
  });
  window.addEventListener('storage', syncFromKey);
}
