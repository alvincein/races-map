import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { fetchRaceById } from '@/lib/races';
import { getRaceSlug } from '@/lib/slugs';

// On-demand revalidation hook. Call this from the import/scrape pipeline after
// races are added or updated so cached content refreshes immediately instead of
// on a timer.
//
//   POST /api/revalidate?secret=YOUR_SECRET
//   optional JSON body: { "ids": ["<race-uuid>", ...] }   // recommended
//                    or { "slugs": ["athens-marathon-2026-1c6eda51", ...] }
//
// Always refreshes the shared map data (/api/races), the home page, and the
// sitemap — that covers newly added races. Pass the `ids` of races whose own
// details changed to also refresh their individual detail pages; the slug is
// resolved server-side so callers don't need to reproduce the slug logic.
export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ message: 'Invalid or missing secret' }, { status: 401 });
  }

  // Shared surfaces that depend on the whole race set.
  revalidatePath('/api/races');
  revalidatePath('/');
  revalidatePath('/sitemap.xml');
  // Hub landing pages (/agones/*) list many races each — refresh them all.
  revalidatePath('/agones');
  revalidatePath('/agones/[hub]', 'page');
  const revalidated = ['/api/races', '/', '/sitemap.xml', '/agones', '/agones/[hub]'];

  let slugs: string[] = [];
  let ids: string[] = [];
  try {
    const body = await request.json();
    if (Array.isArray(body?.slugs)) {
      slugs = body.slugs.filter((s: unknown): s is string => typeof s === 'string');
    }
    if (Array.isArray(body?.ids)) {
      ids = body.ids.filter((s: unknown): s is string => typeof s === 'string');
    }
  } catch {
    // No body or invalid JSON — that's fine, the shared paths above still ran.
  }

  // Resolve race ids to their canonical slugs so callers can just send ids.
  for (const id of ids) {
    const race = await fetchRaceById(supabase, id);
    if (race) slugs.push(getRaceSlug(race));
  }

  // Refresh individual race detail pages (deduped).
  for (const slug of Array.from(new Set(slugs))) {
    revalidatePath(`/race/${slug}`);
    revalidated.push(`/race/${slug}`);
  }

  return NextResponse.json({ revalidated });
}
