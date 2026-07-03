import type { Font } from './types';
import Fuse from 'fuse.js';

// Import font data
import fontsData from '@/data/fonts.json';

export const allFonts: Font[] = fontsData as Font[];

// Build Fuse.js index once
const fuseOptions = {
  keys: [
    { name: 'name', weight: 0.7 },
    { name: 'category', weight: 0.2 },
    { name: 'moods', weight: 0.1 },
    { name: 'designer', weight: 0.1 },
  ],
  threshold: 0.3,
  includeScore: true,
};

let fuseInstance: Fuse<Font> | null = null;

export function getFuseIndex(): Fuse<Font> {
  if (!fuseInstance) {
    fuseInstance = new Fuse(allFonts, fuseOptions);
  }
  return fuseInstance;
}

export function searchFonts(query: string): Font[] {
  if (!query.trim()) return allFonts;
  const fuse = getFuseIndex();
  const results = fuse.search(query);
  return results.map((r) => r.item);
}

export function getFontBySlug(slug: string): Font | undefined {
  return allFonts.find((f) => f.slug === slug);
}

export function filterFonts(
  fonts: Font[],
  {
    categories,
    moods,
    weights,
    languages,
    sources,
    variableOnly,
  }: {
    categories: string[];
    moods: string[];
    weights: number[];
    languages: string[];
    sources: string[];
    variableOnly: boolean;
  }
): Font[] {
  return fonts.filter((font) => {
    if (categories.length > 0 && !categories.includes(font.category)) return false;
    if (moods.length > 0 && !moods.some((m) => font.moods.includes(m))) return false;
    if (weights.length > 0 && !weights.some((w) => font.weights.includes(w))) return false;
    if (languages.length > 0 && !languages.some((l) => font.languages.includes(l))) return false;
    if (sources.length > 0 && !sources.includes(font.source)) return false;
    if (variableOnly && !font.isVariable) return false;
    return true;
  });
}

export function sortFonts(fonts: Font[], sortBy: string): Font[] {
  const sorted = [...fonts];
  switch (sortBy) {
    case 'popular':
      return sorted.sort((a, b) => b.popularity - a.popularity);
    case 'newest':
      return sorted.sort((a, b) => new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime());
    case 'alpha-asc':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'alpha-desc':
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    default:
      return sorted;
  }
}

// Pairing logic
export function getPairingScore(
  font1: Font,
  font2: Font
): { score: 'Complementary' | 'Neutral' | 'Conflicting'; reason: string } {
  const c1 = font1.category;
  const c2 = font2.category;

  if (c1 === c2 && c1 === 'display') {
    return { score: 'Conflicting', reason: 'Two display fonts compete for attention' };
  }
  if (c1 === c2 && c1 === 'handwriting') {
    return { score: 'Conflicting', reason: 'Two script fonts create visual noise' };
  }
  if ((c1 === 'serif' && c2 === 'sans-serif') || (c1 === 'sans-serif' && c2 === 'serif')) {
    return { score: 'Complementary', reason: 'Classic serif and sans-serif create strong typographic contrast' };
  }
  if ((c1 === 'sans-serif' && c2 === 'monospace') || (c1 === 'monospace' && c2 === 'sans-serif')) {
    return { score: 'Complementary', reason: 'Geometric sans with monospace creates technical clarity' };
  }
  if ((c1 === 'display' && c2 === 'serif') || (c1 === 'serif' && c2 === 'display')) {
    return { score: 'Complementary', reason: 'Display heading with serif body has editorial elegance' };
  }
  if ((c1 === 'display' && c2 === 'sans-serif') || (c1 === 'sans-serif' && c2 === 'display')) {
    return { score: 'Complementary', reason: 'Display font as heading pairs well with clean sans body' };
  }
  if ((c1 === 'handwriting' && c2 === 'sans-serif') || (c1 === 'sans-serif' && c2 === 'handwriting')) {
    return { score: 'Complementary', reason: 'Script accent with neutral sans creates personality without chaos' };
  }
  if (c1 === c2) {
    return { score: 'Neutral', reason: 'Same category — differentiate via weight or size' };
  }
  return { score: 'Neutral', reason: 'Moderate pairing — adjust weights for better contrast' };
}

export interface CuratedPairing {
  heading: string;
  body: string;
  label: string;
}

const seedPairings: CuratedPairing[] = [
  { heading: 'inter', body: 'playfair-display', label: 'Modern & Classic' },
  { heading: 'space-grotesk', body: 'lora', label: 'Geometric & Warm' },
  { heading: 'montserrat', body: 'merriweather', label: 'Strong & Readable' },
  { heading: 'oswald', body: 'pt-serif', label: 'Condensed & Elegant' },
  { heading: 'raleway', body: 'source-serif-4', label: 'Refined & Classic' },
  { heading: 'poppins', body: 'eb-garamond', label: 'Round & Historical' },
  { heading: 'dm-sans', body: 'crimson-pro', label: 'Clean & Literary' },
  { heading: 'outfit', body: 'bitter', label: 'Friendly & Sturdy' },
  { heading: 'josefin-sans', body: 'libre-baskerville', label: 'Art Deco & Traditional' },
  { heading: 'syne', body: 'cormorant-garamond', label: 'Avant-garde & Classic' },
  { heading: 'barlow', body: 'spectral', label: 'Neutral & Expressive' },
  { heading: 'bebas-neue', body: 'open-sans', label: 'Impact & Clarity' },
  { heading: 'plus-jakarta-sans', body: 'noto-serif', label: 'Contemporary & Timeless' },
  { heading: 'manrope', body: 'source-serif-4', label: 'Technical & Literary' },
  { heading: 'work-sans', body: 'ibm-plex-serif', label: 'Industrial & Refined' },
  { heading: 'ubuntu', body: 'ubuntu-mono', label: 'Unified System' },
];

type FontCategory = Font['category'];

interface PairingRule {
  headingCategory: FontCategory;
  bodyCategory: FontCategory;
  limit: number;
  maxPerHeading: number;
  maxPerBody: number;
  labels: string[];
}

const pairingRules: PairingRule[] = [
  {
    headingCategory: 'sans-serif',
    bodyCategory: 'serif',
    limit: 120,
    maxPerHeading: 4,
    maxPerBody: 8,
    labels: ['Modern & Classic', 'Clean & Editorial', 'Product & Essay', 'Geometric & Literary'],
  },
  {
    headingCategory: 'serif',
    bodyCategory: 'sans-serif',
    limit: 115,
    maxPerHeading: 4,
    maxPerBody: 8,
    labels: ['Editorial & Clear', 'Elegant & Direct', 'Heritage & Utility', 'Refined & Readable'],
  },
  {
    headingCategory: 'display',
    bodyCategory: 'sans-serif',
    limit: 115,
    maxPerHeading: 3,
    maxPerBody: 9,
    labels: ['Impact & Clarity', 'Campaign & UI', 'Expressive & Neutral', 'Poster & Product'],
  },
  {
    headingCategory: 'display',
    bodyCategory: 'serif',
    limit: 80,
    maxPerHeading: 3,
    maxPerBody: 7,
    labels: ['Expressive & Literary', 'Display & Editorial', 'Brand & Story', 'Statement & Serif'],
  },
  {
    headingCategory: 'sans-serif',
    bodyCategory: 'sans-serif',
    limit: 70,
    maxPerHeading: 3,
    maxPerBody: 5,
    labels: ['UI Workhorse', 'Clean System', 'Modern Interface', 'Product Ready'],
  },
  {
    headingCategory: 'handwriting',
    bodyCategory: 'sans-serif',
    limit: 45,
    maxPerHeading: 2,
    maxPerBody: 5,
    labels: ['Personal & Clean', 'Friendly & Neutral', 'Human & Readable', 'Casual & Clear'],
  },
  {
    headingCategory: 'sans-serif',
    bodyCategory: 'monospace',
    limit: 30,
    maxPerHeading: 2,
    maxPerBody: 6,
    labels: ['SaaS & Code', 'Technical System', 'Interface & Mono', 'Docs Ready'],
  },
  {
    headingCategory: 'monospace',
    bodyCategory: 'sans-serif',
    limit: 20,
    maxPerHeading: 2,
    maxPerBody: 4,
    labels: ['Technical & Clear', 'Code & Product', 'Console & UI', 'Utility Pair'],
  },
  {
    headingCategory: 'serif',
    bodyCategory: 'serif',
    limit: 20,
    maxPerHeading: 2,
    maxPerBody: 4,
    labels: ['Editorial Family', 'Classic Text', 'Literary System', 'Serif Study'],
  },
];

const GLOBAL_MAX_HEADING_USES = 2;
const GLOBAL_MAX_BODY_USES = 2;
const GLOBAL_MAX_TOTAL_USES = 3;

function normalizedFontName(font: Font) {
  return font.name.replace(/\s+\(Bunny\)$/i, '').toLowerCase();
}

function dedupedGoogleFonts() {
  const seen = new Set<string>();
  return allFonts
    .filter((font) => font.source === 'google-fonts' && font.languages.includes('latin'))
    .sort((a, b) => b.popularity - a.popularity)
    .filter((font) => {
      const name = normalizedFontName(font);
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    });
}

function hasBodyWeight(font: Font) {
  return font.weights.includes(400) || font.isVariable;
}

function hasHeadingWeight(font: Font) {
  return font.category === 'display' || font.category === 'handwriting' || font.weights.some((weight) => weight >= 600) || font.isVariable;
}

function categoryCandidates(fonts: Font[], category: FontCategory, role: 'heading' | 'body') {
  return fonts
    .filter((font) => font.category === category)
    .filter((font) => role === 'heading' ? hasHeadingWeight(font) : hasBodyWeight(font))
    .slice(0, category === 'sans-serif' ? 420 : 320);
}

function moodOverlap(a: Font, b: Font) {
  return a.moods.filter((mood) => b.moods.includes(mood)).length;
}

function pairScore(heading: Font, body: Font, rule: PairingRule) {
  const popularity = (heading.popularity * 0.56) + (body.popularity * 0.44);
  const moodBonus = moodOverlap(heading, body) * 10;
  const contrastBonus = heading.category === body.category ? 0 : 45;
  const variableBonus = (heading.isVariable ? 8 : 0) + (body.isVariable ? 6 : 0);
  const bodyReadabilityBonus = body.weights.includes(400) ? 18 : 0;
  const sameMoodPenalty = heading.category === body.category && moodOverlap(heading, body) === 0 ? -25 : 0;
  const scriptPenalty = rule.headingCategory === 'handwriting' ? -20 : 0;
  return popularity + moodBonus + contrastBonus + variableBonus + bodyReadabilityBonus + sameMoodPenalty + scriptPenalty;
}

function categorySignature(pair: CuratedPairing, bySlug: Map<string, Font>) {
  const heading = bySlug.get(pair.heading);
  const body = bySlug.get(pair.body);
  return `${heading?.category ?? 'unknown'}:${body?.category ?? 'unknown'}`;
}

function sharesRecentFont(pair: CuratedPairing, recent: CuratedPairing[]) {
  const pairFonts = new Set([pair.heading, pair.body]);
  return recent.some((recentPair) => (
    pairFonts.has(recentPair.heading) || pairFonts.has(recentPair.body)
  ));
}

function diversifyPairingOrder(
  pairings: CuratedPairing[],
  bySlug: Map<string, Font>,
  initialRecent: CuratedPairing[] = []
) {
  const remaining = [...pairings];
  const ordered: CuratedPairing[] = [];
  const recentFontWindow = 14;
  const recentSignatureWindow = 4;

  while (remaining.length > 0) {
    const previousPairs = [...initialRecent, ...ordered];
    const recentFonts = previousPairs.slice(-recentFontWindow);
    const recentSignatures = previousPairs
      .slice(-recentSignatureWindow)
      .map((pair) => categorySignature(pair, bySlug));

    let index = remaining.findIndex((pair) => (
      !sharesRecentFont(pair, recentFonts) &&
      !recentSignatures.includes(categorySignature(pair, bySlug))
    ));

    if (index === -1) {
      const relaxedRecentFonts = previousPairs.slice(-Math.floor(recentFontWindow / 2));
      index = remaining.findIndex((pair) => !sharesRecentFont(pair, relaxedRecentFonts));
    }

    if (index === -1) index = 0;

    const [next] = remaining.splice(index, 1);
    ordered.push(next);
  }

  return ordered;
}

function buildCuratedPairings(): CuratedPairing[] {
  const fonts = dedupedGoogleFonts();
  const bySlug = new Map(fonts.map((font) => [font.slug, font]));
  const pairings: CuratedPairing[] = [];
  const usedPairs = new Set<string>();
  const globalHeadingUsage = new Map<string, number>();
  const globalBodyUsage = new Map<string, number>();
  const globalTotalUsage = new Map<string, number>();

  const incrementUsage = (map: Map<string, number>, slug: string) => {
    map.set(slug, (map.get(slug) ?? 0) + 1);
  };

  const canUsePair = (headingSlug: string, bodySlug: string) => (
    (globalHeadingUsage.get(headingSlug) ?? 0) < GLOBAL_MAX_HEADING_USES &&
    (globalBodyUsage.get(bodySlug) ?? 0) < GLOBAL_MAX_BODY_USES &&
    (globalTotalUsage.get(headingSlug) ?? 0) < GLOBAL_MAX_TOTAL_USES &&
    (globalTotalUsage.get(bodySlug) ?? 0) < GLOBAL_MAX_TOTAL_USES
  );

  const addPair = (pair: CuratedPairing) => {
    const key = `${pair.heading}:${pair.body}`;
    if (usedPairs.has(key)) return false;
    if (!canUsePair(pair.heading, pair.body)) return false;

    usedPairs.add(key);
    pairings.push(pair);
    incrementUsage(globalHeadingUsage, pair.heading);
    incrementUsage(globalBodyUsage, pair.body);
    incrementUsage(globalTotalUsage, pair.heading);
    incrementUsage(globalTotalUsage, pair.body);
    return true;
  };

  seedPairings
    .filter((pair) => bySlug.has(pair.heading) && bySlug.has(pair.body))
    .forEach(addPair);
  const seedPairCount = pairings.length;

  for (const rule of pairingRules) {
    const headings = categoryCandidates(fonts, rule.headingCategory, 'heading');
    const bodies = categoryCandidates(fonts, rule.bodyCategory, 'body');
    const candidates = headings.flatMap((heading) => (
      bodies
        .filter((body) => heading.slug !== body.slug && normalizedFontName(heading) !== normalizedFontName(body))
        .map((body) => ({ heading, body, score: pairScore(heading, body, rule) }))
    )).sort((a, b) => b.score - a.score);

    const headingUsage = new Map<string, number>();
    const bodyUsage = new Map<string, number>();
    let addedForRule = 0;

    for (const candidate of candidates) {
      if (addedForRule >= rule.limit) break;
      const key = `${candidate.heading.slug}:${candidate.body.slug}`;
      if (usedPairs.has(key)) continue;
      if (!canUsePair(candidate.heading.slug, candidate.body.slug)) continue;
      if ((headingUsage.get(candidate.heading.slug) ?? 0) >= rule.maxPerHeading) continue;
      if ((bodyUsage.get(candidate.body.slug) ?? 0) >= rule.maxPerBody) continue;

      headingUsage.set(candidate.heading.slug, (headingUsage.get(candidate.heading.slug) ?? 0) + 1);
      bodyUsage.set(candidate.body.slug, (bodyUsage.get(candidate.body.slug) ?? 0) + 1);
      if (!addPair({
        heading: candidate.heading.slug,
        body: candidate.body.slug,
        label: rule.labels[addedForRule % rule.labels.length],
      })) continue;
      addedForRule += 1;
    }
  }

  const seedPairs = pairings.slice(0, seedPairCount);
  const generatedPairs = diversifyPairingOrder(pairings.slice(seedPairCount), bySlug, seedPairs);
  return [...seedPairs, ...generatedPairs].slice(0, 560);
}

// 500+ deterministic, rule-scored pairings. No random shuffling, no paid API.
export const curatedPairings: CuratedPairing[] = buildCuratedPairings();

export function getSuggestedPairings(font: Font): string[] {
  // Find complementary fonts
  const isSerif = font.category === 'serif';
  const isSans = font.category === 'sans-serif';
  const isDisplay = font.category === 'display';
  
  let pairCategory: string;
  if (isSerif) pairCategory = 'sans-serif';
  else if (isSans) pairCategory = 'serif';
  else if (isDisplay) pairCategory = 'sans-serif';
  else pairCategory = 'sans-serif';

  const candidates = allFonts
    .filter((f) => f.category === pairCategory && f.slug !== font.slug)
    .slice(0, 20);
  
  // Return top 4
  return candidates.slice(0, 4).map((f) => f.slug);
}
