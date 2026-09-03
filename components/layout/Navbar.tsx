'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useFontStore } from '@/store/useFontStore';
import { allFonts } from '@/lib/fonts';

export function Navbar({ onOpenMobileSidebar }: { onOpenMobileSidebar?: () => void }) {
  const pathname = usePathname();
  const { searchQuery, setSearchQuery, activeCategories, activeMoods, activeWeights, activeLanguages, activeSources, variableOnly } = useFontStore();
  const [inputValue, setInputValue] = useState(searchQuery);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync input when store query is cleared externally (e.g. clearAllFilters)
  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setInputValue(val);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setSearchQuery(val);
      }, 150);
    },
    [setSearchQuery]
  );

  const handleClear = useCallback(() => {
    setInputValue('');
    setSearchQuery('');
    inputRef.current?.focus();
  }, [setSearchQuery]);

  // Keyboard shortcut: "/" focuses search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const isHomepage = pathname === '/';
  const fontCount = allFonts.length.toLocaleString();

  // Count active filters for badge
  const filterCount =
    activeCategories.length +
    activeMoods.length +
    activeWeights.length +
    activeLanguages.length +
    activeSources.length +
    (variableOnly ? 1 : 0);

  return (
    <nav aria-label="Primary" className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border h-14 flex items-center px-4 gap-4">
      {/* Mobile sidebar trigger — only on homepage */}
      {isHomepage && onOpenMobileSidebar && (
        <button
          onClick={onOpenMobileSidebar}
          className="md:hidden flex-shrink-0 relative p-1.5 text-text-muted hover:text-text-primary transition-colors"
          aria-label="Open filters"
          id="mobile-sidebar-trigger"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="14" y2="12" />
            <line x1="4" y1="18" x2="11" y2="18" />
          </svg>
          {filterCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-accent text-background text-[9px] font-bold flex items-center justify-center leading-none">
              {filterCount}
            </span>
          )}
        </button>
      )}

      {/* Logo */}
      <Link href="/" className="flex-shrink-0 flex items-center group">
        <span className="font-sans font-semibold text-[15px] text-text-primary tracking-tight">
          FontStash
        </span>
        <span
          className="w-1.5 h-1.5 rounded-full bg-accent ml-0.5 mb-0.5 inline-block group-hover:scale-110 transition-transform"
          aria-hidden="true"
        />
      </Link>

      {/* Search — only on homepage */}
      {isHomepage ? (
        <div className="flex-1 max-w-2xl mx-auto relative">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
              width="14" height="14" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              id="font-search"
              value={inputValue}
              onChange={handleSearch}
              placeholder={`Search ${fontCount} fonts... ( press / )`}
              className="w-full bg-surface border border-border rounded-input pl-9 pr-8 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-hover transition-colors duration-150"
              autoComplete="off"
            />
            {inputValue && (
              <button
                onClick={handleClear}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                aria-label="Clear search"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {/* Nav links */}
      <div className="flex-shrink-0 flex items-center gap-1">
        {[
          { href: '/', label: 'Fonts' },
          { href: '/pairs', label: 'Pairs' },
          { href: '/compare', label: 'Compare' },
          { href: '/palettes', label: 'Palettes' },
          { href: '/gradients', label: 'Gradients' },
          { href: '/favorites', label: 'Favorites' },
        ].map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`relative text-xs px-2.5 py-1.5 font-mono transition-colors duration-150 ${
              pathname === href
                ? 'text-accent after:absolute after:left-2.5 after:right-2.5 after:-bottom-0.5 after:h-px after:bg-accent'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
