'use client';

import React, { useMemo, useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { FontCard } from '@/components/fonts/FontCard';
import { useFontStore } from '@/store/useFontStore';
import { allFonts } from '@/lib/fonts';
import { FAVORITE_KEYS, useCollections, useLocalStorageList } from '@/lib/storage';

function CollectionMenu({ fontId }: { fontId: string }) {
  const [open, setOpen] = useState(false);
  const { collections, toggleFontInCollection } = useCollections();
  if (collections.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        className="h-8 w-8 rounded-input border border-border bg-surface text-text-muted hover:text-accent hover:border-border-hover"
        aria-label="Add to collection"
        title="Add to collection"
      >
        +
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-20 w-52 rounded-card border border-border bg-surface p-2 shadow-2xl">
          {collections.map((collection) => {
            const active = collection.fontIds.includes(fontId);
            return (
              <button
                key={collection.id}
                onClick={() => toggleFontInCollection(collection.id, fontId)}
                className={`w-full text-left px-2 py-1.5 rounded text-[11px] font-mono transition-colors ${
                  active ? 'text-accent bg-accent/10' : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
                }`}
              >
                {active ? '✓ ' : '+ '}{collection.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function FavoritesPage() {
  const { previewText, previewSize, previewBackground } = useFontStore();
  const { items: favoriteIds } = useLocalStorageList(FAVORITE_KEYS.fonts);
  const { collections, createCollection, deleteCollection } = useCollections();
  const [activeCollectionId, setActiveCollectionId] = useState<string>('all');

  const activeCollection = collections.find((collection) => collection.id === activeCollectionId);
  const favoriteFonts = useMemo(() => {
    const ids = activeCollection ? activeCollection.fontIds : favoriteIds;
    return allFonts.filter((font) => favoriteIds.includes(font.slug) && ids.includes(font.slug));
  }, [favoriteIds, activeCollection]);

  const handleNewCollection = () => {
    const name = window.prompt('Collection name');
    if (name) createCollection(name);
  };

  const handleDeleteCollection = (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    deleteCollection(id);
    setActiveCollectionId('all');
  };

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-14 px-4 sm:px-6 py-6">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Favorites</h1>
            <p className="text-sm text-text-muted mt-1">Saved fonts and project collections stored in this browser.</p>
          </div>
          <button
            onClick={handleNewCollection}
            className="w-fit text-[11px] font-mono py-2 px-3 rounded-input border border-accent/40 text-accent bg-accent/10 hover:bg-accent/15 transition-colors"
          >
            + New Collection
          </button>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCollectionId('all')}
            className={`text-[11px] font-mono px-3 py-1.5 rounded-input border ${
              activeCollectionId === 'all' ? 'border-accent/40 text-accent bg-accent/10' : 'border-border text-text-muted bg-surface'
            }`}
          >
            All Favorites ({favoriteIds.length})
          </button>
          {collections.map((collection) => (
            <span key={collection.id} className="inline-flex items-center rounded-input border border-border bg-surface overflow-hidden">
              <button
                onClick={() => setActiveCollectionId(collection.id)}
                className={`text-[11px] font-mono px-3 py-1.5 ${
                  activeCollectionId === collection.id ? 'text-accent bg-accent/10' : 'text-text-muted'
                }`}
              >
                {collection.name} ({collection.fontIds.length})
              </button>
              <button
                onClick={() => handleDeleteCollection(collection.id, collection.name)}
                className="px-2 text-text-muted hover:text-text-primary border-l border-border"
                aria-label={`Delete ${collection.name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>

        {favoriteIds.length === 0 ? (
          <div className="rounded-card border border-border bg-surface p-10 text-center">
            <p className="text-sm text-text-muted">No favorites yet. Tap the heart on any font to save it here.</p>
          </div>
        ) : favoriteFonts.length === 0 ? (
          <div className="rounded-card border border-border bg-surface p-10 text-center">
            <p className="text-sm text-text-muted">No fonts in this collection yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {favoriteFonts.map((font) => (
              <div key={font.slug} className="relative">
                <FontCard
                  font={font}
                  previewText={previewText}
                  previewSize={previewSize}
                  previewBackground={previewBackground}
                />
                <div className="absolute right-2 top-2 z-10">
                  <CollectionMenu fontId={font.slug} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
