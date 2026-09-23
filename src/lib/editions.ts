import type { RaceWithSubRaces } from '../types/database';
import { haversineKm, raceDate } from './relatedRaces';

// Other years of the same event, identified the way the race-scraper does
// (race_matching.py / filter_existing_races.py): names match once accents,
// years and the leading ordinal ("20ος", "11th") are stripped, and two matches
// closer than EDITION_GAP_DAYS are one edition, not two years of an event.
const EDITION_GAP_DAYS = 300;
// Generic names ("Night Run") recur in different towns.
const MAX_VENUE_KM = 30;
const MIN_KEY_LENGTH = 8;
// "Crete Marathon" inside "Crete Marathon – Crete Marathon" counts as the same
// name, but only for names this long: short fragments glue unrelated races.
const MIN_CONTAINMENT_LENGTH = 12;

// Applied after ς→σ, so the Greek ordinal suffixes appear as "οσ"/"ησ".
const EDITION_PREFIX = /^\d{1,3}\s*(?:οσ|ου|ο|ησ|η|α|th|st|nd|rd|os|o)?\s+/;
const PUNCTUATION = /[()[\]«»"'’·|/,.\-–—:!;&+]/g;
const YEAR_TOKEN = /(^|[^0-9a-z])20\d{2}(?![0-9a-z])/g;

const DIGRAPHS: [string, string][] = [
  ['ου', 'ou'], ['αι', 'ai'], ['ει', 'ei'], ['οι', 'oi'], ['μπ', 'b'],
  ['ντ', 'nt'], ['γκ', 'gk'], ['γγ', 'ng'], ['τσ', 'ts'], ['τζ', 'tz'],
];
const LETTERS: Record<string, string> = {
  α: 'a', β: 'v', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'i', θ: 'th', ι: 'i', κ: 'k', λ: 'l', μ: 'm',
  ν: 'n', ξ: 'x', ο: 'o', π: 'p', ρ: 'r', σ: 's', τ: 't', υ: 'y', φ: 'f', χ: 'ch', ψ: 'ps', ω: 'o',
};

const DAY_MS = 86_400_000;

/** Lowercase, accent-, year- and ordinal-free form of a race name. */
export function normalizeEventName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/ς/g, 'σ')
    .replace(PUNCTUATION, ' ')
    .replace(YEAR_TOKEN, '$1 ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(EDITION_PREFIX, '')
    .trim();
}

// Greek→Latin, so "Αγρινίου" one year matches "Agrinio" the next.
function transliterate(normalized: string): string {
  let s = normalized;
  for (const [greek, latin] of DIGRAPHS) s = s.split(greek).join(latin);
  return Array.from(s, (c) => LETTERS[c] ?? c).join('');
}

const keyCache = new WeakMap<RaceWithSubRaces, string[]>();

function editionKeys(race: RaceWithSubRaces): string[] {
  let keys = keyCache.get(race);
  if (!keys) {
    const unique = new Set<string>();
    for (const name of [race.event_name, race.event_name_en]) {
      if (!name) continue;
      const key = transliterate(normalizeEventName(name));
      if (key.length >= MIN_KEY_LENGTH) unique.add(key);
    }
    keys = Array.from(unique);
    keyCache.set(race, keys);
  }
  return keys;
}

function sameName(a: string[], b: string[]): boolean {
  return a.some((x) =>
    b.some(
      (y) =>
        x === y ||
        (Math.min(x.length, y.length) >= MIN_CONTAINMENT_LENGTH && (x.includes(y) || y.includes(x))),
    ),
  );
}

/** Other years' editions of a race ("Άλλες χρονιές"), oldest first. */
export function findOtherEditions(race: RaceWithSubRaces, all: RaceWithSubRaces[]): RaceWithSubRaces[] {
  const date = raceDate(race);
  const { location_lat: lat, location_lng: lng } = race;
  const keys = editionKeys(race);
  if (!date || lat == null || lng == null || keys.length === 0) return [];
  const time = new Date(date).getTime();

  return all
    .filter((r) => {
      if (r.id === race.id) return false;
      const d = raceDate(r);
      if (!d || r.location_lat == null || r.location_lng == null) return false;
      if (Math.abs(new Date(d).getTime() - time) < EDITION_GAP_DAYS * DAY_MS) return false;
      if (haversineKm(lat, lng, r.location_lat, r.location_lng) > MAX_VENUE_KM) return false;
      return sameName(keys, editionKeys(r));
    })
    .sort((a, b) => raceDate(a)!.localeCompare(raceDate(b)!));
}
