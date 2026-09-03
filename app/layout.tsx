import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';

export const metadata: Metadata = {
  title: {
    default: 'FontStash — Every font. One place.',
    template: '%s | FontStash',
  },
  description: '4,400+ open-source fonts. Instant preview. Zero signup. Discover, customize, and pair fonts for free on FontStash.',
  keywords: ['fonts', 'free fonts', 'google fonts', 'font pairing', 'typography', 'open source fonts', 'font discovery'],
  authors: [{ name: 'FontStash' }],
  creator: 'FontStash',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://fontstash.io',
    siteName: 'FontStash',
    title: 'FontStash — Every font. One place.',
    description: '4,400+ open-source fonts. Instant preview. Zero signup.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FontStash — Every font. One place.',
    description: '4,400+ open-source fonts. Instant preview. Zero signup.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.bunny.net" />
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
        />
        <meta name="theme-color" content="#0A0A0A" />
      </head>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[300] focus:rounded focus:bg-accent focus:px-3 focus:py-2 focus:text-xs focus:font-mono focus:text-background"
        >
          Skip to content
        </a>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
