import type { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';
import { fetchRacesCached } from '@/lib/races';
import { getRaceSlug } from '@/lib/slugs';
import { SITE_URL } from '@/lib/site';
import { getActiveHubs, athensToday, hubPath } from '@/lib/hubs';

// Refreshed on-demand via /api/revalidate when races are imported or updated
// (which calls revalidatePath('/sitemap.xml')), plus a daily floor.
//
// The floor is not redundant with the on-demand hook. The hub URLs below come
// from getActiveHubs(races, athensToday()), whose gating is calendar-dependent,
// so the correct sitemap changes as days pass even when no race data does. It is
// also a safety net: this was `false`, and when the scraper stopped calling
// /api/revalidate the sitemap silently froze for a week (2026-07-28 → 08-05)
// while ~26 new races sat in the database with no pages. One ISR write a day for
// one route — the free-tier problem was 500+ race pages on a short timer.
export const revalidate = 86400;

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
