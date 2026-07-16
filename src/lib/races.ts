import type { SupabaseClient } from '@supabase/supabase-js';
import { Database, Race, SubRace, RaceWithSubRaces } from '../types/database';

interface SubRaceJoin {
  id: string;
  has_gpx: boolean | null;
  distance: number | null;
}

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
): Promise<RaceWithSubRaces[]> {
  try {
    const { data, error } = await supabase
      .from('races')
      .select(`${columns}, sub_races!inner(id, has_gpx, distance)`)
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
    cachedRaces = await fetchRacesWithSubRaces(supabase);
    lastFetchTime = now;
  }
  return cachedRaces;
}

