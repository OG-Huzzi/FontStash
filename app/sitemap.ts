import { MetadataRoute } from 'next';
import { allFonts } from '@/lib/fonts';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://fontstash.io';

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/pairs`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/compare`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/palettes`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/gradients`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/favorites`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
  ];

  const fontPages: MetadataRoute.Sitemap = allFonts.map((font) => ({
    url: `${baseUrl}/font/${font.slug}`,
    lastModified: new Date(font.addedDate),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...staticPages, ...fontPages];
}
