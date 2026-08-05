import type { Metadata } from 'next';
import HomeClient from '@/components/HomeClient';
import { SITE_URL } from '@/lib/site';
import { supabase } from '@/lib/supabase';
import { fetchRacesCached, toRaceListItem } from '@/lib/races';
import { raceDate } from '@/lib/relatedRaces';
import { athensToday } from '@/lib/hubs';

// Daily refresh keeps the server-rendered "upcoming" list honest as dates roll
// past, the same reason the hub pages use it. One ISR write a day for one route.
// The scraper's /api/revalidate hook still refreshes immediately on data change.
export const revalidate = 86400;

// How many upcoming races to server-render into the sidebar list. The home page
// is the site's highest-authority page but shipped an empty map shell: a single
// outbound link and no indexable text, which is what left the race pages
// stranded in "Discovered - currently not indexed". Keep this modest — each
// race adds its slim payload to the HTML twice (markup + RSC).
const SSR_RACE_COUNT = 24;

// The root layout's relative `canonical: './'` resolves to /index on the home
// route, which pointed Google at an alias of this page instead of the origin.
// Every other route sets its own canonical, so pin this one absolutely.
export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

// WebSite markup drives Google's "site name" display in search results
// (proper-case "RaceMap" instead of the bare domain); Organization + logo
// feeds brand/logo surfaces. Google only reads these from the homepage.
const homeJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      name: 'RaceMap',
      alternateName: ['racemap.gr', 'RaceMap Ελλάδα'],
      url: `${SITE_URL}/`,
      inLanguage: 'el',
    },
    {
      '@type': 'Organization',
      name: 'RaceMap',
      url: `${SITE_URL}/`,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo-512.png`,
      },
    },
  ],
};

export default async function Home() {
  // Next SSR_RACE_COUNT races by date, so the initial HTML carries real
  // /race/ links. The client replaces this with the full set from the
  // edge-cached /api/races on hydration.
  const races = await fetchRacesCached(supabase);
  const today = athensToday();
  const upcoming = races
    .filter((r) => {
      const d = raceDate(r);
      return !!d && d.slice(0, 10) >= today;
    })
    .sort((a, b) => (raceDate(a) ?? '').localeCompare(raceDate(b) ?? ''))
    .slice(0, SSR_RACE_COUNT)
    .map(toRaceListItem);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(homeJsonLd).replace(/</g, '\\u003c'),
        }}
      />
      {/* The map UI has no visible page heading; give crawlers and screen
          readers an explicit one. */}
      <h1 className="sr-only">
        Αγώνες Δρόμου & Trail στην Ελλάδα – Διαδραστικός Χάρτης Αγώνων
      </h1>
      <HomeClient initialRaces={upcoming} />
    </>
  );
}
