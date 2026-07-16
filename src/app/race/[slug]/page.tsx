import { supabase } from '@/lib/supabase';
import HomeClient from '@/components/HomeClient';
import { fetchRacesCached } from '@/lib/races';
import { getRaceSlug } from '@/lib/slugs';
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

  const description =
    race.description ||
    race.description_en ||
    `Δείτε πληροφορίες, χάρτη διαδρομής, υψομετρικό προφίλ και δηλώστε συμμετοχή για τον αγώνα ${race.event_name}.`;

  const dateStr =
    race.dates && race.dates.length > 0
      ? new Date(race.dates[0]).toLocaleDateString('el-GR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : '';

  const pageTitle = `${race.event_name}${dateStr ? ` - ${dateStr}` : ''} - RaceMap`;
  const raceSlug = getRaceSlug(race);

  return {
    title: pageTitle,
    description: description.substring(0, 160),
    alternates: {
      canonical: `/race/${raceSlug}`,
    },
    openGraph: {
      title: race.event_name,
      description: description.substring(0, 160),
      type: 'website',
      url: `/race/${raceSlug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: race.event_name,
      description: description.substring(0, 160),
    },
  };
}

export default async function RacePage({ params }: Props) {
  const { slug } = await params;
  const races = await fetchRacesCached(supabase);
  const race = races.find((r) => getRaceSlug(r) === slug || r.id === slug);

  if (!race) {
    notFound();
  }

  // Construct structured data using Schema.org SportsEvent
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: race.event_name,
    description: race.description || race.description_en || undefined,
    startDate: race.dates && race.dates.length > 0 ? race.dates[0] : undefined,
    location: {
      '@type': 'Place',
      name: race.location_place || race.location_city || 'Greece',
      address: {
        '@type': 'PostalAddress',
        addressLocality: race.location_city || undefined,
        addressCountry: 'GR',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: race.location_lat,
        longitude: race.location_lng,
      },
    },
    url: race.event_url || race.scraped_url || undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <HomeClient initialSelectedRace={race} initialSelectedRaceId={race.id} />
    </>
  );
}
