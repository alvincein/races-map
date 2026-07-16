import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { fetchRaceListItems } from '@/lib/races';

// Serve the full race list from a single, edge-cached endpoint instead of
// embedding ~1,000 races into every statically generated page. `force-static`
// prerenders the response and serves it from the CDN; `revalidate = false`
// caches it indefinitely so Supabase is queried only when the data actually
// changes. Refresh it on-demand via /api/revalidate (which calls
// revalidatePath('/api/races')) from the import/scrape pipeline.
export const dynamic = 'force-static';
export const revalidate = false;

export async function GET() {
  const races = await fetchRaceListItems(supabase);
  return NextResponse.json(races);
}
