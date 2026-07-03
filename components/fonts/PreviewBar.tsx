'use client';

import React, { useState } from 'react';
import { useFontStore } from '@/store/useFontStore';

export function PreviewBar({ onOpenMobileSidebar }: { onOpenMobileSidebar?: () => void }) {
  const { previewText, setPreviewText, previewSize, setPreviewSize, previewBackground, setPreviewBackground } =
    useFontStore();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="z-40 flex-shrink-0 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-2.5 flex items-center gap-3">
      {/* Mobile filter trigger */}
      {onOpenMobileSidebar && (
        <button
          onClick={onOpenMobileSidebar}
          className="md:hidden flex-shrink-0 p-1.5 text-text-muted hover:text-text-primary transition-colors border border-border rounded-input"
          aria-label="Open filters"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="14" y2="12" />
            <line x1="4" y1="18" x2="11" y2="18" />
          </svg>
        </button>
      )}

      {/* Preview text input */}
      <div className={`flex-1 min-w-0 flex items-center gap-2 border-b transition-colors duration-150 ${isFocused ? 'border-border-hover' : 'border-transparent'}`}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0">
          <path d="M4 7V4h16v3" />
          <path d="M9 20h6" />
          <path d="M12 4v16" />
        </svg>
        <input
          type="text"
          id="global-preview-text"
          value={previewText}
          onChange={(e) => setPreviewText(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Type to preview all fonts…"
          className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-subtle focus:outline-none"
          maxLength={80}
        />
        {previewText && (
          <button
            onClick={() => setPreviewText('')}
            className="flex-shrink-0 text-text-subtle hover:text-text-muted transition-colors"
            aria-label="Clear preview text"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-4 bg-border flex-shrink-0 hidden sm:block" />

      {/* Size slider */}
      <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
        <span className="text-[10px] font-mono text-text-muted">Size</span>
        <input
          type="range"
          id="preview-size-slider"
          min="12"
          max="96"
          value={previewSize}
          onChange={(e) => setPreviewSize(Number(e.target.value))}
          className="w-20 cursor-pointer"
          style={{ accentColor: '#E8FF57' }}
        />
        <span className="text-[10px] font-mono text-text-muted w-8 text-right tabular-nums">{previewSize}px</span>
      </div>

      {/* Divider */}
      <div className="w-px h-4 bg-border flex-shrink-0 hidden sm:block" />

      {/* Background toggle */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => setPreviewBackground('dark')}
          className={`text-[10px] font-mono px-2 py-1 rounded transition-none border ${
            previewBackground === 'dark'
              ? 'text-accent border-accent/40 bg-accent/10'
              : 'text-text-muted border-border hover:text-text-primary'
          }`}
          id="bg-dark-toggle"
          title="Dark background"
        >
          Dark
        </button>
        <button
          onClick={() => setPreviewBackground('light')}
          className={`text-[10px] font-mono px-2 py-1 rounded transition-none border ${
            previewBackground === 'light'
              ? 'text-accent border-accent/40 bg-accent/10'
              : 'text-text-muted border-border hover:text-text-primary'
          }`}
          id="bg-light-toggle"
          title="Light background"
        >
          Light
        </button>
      </div>
    </div>
  );
}
