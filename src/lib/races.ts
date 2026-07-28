import type { SupabaseClient } from '@supabase/supabase-js';
import { Database, Race, SubRace, RaceWithSubRaces } from '../types/database';

interface SubRaceJoin {
  id: string;
  has_gpx: boolean | null;
  distance: number | null;
  // Present only when fetched with SUB_RACE_SCHEMA_COLUMNS (build-time pages).
  name?: string | null;
  date?: string | null;
  price?: number | null;
  start_time?: string | null;
  race_type?: string | null;
}

// Sub-race columns for the slim client payload (/api/races) — just enough for
// the map markers and the "has GPX" / distance filters.
const SUB_RACE_LIST_COLUMNS = 'id, has_gpx, distance';

// Wider sub-race columns used at build time for race detail pages, where the
// extra fields feed SportsEvent structured data (subEvent names, dates, offers).
export const SUB_RACE_SCHEMA_COLUMNS =
  'id, has_gpx, distance, name, date, price, start_time, race_type';

interface RawRaceRow {
  id: string;
  [key: string]: unknown;
  sub_races: SubRaceJoin | SubRaceJoin[] | null;
}

/**
 * Fetches races with at least one sub-race and known coordinates.
 *
 * Supabase's `!inner` join returns one row per (race, sub-race) pair, so we
 * group by race id and collapse the sub-race rows into an array. Only the
 * `id` and `has_gpx` columns of each sub-race are pulled in — that's all the
 * "has any GPX?" client filter needs.
 *
 * Returns `[]` on any error (logged) so the page still renders.
 */
export async function fetchRacesWithSubRaces(
  supabase: SupabaseClient<Database>,
  columns: string = '*',
  subRaceColumns: string = SUB_RACE_LIST_COLUMNS,
): Promise<RaceWithSubRaces[]> {
  try {
    const { data, error } = await supabase
      .from('races')
      .select(`${columns}, sub_races!inner(${subRaceColumns})`)
      .not('location_lat', 'is', null)
      .not('location_lng', 'is', null)
      .limit(1000);

    if (error) {
      console.error('Error fetching races:', error);
      return [];
    }
    if (!data) return [];

    const byId = new Map<string, RaceWithSubRaces>();
    for (const item of data as unknown as RawRaceRow[]) {
      const existing = byId.get(item.id);
      const joined = Array.isArray(item.sub_races)
        ? item.sub_races
        : item.sub_races
          ? [item.sub_races]
          : [];
      if (existing) {
        existing.sub_races.push(...joined);
      } else {
        const { sub_races: _, ...rest } = item;
        byId.set(item.id, { ...(rest as unknown as Race), sub_races: joined });
      }
    }
    return Array.from(byId.values());
  } catch (err) {
    console.error('Supabase configuration missing or error occurred:', err);
    return [];
  }
}

// Slim column set for map markers, the race list, and client-side filters.
// Excludes heavy detail-only fields (description, translations, certifications,
// registration links, etc.) to keep the /api/races payload small — those are
// loaded per race via `fetchRaceById` when a race is selected.
export const RACE_LIST_COLUMNS = [
  'id',
  'event_name',
  'event_name_en',
  'event_type',
  'max_distance',
  'dates',
  'location_lat',
  'location_lng',
  'location_region',
  'location_city',
  'location_place',
  'status',
  'is_featured',
  'featured_icon',
  'featured_bg_color',
].join(', ');

/**
 * Slim race list for the map/sidebar. Same shape as fetchRacesWithSubRaces but
 * only the columns the map, list, and filters actually read.
 */
export function fetchRaceListItems(
  supabase: SupabaseClient<Database>,
): Promise<RaceWithSubRaces[]> {
  return fetchRacesWithSubRaces(supabase, RACE_LIST_COLUMNS);
}

/**
 * Strips a (possibly full) race down to the slim list shape — used when
 * embedding a race subset into server-rendered HTML (hub pages) so heavy
 * fields like descriptions don't bloat the page payload.
 */
export function toRaceListItem(race: RaceWithSubRaces): RaceWithSubRaces {
  return {
    id: race.id,
    event_name: race.event_name,
    event_name_en: race.event_name_en,
    event_type: race.event_type,
    max_distance: race.max_distance,
    dates: race.dates,
    location_lat: race.location_lat,
    location_lng: race.location_lng,
    location_region: race.location_region,
    location_city: race.location_city,
    location_place: race.location_place,
    status: race.status,
    sub_races: race.sub_races.map((s) => ({
      id: s.id,
      has_gpx: s.has_gpx,
      distance: s.distance,
    })),
  } as unknown as RaceWithSubRaces;
}

/**
 * Full detail for a single race, loaded on-demand when a race is selected so the
 * list payload can stay slim. Returns `null` on error or if not found.
 */
export async function fetchRaceById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<RaceWithSubRaces | null> {
  try {
    const { data, error } = await supabase
      .from('races')
      .select('*, sub_races(id, has_gpx, distance)')
      .eq('id', id)
      .single();

    if (error || !data) {
      if (error) console.error('Error fetching race detail:', error);
      return null;
    }

    const { sub_races, ...rest } = data as unknown as RawRaceRow;
    const joined = Array.isArray(sub_races) ? sub_races : sub_races ? [sub_races] : [];
    return { ...(rest as unknown as Race), sub_races: joined };
  } catch (err) {
    console.error('Supabase error fetching race detail:', err);
    return null;
  }
}

let cachedRaces: RaceWithSubRaces[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60000; // 1 minute cache TTL

/**
 * Cached wrapper around fetchRacesWithSubRaces.
 * Prevents slamming the database with concurrent requests during next build.
 */
export async function fetchRacesCached(
  supabase: SupabaseClient<Database>,
): Promise<RaceWithSubRaces[]> {
  const now = Date.now();
  // If cache is empty or expired (TTL), fetch fresh data
  if (!cachedRaces || now - lastFetchTime > CACHE_TTL_MS) {
    // Build-time consumers (race pages, sitemap) get the wider sub-race columns
    // so structured data can describe each distance as a subEvent with offers.
    cachedRaces = await fetchRacesWithSubRaces(supabase, '*', SUB_RACE_SCHEMA_COLUMNS);
    lastFetchTime = now;
  }
  return cachedRaces;
}

