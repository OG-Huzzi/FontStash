'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar, MobileSidebar } from '@/components/layout/Sidebar';
import { PreviewBar } from '@/components/fonts/PreviewBar';
import { FontGrid } from '@/components/fonts/FontGrid';
import { FontDetailPanel } from '@/components/fonts/FontDetailPanel';
import { getFontBySlug } from '@/lib/fonts';
import { useFontStore } from '@/store/useFontStore';

export default function HomePageClient() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { openPanel } = useFontStore();

  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get('font');
    if (!slug) return;
    const font = getFontBySlug(slug);
    if (font) openPanel(font);
    window.history.replaceState(null, '', '/');
  }, [openPanel]);

  return (
    <main className="h-screen bg-background overflow-hidden flex flex-col">
      {/* Fixed Navbar */}
      <Navbar onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />

      {/* Mobile sidebar drawer */}
      <MobileSidebar
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      {/* Fixed navbar spacer */}
      <div className="h-14 flex-shrink-0" />

      <PreviewBar onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />

      {/* Main layout */}
      <div className="flex gap-0 flex-1 min-h-0 overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:block px-5 py-6 flex-shrink-0 min-h-0">
          <Sidebar />
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px bg-border flex-shrink-0" />

        {/* Font grid */}
        <div className="flex-1 min-w-0 min-h-0">
          <FontGrid />
        </div>
      </div>

      {/* Font Detail Panel (drawer) */}
      <FontDetailPanel />
    </main>
  );
}
