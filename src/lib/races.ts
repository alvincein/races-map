import type { SupabaseClient } from '@supabase/supabase-js';
import { Database, Race, SubRace } from '../types/database';

export type RaceWithSubRaces = Race & {
  sub_races: Pick<SubRace, 'id' | 'has_gpx'>[];
};

interface SubRaceJoin {
  id: string;
  has_gpx: boolean | null;
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
): Promise<RaceWithSubRaces[]> {
  try {
    const { data, error } = await supabase
      .from('races')
      .select('*, sub_races!inner(id, has_gpx)')
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
