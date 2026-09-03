'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ background: '#0A0A0A', color: '#F2F2F2', fontFamily: 'system-ui, sans-serif' }}>
        <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ maxWidth: 380, textAlign: 'center' }}>
            <h1 style={{ fontSize: 18, marginBottom: 8 }}>Something went wrong</h1>
            <p style={{ fontSize: 14, opacity: 0.7, marginBottom: 20 }}>Please reload the page. Your local favorites are safe.</p>
            <button
              onClick={reset}
              style={{ padding: '8px 20px', borderRadius: 6, border: '1px solid #E8FF57', background: 'transparent', color: '#E8FF57', cursor: 'pointer' }}
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
