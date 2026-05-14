import type { Race } from '../types/database';
import type { FilterState, DistanceBucket } from '../types/filters';

interface DateRange {
  start: Date;
  end: Date | null;
}

function distanceMatchesBuckets(dist: number, buckets: DistanceBucket[]): boolean {
  return buckets.some(bucket => {
    switch (bucket) {
      case '5k': return dist <= 10500; // Includes 5k to 10k (with a small buffer)
      case '10k': return dist > 10500 && dist <= 20500; // 10k to 20k
      case '21k': return dist > 20500 && dist <= 31000; // Half Marathon range
      case '42k': return dist > 31000 && dist <= 50000; // Marathon range
      case 'ultra': return dist > 50000; // Ultra
    }
  });
}

function computeDateRange(filters: FilterState, now: Date): DateRange | null {
  if (filters.dateRange === 'all') return null;
  if (filters.dateRange === 'custom') {
    return {
      start: filters.customDateStart ? new Date(filters.customDateStart) : new Date(0),
      end: filters.customDateEnd ? new Date(filters.customDateEnd) : null,
    };
  }
  const end = new Date(now);
  const months = filters.dateRange === '3months' ? 3 : 6;
  end.setMonth(end.getMonth() + months);
  return { start: now, end };
}

export function nextRaceDate(race: Race, _now: Date): Date | null {
  if (!race.dates || race.dates.length === 0) return null;
  // dates[] is assumed chronologically ordered upstream; the consumer convention
  // across the app treats dates[0] as the next occurrence.
  return new Date(race.dates[0]);
}

export function applyFilters<T extends Race>(races: T[], filters: FilterState, now: Date = new Date(), favorites: string[] = []): T[] {
  const dateRange = computeDateRange(filters, now);
  return races.filter(race => {
    if (filters.favoritesOnly && !favorites.includes(race.id)) return false;
    
    if (filters.type !== 'all' && race.event_type?.toLowerCase() !== filters.type) return false;

    if (filters.distanceRange.length > 0) {
      const subRaces = (race as any).sub_races as { distance?: number | null }[];
      const hasMatchingSubRace = subRaces?.some(sr => 
        sr.distance != null && distanceMatchesBuckets(sr.distance, filters.distanceRange)
      );
      if (!hasMatchingSubRace) return false;
    }

    const raceDate = nextRaceDate(race, now);

    if (filters.regions.length > 0) {
      if (!race.location_region || !filters.regions.includes(race.location_region)) return false;
    }

    if (raceDate) {
      if (filters.upcomingOnly && raceDate < now) return false;
      if (dateRange) {
        if (raceDate < dateRange.start) return false;
        if (dateRange.end && raceDate > dateRange.end) return false;
      }
    }

    if (filters.hasGpxOnly) {
      const subRaces = (race as Race & { sub_races?: { has_gpx?: boolean | null }[] }).sub_races;
      if (!subRaces?.some(sr => sr.has_gpx === true)) return false;
    }

    return true;
  });
}
