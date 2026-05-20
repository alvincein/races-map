import { supabase } from '@/lib/supabase';
import HomeClient from '@/components/HomeClient';
import { fetchRacesCached } from '@/lib/races';
import type { RaceWithSubRaces } from '@/types/database';

export const revalidate = 1800;

export default async function Home() {
  const races = (await fetchRacesCached(supabase)) as RaceWithSubRaces[];

  return <HomeClient initialRaces={races} />;
}

