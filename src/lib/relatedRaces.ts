import type { RaceWithSubRaces } from '../types/database';
import { getRaceSlug } from './slugs';

// Minimal shape embedded in race-page HTML for the "Σχετικοί Αγώνες" links.
export interface RelatedRaceLink {
  slug: string;
  name: string;
  date: string | null;
  place: string | null;
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function raceDate(race: RaceWithSubRaces): string | null {
  return race.start_date || (race.dates && race.dates[0]) || null;
}

/**
 * Picks related races for a race detail page: up to half from the same region
 * (closest in the calendar to this race's own date) and the rest by geographic
 * proximity. Deliberately uses the race's date — not "now" — as the reference
 * so the result is stable across regenerations of this statically cached page.
 */
export function computeRelatedRaces(
  race: RaceWithSubRaces,
  all: RaceWithSubRaces[],
  limit = 8,
): RelatedRaceLink[] {
  const refTime = raceDate(race) ? new Date(raceDate(race)!).getTime() : null;
  const candidates = all.filter((r) => r.id !== race.id);

  const byCalendarProximity = (a: RaceWithSubRaces, b: RaceWithSubRaces) => {
    if (refTime === null) return 0;
    const at = raceDate(a) ? Math.abs(new Date(raceDate(a)!).getTime() - refTime) : Infinity;
    const bt = raceDate(b) ? Math.abs(new Date(raceDate(b)!).getTime() - refTime) : Infinity;
    return at - bt;
  };

  const picked: RaceWithSubRaces[] = [];
  const pickedIds = new Set<string>();
  const take = (pool: RaceWithSubRaces[], n: number) => {
    for (const r of pool) {
      if (n <= 0) break;
      if (pickedIds.has(r.id)) continue;
      picked.push(r);
      pickedIds.add(r.id);
      n--;
    }
  };

  if (race.location_region) {
    const sameRegion = candidates
      .filter((r) => r.location_region === race.location_region)
      .sort(byCalendarProximity);
    take(sameRegion, Math.ceil(limit / 2));
  }

  if (race.location_lat != null && race.location_lng != null) {
    const nearby = candidates
      .filter((r) => r.location_lat != null && r.location_lng != null)
      .sort(
        (a, b) =>
          haversineKm(race.location_lat!, race.location_lng!, a.location_lat!, a.location_lng!) -
          haversineKm(race.location_lat!, race.location_lng!, b.location_lat!, b.location_lng!),
      );
    take(nearby, limit - picked.length);
  } else {
    take(candidates.sort(byCalendarProximity), limit - picked.length);
  }

  return picked.map((r) => ({
    slug: getRaceSlug(r),
    name: r.event_name,
    date: raceDate(r),
    place: r.location_place || r.location_city || null,
  }));
}
