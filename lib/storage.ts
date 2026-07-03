'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

export const FAVORITE_KEYS = {
  fonts: 'fontstash_favorites_fonts',
  palettes: 'fontstash_favorites_palettes',
  gradients: 'fontstash_favorites_gradients',
} as const;

export interface FontCollection {
  id: string;
  name: string;
  fontIds: string[];
  createdAt: string;
}

const COLLECTIONS_KEY = 'fontstash_collections';

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent('fontstash-storage', { detail: { key } }));
}

export function useLocalStorageList(key: string) {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    setItems(readJson<string[]>(key, []));
    const sync = () => setItems(readJson<string[]>(key, []));
    window.addEventListener('storage', sync);
    window.addEventListener('fontstash-storage', sync as EventListener);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('fontstash-storage', sync as EventListener);
    };
  }, [key]);

  const toggle = useCallback((id: string) => {
    setItems((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      writeJson(key, next);
      return next;
    });
  }, [key]);

  const has = useCallback((id: string) => items.includes(id), [items]);

  return { items, toggle, has };
}

export function useCollections() {
  const [collections, setCollections] = useState<FontCollection[]>([]);

  useEffect(() => {
    setCollections(readJson<FontCollection[]>(COLLECTIONS_KEY, []));
    const sync = () => setCollections(readJson<FontCollection[]>(COLLECTIONS_KEY, []));
    window.addEventListener('storage', sync);
    window.addEventListener('fontstash-storage', sync as EventListener);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('fontstash-storage', sync as EventListener);
    };
  }, []);

  const save = useCallback((next: FontCollection[]) => {
    setCollections(next);
    writeJson(COLLECTIONS_KEY, next);
  }, []);

  const createCollection = useCallback((name: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    save([
      ...collections,
      {
        id: `${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
        name: cleanName,
        fontIds: [],
        createdAt: new Date().toISOString(),
      },
    ]);
  }, [collections, save]);

  const deleteCollection = useCallback((id: string) => {
    save(collections.filter((collection) => collection.id !== id));
  }, [collections, save]);

  const toggleFontInCollection = useCallback((collectionId: string, fontId: string) => {
    save(collections.map((collection) => {
      if (collection.id !== collectionId) return collection;
      const fontIds = collection.fontIds.includes(fontId)
        ? collection.fontIds.filter((id) => id !== fontId)
        : [...collection.fontIds, fontId];
      return { ...collection, fontIds };
    }));
  }, [collections, save]);

  return useMemo(() => ({
    collections,
    createCollection,
    deleteCollection,
    toggleFontInCollection,
  }), [collections, createCollection, deleteCollection, toggleFontInCollection]);
}
