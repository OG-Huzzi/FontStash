'use client';

import type { Font } from './types';

// Central deduped font stylesheet loader.
// Previously FontCard / DetailPanel / Compare / Pairs each injected their own
// `<link id="font-...">` namespace and never cleaned up, letting `<head>` grow
// unbounded and loading the same URL up to 4 times.
// This helper dedupes by href (not just id) so all surfaces share one tag.

const loadedHrefs = new Set<string>();

function hrefAlreadyInDom(href: string): HTMLLinkElement | null {
  const links = document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]');
  for (const link of Array.from(links)) {
    if (link.href === href || link.getAttribute('href') === href) return link;
  }
  return null;
}

function primaryFamily(font: Font) {
  return font.fontFamily.split(',')[0]?.trim() || `'${font.name}'`;
}

export function ensureFontStylesheet(font: Font, weight = 400): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  const href = font.importUrl;

  const loadFace = async () => {
    try {
      await (document as Document & { fonts?: FontFaceSet }).fonts?.load(
        `${weight} 32px ${primaryFamily(font)}`
      );
    } catch {
      // Provider may miss a face — still render with fallback stack.
    }
  };

  if (loadedHrefs.has(href)) return loadFace();
  const existing = hrefAlreadyInDom(href) ?? document.getElementById(`font-${font.slug}`) as HTMLLinkElement | null;
  if (existing) {
    loadedHrefs.add(href);
    return loadFace();
  }

  // Also satisfy legacy namespaces so old ids never duplicate the same URL.
  for (const legacyId of [`font-panel-${font.slug}`, `font-compare-${font.slug}`, `font-pairs-${font.slug}`]) {
    const legacy = document.getElementById(legacyId) as HTMLLinkElement | null;
    if (legacy && (legacy.href === href || legacy.getAttribute('href') === href)) {
      loadedHrefs.add(href);
      return loadFace();
    }
  }

  const link = document.createElement('link');
  link.id = `font-${font.slug}`;
  link.rel = 'stylesheet';
  link.href = href;

  return new Promise((resolve) => {
    link.onload = async () => {
      loadedHrefs.add(href);
      await loadFace();
      resolve();
    };
    link.onerror = () => resolve();
    document.head.appendChild(link);
  });
}

// Produce a valid `next/font/google` identifier.
// e.g. "Playfair Display" -> "Playfair_Display", "ABeeZee (Bunny)" -> "ABeeZee"
export function toSafeNextFontImport(font: Font): string {
  const base = font.name.replace(/\s+\((Bunny|FS|OF)\)$/i, '').trim();
  const identifier = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_ ]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/^(\d)/, '_$1');
  const safe = identifier || 'CustomFont';
  if (font.source !== 'google-fonts') {
    return `// "${font.name}" is served via ${font.source} — no next/font/google export.\n// Use CSS import instead:\n// @import url('${font.importUrl}');`;
  }
  return `import { ${safe} } from 'next/font/google';`;
}

export function toVariationSettings(font: Font, weight: number): string | null {
  if (!font.isVariable || font.variableAxes.length === 0) return null;
  const clamped = Math.min(900, Math.max(1, Math.round(weight)));
  const settings = font.variableAxes.map((axis) => {
    if (axis.toLowerCase() === 'wght') return `'wght' ${clamped}`;
    // Non-weight axes: keep provider default.
    return `'${axis}' 400`;
  });
  return `font-variation-settings: ${settings.join(', ')};`;
}
