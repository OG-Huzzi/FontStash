'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-sm text-center">
        <h1 className="text-lg font-bold text-text-primary mb-2">Something went wrong</h1>
        <p className="text-sm text-text-muted mb-5">
          This section failed to load. Your saved fonts are still stored locally.
        </p>
        <button
          onClick={reset}
          className="text-[12px] font-mono py-2 px-5 rounded-input border border-accent/40 text-accent bg-accent/10 hover:bg-accent/20 transition-colors"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
