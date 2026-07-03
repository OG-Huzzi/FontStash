import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center px-6">
      <p className="font-mono text-[10px] text-accent uppercase tracking-widest mb-4">404</p>
      <h1 className="font-sans font-bold text-3xl text-text-primary mb-3">Page not found</h1>
      <p className="text-text-muted text-sm mb-8">The font or page you&apos;re looking for doesn&apos;t exist.</p>
      <Link
        href="/"
        className="font-mono text-sm text-accent border border-accent/40 px-4 py-2 rounded-input hover:bg-accent/10 transition-colors"
      >
        ← Back to FontStash
      </Link>
    </div>
  );
}
