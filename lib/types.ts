export interface Font {
  id: string;
  name: string;
  slug: string;
  category: 'sans-serif' | 'serif' | 'monospace' | 'display' | 'handwriting';
  moods: string[];
  weights: number[];
  isVariable: boolean;
  variableAxes: string[];
  languages: string[];
  source: 'google-fonts' | 'bunny-fonts' | 'font-squirrel' | 'open-foundry';
  license: string;
  importUrl: string;
  fontFamily: string;
  downloadUrl: string;
  ttfUrl: string | null;
  popularity: number;
  addedDate: string;
  designer: string;
  description: string;
  version: string;
}

export type SortOption = 'popular' | 'newest' | 'alpha-asc' | 'alpha-desc';
export type PreviewMode = 'sentence' | 'paragraph' | 'alphabet' | 'numbers' | 'custom' | 'waterfall';
export type PreviewBackground = 'dark' | 'light' | 'custom';

// Action result types
export type AddToCompareResult = 'added' | 'duplicate' | 'limit';
