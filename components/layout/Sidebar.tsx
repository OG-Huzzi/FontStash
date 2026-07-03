'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useFontStore } from '@/store/useFontStore';
import { FAVORITE_KEYS, useLocalStorageList } from '@/lib/storage';

const CATEGORIES = [
  { id: 'sans-serif', label: 'Sans Serif' },
  { id: 'serif', label: 'Serif' },
  { id: 'monospace', label: 'Monospace' },
  { id: 'display', label: 'Display' },
  { id: 'handwriting', label: 'Handwriting' },
];

const MOODS = [
  { id: 'elegant', label: 'Elegant' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'playful', label: 'Playful' },
  { id: 'technical', label: 'Technical' },
  { id: 'vintage', label: 'Vintage' },
  { id: 'modern', label: 'Modern' },
  { id: 'bold', label: 'Bold' },
  { id: 'friendly', label: 'Friendly' },
];

const WEIGHTS = [
  { value: 100, label: 'Thin' },
  { value: 300, label: 'Light' },
  { value: 400, label: 'Regular' },
  { value: 500, label: 'Medium' },
  { value: 600, label: 'SemiBold' },
  { value: 700, label: 'Bold' },
  { value: 800, label: 'ExtraBold' },
  { value: 900, label: 'Black' },
];

const LANGUAGES = [
  { id: 'latin', label: 'Latin' },
  { id: 'cyrillic', label: 'Cyrillic' },
  { id: 'greek', label: 'Greek' },
  { id: 'arabic', label: 'Arabic' },
  { id: 'devanagari', label: 'Devanagari' },
  { id: 'japanese', label: 'Japanese' },
  { id: 'korean', label: 'Korean' },
  { id: 'chinese', label: 'Chinese' },
];

const SOURCES = [
  { id: 'google-fonts', label: 'Google Fonts' },
  { id: 'bunny-fonts', label: 'Bunny Fonts' },
  { id: 'font-squirrel', label: 'Font Squirrel' },
  { id: 'open-foundry', label: 'Open Foundry' },
];

const SORT_OPTIONS = [
  { id: 'popular', label: 'Most Popular' },
  { id: 'newest', label: 'Newest' },
  { id: 'alpha-asc', label: 'A → Z' },
  { id: 'alpha-desc', label: 'Z → A' },
];

interface SectionProps {
  title: string;
  children: React.ReactNode;
  count?: number;
}

function Section({ title, children, count }: SectionProps) {
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-[9px] uppercase tracking-[0.14em] text-text-muted font-mono">
          {title}
        </h3>
        {count !== undefined && count > 0 && (
          <span className="text-[9px] font-mono text-accent bg-accent/10 border border-accent/20 px-1.5 py-0.5 rounded">
            {count}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

interface DropdownSectionProps extends SectionProps {
  defaultOpen?: boolean;
}

function DropdownSection({ title, children, count, defaultOpen = false }: DropdownSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const panelId = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-filter-panel`;

  return (
    <div className="mb-2.5 rounded-card border border-border bg-surface/35 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-surface-hover/70 transition-colors"
        aria-expanded={isOpen}
        aria-controls={panelId}
      >
        <span className="text-[9px] uppercase tracking-[0.14em] text-text-muted font-mono">
          {title}
        </span>
        <span className="flex items-center gap-2">
          {count !== undefined && count > 0 && (
            <span className="text-[9px] font-mono text-accent bg-accent/10 border border-accent/20 px-1.5 py-0.5 rounded">
              {count}
            </span>
          )}
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`text-text-muted transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>
      {isOpen && (
        <div id={panelId} className="px-3 pb-3 pt-0 border-t border-border/70">
          <div className="pt-3">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

interface FilterPillProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function FilterPill({ label, active, onClick }: FilterPillProps) {
  return (
    <button
      onClick={onClick}
      className={`text-[11px] px-2.5 py-1 rounded-[4px] border transition-colors duration-100 cursor-pointer ${
        active
          ? 'bg-accent/10 border-accent/40 text-accent'
          : 'bg-transparent border-border text-text-muted hover:text-text-primary hover:border-border-hover'
      }`}
    >
      {label}
    </button>
  );
}

interface SidebarContentProps {
  onClose?: () => void;
  isMobile?: boolean;
}

export function SidebarContent({ onClose, isMobile }: SidebarContentProps) {
  const {
    activeCategories, toggleCategory,
    activeMoods, toggleMood,
    activeWeights, toggleWeight,
    activeLanguages, toggleLanguage,
    activeSources, toggleSource,
    variableOnly, setVariableOnly,
    sortBy, setSortBy,
    clearAllFilters,
  } = useFontStore();
  const { items: favorites } = useLocalStorageList(FAVORITE_KEYS.fonts);

  const hasActiveFilters =
    activeCategories.length > 0 ||
    activeMoods.length > 0 ||
    activeWeights.length > 0 ||
    activeLanguages.length > 0 ||
    activeSources.length > 0 ||
    variableOnly;

  return (
    <div className={isMobile ? 'p-5 pb-8' : ''}>
      {/* Mobile header */}
      {isMobile && (
        <div className="flex items-center justify-between mb-5 pb-4 border-b border-border">
          <span className="font-mono text-[11px] text-text-muted uppercase tracking-widest">Filters</span>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors p-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Favorites shortcut */}
      {favorites.length > 0 && (
        <div className="mb-5 p-2.5 rounded-card border border-border bg-surface/50">
          <p className="text-[9px] font-mono text-text-muted uppercase tracking-widest mb-1">Saved</p>
          <p className="text-[11px] text-text-primary">{favorites.length} font{favorites.length !== 1 ? 's' : ''} favorited</p>
        </div>
      )}

      {/* Sort */}
      <Section title="Sort By">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="w-full bg-surface border border-border rounded-input px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-border-hover appearance-none cursor-pointer"
          id="sort-select"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id} className="bg-surface">
              {opt.label}
            </option>
          ))}
        </select>
        <div
          className="mt-2 inline-flex text-[9px] font-mono text-accent border border-accent/30 bg-accent/10 rounded px-2 py-1"
          title="Every search filter is free and unlocked."
        >
          All filters unlocked
        </div>
      </Section>

      {/* Categories */}
      <DropdownSection title="Category" count={activeCategories.length}>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <FilterPill
              key={cat.id}
              label={cat.label}
              active={activeCategories.includes(cat.id)}
              onClick={() => toggleCategory(cat.id)}
            />
          ))}
        </div>
      </DropdownSection>

      {/* Moods */}
      <DropdownSection title="Mood" count={activeMoods.length}>
        <div className="flex flex-wrap gap-1.5">
          {MOODS.map((mood) => (
            <FilterPill
              key={mood.id}
              label={mood.label}
              active={activeMoods.includes(mood.id)}
              onClick={() => toggleMood(mood.id)}
            />
          ))}
        </div>
      </DropdownSection>

      {/* Variable Font Toggle */}
      <Section title="Variable Fonts">
        <label className="flex items-center gap-2.5 cursor-pointer group">
          <button
            role="switch"
            aria-checked={variableOnly}
            onClick={() => setVariableOnly(!variableOnly)}
            id="variable-toggle"
            className={`relative w-9 h-5 rounded-full border transition-colors duration-150 focus:outline-none ${
              variableOnly ? 'bg-accent/20 border-accent/40' : 'bg-surface border-border'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform duration-150 ${
                variableOnly ? 'translate-x-4 bg-accent' : 'translate-x-0 bg-text-muted'
              }`}
            />
          </button>
          <span className="text-xs text-text-muted group-hover:text-text-primary transition-colors">
            Variable only
            <span className="font-mono text-text-subtle ml-1 text-[10px]">(184)</span>
          </span>
        </label>
      </Section>

      {/* Weights */}
      <DropdownSection title="Weight Availability" count={activeWeights.length}>
        <div className="grid grid-cols-2 gap-y-1.5 gap-x-2">
          {WEIGHTS.map((w) => (
            <label key={w.value} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={activeWeights.includes(w.value)}
                onChange={() => toggleWeight(w.value)}
              />
              <span className="text-xs text-text-muted group-hover:text-text-primary transition-colors">
                {w.label}
                <span className="font-mono ml-1 text-text-subtle text-[10px]">{w.value}</span>
              </span>
            </label>
          ))}
        </div>
      </DropdownSection>

      {/* Languages */}
      <DropdownSection title="Language Support" count={activeLanguages.length}>
        <div className="flex flex-wrap gap-1.5">
          {LANGUAGES.map((lang) => (
            <FilterPill
              key={lang.id}
              label={lang.label}
              active={activeLanguages.includes(lang.id)}
              onClick={() => toggleLanguage(lang.id)}
            />
          ))}
        </div>
      </DropdownSection>

      {/* Sources */}
      <Section title="Source" count={activeSources.length}>
        <div className="space-y-1.5">
          {SOURCES.map((src) => (
            <label key={src.id} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={activeSources.includes(src.id)}
                onChange={() => toggleSource(src.id)}
              />
              <span className="text-xs text-text-muted group-hover:text-text-primary transition-colors">
                {src.label}
              </span>
            </label>
          ))}
        </div>
      </Section>

      {/* Clear All */}
      {hasActiveFilters && (
        <button
          onClick={() => { clearAllFilters(); onClose?.(); }}
          className="text-xs font-mono text-accent hover:text-accent/80 transition-colors mt-1 w-full text-left py-1"
          id="clear-filters"
        >
          ✕ Clear all filters
        </button>
      )}
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="w-56 flex-shrink-0 h-full overflow-y-scroll sidebar-scrollbar pr-2">
      <SidebarContent />
    </aside>
  );
}

export function MobileSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <>
      {/* Overlay */}
      <div
        className={`sidebar-overlay ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`sidebar-drawer scrollbar-thin ${isOpen ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Filter sidebar"
      >
        <div className="pt-14">
          <SidebarContent onClose={onClose} isMobile />
        </div>
      </div>
    </>
  );
}
