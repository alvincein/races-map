import { supabase } from '@/lib/supabase';
import HomeClient from '@/components/HomeClient';
import { fetchRacesCached } from '@/lib/races';
import type { RaceWithSubRaces } from '@/types/database';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const revalidate = 1800;

interface Props {
  params: Promise<{ id: string }>;
}

// Generate static params for all races to statically pre-render them at build time
export async function generateStaticParams() {
  const races = await fetchRacesCached(supabase);
  return races.map((race) => ({
    id: race.id,
  }));
}

// Generate dynamic metadata for SEO and social sharing tags
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const races = await fetchRacesCached(supabase);
  const race = races.find((r) => r.id === id);

  if (!race) {
    return {
      title: 'Race Not Found - Greek Running Races',
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

  const pageTitle = `${race.event_name}${dateStr ? ` - ${dateStr}` : ''} - Greek Running Races`;

  return {
    title: pageTitle,
    description: description.substring(0, 160),
    openGraph: {
      title: race.event_name,
      description: description.substring(0, 160),
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: race.event_name,
      description: description.substring(0, 160),
    },
  };
}

export default async function RacePage({ params }: Props) {
  const { id } = await params;
  const races = await fetchRacesCached(supabase);
  const race = races.find((r) => r.id === id);

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
      <HomeClient initialRaces={races} initialSelectedRaceId={id} />
    </>
  );
}

