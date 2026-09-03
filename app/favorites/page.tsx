'use client';

import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { FontCard } from '@/components/fonts/FontCard';
import { useFontStore } from '@/store/useFontStore';
import { allFonts, getFontBySlug } from '@/lib/fonts';
import { FAVORITE_KEYS, useCollections, useLocalStorageList, type FontCollection } from '@/lib/storage';
import { useToast } from '@/components/ui/Toast';

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
        aria-expanded={open}
        title="Add to collection"
      >
        +
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
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
        </>
      )}
    </div>
  );
}

function CollectionDialog({
  mode,
  initialName,
  onSubmit,
  onClose,
}: {
  mode: 'create' | 'rename' | 'delete';
  initialName?: string;
  onSubmit: (name: string) => string | boolean | null | void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initialName ?? '');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = () => {
    if (mode === 'delete') {
      (onSubmit as (name: string) => void)('');
      return;
    }
    const clean = name.trim();
    if (!clean) {
      setError('Name cannot be empty');
      return;
    }
    const result = onSubmit(clean);
    if (result === false || result === null) {
      setError('A collection with that name already exists');
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={mode === 'create' ? 'New collection' : mode === 'rename' ? 'Rename collection' : 'Delete collection'}>
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-card border border-border bg-surface p-5 shadow-2xl">
        <h3 className="text-sm font-semibold text-text-primary mb-1">
          {mode === 'create' ? 'New collection' : mode === 'rename' ? `Rename "${initialName}"` : `Delete "${initialName}"?`}
        </h3>
        {mode === 'delete' ? (
          <p className="text-xs text-text-muted mb-4">Fonts stay in All Favorites — only the collection is removed.</p>
        ) : (
          <p className="text-xs text-text-muted mb-3">Stored locally in this browser. Export JSON to back up.</p>
        )}
        {mode !== 'delete' && (
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => { setName(e.target.value); setError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            placeholder="e.g. Blog redesign"
            maxLength={48}
            className="w-full rounded-input border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-subtle focus:border-border-hover focus:outline-none"
            aria-label="Collection name"
          />
        )}
        {error && <p className="mt-2 text-[11px] font-mono text-[#FF6B6B]">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-input border border-border px-3 py-1.5 text-[11px] font-mono text-text-muted hover:text-text-primary">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className={`rounded-input border px-3 py-1.5 text-[11px] font-mono ${
              mode === 'delete'
                ? 'border-[#FF6B6B]/40 bg-[#FF6B6B]/10 text-[#FF6B6B] hover:bg-[#FF6B6B]/20'
                : 'border-accent/40 bg-accent/10 text-accent hover:bg-accent/20'
            }`}
          >
            {mode === 'create' ? 'Create' : mode === 'rename' ? 'Rename' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

function encodeShare(fontIds: string[]) {
  try {
    return btoa(encodeURIComponent(JSON.stringify(fontIds))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch {
    return '';
  }
}

function decodeShare(token: string): string[] {
  try {
    const padded = token.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(atob(padded));
    const parsed = JSON.parse(json) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string').slice(0, 500) : [];
  } catch {
    return [];
  }
}

export default function FavoritesPage() {
  const { previewText, previewSize, previewBackground } = useFontStore();
  const { items: favoriteIds } = useLocalStorageList(FAVORITE_KEYS.fonts);
  const { collections, createCollection, renameCollection, deleteCollection, importCollections } = useCollections();
  const { showToast } = useToast();
  const [activeCollectionId, setActiveCollectionId] = useState<string>('all');
  const [dialog, setDialog] = useState<{ mode: 'create' | 'rename' | 'delete'; id?: string; name?: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const activeCollection = collections.find((collection) => collection.id === activeCollectionId);

  // Import shared collection from ?share= token (frontend-only, no backend).
  useEffect(() => {
    try {
      const token = new URLSearchParams(window.location.search).get('share');
      if (!token) return;
      const ids = decodeShare(token).filter((slug) => getFontBySlug(slug));
      if (ids.length === 0) return;
      const ok = importCollections([{ id: `shared-${Date.now()}`, name: `Shared (${ids.length})`, fontIds: ids, createdAt: new Date().toISOString() }]);
      if (ok) showToast(`Imported shared collection (${ids.length} fonts)`);
      window.history.replaceState(null, '', '/favorites');
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const favoriteFonts = useMemo(() => {
    if (activeCollection) {
      // Show collection contents even if a font was un-hearted afterwards.
      return activeCollection.fontIds
        .map((slug) => getFontBySlug(slug))
        .filter((f): f is NonNullable<typeof f> => Boolean(f));
    }
    return allFonts.filter((font) => favoriteIds.includes(font.slug));
  }, [favoriteIds, activeCollection]);

  const handleExportJson = useCallback(async () => {
    const payload = JSON.stringify(collections, null, 2);
    try {
      await navigator.clipboard.writeText(payload);
      showToast('Collections JSON copied');
    } catch {
      showToast('Could not copy JSON');
    }
  }, [collections, showToast]);

  const handleDownloadJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(collections, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fontstash-collections.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Collections downloaded');
  }, [collections, showToast]);

  const handleImportFile = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as FontCollection[];
      const ok = importCollections(Array.isArray(parsed) ? parsed : []);
      showToast(ok ? 'Collections imported' : 'No valid collections found');
    } catch {
      showToast('Invalid JSON file');
    }
  }, [importCollections, showToast]);

  const handleCopyCss = useCallback(async () => {
    const css = favoriteFonts
      .map((f) => `@import url('${f.importUrl}'); /* ${f.name} */`)
      .join('\n');
    if (!css) {
      showToast('Nothing to export');
      return;
    }
    try {
      await navigator.clipboard.writeText(css);
      showToast(`Copied ${favoriteFonts.length} @imports`);
    } catch {
      showToast('Could not copy CSS');
    }
  }, [favoriteFonts, showToast]);

  const handleShare = useCallback(async () => {
    const ids = (activeCollection ? activeCollection.fontIds : favoriteIds).slice(0, 200);
    if (ids.length === 0) {
      showToast('Nothing to share');
      return;
    }
    const token = encodeShare(ids);
    const url = `${window.location.origin}/favorites?share=${token}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast('Share link copied');
    } catch {
      showToast('Could not copy link');
    }
  }, [activeCollection, favoriteIds, showToast]);

  return (
    <main id="main-content" className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-14 px-4 sm:px-6 py-6">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Favorites</h1>
            <p className="text-sm text-text-muted mt-1">Saved fonts and project collections stored in this browser.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setDialog({ mode: 'create' })} className="w-fit text-[11px] font-mono py-2 px-3 rounded-input border border-accent/40 text-accent bg-accent/10 hover:bg-accent/15 transition-colors">
              + New Collection
            </button>
            {collections.length > 0 && (
              <>
                <button onClick={handleExportJson} className="w-fit text-[11px] font-mono py-2 px-3 rounded-input border border-border text-text-muted bg-surface hover:text-text-primary" title="Copy collections JSON">
                  Export
                </button>
                <button onClick={handleDownloadJson} className="w-fit text-[11px] font-mono py-2 px-3 rounded-input border border-border text-text-muted bg-surface hover:text-text-primary" title="Download collections JSON">
                  ↓ JSON
                </button>
                <button onClick={() => fileRef.current?.click()} className="w-fit text-[11px] font-mono py-2 px-3 rounded-input border border-border text-text-muted bg-surface hover:text-text-primary" title="Import collections JSON">
                  Import
                </button>
                <input ref={fileRef} type="file" accept="application/json" className="hidden" aria-label="Import collections JSON" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleImportFile(f); e.target.value = ''; }} />
              </>
            )}
          </div>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCollectionId('all')}
            aria-pressed={activeCollectionId === 'all'}
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
                aria-pressed={activeCollectionId === collection.id}
                className={`text-[11px] font-mono px-3 py-1.5 ${
                  activeCollectionId === collection.id ? 'text-accent bg-accent/10' : 'text-text-muted'
                }`}
              >
                {collection.name} ({collection.fontIds.length})
              </button>
              <button
                onClick={() => setDialog({ mode: 'rename', id: collection.id, name: collection.name })}
                className="px-2 text-text-subtle hover:text-text-primary border-l border-border"
                aria-label={`Rename ${collection.name}`}
                title="Rename"
              >
                ✎
              </button>
              <button
                onClick={() => setDialog({ mode: 'delete', id: collection.id, name: collection.name })}
                className="px-2 text-text-muted hover:text-text-primary border-l border-border"
                aria-label={`Delete ${collection.name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>

        {favoriteFonts.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button onClick={handleCopyCss} className="text-[11px] font-mono px-3 py-1.5 rounded-input border border-border text-text-muted bg-surface hover:text-text-primary">
              Copy {favoriteFonts.length} @imports
            </button>
            <button onClick={handleShare} className="text-[11px] font-mono px-3 py-1.5 rounded-input border border-border text-text-muted bg-surface hover:text-text-primary">
              Copy share link ↗
            </button>
            {activeCollection && (
              <span className="text-[10px] font-mono text-text-subtle">{activeCollection.fontIds.length} in collection</span>
            )}
          </div>
        )}

        {favoriteIds.length === 0 && !activeCollection ? (
          <div className="rounded-card border border-border bg-surface p-10 text-center">
            <p className="text-sm text-text-muted">No favorites yet. Tap the heart on any font to save it here.</p>
          </div>
        ) : favoriteFonts.length === 0 ? (
          <div className="rounded-card border border-border bg-surface p-10 text-center">
            <p className="text-sm text-text-muted">No fonts in this collection yet. Open a font and use + to add it.</p>
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

      {dialog && (
        <CollectionDialog
          mode={dialog.mode}
          initialName={dialog.name}
          onClose={() => setDialog(null)}
          onSubmit={(name) => {
            if (dialog.mode === 'create') {
              const id = createCollection(name);
              if (id) setActiveCollectionId(id);
              return id;
            }
            if (dialog.mode === 'rename' && dialog.id) {
              return renameCollection(dialog.id, name);
            }
            if (dialog.mode === 'delete' && dialog.id) {
              deleteCollection(dialog.id);
              setActiveCollectionId('all');
              setDialog(null);
            }
          }}
        />
      )}
    </main>
  );
}
