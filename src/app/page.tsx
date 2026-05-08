import { supabase } from '@/lib/supabase';
import HomeClient from '@/components/HomeClient';
import { Race } from '@/types/database';

// Opt out of caching if we want real-time updates, or revalidate every hour
export const revalidate = 3600; 

export default async function Home() {
  let races: Race[] = [];

  try {
    // We only fetch races that have coordinates AND have at least one sub-race
    const { data, error } = await supabase
      .from('races')
      .select('*, sub_races!inner(id)')
      .not('location_lat', 'is', null)
      .not('location_lng', 'is', null)
      .limit(1000); 
    
    if (error) {
      console.error('Error fetching races:', error);
    } else if (data) {
      // Deduplicate races (Supabase inner join might return multiple rows per race)
      const uniqueRaces = Array.from(new Map(data.map(item => [item.id, item])).values());
      races = uniqueRaces as unknown as Race[];
    }
  } catch (err) {
    console.error('Supabase configuration missing or error occurred:', err);
  }

  // Fallback data if Supabase connection fails or is not yet configured
  if (races.length === 0) {
    races = [
      {
        id: "89812f61-0666-48ce-a08a-2af4d72df863",
        event_name: "Half Marathon Mykonos 21km",
        description: "Το EVOLUTION TRAINING CLUB, προκηρύσσει τον αγώνα HALF MARATHON...",
        dates: ["2026-04-19"],
        max_distance: 21000,
        event_type: "Road",
        location_place: "Φάρος Αρμενιστής",
        location_lat: 37.4850517,
        location_lng: 25.3171581,
        created_at: "2026-03-28",
      } as unknown as Race
    ];
  }

  return <HomeClient initialRaces={races} />;
}
