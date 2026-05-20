import type { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';
import { fetchRacesCached } from '@/lib/races';

export const revalidate = 1800; // Revalidate every 30 minutes to match data updates

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://races-map.vercel.app';

  const races = await fetchRacesCached(supabase);

  const raceUrls = races.map((race) => ({
    url: `${baseUrl}/race/${race.id}`,
    lastModified: race.updated_at ? new Date(race.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    ...raceUrls,
  ];
}
