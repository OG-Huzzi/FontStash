export default function Loading() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center">
          <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" aria-hidden="true" />
        </div>
        <p className="text-xs font-mono text-text-muted">Loading fonts…</p>
      </div>
    </main>
  );
}
