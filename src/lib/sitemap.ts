import type { RaceWithSubRaces } from '../types/database';
import { getActiveHubs, hubPath } from './hubs';
import { raceDate } from './relatedRaces';
import { getRaceSlug } from './slugs';

// The last significant change to what every race page renders (full
// description, server-rendered distances, other-year links). A race's
// <lastmod> never predates it; bump it when the race page's content changes.
export const RACE_PAGE_CONTENT_UPDATED = '2026-09-23';

export interface SitemapEntry {
  url: string;
  lastModified: Date | null;
}

/** Last day a race runs on (YYYY-MM-DD), or null when it has no dates. */
function lastRaceDay(race: RaceWithSubRaces): string | null {
  const days = [race.end_date, race.start_date, ...(race.dates ?? [])]
    .filter((d): d is string => !!d)
    .map((d) => d.slice(0, 10));
  return days.length > 0 ? days.reduce((a, b) => (a > b ? a : b)) : null;
}

function latest(dates: (string | null | undefined)[]): Date | null {
  let max: number | null = null;
  for (const d of dates) {
    if (!d) continue;
    const t = new Date(d).getTime();
    if (!Number.isNaN(t) && (max === null || t > max)) max = t;
  }
  return max === null ? null : new Date(max);
}

// A listing changes when one of its races is edited, and when a race has run
// and drops out of "upcoming".
function listingLastModified(races: RaceWithSubRaces[], today: string): Date | null {
  return latest(
    races.flatMap((r) => {
      const day = raceDate(r)?.slice(0, 10) ?? null;
      return [r.updated_at ?? r.created_at, day !== null && day < today ? day : null];
    }),
  );
}

/**
 * Home, the hub directory, active hubs, and races that haven't run yet. Past
 * races keep their pages but stay out of the sitemap, which is what Google
 * uses to decide what to crawl next.
 */
export function buildSitemapEntries(
  races: RaceWithSubRaces[],
  today: string,
  baseUrl: string,
): SitemapEntry[] {
  const siteLastModified = listingLastModified(races, today);
  const hubs = getActiveHubs(races, today).map((hub) => ({
    url: `${baseUrl}${hubPath(hub)}`,
    lastModified: listingLastModified([...hub.upcoming, ...hub.past], today),
  }));
  const upcomingRaces = races
    .filter((r) => {
      const last = lastRaceDay(r);
      return last === null || last >= today;
    })
    .map((r) => ({
      url: `${baseUrl}/race/${getRaceSlug(r)}`,
      lastModified: latest([r.updated_at ?? r.created_at, RACE_PAGE_CONTENT_UPDATED]),
    }));

  return [
    { url: baseUrl, lastModified: siteLastModified },
    { url: `${baseUrl}/agones`, lastModified: siteLastModified },
    ...hubs,
    ...upcomingRaces,
  ];
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function renderSitemapXml(entries: SitemapEntry[], generatedAt: Date): string {
  const urls = entries.map((e) => {
    const lastmod = e.lastModified ? `<lastmod>${e.lastModified.toISOString()}</lastmod>` : '';
    return `<url><loc>${escapeXml(e.url)}</loc>${lastmod}</url>`;
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<!-- generated ${generatedAt.toISOString()} -->`,
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}
