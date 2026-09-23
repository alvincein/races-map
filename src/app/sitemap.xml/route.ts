import { supabase } from '@/lib/supabase';
import { fetchSitemapRaces } from '@/lib/races';
import { athensToday } from '@/lib/hubs';
import { buildSitemapEntries, renderSitemapXml } from '@/lib/sitemap';
import { SITE_URL } from '@/lib/site';

// Rendered per request and cached by Vercel's CDN for an hour — not ISR. As an
// ISR route (app/sitemap.ts) it never refreshed in production: neither its
// revalidate timer nor revalidatePath('/sitemap.xml') replaced the build-time
// copy, so it only changed on deploys.
export const dynamic = 'force-dynamic';

export async function GET() {
  const races = await fetchSitemapRaces(supabase);

  // The fetch returns [] on a database error. Serving (and caching) an empty
  // sitemap would tell Google the site has no pages; a 503 makes it retry.
  if (races.length === 0) {
    return new Response('Sitemap temporarily unavailable', {
      status: 503,
      headers: { 'Cache-Control': 'no-store', 'Retry-After': '600' },
    });
  }

  const xml = renderSitemapXml(buildSitemapEntries(races, athensToday(), SITE_URL), new Date());
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
