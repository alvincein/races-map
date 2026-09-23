import { describe, it, expect } from 'vitest';
import { findOtherEditions, normalizeEventName } from './editions';
import type { RaceWithSubRaces } from '../types/database';

const CHANIA = { location_lat: 35.51, location_lng: 24.02 };

function race(
  id: string,
  event_name: string,
  date: string,
  overrides: Partial<RaceWithSubRaces> = {},
): RaceWithSubRaces {
  return {
    id,
    event_name,
    event_name_en: null,
    dates: [date],
    start_date: date,
    ...CHANIA,
    sub_races: [],
    ...overrides,
  } as unknown as RaceWithSubRaces;
}

describe('normalizeEventName', () => {
  it('strips accents, years and the leading ordinal', () => {
    expect(normalizeEventName('20ος Διεθνής Μαραθώνιος Δρόμος Θεσσαλονίκης 2026')).toBe(
      'διεθνησ μαραθωνιοσ δρομοσ θεσσαλονικησ',
    );
    expect(normalizeEventName('11th Crete Marathon – Crete Marathon 2027')).toBe(
      'crete marathon crete marathon',
    );
    expect(normalizeEventName('15o Skiathos Trail Run 2027')).toBe('skiathos trail run');
  });
});

describe('findOtherEditions', () => {
  it('links the same event across years, oldest first', () => {
    const r2026 = race('a', '10ος Μαραθώνιος Κρήτης 2026', '2026-04-19');
    const r2027 = race('b', '11ος Μαραθώνιος Κρήτης – Crete Marathon', '2027-04-11');
    const r2025 = race('c', '9ος Μαραθώνιος Κρήτης 2025', '2025-04-13');
    expect(findOtherEditions(r2026, [r2026, r2027, r2025]).map((r) => r.id)).toEqual(['c', 'b']);
  });

  it('matches a Greek name with its Latin spelling', () => {
    const agrinio = { location_lat: 38.62, location_lng: 21.41 };
    const a = race('a', '6ο City Trail Αγρινίου', '2026-05-10', agrinio);
    const b = race('b', '7ο City Trail Agrinio', '2027-05-16', agrinio);
    expect(findOtherEditions(a, [a, b]).map((r) => r.id)).toEqual(['b']);
  });

  it('treats same-name races under 300 days apart as different events', () => {
    const a = race('a', 'Λίμνη Μαραθώνα 2026', '2026-05-24');
    const b = race('b', 'Λίμνη Μαραθώνα 2026', '2026-09-06');
    expect(findOtherEditions(a, [a, b])).toEqual([]);
  });

  it('does not link same-name races in different towns', () => {
    const a = race('a', 'Night Run 2026', '2026-06-01', { location_lat: 37.98, location_lng: 23.72 });
    const b = race('b', 'Night Run 2027', '2027-06-01', { location_lat: 40.64, location_lng: 22.94 });
    expect(findOtherEditions(a, [a, b])).toEqual([]);
  });

  it('does not glue a short name into a longer, different one', () => {
    const a = race('a', 'Night Run 2026', '2026-06-01');
    const b = race('b', 'Kallithea Night Run 2027', '2027-06-01');
    expect(findOtherEditions(a, [a, b])).toEqual([]);
  });
});
