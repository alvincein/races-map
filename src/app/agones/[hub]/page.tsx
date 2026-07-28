import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import HomeClient from '@/components/HomeClient';
import { supabase } from '@/lib/supabase';
import { fetchRacesCached, toRaceListItem } from '@/lib/races';
import {
  getActiveHubs,
  resolveHub,
  athensToday,
  hubPath,
  getRaceSlug,
} from '@/lib/hubs';
import { SITE_URL } from '@/lib/site';

// Hub landing pages render the map app scoped to the hub's races: the SEO
// payload (title/meta, sr-only H1, SSR'd sidebar list with real race links,
// JSON-LD) lives in the initial HTML, while the presentation stays the
// compact map-based design. Daily refresh keeps "upcoming" honest; the
// scraper's /api/revalidate hook refreshes immediately on data changes.
export const revalidate = 86400;

interface Props {
  params: Promise<{ hub: string }>;
}

export async function generateStaticParams() {
  const races = await fetchRacesCached(supabase);
  return getActiveHubs(races, athensToday()).map((h) => ({ hub: h.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { hub: slug } = await params;
  const races = await fetchRacesCached(supabase);
  const hub = resolveHub(slug, races);
  if (!hub) return { title: 'Δεν βρέθηκε – RaceMap' };
  return {
    title: hub.metaTitle,
    description: hub.metaDescription,
    alternates: { canonical: hubPath(hub) },
    openGraph: {
      title: hub.metaTitle,
      description: hub.metaDescription,
      url: hubPath(hub),
      type: 'website',
    },
  };
}

export default async function HubPage({ params }: Props) {
  const { hub: slug } = await params;
  const races = await fetchRacesCached(supabase);
  const today = athensToday();
  const hub = resolveHub(slug, races, today);
  if (!hub) notFound();

  // Slim payload for the SSR'd sidebar list — no heavy detail fields.
  const hubRaces = hub.upcoming.map(toRaceListItem);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: hub.metaTitle,
    description: hub.metaDescription,
    url: `${SITE_URL}${hubPath(hub)}`,
    inLanguage: 'el',
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Αρχική', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'Ημερολόγιο Αγώνων', item: `${SITE_URL}/agones` },
        { '@type': 'ListItem', position: 3, name: hub.name },
      ],
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: hub.upcoming.length,
      itemListElement: hub.upcoming.slice(0, 50).map((r, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: r.event_name,
        url: `${SITE_URL}/race/${getRaceSlug(r)}`,
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      {/* The map UI shows the hub title inside the list panel; give crawlers
          an explicit page heading too. */}
      <h1 className="sr-only">{hub.h1}</h1>
      <HomeClient
        initialRaces={hubRaces}
        initialHub={{
          slug: hub.slug,
          name: hub.name,
          h1: hub.h1,
          intro: hub.intro,
          raceIds: hubRaces.map((r) => r.id),
          area: hub.area ?? null,
        }}
      />
    </>
  );
}
