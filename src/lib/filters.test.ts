import { describe, it, expect } from 'vitest';
import { applyFilters, nextRaceDate } from './filters';
import { DEFAULT_FILTERS } from '../types/filters';
import type { Race } from '../types/database';

function makeRace(overrides: Partial<Race> = {}): Race {
  return {
    id: 'r1',
    event_name: 'Test Race',
    description: null,
    dates: ['2026-06-15'],
    max_distance: 21000,
    event_type: 'Road',
    event_url: null,
    scraped_url: null,
    location_place: null,
    location_region: 'Attiki',
    location_city: null,
    location_lat: 37.98,
    location_lng: 23.72,
    nearest_city: null,
    has_multiple_races: null,
    source_id: null,
    created_at: null,
    updated_at: null,
    reviewed: null,
    event_name_translations: null,
    nearest_city_id: null,
    event_name_en: null,
    description_en: null,
    needs_rescan: null,
    rescaned_date: null,
    confidence_score: null,
    confidence_explanation: null,
    ...overrides,
  } as Race;
}

const NOW = new Date('2026-05-01T00:00:00Z');

describe('applyFilters', () => {
  it('returns all races with default filters when all are upcoming', () => {
    const races = [makeRace({ dates: ['2026-06-15'] }), makeRace({ id: 'r2', dates: ['2026-10-01'] })];
    expect(applyFilters(races, DEFAULT_FILTERS, NOW)).toHaveLength(2);
  });

  it('upcomingOnly excludes past races', () => {
    const races = [makeRace({ dates: ['2025-12-31'] }), makeRace({ id: 'r2', dates: ['2026-06-15'] })];
    const result = applyFilters(races, DEFAULT_FILTERS, NOW);
    expect(result.map(r => r.id)).toEqual(['r2']);
  });

  it('filter by type=trail excludes road races', () => {
    const races = [
      makeRace({ id: 'road', event_type: 'Road' }),
      makeRace({ id: 'trail', event_type: 'Trail' }),
    ];
    const result = applyFilters(races, { ...DEFAULT_FILTERS, type: 'trail' }, NOW);
    expect(result.map(r => r.id)).toEqual(['trail']);
  });

  it('distance bucket "21k" matches half-marathon distances (12001..25000m)', () => {
    const races = [
      makeRace({ id: 'short', max_distance: 5000 }),
      makeRace({ id: 'half', max_distance: 21000 }),
      makeRace({ id: 'marathon', max_distance: 42000 }),
    ];
    const result = applyFilters(races, { ...DEFAULT_FILTERS, distanceRange: ['21k'] }, NOW);
    expect(result.map(r => r.id)).toEqual(['half']);
  });

  it('distance buckets are unioned (multiple checked)', () => {
    const races = [
      makeRace({ id: 'short', max_distance: 5000 }),
      makeRace({ id: 'half', max_distance: 21000 }),
      makeRace({ id: 'ultra', max_distance: 60000 }),
    ];
    const result = applyFilters(races, { ...DEFAULT_FILTERS, distanceRange: ['5k', 'ultra'] }, NOW);
    expect(result.map(r => r.id).sort()).toEqual(['short', 'ultra']);
  });

  it('month filter matches the first date only', () => {
    const races = [
      makeRace({ id: 'jun', dates: ['2026-06-15'] }),
      makeRace({ id: 'oct', dates: ['2026-10-01'] }),
    ];
    const result = applyFilters(races, { ...DEFAULT_FILTERS, months: [5] /* June */ }, NOW);
    expect(result.map(r => r.id)).toEqual(['jun']);
  });

  it('dateRange=3months caps races more than 3 months from now', () => {
    const races = [
      makeRace({ id: 'soon', dates: ['2026-06-15'] }),
      makeRace({ id: 'later', dates: ['2026-11-15'] }),
    ];
    const result = applyFilters(races, { ...DEFAULT_FILTERS, dateRange: '3months' }, NOW);
    expect(result.map(r => r.id)).toEqual(['soon']);
  });

  it('region filter matches case-sensitively against location_region', () => {
    const races = [
      makeRace({ id: 'at', location_region: 'Attiki' }),
      makeRace({ id: 'kr', location_region: 'Kriti' }),
    ];
    const result = applyFilters(races, { ...DEFAULT_FILTERS, regions: ['Kriti'] }, NOW);
    expect(result.map(r => r.id)).toEqual(['kr']);
  });

  it('hasGpxOnly excludes races whose sub_races have no has_gpx=true', () => {
    type R = Race & { sub_races?: { has_gpx?: boolean | null }[] };
    const races: R[] = [
      { ...makeRace({ id: 'with' }), sub_races: [{ has_gpx: true }] } as R,
      { ...makeRace({ id: 'without' }), sub_races: [{ has_gpx: false }, { has_gpx: null }] } as R,
    ];
    const result = applyFilters(races, { ...DEFAULT_FILTERS, hasGpxOnly: true }, NOW);
    expect(result.map(r => r.id)).toEqual(['with']);
  });

  it('custom date range respects start and end', () => {
    const races = [
      makeRace({ id: 'before', dates: ['2026-05-15'] }),
      makeRace({ id: 'inside', dates: ['2026-06-15'] }),
      makeRace({ id: 'after', dates: ['2026-08-15'] }),
    ];
    const result = applyFilters(
      races,
      {
        ...DEFAULT_FILTERS,
        upcomingOnly: false,
        dateRange: 'custom',
        customDateStart: '2026-06-01',
        customDateEnd: '2026-07-01',
      },
      NOW,
    );
    expect(result.map(r => r.id)).toEqual(['inside']);
  });
});

describe('nextRaceDate', () => {
  it('returns null when no dates', () => {
    expect(nextRaceDate(makeRace({ dates: null }), NOW)).toBeNull();
    expect(nextRaceDate(makeRace({ dates: [] }), NOW)).toBeNull();
  });

  it('returns dates[0] as a Date', () => {
    const d = nextRaceDate(makeRace({ dates: ['2026-06-15'] }), NOW);
    expect(d?.toISOString().startsWith('2026-06-15')).toBe(true);
  });
});
