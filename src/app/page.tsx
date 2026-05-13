import { supabase } from '@/lib/supabase';
import HomeClient from '@/components/HomeClient';
import { fetchRacesWithSubRaces } from '@/lib/races';
import type { Race } from '@/types/database';

export const revalidate = 1800;

export default async function Home() {
  const races = (await fetchRacesWithSubRaces(supabase)) as unknown as Race[];

  return <HomeClient initialRaces={races} />;
}
