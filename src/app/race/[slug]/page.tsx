import { supabase } from '@/lib/supabase';
import HomeClient from '@/components/HomeClient';
import { fetchRacesCached } from '@/lib/races';
import { getRaceSlug } from '@/lib/slugs';
import { getRegionLabel } from '@/lib/regions';
import { computeRelatedRaces } from '@/lib/relatedRaces';
import { SITE_URL } from '@/lib/site';
import type { RaceWithSubRaces } from '@/types/database';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

// Race detail pages are static and change only when that race is imported or
// edited. Cache indefinitely and refresh on-demand via /api/revalidate instead
// of regenerating every 30 minutes across ~1,000 pages. New race slugs not in
// the last build are generated on first request (dynamicParams defaults to true)
// and then cached.
export const revalidate = false;

interface Props {
  params: Promise<{ slug: string }>;
}

// Generate static params for all races to statically pre-render them at build time
export async function generateStaticParams() {
  const races = await fetchRacesCached(supabase);
  return races.map((race) => ({
    slug: getRaceSlug(race),
  }));
}

// Generate dynamic metadata for SEO and social sharing tags
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const races = await fetchRacesCached(supabase);
  const race = races.find((r) => getRaceSlug(r) === slug || r.id === slug);

  if (!race) {
    return {
      title: 'Race Not Found - RaceMap',
    };
  }

  const city = race.location_place || race.location_city || '';
  const distances = race.sub_races
    .map((s) => s.distance)
    .filter((d): d is number => typeof d === 'number')
    .sort((a, b) => b - a)
    .map((d) => (d >= 1000 ? `${d / 1000}χλμ` : `${d}μ`))
    .join(', ');

  const description = (
    race.display_description ||
    race.description_en ||
    `Ο αγώνας ${race.event_name}${city ? ` στην τοποθεσία ${city}` : ''}${distances ? ` με αποστάσεις ${distances}` : ''}. Δείτε ημερομηνία, χάρτη διαδρομής, υψομετρικό προφίλ και σύνδεσμο εγγραφής στο RaceMap.`
  ).substring(0, 160);

  const dateStr =
    race.dates && race.dates.length > 0
      ? new Date(race.dates[0]).toLocaleDateString('el-GR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : '';

  // The layout's title.template appends "| RaceMap" — don't brand it here too.
  const pageTitle = [race.event_name, dateStr, city].filter(Boolean).join(' – ');
  const raceSlug = getRaceSlug(race);

  return {
    title: pageTitle,
    description,
    alternates: {
      canonical: `/race/${raceSlug}`,
    },
    openGraph: {
      title: pageTitle,
      description,
      type: 'website',
      url: `/race/${raceSlug}`,
      siteName: 'RaceMap',
      locale: 'el_GR',
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description,
    },
  };
}

// schema.org EventStatusType, keyed by our races.status values.
const EVENT_STATUS_SCHEMA: Record<string, string> = {
  scheduled: 'https://schema.org/EventScheduled',
  postponed: 'https://schema.org/EventPostponed',
  cancelled: 'https://schema.org/EventCancelled',
};

// Sub-race distances are stored in meters.
function distanceLabel(meters: number): string {
  return meters >= 1000 ? `${meters / 1000}χλμ` : `${meters}μ`;
}

// Combine a sub-race date ('YYYY-MM-DD') with its start time ('HH:MM[:SS]')
// into an ISO-ish datetime; fall back to the bare date when time is absent
// or malformed.
function subRaceStartDate(date: string, startTime: string | null | undefined): string {
  if (!startTime || date.includes('T')) return date;
  const match = startTime.match(/^([01]?\d|2[0-3]):[0-5]\d/);
  return match ? `${date}T${match[0].padStart(5, '0')}` : date;
}

// Structured data for the race: a SportsEvent enriched with everything the DB
// knows — status, offers (entry fees), and each distance as a subEvent. This
// is what makes the pages eligible for Google's event rich results.
function buildRaceJsonLd(race: RaceWithSubRaces, raceSlug: string) {
  const pageUrl = `${SITE_URL}/race/${raceSlug}`;
  const officialUrl = race.event_url || race.scraped_url || undefined;
  const registrationUrl = race.registration_url || officialUrl;
  const startDate = race.start_date || (race.dates && race.dates[0]) || undefined;

  const location = {
    '@type': 'Place',
    name: race.location_place || race.location_city || 'Greece',
    address: {
      '@type': 'PostalAddress',
      addressLocality: race.location_city || undefined,
      addressRegion: race.location_region ? getRegionLabel(race.location_region) : undefined,
      addressCountry: 'GR',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: race.location_lat,
      longitude: race.location_lng,
    },
  };

  const prices = race.sub_races
    .map((s) => s.price)
    .filter((p): p is number => typeof p === 'number' && p >= 0);

  const subEvents = race.sub_races
    .filter((s) => s.name || typeof s.distance === 'number')
    .map((s) => ({
      '@type': 'SportsEvent',
      name:
        s.name ||
        (typeof s.distance === 'number'
          ? `${race.event_name} – ${distanceLabel(s.distance)}`
          : race.event_name),
      startDate: s.date ? subRaceStartDate(s.date, s.start_time) : startDate,
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      eventStatus: (race.status && EVENT_STATUS_SCHEMA[race.status]) || undefined,
      location,
      offers:
        typeof s.price === 'number' && s.price >= 0
          ? {
              '@type': 'Offer',
              price: s.price,
              priceCurrency: 'EUR',
              url: registrationUrl,
            }
          : undefined,
    }));

  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: race.event_name,
    description: race.display_description || race.description_en || undefined,
    startDate,
    endDate: race.end_date || undefined,
    eventStatus: (race.status && EVENT_STATUS_SCHEMA[race.status]) || undefined,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    sport: 'Running',
    location,
    url: pageUrl,
    sameAs: officialUrl,
    offers:
      prices.length > 0
        ? {
            '@type': 'AggregateOffer',
            priceCurrency: 'EUR',
            lowPrice: Math.min(...prices),
            highPrice: Math.max(...prices),
            offerCount: prices.length,
            url: registrationUrl,
          }
        : undefined,
    subEvent: subEvents.length > 0 ? subEvents : undefined,
  };
}

export default async function RacePage({ params }: Props) {
  const { slug } = await params;
  const races = await fetchRacesCached(supabase);
  const race = races.find((r) => getRaceSlug(r) === slug || r.id === slug);

  if (!race) {
    notFound();
  }

  const jsonLd = buildRaceJsonLd(race, getRaceSlug(race));
  // Server-computed internal links ("Σχετικοί Αγώνες") — crawlable in the
  // static HTML, so race pages link to each other instead of being islands
  // reachable only via the sitemap.
  const relatedRaces = computeRelatedRaces(race, races);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <HomeClient initialSelectedRace={race} initialSelectedRaceId={race.id} relatedRaces={relatedRaces} />
    </>
  );
}
