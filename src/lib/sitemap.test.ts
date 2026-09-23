import { describe, it, expect } from 'vitest';
import { buildSitemapEntries, renderSitemapXml, RACE_PAGE_CONTENT_UPDATED } from './sitemap';
import type { RaceWithSubRaces } from '../types/database';

const BASE = 'https://racemap.gr';
const TODAY = '2026-10-01';

function race(
  id: string,
  date: string | null,
  overrides: Partial<RaceWithSubRaces> = {},
): RaceWithSubRaces {
  return {
    id,
    event_name: `Race ${id}`,
    event_name_en: null,
    event_type: 'road',
    dates: date ? [date] : null,
    start_date: date,
    end_date: date,
    location_lat: 37.98,
    location_lng: 23.72,
    location_region: 'Attiki',
    location_city: 'Αθήνα',
    location_place: 'Αθήνα',
    status: 'scheduled',
    updated_at: '2026-06-01T00:00:00Z',
    created_at: '2026-06-01T00:00:00Z',
    sub_races: [{ id: `${id}-s`, has_gpx: false, distance: 10000 }],
    ...overrides,
  } as unknown as RaceWithSubRaces;
}

function raceUrls(races: RaceWithSubRaces[]): string[] {
  return buildSitemapEntries(races, TODAY, BASE)
    .map((e) => e.url)
    .filter((u) => u.includes('/race/'));
}

describe('buildSitemapEntries', () => {
  it('lists races that have not run yet and leaves out the ones that have', () => {
    const urls = raceUrls([
      race('past', '2026-09-20'),
      race('today', TODAY),
      race('later', '2026-11-15'),
      race('undated', null),
      race('ongoing', '2026-09-30', { end_date: '2026-10-02' }),
    ]);
    expect(urls.some((u) => u.includes('-past'))).toBe(false);
    for (const id of ['today', 'later', 'undated', 'ongoing']) {
      expect(urls.some((u) => u.endsWith(`-${id}`))).toBe(true);
    }
  });

  it('never dates a race page before its last content change', () => {
    const entries = buildSitemapEntries(
      [race('old', '2026-11-01'), race('edited', '2026-11-02', { updated_at: '2026-12-24T10:00:00Z' })],
      TODAY,
      BASE,
    );
    const byId = (id: string) => entries.find((e) => e.url.endsWith(`-${id}`))!;
    expect(byId('old').lastModified).toEqual(new Date(RACE_PAGE_CONTENT_UPDATED));
    expect(byId('edited').lastModified).toEqual(new Date('2026-12-24T10:00:00Z'));
  });

  it('dates listings by their latest race edit or latest race that has run', () => {
    const upcoming = ['2026-10-04', '2026-10-11', '2026-10-18', '2026-10-25', '2026-11-01'].map((d, i) =>
      race(`u${i}`, d),
    );
    const entries = buildSitemapEntries([...upcoming, race('ran', '2026-09-20')], TODAY, BASE);
    const home = entries.find((e) => e.url === BASE)!;
    const athens = entries.find((e) => e.url === `${BASE}/agones/athina`);
    expect(home.lastModified).toEqual(new Date('2026-09-20'));
    expect(athens?.lastModified).toEqual(new Date('2026-09-20'));
  });
});

describe('renderSitemapXml', () => {
  it('escapes URLs, omits a missing lastmod, and stamps the generation time', () => {
    const xml = renderSitemapXml(
      [
        { url: `${BASE}/race/a&b`, lastModified: new Date('2026-09-23T00:00:00Z') },
        { url: BASE, lastModified: null },
      ],
      new Date('2026-09-23T12:00:00Z'),
    );
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<!-- generated 2026-09-23T12:00:00.000Z -->');
    expect(xml).toContain(
      `<url><loc>${BASE}/race/a&amp;b</loc><lastmod>2026-09-23T00:00:00.000Z</lastmod></url>`,
    );
    expect(xml).toContain(`<url><loc>${BASE}</loc></url>`);
  });
});
