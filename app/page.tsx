import type { Metadata } from 'next';
import HomePageClient from './HomePageClient';

export const metadata: Metadata = {
  title: 'FontStash — Every font. One place.',
  description: '4,400+ open-source fonts. Instant preview. Zero signup. Discover, customize, and pair the perfect font for your project.',
};

export default function HomePage() {
  return <HomePageClient />;
}
