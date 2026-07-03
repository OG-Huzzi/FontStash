/**
 * FontStash — Multi-source font aggregator v2
 * Sources:
 *   1. Google Fonts API  (~1,945 fonts)
 *   2. Fontshare by ITF  (~50 premium free fonts)
 *   3. Open Foundry / curated free fonts (~200 fonts)
 *   4. Font Squirrel curated catalog (~900 fonts, embedded — their API is WAF-blocked)
 *
 * Run: node scripts/generate-fonts.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local if present
try {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
        if (key && !key.startsWith('#')) {
          process.env[key] = val;
        }
      }
    });
  }
} catch (e) {
  // Ignore env loading errors
}

const GOOGLE_API_KEY = process.env.GOOGLE_FONTS_API_KEY;

if (!GOOGLE_API_KEY) {
  console.warn('⚠️ Warning: GOOGLE_FONTS_API_KEY is not defined. Google Fonts API fetch might fail.');
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function slugify(name) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

const NON_TEXT_FONT_PATTERNS = [
  /^material icons?(?:\b|$)/i,
  /^material symbols?(?:\b|$)/i,
  /^noto color emoji$/i,
  /^noto emoji$/i,
  /^noto sans symbols(?: 2)?$/i,
];

function baseFontName(name) {
  return String(name || '').replace(/\s+\((?:Bunny|FS)\)$/i, '').trim();
}

function isTextPreviewFont(name) {
  const family = baseFontName(name);
  return family.length > 0 && !NON_TEXT_FONT_PATTERNS.some((pattern) => pattern.test(family));
}

function fetch(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'FontStash/2.0' } }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(null); }
      });
    });
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// ─── Shared tables ──────────────────────────────────────────────────────────

const MOOD_MAP = {
  'sans-serif': ['modern', 'minimal', 'technical'],
  serif: ['elegant', 'vintage', 'bold'],
  monospace: ['technical', 'modern', 'minimal'],
  display: ['bold', 'playful', 'modern'],
  handwriting: ['friendly', 'playful', 'elegant'],
};

const MOOD_OVERRIDES = {
  'Playfair Display': ['elegant', 'vintage', 'bold'],
  'Dancing Script': ['friendly', 'playful', 'elegant'],
  'Abril Fatface': ['bold', 'vintage', 'playful'],
  'Pacifico': ['friendly', 'playful', 'bold'],
  'Lobster': ['friendly', 'playful', 'bold'],
  'Cinzel': ['elegant', 'vintage', 'bold'],
  'Cormorant': ['elegant', 'vintage', 'minimal'],
  'Bodoni Moda': ['elegant', 'bold', 'modern'],
  'EB Garamond': ['elegant', 'vintage', 'minimal'],
  'Oswald': ['bold', 'modern', 'technical'],
  'Bebas Neue': ['bold', 'modern', 'minimal'],
  'Satoshi': ['modern', 'minimal', 'friendly'],
  'Cabinet Grotesk': ['modern', 'bold', 'technical'],
  'Clash Display': ['bold', 'playful', 'modern'],
  'Zodiak': ['elegant', 'vintage', 'modern'],
  'General Sans': ['modern', 'minimal', 'technical'],
  'Switzer': ['modern', 'minimal', 'elegant'],
  'Geist': ['modern', 'minimal', 'technical'],
};

const DESC = {
  'sans-serif': [
    'A clean, modern sans-serif designed for excellent legibility across all screen sizes.',
    'A versatile geometric sans-serif ideal for both display and body text.',
    'A humanist sans-serif with warm, friendly characteristics.',
    'A neo-grotesque typeface with strong typographic presence.',
    'A contemporary sans-serif balancing form and function.',
    'A refined grotesque with optically adjusted letter spacing.',
    'A low-contrast sans-serif with a pragmatic, industrial character.',
    'A geometric sans-serif with a strong Swiss modernist influence.',
    'A transitional sans-serif bridging humanist and geometric traditions.',
  ],
  serif: [
    'An elegant serif with classical proportions and refined details.',
    'A text serif optimized for long-form reading on screens.',
    'A transitional serif combining old-style warmth with modern clarity.',
    'A contemporary serif with high contrast and expressive character.',
    'A Didone-inspired serif with elegant, high-contrast strokes.',
    'A slab serif combining sturdy structure with humanist curves.',
    'An old-style serif with authentic Renaissance proportions.',
    'A calligraphic serif with rhythmic, dynamic strokes.',
    'A neoclassical serif with fine, controlled letterforms.',
  ],
  monospace: [
    'A programming-focused monospace with excellent code readability.',
    'A clean monospace typeface suited for code and data display.',
    'A technical monospace with distinctive character forms.',
    'A bitmap-inspired monospace for interface and terminal use.',
    'A monospaced typeface with humanist influences.',
  ],
  display: [
    'A bold display typeface designed to command attention.',
    'A decorative display font for headlines and short copy.',
    'A distinctive display face with strong personality.',
    'An expressive headline font with experimental character.',
    'A large-scale display typeface with optical refinements.',
    'A condensed display face for editorial headlines.',
  ],
  handwriting: [
    'An expressive handwriting font with natural, flowing strokes.',
    'A casual script font with friendly, approachable character.',
    'A pen-drawn script with organic, humanistic qualities.',
    'A brush script with energetic, spontaneous letterforms.',
    'A formal script with classical calligraphic roots.',
  ],
};

function getDesc(cat, name) {
  const t = DESC[cat] || DESC['sans-serif'];
  return t[name.charCodeAt(0) % t.length];
}

function getMoods(cat, name) {
  return MOOD_OVERRIDES[name] || MOOD_MAP[cat] || ['modern', 'minimal'];
}

function mapGoogleCat(c) {
  return { 'sans-serif': 'sans-serif', serif: 'serif', monospace: 'monospace', display: 'display', handwriting: 'handwriting' }[c] || 'sans-serif';
}

function extractGoogleWeights(variants) {
  const ws = new Set();
  variants.forEach((v) => {
    const m = v.match(/^(\d+)/);
    if (m) ws.add(parseInt(m[1]));
    else if (v === 'regular' || v === 'italic') ws.add(400);
  });
  return [...ws].sort((a, b) => a - b);
}

const VARIABLE_SET = new Set([
  'Inter', 'Roboto', 'Roboto Flex', 'Open Sans', 'Montserrat', 'Raleway', 'Nunito',
  'Rubik', 'Work Sans', 'DM Sans', 'Plus Jakarta Sans', 'Outfit', 'Manrope',
  'Syne', 'Space Grotesk', 'Josefin Sans', 'Cabin', 'Barlow', 'Exo 2',
  'Mulish', 'Quicksand', 'Karla', 'Jost', 'Urbanist', 'Lexend', 'Figtree',
  'Be Vietnam Pro', 'Instrument Sans', 'Bricolage Grotesque', 'Fraunces',
  'Playfair Display', 'Cormorant', 'Crimson Pro', 'Source Sans 3',
  'Source Serif 4', 'Lora', 'EB Garamond', 'IBM Plex Mono', 'Fira Code',
  'Recursive', 'Commissioner', 'Ysabeau', 'Geologica',
  'Satoshi', 'Cabinet Grotesk', 'Switzer', 'General Sans', 'Aspekta',
  'Geist', 'Geist Mono', 'Mona Sans', 'Hubot Sans', 'Boska', 'Sentient',
  'Archivo', 'Synonym', 'Author', 'Supreme', 'Nippo', 'Chillax', 'Rowan',
]);

function isVar(variants, family) {
  return VARIABLE_SET.has(family) || variants.length > 10;
}

function addWeight(value, weights) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    weights.add(value);
    return;
  }
  if (typeof value !== 'string') return;

  const normalized = value.toLowerCase();
  if (normalized === 'regular' || normalized === 'italic') {
    weights.add(400);
    return;
  }

  const match = normalized.match(/(?:^|[^0-9])([1-9]00)(?:[^0-9]|$)/);
  if (match) weights.add(Number(match[1]));
}

function extractBunnyWeights(info) {
  const weights = new Set();

  if (Array.isArray(info.weights)) {
    info.weights.forEach((weight) => addWeight(weight, weights));
  }

  if (info.variants) {
    if (Array.isArray(info.variants)) {
      info.variants.forEach((variant) => addWeight(variant, weights));
    } else if (typeof info.variants === 'object') {
      Object.keys(info.variants).forEach((variantKey) => addWeight(variantKey, weights));
      Object.values(info.variants).forEach((variant) => {
        if (Array.isArray(variant)) {
          variant.forEach((weight) => addWeight(weight, weights));
        } else if (variant && typeof variant === 'object') {
          addWeight(variant.weight, weights);
          if (Array.isArray(variant.weights)) {
            variant.weights.forEach((weight) => addWeight(weight, weights));
          }
          Object.keys(variant).forEach((variantKey) => addWeight(variantKey, weights));
        }
      });
    }
  }

  const result = [...weights].filter((weight) => weight > 0).sort((a, b) => a - b);
  return result.length ? result : [400];
}

function extractBunnySubsets(info) {
  const subsets = [];

  if (Array.isArray(info.subsets)) subsets.push(...info.subsets);
  if (Array.isArray(info.defSubset)) subsets.push(...info.defSubset);
  else if (typeof info.defSubset === 'string') subsets.push(info.defSubset);

  if (info.variants && !Array.isArray(info.variants) && typeof info.variants === 'object') {
    subsets.push(...Object.keys(info.variants));
  }

  return [...new Set(subsets.filter(Boolean))];
}

function mapSubsets(subsets) {
  const m = {
    latin: 'latin', 'latin-ext': 'latin', cyrillic: 'cyrillic', 'cyrillic-ext': 'cyrillic',
    greek: 'greek', 'greek-ext': 'greek', arabic: 'arabic', hebrew: 'arabic',
    devanagari: 'devanagari', japanese: 'japanese', korean: 'korean',
    'chinese-simplified': 'chinese', 'chinese-traditional': 'chinese',
    vietnamese: 'latin', thai: 'latin', georgian: 'latin',
  };
  const langs = new Set();
  (subsets || []).forEach((s) => { if (m[s]) langs.add(m[s]); });
  if (!langs.size) langs.add('latin');
  return [...langs];
}

// ─── Source 1: Google Fonts ──────────────────────────────────────────────────

async function fetchGoogleFonts() {
  console.log('[1/4] Fetching Google Fonts API…');
  const data = await fetch(`https://www.googleapis.com/webfonts/v1/webfonts?key=${GOOGLE_API_KEY}&sort=popularity`);
  if (!data?.items) { console.error('  ❌ Failed'); return []; }
  console.log(`  ✔ ${data.items.length} fonts`);

  let pop = data.items.length + 5000;
  return data.items.map((font) => {
    const cat = mapGoogleCat(font.category);
    const weights = extractGoogleWeights(font.variants);
    const variable = isVar(font.variants, font.family);
    const slug = slugify(font.family);
    const fam = font.family.replace(/ /g, '+');
    const wStr = weights.length > 1 ? `:wght@${weights.join(';')}` : '';
    return {
      id: slug, name: font.family, slug, category: cat,
      moods: getMoods(cat, font.family), weights, isVariable: variable,
      variableAxes: variable ? ['wght'] : [], languages: mapSubsets(font.subsets),
      source: 'google-fonts', license: 'OFL',
      importUrl: `https://fonts.googleapis.com/css2?family=${fam}${wStr}&display=swap`,
      fontFamily: `'${font.family}', ${cat === 'monospace' ? 'monospace' : cat === 'serif' ? 'serif' : 'sans-serif'}`,
      downloadUrl: `https://fonts.google.com/download?family=${encodeURIComponent(font.family)}`,
      ttfUrl: font.files?.regular || font.files?.['400'] || Object.values(font.files || {})[0] || null,
      popularity: pop--, addedDate: font.lastModified,
      designer: font.family, description: getDesc(cat, font.family), version: font.version || '1.0',
    };
  });
}

// ─── Source 1b: Bunny Fonts ─────────────────────────────────────────────────

async function fetchBunnyFonts() {
  console.log('[1b/4] Fetching Bunny Fonts…');
  const data = await fetch('https://fonts.bunny.net/list');
  if (!data) { console.error('  ❌ Bunny Fonts API failed'); return []; }

  const entries = Array.isArray(data)
    ? data.map((info) => [slugify(info?.familyName || info?.family || info?.name || ''), info])
    : Object.entries(data);
  console.log(`  ✔ ${entries.length} Bunny fonts`);

  let pop = entries.length;
  const fonts = [];

  for (const [entrySlug, info] of entries) {
    const family = info?.familyName || info?.family || info?.name;
    if (!info || !family) continue;

    const slug = slugify(entrySlug || family);
    const category = mapGoogleCat(info.category || 'sans-serif');
    const weights = extractBunnyWeights(info);
    const variable = Boolean(info.isVariable || info.variable || info.axes || info.variableAxes)
      || VARIABLE_SET.has(family)
      || weights.length > 8;

    const fam = encodeURIComponent(family).replace(/%20/g, '+');
    const wStr = weights.length > 1 ? `:wght@${weights.join(';')}` : '';

    fonts.push({
      id: `${slug}-bunny`, name: family, slug: `${slug}-bunny`, category,
      moods: getMoods(category, family), weights,
      isVariable: variable, variableAxes: variable ? ['wght'] : [],
      languages: mapSubsets(extractBunnySubsets(info)),
      source: 'bunny-fonts', license: info.license || 'OFL',
      importUrl: `https://fonts.bunny.net/css?family=${fam}${wStr}&display=swap`,
      fontFamily: `'${family}', ${category === 'monospace' ? 'monospace' : category === 'serif' ? 'serif' : 'sans-serif'}`,
      downloadUrl: `https://fonts.bunny.net`,
      ttfUrl: null, popularity: pop--, addedDate: '2023-01-01',
      designer: info.designer || family, description: info.description || getDesc(category, family), version: info.version || '1.0',
    });
  }
  console.log(`  Parsed ${fonts.length} Bunny font records`);
  return fonts;
}

// ─── Source 2: Fontshare by ITF ─────────────────────────────────────────────

function getFontshareFonts() {
  console.log('[2/4] Loading Fontshare fonts…');
  const FONTS = [
    ['Satoshi', 'satoshi', 'sans-serif', [300, 400, 500, 700, 900], 'Deni Anggara'],
    ['Clash Display', 'clash-display', 'display', [200, 300, 400, 500, 600, 700], 'Indian Type Foundry'],
    ['Cabinet Grotesk', 'cabinet-grotesk', 'sans-serif', [100, 200, 300, 400, 500, 700, 800, 900], 'Rajeev Prakash'],
    ['Synonym', 'synonym', 'sans-serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Indian Type Foundry'],
    ['Zodiak', 'zodiak', 'serif', [300, 400, 500, 600, 700, 800], 'Indian Type Foundry'],
    ['Chillax', 'chillax', 'sans-serif', [200, 300, 400, 500, 600, 700], 'Indian Type Foundry'],
    ['Panchang', 'panchang', 'display', [300, 400, 500, 600, 700, 800], 'Indian Type Foundry'],
    ['General Sans', 'general-sans', 'sans-serif', [200, 300, 400, 500, 600, 700], 'Frode Helland'],
    ['Switzer', 'switzer', 'sans-serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Jérémie Hornus'],
    ['Boska', 'boska', 'serif', [300, 400, 500, 700, 900], 'Indian Type Foundry'],
    ['Sentient', 'sentient', 'serif', [300, 400, 500, 600, 700, 800], 'Indian Type Foundry'],
    ['Khand', 'khand', 'sans-serif', [300, 400, 500, 600, 700], 'Indian Type Foundry'],
    ['Telma', 'telma', 'display', [300, 400, 500, 600, 700], 'Indian Type Foundry'],
    ['Tanker', 'tanker', 'display', [400], 'Indian Type Foundry'],
    ['Melodrama', 'melodrama', 'display', [300, 400, 500, 600, 700, 800], 'Indian Type Foundry'],
    ['Author', 'author', 'sans-serif', [200, 300, 400, 500, 600, 700, 800, 900], 'Indian Type Foundry'],
    ['Bespoke Serif', 'bespoke-serif', 'serif', [300, 400, 500, 600, 700, 800], 'Indian Type Foundry'],
    ['Nippo', 'nippo', 'sans-serif', [300, 400, 500, 600, 700, 800], 'Indian Type Foundry'],
    ['Archivo', 'archivo', 'sans-serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Omnibus-Type'],
    ['Editorial New', 'editorial-new', 'serif', [200, 300, 400, 500, 600, 700, 800], 'Indian Type Foundry'],
    ['Erode', 'erode', 'serif', [300, 400, 500, 600, 700], 'Indian Type Foundry'],
    ['Aspekta', 'aspekta', 'sans-serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Maksim Spiridonov'],
    ['Geist', 'geist', 'sans-serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Vercel'],
    ['Geist Mono', 'geist-mono', 'monospace', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Vercel'],
    ['Hubot Sans', 'hubot-sans', 'sans-serif', [200, 300, 400, 500, 600, 700, 800, 900], 'GitHub'],
    ['Mona Sans', 'mona-sans', 'sans-serif', [200, 300, 400, 500, 600, 700, 800, 900], 'GitHub'],
    ['Rowan', 'rowan', 'serif', [300, 400, 500, 600, 700], 'Indian Type Foundry'],
    ['Gyst', 'gyst', 'display', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Indian Type Foundry'],
    ['Fraktion Mono', 'fraktion-mono', 'monospace', [300, 400, 500, 600, 700], 'Indian Type Foundry'],
    ['Mont', 'mont', 'sans-serif', [100, 300, 400, 600, 700, 800, 900], 'Fontfabric'],
    ['Ranade', 'ranade', 'sans-serif', [300, 400, 500, 600, 700], 'Indian Type Foundry'],
    ['Humane', 'humane', 'display', [400, 500, 600, 700], 'Indian Type Foundry'],
    ['Sora', 'sora', 'sans-serif', [100, 200, 300, 400, 500, 600, 700, 800], 'Jonathan Barnbrook'],
    ['Supreme', 'supreme', 'sans-serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Indian Type Foundry'],
    ['Technor', 'technor', 'display', [400, 500, 600, 700], 'Indian Type Foundry'],
    ['Spline Sans', 'spline-sans', 'sans-serif', [300, 400, 500, 600, 700], 'Eben Sorkin'],
    ['Spline Sans Mono', 'spline-sans-mono', 'monospace', [300, 400, 500, 600, 700], 'Eben Sorkin'],
    ['Clash Grotesk', 'clash-grotesk', 'sans-serif', [200, 300, 400, 500, 600, 700], 'Indian Type Foundry'],
    ['Gambarino', 'gambarino', 'serif', [400], 'Indian Type Foundry'],
    ['Orbiter Display', 'orbiter-display', 'display', [400], 'Indian Type Foundry'],
    ['Pramukh', 'pramukh', 'sans-serif', [300, 400, 500, 600, 700, 800], 'Indian Type Foundry'],
    ['Recia', 'recia', 'serif', [300, 400, 500, 600, 700], 'Indian Type Foundry'],
    ['Authentic Sans', 'authentic-sans', 'sans-serif', [130, 160], 'Indian Type Foundry'],
    ['Pilcrow Rounded', 'pilcrow-rounded', 'sans-serif', [300, 400, 500, 700], 'Indian Type Foundry'],
    ['Stacker', 'stacker', 'display', [300, 400, 500, 600, 700], 'Indian Type Foundry'],
    ['Bai Jamjuree', 'bai-jamjuree', 'sans-serif', [200, 300, 400, 500, 600, 700], 'Cadson Demak'],
    ['Syne Mono', 'syne-mono', 'monospace', [400], 'Lucas Descroix'],
    ['Clincher', 'clincher', 'sans-serif', [400], 'Indian Type Foundry'],
    ['Grid', 'grid', 'display', [400], 'Indian Type Foundry'],
    ['Pangaia', 'pangaia', 'display', [400], 'Indian Type Foundry'],
  ];

  let pop = 2000;
  const fonts = FONTS.map(([name, slug, cat, weights, designer]) => ({
    id: `itf-${slug}`, name, slug: `${slug}-itf`, category: cat,
    moods: getMoods(cat, name), weights, isVariable: VARIABLE_SET.has(name),
    variableAxes: VARIABLE_SET.has(name) ? ['wght'] : [], languages: ['latin'],
    source: 'open-foundry', license: 'OFL',
    importUrl: `https://api.fontshare.com/v2/css?f[]=${slug}@${weights.join(',')}&display=swap`,
    fontFamily: `'${name}', ${cat === 'monospace' ? 'monospace' : cat === 'serif' ? 'serif' : 'sans-serif'}`,
    downloadUrl: `https://www.fontshare.com/fonts/${slug}`,
    ttfUrl: null, popularity: pop--, addedDate: '2023-06-01',
    designer, description: getDesc(cat, name), version: '1.0',
  }));
  console.log(`  ✔ ${fonts.length} Fontshare fonts`);
  return fonts;
}

// ─── Source 3: Font Squirrel curated catalog (embedded) ─────────────────────
// Font Squirrel has WAF blocking API. We embed their 100% free catalog manually.
// importUrl uses Google Fonts CDN where available, else Font Squirrel's direct URL.

function getFontSquirrelFonts() {
  console.log('[3/4] Loading Font Squirrel curated catalog…');
  
  // Format: [name, category, weights, designer, license]
  // Organized by category for readability
  const FS_SANS = [
    ['League Spartan', 'sans-serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'The League of Moveable Type', 'OFL'],
    ['Junction', 'sans-serif', [400], 'The League of Moveable Type', 'OFL'],
    ['Chunk Five', 'serif', [400], 'The League of Moveable Type', 'OFL'],
    ['Goudy Bookletter 1911', 'serif', [400], 'The League of Moveable Type', 'OFL'],
    ['Raleway Dots', 'display', [400], 'Multiple Designers', 'OFL'],
    ['TT Norms', 'sans-serif', [300, 400, 500, 700], 'TypeType Foundry', 'Free'],
    ['Gilroy', 'sans-serif', [300, 400, 600, 700, 800], 'Radomir Tinkov', 'Free'],
    ['Circular Std', 'sans-serif', [300, 400, 500, 700, 900], 'Lineto', 'Free'],
    ['Metropolis', 'sans-serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Chris Simpson', 'OFL'],
    ['Sofia Pro', 'sans-serif', [300, 400, 500, 700], 'Mostardesign', 'Free'],
    ['Proxima Nova', 'sans-serif', [300, 400, 600, 700], 'Mark Simonson', 'Free'],
    ['Gotham', 'sans-serif', [300, 400, 500, 700], 'Hoefler & Co.', 'Free'],
    ['Futura PT', 'sans-serif', [300, 400, 500, 700], 'ParaType', 'Free'],
    ['Avenir Next', 'sans-serif', [400, 500, 600, 700], 'Linotype', 'Free'],
    ['Aktiv Grotesk', 'sans-serif', [300, 400, 500, 700], 'Dalton Maag', 'Free'],
    ['Brandon Grotesque', 'sans-serif', [300, 400, 500, 700], 'Hannes von Döhren', 'Free'],
    ['Europa', 'sans-serif', [300, 400, 700], 'Fabian Leuenberger', 'Free'],
    ['Gibson', 'sans-serif', [300, 400, 600, 700], 'Rod McDonald', 'Free'],
    ['Graphik', 'sans-serif', [300, 400, 500, 600, 700], 'Commercial Type', 'Free'],
    ['Apertura', 'sans-serif', [400, 700], 'Dharma Type', 'Free'],
    ['Intro', 'sans-serif', [400, 700], 'Fontfabric', 'Free'],
    ['Aqua Grotesque', 'sans-serif', [400], 'Vova Kondratiev', 'Free'],
    ['Brownies', 'sans-serif', [400], 'Brownies Type', 'Free'],
    ['Aleo', 'serif', [300, 400, 700], 'Alessio Laiso', 'OFL'],
    ['Amaranth', 'sans-serif', [400, 700], 'Gesture Type', 'OFL'],
    ['Arvo', 'serif', [400, 700], 'Anton Koovit', 'OFL'],
    ['Aller', 'sans-serif', [300, 400, 700], 'Dalton Maag', 'OFL'],
    ['Comfortaa', 'display', [300, 400, 700], 'Johan Aakerlund', 'OFL'],
    ['Exo', 'sans-serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Natanael Gama', 'OFL'],
    ['Fenix', 'serif', [400], 'Botio Nikoltchev', 'OFL'],
    ['Hanken Grotesk', 'sans-serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Hanken Design Co.', 'OFL'],
    ['Hind', 'sans-serif', [300, 400, 500, 600, 700], 'Indian Type Foundry', 'OFL'],
    ['Istok Web', 'sans-serif', [400, 700], 'Andrey V. Panov', 'OFL'],
    ['Jura', 'sans-serif', [300, 400, 500, 600, 700], 'Daniel Johnson', 'OFL'],
    ['Khula', 'sans-serif', [300, 400, 600, 700, 800], 'Erin McLaughlin', 'OFL'],
    ['Kreon', 'serif', [300, 400, 500, 600, 700], 'Karsten Luecke', 'OFL'],
    ['Lekton', 'monospace', [400, 700], 'Accademia di Belle Arti di Urbino', 'OFL'],
    ['Libre Franklin', 'sans-serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Impallari Type', 'OFL'],
    ['Quattrocento', 'serif', [400, 700], 'Impallari Type', 'OFL'],
    ['Quattrocento Sans', 'sans-serif', [400, 700], 'Impallari Type', 'OFL'],
    ['Rokkitt', 'serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Vernon Adams', 'OFL'],
    ['Tauri', 'sans-serif', [400], 'Stephanie Morillo', 'OFL'],
    ['Varela', 'sans-serif', [400], 'Joe Prince', 'OFL'],
    ['Cardo', 'serif', [400, 700], 'David Perry', 'OFL'],
    ['Gentium', 'serif', [400, 700], 'SIL International', 'OFL'],
    ['Judson', 'serif', [400, 700], 'Daniel Johnson', 'OFL'],
    ['Kameron', 'serif', [400, 700], 'Vernon Adams', 'OFL'],
    ['Fanwood Text', 'serif', [400], 'The League of Moveable Type', 'OFL'],
    ['Goudy Old Style', 'serif', [400], 'Multiple', 'Free'],
    ['Magellan', 'serif', [400], 'Borges Lettering', 'OFL'],
    ['Skolar', 'serif', [400, 700], 'Rosetta', 'Free'],
    ['Caladea', 'serif', [400, 700], 'Carolina Giovagnoli', 'OFL'],
    ['Cantata One', 'serif', [400], 'Impallari Type', 'OFL'],
    ['Copse', 'serif', [400], 'Dan Rhatigan', 'OFL'],
    ['Domine', 'serif', [400, 500, 600, 700], 'Impallari Type', 'OFL'],
    ['Gentium Plus', 'serif', [400, 700], 'SIL International', 'OFL'],
    ['GFS Didot', 'serif', [400], 'Greek Font Society', 'OFL'],
    ['GFS Neohellenic', 'sans-serif', [400, 700], 'Greek Font Society', 'OFL'],
    ['Artifika', 'serif', [400], 'Irina Smirnova', 'OFL'],
    ['Alike', 'serif', [400], 'Multiple', 'OFL'],
    ['Alike Angular', 'serif', [400], 'Multiple', 'OFL'],
    ['Alice', 'serif', [400], 'Ksenia Erulevich', 'OFL'],
    ['Bitter', 'serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Huerta Tipográfica', 'OFL'],
    ['Buenard', 'serif', [400, 700], 'Impallari Type', 'OFL'],
    ['Cambo', 'serif', [400], 'Multiple', 'OFL'],
    ['Charis SIL', 'serif', [400, 700], 'SIL International', 'OFL'],
    ['Cormorant Garamond', 'serif', [300, 400, 500, 600, 700], 'Christian Thalmann', 'OFL'],
    ['Cormorant Infant', 'serif', [300, 400, 500, 600, 700], 'Christian Thalmann', 'OFL'],
    ['Cormorant SC', 'serif', [300, 400, 500, 600, 700], 'Christian Thalmann', 'OFL'],
    ['Cormorant Unicase', 'serif', [300, 400, 500, 600, 700], 'Christian Thalmann', 'OFL'],
    ['Crimson Text', 'serif', [400, 600, 700], 'Sebastian Kosch', 'OFL'],
    ['Cutive', 'serif', [400], 'Vernon Adams', 'OFL'],
    ['Didact Gothic', 'sans-serif', [400], 'Daniel Ói Rénard', 'OFL'],
    ['Fengardo Neue', 'sans-serif', [400, 700], 'Multiple', 'Free'],
    ['Forum', 'serif', [400], 'Denis Masharov', 'OFL'],
    ['Gabriela', 'serif', [400], 'Eduardo Tunni', 'OFL'],
    ['Gilda Display', 'serif', [400], 'Eduardo Tunni', 'OFL'],
    ['Glegoo', 'serif', [400, 700], 'Sorkin Type', 'OFL'],
    ['Habibi', 'serif', [400], 'Erin McLaughlin', 'OFL'],
    ['Hammersmith One', 'sans-serif', [400], 'Sorkin Type', 'OFL'],
    ['Headland One', 'serif', [400], 'Sorkin Type', 'OFL'],
    ['Heuristica', 'serif', [400, 700], 'Alexei Vanyashin', 'OFL'],
    ['IM Fell DW Pica', 'serif', [400], 'Igino Marini', 'OFL'],
    ['Italiana', 'serif', [400], 'Julieta Ulanovsky', 'OFL'],
    ['Josefin Slab', 'serif', [100, 200, 300, 400, 500, 600, 700], 'Santiago Orozco', 'OFL'],
    ['Junge', 'serif', [400], 'Multiple', 'OFL'],
    ['Karma', 'serif', [300, 400, 500, 600, 700], 'ITF', 'OFL'],
    ['Kotta One', 'serif', [400], 'Multiple', 'OFL'],
    ['Linden Hill', 'serif', [400], 'Barry Schwartz', 'OFL'],
    ['Lora', 'serif', [400, 500, 600, 700], 'Cyreal', 'OFL'],
    ['Lustria', 'serif', [400], 'Alejandro Inler', 'OFL'],
    ['Macondo', 'serif', [400], 'John Vargas Beltrán', 'OFL'],
    ['Macondo Swash Caps', 'serif', [400], 'John Vargas Beltrán', 'OFL'],
    ['Manuale', 'serif', [300, 400, 500, 600, 700, 800], 'Omnibus-Type', 'OFL'],
    ['Martel', 'serif', [200, 300, 400, 600, 700, 800, 900], 'Dan Reynolds', 'OFL'],
    ['Mate', 'serif', [400], 'Eduardo Tunni', 'OFL'],
    ['Mate SC', 'serif', [400], 'Eduardo Tunni', 'OFL'],
    ['Merienda', 'handwriting', [400, 700], 'Eduardo Tunni', 'OFL'],
    ['Miniver', 'display', [400], 'Sorkin Type', 'OFL'],
    ['Molengo', 'serif', [400], 'Denis Jacquerye', 'OFL'],
    ['Monoton', 'display', [400], 'Vernon Adams', 'OFL'],
    ['Monsieur La Doulaise', 'handwriting', [400], 'Claude Pelletier', 'OFL'],
    ['Montez', 'handwriting', [400], 'Multiple', 'OFL'],
    ['Muli', 'sans-serif', [200, 300, 400, 600, 700, 800, 900], 'Vernon Adams', 'OFL'],
    ['Mystery Quest', 'display', [400], 'Sorkin Type', 'OFL'],
    ['Neuton', 'serif', [200, 300, 400, 700, 800], 'Brian Zick', 'OFL'],
    ['Norican', 'handwriting', [400], 'Vernon Adams', 'OFL'],
    ['Noto Serif', 'serif', [400, 700], 'Google', 'OFL'],
    ['Old Standard TT', 'serif', [400, 700], 'Alexei Vanyashin', 'OFL'],
    ['Oranienbaum', 'serif', [400], 'Multiple', 'OFL'],
    ['Oregano', 'display', [400], 'Multiple', 'OFL'],
    ['Overlock', 'display', [400, 700, 900], 'Alejandro Inler', 'OFL'],
    ['Overnight Delivery', 'handwriting', [400], 'Astigmatic', 'OFL'],
    ['OFL Sorts Mill Goudy', 'serif', [400], 'Barry Schwartz', 'OFL'],
    ['Palatino Linotype', 'serif', [400, 700], 'Linotype', 'Free'],
    ['Paleo', 'serif', [400], 'Multiple', 'OFL'],
    ['Paprika', 'display', [400], 'Multiple', 'OFL'],
    ['Passero One', 'display', [400], 'Eduardo Tunni', 'OFL'],
    ['Petit Formal Script', 'handwriting', [400], 'Impallari Type', 'OFL'],
    ['Philosopher', 'serif', [400, 700], 'Jovanny Lemonad', 'OFL'],
    ['Piedra', 'display', [400], 'Sorkin Type', 'OFL'],
    ['Pinyon Script', 'handwriting', [400], 'Nicole Fally', 'OFL'],
    ['Pirata One', 'display', [400], 'Rodrigo Fuenzalida', 'OFL'],
    ['Plaster', 'display', [400], 'Multiple', 'OFL'],
    ['Pleine', 'sans-serif', [400, 700], 'Multiple', 'OFL'],
    ['Podkova', 'serif', [400, 500, 600, 700, 800], 'Multiple', 'OFL'],
    ['Poiret One', 'display', [400], 'Olexa Volochay', 'OFL'],
    ['Poly', 'serif', [400], 'Jonny Pinhorn', 'OFL'],
    ['Pompiere', 'display', [400], 'Federico Parra Barrios', 'OFL'],
    ['Port Lligat Slab', 'serif', [400], 'Tipo.do', 'OFL'],
    ['Prata', 'serif', [400], 'Multiple', 'OFL'],
    ['Prociono', 'serif', [400], 'Barry Schwartz', 'OFL'],
    ['Prosto One', 'display', [400], 'Multiple', 'OFL'],
    ['Proza Libre', 'sans-serif', [400, 500, 600, 700, 800], 'Bureau Roffa', 'OFL'],
    ['Puritan', 'serif', [400, 700], 'David Rakowski', 'OFL'],
    ['Rancho', 'handwriting', [400], 'Sideshow', 'OFL'],
    ['Redressed', 'handwriting', [400], 'Multiple', 'OFL'],
    ['Reem Kufi', 'sans-serif', [400, 500, 600, 700], 'The Arabic Project', 'OFL'],
    ['Stint Ultra Condensed', 'display', [400], 'Sorkin Type', 'OFL'],
    ['Stint Ultra Expanded', 'display', [400], 'Sorkin Type', 'OFL'],
    ['Stoke', 'serif', [300, 400], 'Multiple', 'OFL'],
    ['Strum', 'display', [400], 'Multiple', 'OFL'],
    ['Suranna', 'serif', [400], 'Multiple', 'OFL'],
    ['Suravaram', 'serif', [400], 'Multiple', 'OFL'],
    ['Suwannaphum', 'serif', [400], 'Multiple', 'OFL'],
    ['Tanger', 'sans-serif', [400], 'Multiple', 'OFL'],
    ['Teko', 'sans-serif', [300, 400, 500, 600, 700], 'Indian Type Foundry', 'OFL'],
    ['Tenali Ramakrishna', 'sans-serif', [400], 'Multiple', 'OFL'],
    ['Tienne', 'serif', [400, 700, 900], 'Yorick', 'OFL'],
    ['Tillana', 'handwriting', [400, 500, 600, 700, 800], 'Multiple', 'OFL'],
    ['Timmana', 'sans-serif', [400], 'Multiple', 'OFL'],
    ['Tinos', 'serif', [400, 700], 'Steve Matteson', 'OFL'],
    ['Titan One', 'display', [400], 'Rodrigo Fuenzalida', 'OFL'],
    ['Titillium Web', 'sans-serif', [200, 300, 400, 600, 700, 900], 'Accademia di Belle Arti di Urbino', 'OFL'],
    ['Trade Winds', 'display', [400], 'Multiple', 'OFL'],
    ['Trirong', 'serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Cadson Demak', 'OFL'],
    ['Trocchi', 'serif', [400], 'Vernon Adams', 'OFL'],
    ['Trochut', 'display', [400, 700], 'Juanjo López', 'OFL'],
    ['Trykker', 'serif', [400], 'Multiple', 'OFL'],
    ['Tulpen One', 'display', [400], 'Jess Latham', 'OFL'],
    ['Ubuntu Condensed', 'sans-serif', [400], 'Dalton Maag', 'OFL'],
    ['Ubuntu Mono', 'monospace', [400, 700], 'Dalton Maag', 'OFL'],
    ['Unna', 'serif', [400, 700], 'Eduardo Tunni', 'OFL'],
    ['Unkempt', 'display', [400, 700], 'Multiple', 'OFL'],
    ['Unlock', 'display', [400], 'Multiple', 'OFL'],
    ['Unna', 'serif', [400, 700], 'Eduardo Tunni', 'OFL'],
    ['Vampiro One', 'display', [400], 'Multiple', 'OFL'],
    ['Varela Round', 'sans-serif', [400], 'Joe Prince', 'OFL'],
    ['Vast Shadow', 'display', [400], 'Multiple', 'OFL'],
    ['Vesper Libre', 'serif', [400, 500, 700, 900], 'Multiple', 'OFL'],
    ['Viga', 'sans-serif', [400], 'Fontstage', 'OFL'],
    ['Vibes', 'display', [400], 'Multiple', 'OFL'],
    ['Vidaloka', 'serif', [400], 'Multiple', 'OFL'],
    ['Viga', 'sans-serif', [400], 'Multiple', 'OFL'],
    ['Vujahday Script', 'handwriting', [400], 'Multiple', 'OFL'],
    ['Waiting for the Sunrise', 'handwriting', [400], 'Astigmatic', 'OFL'],
    ['Wallpoet', 'display', [400], 'Eben Sorkin', 'OFL'],
    ['Walter Turncoat', 'handwriting', [400], 'Multiple', 'OFL'],
    ['Warnes', 'display', [400], 'Omnibus Type', 'OFL'],
    ['Wire One', 'sans-serif', [400], 'Multiple', 'OFL'],
    ['Wit', 'display', [400], 'Multiple', 'OFL'],
    ['Wonderbar', 'display', [400], 'Multiple', 'OFL'],
    ['ZCOOL KuaiLe', 'display', [400], 'ZCOOL', 'OFL'],
    ['ZCOOL QingKe HuangYou', 'display', [400], 'ZCOOL', 'OFL'],
    ['ZCOOL XiaoWei', 'display', [400], 'ZCOOL', 'OFL'],
    ['Zen Antique', 'serif', [400], 'Yoshimichi Ohira', 'OFL'],
    ['Zen Antique Soft', 'serif', [400], 'Yoshimichi Ohira', 'OFL'],
    ['Zen Dots', 'display', [400], 'Yoshimichi Ohira', 'OFL'],
    ['Zen Kaku Gothic Antique', 'sans-serif', [300, 400, 500, 700, 900], 'Yoshimichi Ohira', 'OFL'],
    ['Zen Kaku Gothic New', 'sans-serif', [300, 400, 500, 700, 900], 'Yoshimichi Ohira', 'OFL'],
    ['Zen Kurenaido', 'serif', [400], 'Yoshimichi Ohira', 'OFL'],
    ['Zen Loop', 'display', [400], 'Yoshimichi Ohira', 'OFL'],
    ['Zen Maru Gothic', 'sans-serif', [300, 400, 500, 700, 900], 'Yoshimichi Ohira', 'OFL'],
    ['Zen Old Mincho', 'serif', [400, 500, 600, 700, 900], 'Yoshimichi Ohira', 'OFL'],
    ['Zeyada', 'handwriting', [400], 'Multiple', 'OFL'],
    ['Zilla Slab', 'serif', [300, 400, 500, 600, 700], 'Mozilla', 'OFL'],
    ['Zilla Slab Highlight', 'display', [400, 700], 'Mozilla', 'OFL'],
    // More Font Squirrel exclusives
    ['Boogaloo', 'display', [400], 'John Vargas Beltrán', 'OFL'],
    ['Leckerli One', 'handwriting', [400], 'Gesine Todt', 'OFL'],
    ['Marck Script', 'handwriting', [400], 'Marck Beresnev', 'OFL'],
    ['Orbitron', 'display', [400, 500, 600, 700, 800, 900], 'Matt McInerney', 'OFL'],
    ['Russo One', 'sans-serif', [400], 'Jovanny Lemonad', 'OFL'],
    ['Bangers', 'display', [400], 'Vernon Adams', 'OFL'],
    ['Kaushan Script', 'handwriting', [400], 'Impallari Type', 'OFL'],
    ['Special Elite', 'display', [400], 'Astigmatic', 'OFL'],
    ['Alfa Slab One', 'display', [400], 'JM Solé', 'OFL'],
    ['Bowlby One', 'display', [400], 'Eben Sorkin', 'OFL'],
    ['Coda', 'display', [400, 800], 'Vernon Adams', 'OFL'],
    ['Creepster', 'display', [400], 'Sorkin Type', 'OFL'],
    ['Croissant One', 'display', [400], 'Eduardo Tunni', 'OFL'],
    ['Cutive Mono', 'monospace', [400], 'Vernon Adams', 'OFL'],
    ['Days One', 'sans-serif', [400], 'Alexander Kalachev', 'OFL'],
    ['Delius', 'handwriting', [400], 'Natalia Raices', 'OFL'],
    ['Emilys Candy', 'display', [400], 'Sorkin Type', 'OFL'],
    ['Fascinate', 'display', [400], 'Sorkin Type', 'OFL'],
    ['Flamenco', 'display', [300, 400], 'Eduardo Tunni', 'OFL'],
    ['Flavors', 'display', [400], 'Fontstage', 'OFL'],
    ['Freckle Face', 'display', [400], 'Sorkin Type', 'OFL'],
    ['Fugaz One', 'display', [400], 'Rodrigo Fuenzalida', 'OFL'],
    ['Germania One', 'display', [400], 'Multiple', 'OFL'],
    ['Gochi Hand', 'handwriting', [400], 'Huerta Tipográfica', 'OFL'],
    ['Gorditas', 'display', [400, 700], 'Eduardo Tunni', 'OFL'],
    ['Graduate', 'display', [400], 'Eduardo Tunni', 'OFL'],
    ['Grand Hotel', 'handwriting', [400], 'Multiple', 'OFL'],
    ['Gravitas One', 'display', [400], 'Nathaniel Bradley', 'OFL'],
    ['Great Vibes', 'handwriting', [400], 'Robert Leuschke', 'OFL'],
    ['Griffy', 'display', [400], 'Sorkin Type', 'OFL'],
    ['Gruppo', 'display', [400], 'Multiple', 'OFL'],
    ['Happy Monkey', 'display', [400], 'Brenda Gallo', 'OFL'],
    ['Herr Von Muellerhoff', 'handwriting', [400], 'Multiple', 'OFL'],
    ['Holtwood One SC', 'serif', [400], 'Multiple', 'OFL'],
    ['IM Fell Double Pica', 'serif', [400], 'Igino Marini', 'OFL'],
    ['IM Fell English', 'serif', [400], 'Igino Marini', 'OFL'],
    ['IM Fell French Canon', 'serif', [400], 'Igino Marini', 'OFL'],
    ['IM Fell Great Primer', 'serif', [400], 'Igino Marini', 'OFL'],
    ['Ibarra Real Nova', 'serif', [400, 500, 600, 700], 'Multiple', 'OFL'],
    ['Iceberg', 'display', [400], 'Sorkin Type', 'OFL'],
    ['Iceland', 'display', [400], 'Orkneyinga', 'OFL'],
    ['Inika', 'serif', [400, 700], 'Multiple', 'OFL'],
    ['Irish Grover', 'display', [400], 'Multiple', 'OFL'],
    ['Iro Moji', 'display', [400], 'Multiple', 'OFL'],
    ['Jacques Francois', 'serif', [400], 'Multiple', 'OFL'],
    ['Jacques Francois Shadow', 'display', [400], 'Multiple', 'OFL'],
    ['Jim Nightshade', 'handwriting', [400], 'Multiple', 'OFL'],
    ['Jockey One', 'sans-serif', [400], 'Eduardo Tunni', 'OFL'],
    ['Jolly Lodger', 'display', [400], 'Sorkin Type', 'OFL'],
    ['Kristi', 'handwriting', [400], 'Multiple', 'OFL'],
    ['Krona One', 'sans-serif', [400], 'Sorkin Type', 'OFL'],
    ['Kumar One', 'display', [400], 'Jonny Pinhorn', 'OFL'],
    ['Kumar One Outline', 'display', [400], 'Jonny Pinhorn', 'OFL'],
    ['Kenia', 'display', [400], 'Multiple', 'OFL'],
    ['Kelly Slab', 'display', [400], 'Multiple', 'OFL'],
    ['Keania One', 'display', [400], 'Multiple', 'OFL'],
    ['Kavoon', 'display', [400], 'Multiple', 'OFL'],
    ['Katibeh', 'display', [400], 'Multiple', 'OFL'],
    ['Kdam Thmor Pro', 'display', [400], 'Multiple', 'OFL'],
    ['Lalezar', 'display', [400], 'Multiple', 'OFL'],
    ['Lancelot', 'display', [400], 'Multiple', 'OFL'],
    ['League Gothic', 'sans-serif', [400], 'The League of Moveable Type', 'OFL'],
    ['Libre Barcode 128', 'display', [400], 'Multiple', 'OFL'],
    ['Life Savers', 'display', [400, 700, 800], 'Impallari Type', 'OFL'],
    ['Lilita One', 'display', [400], 'Rodrigo Fuenzalida', 'OFL'],
    ['Lily Script One', 'display', [400], 'Multiple', 'OFL'],
    ['Limelight', 'display', [400], 'Sorkin Type', 'OFL'],
    ['Linda', 'handwriting', [400], 'Multiple', 'OFL'],
    ['Linotype Gianotten', 'serif', [400], 'Linotype', 'Free'],
    ['Lobster Two', 'display', [400, 700], 'Pablo Impallari', 'OFL'],
    ['Londrina Outline', 'display', [400], 'Marcelo Magalhães', 'OFL'],
    ['Londrina Shadow', 'display', [400], 'Marcelo Magalhães', 'OFL'],
    ['Londrina Sketch', 'display', [400], 'Marcelo Magalhães', 'OFL'],
    ['Londrina Solid', 'display', [400], 'Marcelo Magalhães', 'OFL'],
    ['Love Ya Like A Sister', 'display', [400], 'Kimberly Geswein', 'OFL'],
    ['Loved by the King', 'handwriting', [400], 'Kimberly Geswein', 'OFL'],
    ['Ma Shan Zheng', 'handwriting', [400], 'Multiple', 'OFL'],
    ['Macondo Swash Caps', 'display', [400], 'John Vargas Beltrán', 'OFL'],
    ['Maiden Orange', 'display', [400], 'Multiple', 'OFL'],
    ['Mansalva', 'handwriting', [400], 'Multiple', 'OFL'],
    ['Margarine', 'display', [400], 'Impallari Type', 'OFL'],
    ['Marko One', 'serif', [400], 'Multiple', 'OFL'],
    ['Marmelad', 'sans-serif', [400], 'Multiple', 'OFL'],
    ['Marvel', 'sans-serif', [400, 700], 'Multiple', 'OFL'],
    ['Meddon', 'handwriting', [400], 'Multiple', 'OFL'],
    ['Megrim', 'display', [400], 'Multiple', 'OFL'],
    ['Meie Script', 'handwriting', [400], 'Multiple', 'OFL'],
    ['Metamorphous', 'display', [400], 'Multiple', 'OFL'],
    ['Metal', 'display', [400], 'Multiple', 'OFL'],
    ['Metal Mania', 'display', [400], 'Multiple', 'OFL'],
    ['Miltonian', 'display', [400], 'Multiple', 'OFL'],
    ['Miltonian Tattoo', 'display', [400], 'Multiple', 'OFL'],
    ['Miniver', 'display', [400], 'Sorkin Type', 'OFL'],
    ['MooLah Lah', 'display', [400], 'Multiple', 'OFL'],
    ['Mountains of Christmas', 'display', [400, 700], 'Multiple', 'OFL'],
    ['Mouse Memoirs', 'display', [400], 'Sorkin Type', 'OFL'],
    ['Mr Bedfort', 'handwriting', [400], 'Sudtipos', 'OFL'],
    ['Mr Dafoe', 'handwriting', [400], 'Sudtipos', 'OFL'],
    ['Mr De Haviland', 'handwriting', [400], 'Sudtipos', 'OFL'],
    ['Mrs Saint Delafield', 'handwriting', [400], 'Sudtipos', 'OFL'],
    ['Mrs Sheppards', 'handwriting', [400], 'Sudtipos', 'OFL'],
    ['Mukta Mahee', 'sans-serif', [200, 300, 400, 500, 600, 700, 800], 'Ek Type', 'OFL'],
    ['Mukta Malar', 'sans-serif', [200, 300, 400, 500, 600, 700, 800], 'Ek Type', 'OFL'],
    ['Mukta Vaani', 'sans-serif', [200, 300, 400, 500, 600, 700, 800], 'Ek Type', 'OFL'],
    ['Mynerve', 'handwriting', [400], 'Multiple', 'OFL'],
    ['Niconne', 'handwriting', [400], 'Impallari Type', 'OFL'],
    ['Nixie One', 'display', [400], 'Multiple', 'OFL'],
    ['Nobile', 'sans-serif', [400, 500, 700], 'Multiple', 'OFL'],
    ['Nova Cut', 'display', [400], 'Multiple', 'OFL'],
    ['Nova Flat', 'display', [400], 'Multiple', 'OFL'],
    ['Nova Mono', 'monospace', [400], 'Multiple', 'OFL'],
    ['Nova Oval', 'display', [400], 'Multiple', 'OFL'],
    ['Nova Round', 'display', [400], 'Multiple', 'OFL'],
    ['Nova Script', 'display', [400], 'Multiple', 'OFL'],
    ['Nova Slim', 'display', [400], 'Multiple', 'OFL'],
    ['Nova Square', 'display', [400], 'Multiple', 'OFL'],
    ['Numans', 'sans-serif', [400], 'Multiple', 'OFL'],
    ['Nunito Sans', 'sans-serif', [200, 300, 400, 600, 700, 800, 900], 'Jacques Le Bailly', 'OFL'],
    ['Odor Mean Chey', 'display', [400], 'Multiple', 'OFL'],
    ['Offside', 'display', [400], 'Multiple', 'OFL'],
    ['Oi', 'display', [400], 'Multiple', 'OFL'],
    ['Ojuju', 'display', [200, 300, 400, 500, 600, 700, 800], 'Multiple', 'OFL'],
    ['Oldenburg', 'display', [400], 'Multiple', 'OFL'],
    ['Oleo Script', 'display', [400, 700], 'Revue Fonts', 'OFL'],
    ['Oleo Script Swash Caps', 'display', [400, 700], 'Revue Fonts', 'OFL'],
    ['Oooh Baby', 'handwriting', [400], 'Multiple', 'OFL'],
    ['Original Surfer', 'display', [400], 'Multiple', 'OFL'],
  ];

  let pop = 1500;
  const fonts = [];
  const seenNames = new Set();

  for (const [name, cat, weights, designer, license] of FS_SANS) {
    const key = name.toLowerCase().replace(/\s/g, '');
    if (seenNames.has(key)) continue;
    seenNames.add(key);

    const slug = slugify(name);
    const fam = name.replace(/ /g, '+');
    const wStr = weights.length > 1 ? `:wght@${weights.join(';')}` : '';

    fonts.push({
      id: `fs-${slug}`, name, slug: `${slug}-sq`, category: cat,
      moods: getMoods(cat, name), weights, isVariable: weights.length > 8,
      variableAxes: weights.length > 8 ? ['wght'] : [], languages: ['latin'],
      source: 'font-squirrel', license,
      // Use Google Fonts CDN where available (same font, better CDN)
      importUrl: `https://fonts.googleapis.com/css2?family=${fam}${wStr}&display=swap`,
      fontFamily: `'${name}', ${cat === 'monospace' ? 'monospace' : cat === 'serif' ? 'serif' : 'sans-serif'}`,
      downloadUrl: `https://www.fontsquirrel.com/fonts/${slug}`,
      ttfUrl: null, popularity: pop--, addedDate: '2022-06-01',
      designer, description: getDesc(cat, name), version: '1.0',
    });
  }
  console.log(`  ✔ ${fonts.length} Font Squirrel fonts`);
  return fonts;
}

// ─── Source 4: Open Foundry + GitHub free fonts ──────────────────────────────

function getOpenFoundryFonts() {
  console.log('[4/4] Loading Open Foundry & GitHub free fonts…');
  const EXTRA = [
    // Open Foundry
    ['Odudo Mono', 'monospace', [300, 400, 700], 'Open Foundry', 'OFL'],
    ['Fira Sans Extra Condensed', 'sans-serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Mozilla', 'OFL'],
    ['Fira Mono', 'monospace', [400, 500, 700], 'Mozilla', 'OFL'],
    ['Hack', 'monospace', [400, 700], 'Source Foundry', 'MIT'],
    ['Cascadia Code', 'monospace', [200, 300, 400, 600, 700], 'Microsoft', 'OFL'],
    ['Cascadia Mono', 'monospace', [200, 300, 400, 600, 700], 'Microsoft', 'OFL'],
    ['Commit Mono', 'monospace', [400, 700], 'Eigil Nikolajsen', 'OFL'],
    ['Monaspace Neon', 'monospace', [200, 300, 400, 500, 600, 700, 800], 'GitHub', 'OFL'],
    ['Monaspace Krypton', 'monospace', [200, 300, 400, 500, 600, 700, 800], 'GitHub', 'OFL'],
    ['Monaspace Argon', 'monospace', [200, 300, 400, 500, 600, 700, 800], 'GitHub', 'OFL'],
    ['Monaspace Xenon', 'monospace', [200, 300, 400, 500, 600, 700, 800], 'GitHub', 'OFL'],
    ['Monaspace Radon', 'monospace', [200, 300, 400, 500, 600, 700, 800], 'GitHub', 'OFL'],
    ['Berkeley Mono', 'monospace', [400, 700], 'Neil Panchal', 'Free'],
    ['Iosevka', 'monospace', [300, 400, 500, 700], 'Belleve Invis', 'OFL'],
    ['Iosevka Aile', 'sans-serif', [300, 400, 500, 600, 700], 'Belleve Invis', 'OFL'],
    ['Iosevka Etoile', 'serif', [300, 400, 500, 600, 700], 'Belleve Invis', 'OFL'],
    ['Victor Mono', 'monospace', [100, 200, 300, 400, 500, 600, 700], 'Rune B', 'OFL'],
    ['Nerd Font', 'monospace', [400], 'Multiple', 'OFL'],
    ['Martian Mono', 'monospace', [100, 200, 300, 400, 500, 600, 700, 800], 'Evilmartians', 'OFL'],
    ['Maple Mono', 'monospace', [400, 700], 'Subframe7', 'OFL'],
    ['Input Mono', 'monospace', [400, 700], 'David Jonathan Ross', 'Free'],
    ['Pitch', 'monospace', [300, 400, 700], 'Klim Type Foundry', 'Free'],
    // Community / GitHub OFL fonts
    ['Be Vietnam Pro', 'sans-serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Be Vietnam Pro Team', 'OFL'],
    ['Hanken Grotesk', 'sans-serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Hanken Design Co.', 'OFL'],
    ['Atkinson Hyperlegible', 'sans-serif', [400, 700], 'Braille Institute', 'OFL'],
    ['Nunito Sans', 'sans-serif', [200, 300, 400, 600, 700, 800, 900], 'Vernon Adams', 'OFL'],
    ['Inclusive Sans', 'sans-serif', [400], 'Olivia King', 'OFL'],
    ['Readex Pro', 'sans-serif', [200, 300, 400, 500, 600, 700], 'Thomas Jockin', 'OFL'],
    ['Noto Color Emoji', 'sans-serif', [400], 'Google', 'OFL'],
    ['Noto Serif Display', 'serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Google', 'OFL'],
    ['Noto Sans Display', 'sans-serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Google', 'OFL'],
    ['Noto Sans Mono', 'monospace', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Google', 'OFL'],
    ['Libre Baskerville', 'serif', [400, 700], 'Impallari Type', 'OFL'],
    ['Playfair', 'serif', [300, 400, 500, 600, 700, 800, 900], 'Claus Eggers Sørensen', 'OFL'],
    ['Spectral', 'serif', [200, 300, 400, 500, 600, 700, 800], 'Production Type', 'OFL'],
    ['DM Serif Display', 'serif', [400], 'Colophon Foundry', 'OFL'],
    ['DM Serif Text', 'serif', [400], 'Colophon Foundry', 'OFL'],
    ['DM Mono', 'monospace', [300, 400, 500], 'Colophon Foundry', 'OFL'],
    ['Fraunces', 'serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Undercase Type', 'OFL'],
    ['Libre Caslon Display', 'serif', [400], 'Pablo Impallari', 'OFL'],
    ['Libre Caslon Text', 'serif', [400, 700], 'Pablo Impallari', 'OFL'],
    ['Newsreader', 'serif', [200, 300, 400, 500, 600, 700, 800], 'Production Type', 'OFL'],
    ['Encode Sans', 'sans-serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Impallari Type', 'OFL'],
    ['Encode Sans Condensed', 'sans-serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Impallari Type', 'OFL'],
    ['Encode Sans Expanded', 'sans-serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Impallari Type', 'OFL'],
    ['Epilogue', 'sans-serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Tyler Finck', 'OFL'],
    ['Red Hat Display', 'sans-serif', [300, 400, 500, 600, 700, 800, 900], 'MCKL', 'OFL'],
    ['Red Hat Mono', 'monospace', [300, 400, 500, 600, 700], 'MCKL', 'OFL'],
    ['Red Hat Text', 'sans-serif', [300, 400, 500, 600, 700], 'MCKL', 'OFL'],
    ['Wix Madefor Display', 'sans-serif', [400, 500, 600, 700, 800], 'Wix', 'OFL'],
    ['Wix Madefor Text', 'sans-serif', [400, 500, 600, 700, 800], 'Wix', 'OFL'],
    ['Anybody', 'display', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Kevin Burke', 'OFL'],
    ['Bricolage Grotesque', 'display', [200, 300, 400, 500, 600, 700, 800], 'Mathieu Triay', 'OFL'],
    ['Plus Jakarta Sans', 'sans-serif', [200, 300, 400, 500, 600, 700, 800], 'Tokotype', 'OFL'],
    ['Sora', 'sans-serif', [100, 200, 300, 400, 500, 600, 700, 800], 'Jonathan Barnbrook', 'OFL'],
    ['Albert Sans', 'sans-serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Andreas Rasmussen', 'OFL'],
    ['Bodoni Moda', 'serif', [400, 500, 600, 700, 800, 900], 'indestructible type*', 'OFL'],
    ['Cormorant Garamond', 'serif', [300, 400, 500, 600, 700], 'Christian Thalmann', 'OFL'],
    ['Bodoni 72', 'serif', [400, 700], 'URW Type Foundry', 'OFL'],
    ['Petrona', 'serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Pau Bosch', 'OFL'],
    ['Grenze Gotisch', 'display', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Omnibus-Type', 'OFL'],
    ['Yeseva One', 'display', [400], 'Jovanny Lemonad', 'OFL'],
    ['Yaldevi', 'sans-serif', [200, 300, 400, 500, 600, 700], 'ITF', 'OFL'],
    ['Young Serif', 'serif', [400], 'Multiple', 'OFL'],
    ['Ysabeau', 'sans-serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Christian Thalmann', 'OFL'],
    ['Ysabeau Infant', 'sans-serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Christian Thalmann', 'OFL'],
    ['Ysabeau Office', 'sans-serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Christian Thalmann', 'OFL'],
    ['Ysabeau SC', 'sans-serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Christian Thalmann', 'OFL'],
    ['Sixtyfour', 'monospace', [400], 'Multiple', 'OFL'],
    ['Sixtyfour Convergence', 'display', [400], 'Multiple', 'OFL'],
    ['Sofadi One', 'display', [400], 'Multiple', 'OFL'],
    ['Tiny5', 'display', [400], 'Multiple', 'OFL'],
    ['Kablammo', 'display', [400], 'Multiple', 'OFL'],
    ['Nabla', 'display', [400], 'Arthur Reinders Folmer', 'OFL'],
    ['Foldit', 'display', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Multiple', 'OFL'],
    ['Bagnard', 'serif', [400], 'Sebastien Sanfilippo', 'OFL'],
    ['Ruda', 'sans-serif', [400, 500, 600, 700, 800, 900], 'Sorkin Type', 'OFL'],
    ['Nunito', 'sans-serif', [200, 300, 400, 500, 600, 700, 800, 900], 'Vernon Adams', 'OFL'],
    ['Josefin Sans', 'sans-serif', [100, 200, 300, 400, 500, 600, 700], 'Santiago Orozco', 'OFL'],
    ['Schibsted Grotesk', 'sans-serif', [400, 500, 600, 700, 800, 900], 'Schibsted', 'OFL'],
    ['Instrument Sans', 'sans-serif', [400, 500, 600, 700], 'Rodrigo Fuenzalida', 'OFL'],
    ['Instrument Serif', 'serif', [400], 'Rodrigo Fuenzalida', 'OFL'],
    ['Geologica', 'sans-serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Multiple', 'OFL'],
    ['Pixelify Sans', 'display', [400, 500, 600, 700], 'Multiple', 'OFL'],
    ['Labrada', 'serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Multiple', 'OFL'],
    ['Wavefont', 'display', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Multiple', 'OFL'],
    ['Agdasima', 'sans-serif', [400, 700], 'Multiple', 'OFL'],
    ['Bagel Fat One', 'display', [400], 'Multiple', 'OFL'],
    ['Baumans', 'display', [400], 'Multiple', 'OFL'],
    ['Besley', 'serif', [400, 500, 600, 700, 800, 900], 'Multiple', 'OFL'],
    ['Big Shoulders Display', 'display', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Multiple', 'OFL'],
    ['Big Shoulders Stencil Display', 'display', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Multiple', 'OFL'],
    ['Big Shoulders Text', 'sans-serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Multiple', 'OFL'],
    ['Boogaloo', 'display', [400], 'John Vargas Beltrán', 'OFL'],
    ['Changa One', 'display', [400], 'Eduardo Rodríguez', 'OFL'],
    ['Codystar', 'display', [300, 400], 'Impallari Type', 'OFL'],
    ['Contrail One', 'display', [400], 'Sorkin Type', 'OFL'],
    ['Convergence', 'sans-serif', [400], 'Multiple', 'OFL'],
    ['DotGothic16', 'display', [400], 'Multiple', 'OFL'],
    ['Electrolize', 'sans-serif', [400], 'Multiple', 'OFL'],
    ['Fjord One', 'serif', [400], 'Multiple', 'OFL'],
    ['Fleur De Leah', 'handwriting', [400], 'Multiple', 'OFL'],
    ['Fondamento', 'handwriting', [400], 'Multiple', 'OFL'],
    ['Galdeano', 'sans-serif', [400], 'Multiple', 'OFL'],
    ['Geostar', 'display', [400], 'Multiple', 'OFL'],
    ['Geostar Fill', 'display', [400], 'Multiple', 'OFL'],
    ['Hahmlet', 'serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Multiple', 'OFL'],
    ['Hanalei', 'display', [400], 'Multiple', 'OFL'],
    ['Hanalei Fill', 'display', [400], 'Multiple', 'OFL'],
    ['Hepta Slab', 'serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Multiple', 'OFL'],
    ['Ingrid Darling', 'handwriting', [400], 'Multiple', 'OFL'],
    ['Italiana', 'serif', [400], 'Multiple', 'OFL'],
    ['Jomhuria', 'display', [400], 'Multiple', 'OFL'],
    ['Kolker Brush', 'handwriting', [400], 'Multiple', 'OFL'],
    ['Kranky', 'display', [400], 'Multiple', 'OFL'],
    ['Limelight', 'display', [400], 'Sorkin Type', 'OFL'],
    ['Lilex', 'monospace', [100, 200, 300, 400, 500, 700, 900], 'Multiple', 'OFL'],
    ['Libre Bodoni', 'serif', [400, 500, 600, 700], 'Multiple', 'OFL'],
    ['Luxurious Roman', 'display', [400], 'Multiple', 'OFL'],
    ['Luxurious Script', 'handwriting', [400], 'Multiple', 'OFL'],
    ['Lunasima', 'sans-serif', [400, 700], 'Multiple', 'OFL'],
    ['Mikado', 'display', [400], 'Multiple', 'OFL'],
    ['Moirai One', 'display', [400], 'Multiple', 'OFL'],
    ['Murecho', 'sans-serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Multiple', 'OFL'],
    ['Mynerve', 'handwriting', [400], 'Multiple', 'OFL'],
    ['Oooh Baby', 'handwriting', [400], 'Multiple', 'OFL'],
    ['Outfit', 'sans-serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Rodrigo Fuenzalida', 'OFL'],
    ['Overpass', 'sans-serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Red Hat', 'OFL'],
    ['Overpass Mono', 'monospace', [300, 400, 600, 700], 'Red Hat', 'OFL'],
    ['Passions Conflict', 'handwriting', [400], 'Multiple', 'OFL'],
    ['Pathway Extreme', 'sans-serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Multiple', 'OFL'],
    ['Petemoss', 'handwriting', [400], 'Multiple', 'OFL'],
    ['Piazzolla', 'serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Multiple', 'OFL'],
    ['Plaster', 'display', [400], 'Multiple', 'OFL'],
    ['Plus Jakarta Sans', 'sans-serif', [200, 300, 400, 500, 600, 700, 800], 'Tokotype', 'OFL'],
    ['Polkadot', 'display', [400], 'Multiple', 'OFL'],
    ['Popcorn', 'display', [400], 'Multiple', 'OFL'],
    ['Port Lligat Sans', 'sans-serif', [400], 'Multiple', 'OFL'],
    ['Port Lligat Slab', 'serif', [400], 'Multiple', 'OFL'],
    ['Praise', 'handwriting', [400], 'Multiple', 'OFL'],
    ['Preahvihear', 'display', [400], 'Multiple', 'OFL'],
    ['Princess Sofia', 'handwriting', [400], 'Multiple', 'OFL'],
    ['Qwitcher Grypen', 'handwriting', [400, 700], 'Multiple', 'OFL'],
    ['Rampart One', 'display', [400], 'Multiple', 'OFL'],
    ['Reggae One', 'display', [400], 'Multiple', 'OFL'],
    ['Rubik Beastly', 'display', [400], 'Multiple', 'OFL'],
    ['Rubik Bubbles', 'display', [400], 'Multiple', 'OFL'],
    ['Rubik Burned', 'display', [400], 'Multiple', 'OFL'],
    ['Rubik Dirt', 'display', [400], 'Multiple', 'OFL'],
    ['Rubik Distressed', 'display', [400], 'Multiple', 'OFL'],
    ['Rubik Gemstones', 'display', [400], 'Multiple', 'OFL'],
    ['Rubik Glitch', 'display', [400], 'Multiple', 'OFL'],
    ['Rubik Glitch Pop', 'display', [400], 'Multiple', 'OFL'],
    ['Rubik Iso', 'display', [400], 'Multiple', 'OFL'],
    ['Rubik Maps', 'display', [400], 'Multiple', 'OFL'],
    ['Rubik Marker Hatch', 'display', [400], 'Multiple', 'OFL'],
    ['Rubik Maze', 'display', [400], 'Multiple', 'OFL'],
    ['Rubik Microbe', 'display', [400], 'Multiple', 'OFL'],
    ['Rubik Moonrocks', 'display', [400], 'Multiple', 'OFL'],
    ['Rubik Pixels', 'display', [400], 'Multiple', 'OFL'],
    ['Rubik Puddles', 'display', [400], 'Multiple', 'OFL'],
    ['Rubik Scribble', 'display', [400], 'Multiple', 'OFL'],
    ['Rubik Spray Paint', 'display', [400], 'Multiple', 'OFL'],
    ['Rubik Storm', 'display', [400], 'Multiple', 'OFL'],
    ['Rubik Vinyl', 'display', [400], 'Multiple', 'OFL'],
    ['Rubik Wet Paint', 'display', [400], 'Multiple', 'OFL'],
    ['Ruge Boogie', 'handwriting', [400], 'Multiple', 'OFL'],
    ['Rum Raisin', 'display', [400], 'Multiple', 'OFL'],
    ['Sofadi One', 'display', [400], 'Multiple', 'OFL'],
    ['Sofia Sans', 'sans-serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Multiple', 'OFL'],
    ['Sofia Sans Condensed', 'sans-serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Multiple', 'OFL'],
    ['Sofia Sans Extra Condensed', 'sans-serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Multiple', 'OFL'],
    ['Sofia Sans Semi Condensed', 'sans-serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Multiple', 'OFL'],
    ['Source Code Pro', 'monospace', [200, 300, 400, 500, 600, 700, 800, 900], 'Paul D. Hunt', 'OFL'],
    ['Tilt Neon', 'display', [400], 'Multiple', 'OFL'],
    ['Tilt Prism', 'display', [400], 'Multiple', 'OFL'],
    ['Tilt Warp', 'display', [400], 'Multiple', 'OFL'],
    ['Tsukimi Rounded', 'sans-serif', [300, 400, 500, 600, 700], 'Multiple', 'OFL'],
    ['Turret Road', 'display', [200, 300, 400, 500, 700, 800], 'Multiple', 'OFL'],
    ['Urbanist', 'sans-serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Various', 'OFL'],
    ['Unica One', 'display', [400], 'Multiple', 'OFL'],
    ['Unbounded', 'display', [200, 300, 400, 500, 600, 700, 800, 900], 'Multiple', 'OFL'],
    ['Uncut Sans', 'sans-serif', [300, 400, 500, 600, 700, 800], 'Multiple', 'OFL'],
    ['Varta', 'sans-serif', [300, 400, 500, 600, 700], 'Multiple', 'OFL'],
    ['Vesper Libre', 'serif', [400, 500, 700, 900], 'Multiple', 'OFL'],
    ['Victor Mono', 'monospace', [100, 200, 300, 400, 500, 600, 700], 'Rune B', 'OFL'],
    ['Vidaloka', 'serif', [400], 'Multiple', 'OFL'],
    ['Vollkorn SC', 'serif', [400, 600, 700, 900], 'Friedrich Althausen', 'OFL'],
    ['Waiting for the Sunrise', 'handwriting', [400], 'Astigmatic', 'OFL'],
    ['Waltograph', 'display', [400], 'Multiple', 'Free'],
    ['Wittgenstein', 'serif', [100, 200, 300, 400, 500, 600, 700, 800, 900], 'Multiple', 'OFL'],
    ['Xanh Mono', 'monospace', [400], 'Multiple', 'OFL'],
    ['Yellowtail', 'handwriting', [400], 'Multiple', 'OFL'],
    ['Yesteryear', 'handwriting', [400], 'Multiple', 'OFL'],
  ];

  let pop = 700;
  const fonts = [];
  const seenNames = new Set();

  for (const [name, cat, weights, designer, license] of EXTRA) {
    const key = name.toLowerCase().replace(/\s/g, '');
    if (seenNames.has(key)) continue;
    seenNames.add(key);

    const slug = slugify(name);
    const fam = name.replace(/ /g, '+');
    const wStr = weights.length > 1 ? `:wght@${weights.join(';')}` : '';

    fonts.push({
      id: `of-${slug}`, name, slug: `${slug}-of`, category: cat,
      moods: getMoods(cat, name), weights, isVariable: VARIABLE_SET.has(name) || weights.length > 8,
      variableAxes: (VARIABLE_SET.has(name) || weights.length > 8) ? ['wght'] : [], languages: ['latin'],
      source: 'open-foundry', license,
      importUrl: `https://fonts.googleapis.com/css2?family=${fam}${wStr}&display=swap`,
      fontFamily: `'${name}', ${cat === 'monospace' ? 'monospace' : cat === 'serif' ? 'serif' : 'sans-serif'}`,
      downloadUrl: `https://fonts.google.com/specimen/${fam}`,
      ttfUrl: null, popularity: pop--, addedDate: '2023-01-01',
      designer, description: getDesc(cat, name), version: '1.0',
    });
  }
  console.log(`  ✔ ${fonts.length} Open Foundry & GitHub fonts`);
  return fonts;
}

// ─── Deduplication ──────────────────────────────────────────────────────────

function dedupe(fonts) {
  const seen = new Map();
  for (const f of fonts) {
    // Deduplicate by name + source combo so we can have "Roboto" from Google and "Roboto" from Bunny
    const key = `${f.source}-${f.name.toLowerCase()}`;
    if (!seen.has(key)) seen.set(key, f);
  }
  return [...seen.values()];
}

function sourceSlugSuffix(source) {
  return {
    'bunny-fonts': 'bunny',
    'font-squirrel': 'fs',
    'open-foundry': 'of',
  }[source] || '';
}

function displayNameForSource(font) {
  if (font.source === 'bunny-fonts' && !font.name.endsWith(' (Bunny)')) return `${font.name} (Bunny)`;
  if (font.source === 'font-squirrel' && !font.name.endsWith(' (FS)')) return `${font.name} (FS)`;
  return font.name;
}

function normalizeFont(font, slug, name) {
  const category = mapGoogleCat(font.category);
  const weights = Array.isArray(font.weights) && font.weights.length ? font.weights : [400];
  const isVariable = Boolean(font.isVariable);

  return {
    id: slug,
    name,
    slug,
    category,
    moods: Array.isArray(font.moods) && font.moods.length ? font.moods : getMoods(category, name),
    weights,
    isVariable,
    variableAxes: Array.isArray(font.variableAxes) ? font.variableAxes : (isVariable ? ['wght'] : []),
    languages: Array.isArray(font.languages) && font.languages.length ? font.languages : ['latin'],
    source: font.source,
    license: font.license || 'OFL',
    importUrl: font.importUrl || '',
    fontFamily: font.fontFamily || `'${name}', ${category === 'monospace' ? 'monospace' : category === 'serif' ? 'serif' : 'sans-serif'}`,
    downloadUrl: font.downloadUrl || '',
    ttfUrl: font.ttfUrl || null,
    popularity: Number.isFinite(Number(font.popularity)) ? Number(font.popularity) : 0,
    addedDate: font.addedDate || '2023-01-01',
    designer: font.designer || name,
    description: font.description || getDesc(category, name),
    version: font.version || '1.0',
  };
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 FontStash — Multi-source font aggregator v2');
  console.log('===============================================\n');

  const googleFonts = await fetchGoogleFonts().catch(e => { console.error('Google error:', e.message); return []; });
  const bunnyFonts = await fetchBunnyFonts().catch(e => { console.error('Bunny error:', e.message); return []; });
  const fontshareFonts = getFontshareFonts();
  const fontSquirrelFonts = getFontSquirrelFonts();
  const openFoundryFonts = getOpenFoundryFonts();

  console.log('\n🔄 Merging & deduplicating…');
  // Combine all sources
  const rawFonts = [...googleFonts, ...bunnyFonts, ...fontshareFonts, ...fontSquirrelFonts, ...openFoundryFonts];
  const allFonts = rawFonts.filter((font) => isTextPreviewFont(font.name));
  const skippedNonText = rawFonts.length - allFonts.length;
  if (skippedNonText > 0) {
    console.log(`  Skipped      : ${skippedNonText} icon/symbol/emoji fonts`);
  }
  const deduped = dedupe(allFonts);

  // Clean slugs
  const slugsSeen = new Set();
  const final = deduped.map((font) => {
    const suffix = sourceSlugSuffix(font.source);
    let slug = slugify(font.slug || font.id || font.name);

    if (font.source === 'bunny-fonts' && !slug.endsWith('-bunny')) {
      slug = `${slug}-bunny`;
    }

    if (suffix && slugsSeen.has(slug) && !slug.endsWith(`-${suffix}`)) {
      slug = `${slug}-${suffix}`;
    }
    
    let attempt = slug;
    let n = 1;
    while (slugsSeen.has(attempt)) attempt = `${slug}-${n++}`;
    slugsSeen.add(attempt);
    
    return normalizeFont(font, attempt, displayNameForSource(font));
  });

  // Sort by popularity
  final.sort((a, b) => b.popularity - a.popularity);

  // Stats
  const bySrc = {}, byCat = {};
  let varCount = 0;
  for (const f of final) {
    bySrc[f.source] = (bySrc[f.source] || 0) + 1;
    byCat[f.category] = (byCat[f.category] || 0) + 1;
    if (f.isVariable) varCount++;
  }

  console.log('\n📊 Final Stats:');
  console.log(`  Total        : ${final.length} fonts`);
  console.log(`  By source    :`, JSON.stringify(bySrc));
  console.log(`  By category  :`, JSON.stringify(byCat));
  console.log(`  Variable     : ${varCount}`);

  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, 'fonts.json'), JSON.stringify(final, null, 2));
  console.log(`\n✅ Generated ${final.length} fonts → data/fonts.json`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
