import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getFontBySlug, allFonts } from '@/lib/fonts';

interface Props {
  params: { slug: string };
}

export async function generateStaticParams() {
  return allFonts.map((font) => ({ slug: font.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const font = getFontBySlug(params.slug);
  if (!font) return {};

  const title = `${font.name} — Free Font | FontStash`;
  const description = `Download and preview ${font.name}, a free ${font.category} font by ${font.designer}. Customize weight, size, spacing and find perfect pairings on FontStash.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://fontstash.io/font/${font.slug}`,
    },
    twitter: {
      title,
      description,
    },
  };
}

export default function FontDetailPage({ params }: Props) {
  const font = getFontBySlug(params.slug);
  if (!font) notFound();

  redirect(`/?font=${encodeURIComponent(font.slug)}`);
}
