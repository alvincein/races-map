import type { Race } from '../types/database';
import type { FilterState, DistanceBucket } from '../types/filters';

interface DateRange {
  start: Date;
  end: Date | null;
}

function distanceMatchesBuckets(dist: number, buckets: DistanceBucket[]): boolean {
  return buckets.some(bucket => {
    switch (bucket) {
      case '5k': return dist <= 5000;
      case '10k': return dist > 5000 && dist <= 12000;
      case '21k': return dist > 12000 && dist <= 25000;
      case '42k': return dist > 25000 && dist <= 45000;
      case 'ultra': return dist > 45000;
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
      if (!distanceMatchesBuckets(race.max_distance ?? 0, filters.distanceRange)) return false;
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
