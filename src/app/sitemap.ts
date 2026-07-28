import type { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';
import { fetchRacesCached } from '@/lib/races';
import { getRaceSlug } from '@/lib/slugs';
import { SITE_URL } from '@/lib/site';
import { getActiveHubs, athensToday, hubPath } from '@/lib/hubs';

// Cache indefinitely; refreshed on-demand via /api/revalidate when races are
// imported or updated (which calls revalidatePath('/sitemap.xml')).
export const revalidate = false;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;

  const races = await fetchRacesCached(supabase);

  const raceUrls = races.map((race) => ({
    url: `${baseUrl}/race/${getRaceSlug(race)}`,
    lastModified: race.updated_at ? new Date(race.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const hubUrls = getActiveHubs(races, athensToday()).map((hub) => ({
    url: `${baseUrl}${hubPath(hub)}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/agones`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    ...hubUrls,
    ...raceUrls,
  ];
}
