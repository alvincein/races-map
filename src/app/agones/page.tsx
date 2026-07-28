import type { Metadata } from 'next';
import HomeClient from '@/components/HomeClient';
import { supabase } from '@/lib/supabase';
import { fetchRacesCached } from '@/lib/races';
import { getActiveHubs, athensToday, buildHubDirectory } from '@/lib/hubs';
import { SITE_URL } from '@/lib/site';

// The calendar index: the map app with a hub directory panel in the sidebar.
// Refreshed daily and on-demand via /api/revalidate.
export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Ημερολόγιο Αγώνων Δρόμου & Trail στην Ελλάδα – Καλεντάρι Αγώνων',
  description:
    'Το πλήρες καλεντάρι αγώνων τρεξίματος στην Ελλάδα: αγώνες δρόμου, ορεινό τρέξιμο και trail ανά πόλη, βουνό, μήνα, απόσταση και περιφέρεια — με ημερομηνίες, αποστάσεις και εγγραφές.',
  alternates: { canonical: '/agones' },
  openGraph: {
    title: 'Ημερολόγιο Αγώνων Δρόμου & Trail στην Ελλάδα',
    url: '/agones',
    type: 'website',
  },
};

export default async function AgonesIndexPage() {
  const races = await fetchRacesCached(supabase);
  const today = athensToday();
  const hubs = getActiveHubs(races, today);
  const directory = buildHubDirectory(hubs);
  const year = today.slice(0, 4);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Ημερολόγιο Αγώνων Δρόμου & Trail στην Ελλάδα ${year}`,
    url: `${SITE_URL}/agones`,
    inLanguage: 'el',
    isPartOf: { '@type': 'WebSite', name: 'RaceMap', url: `${SITE_URL}/` },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Αρχική', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'Ημερολόγιο Αγώνων' },
      ],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <h1 className="sr-only">Ημερολόγιο Αγώνων Δρόμου & Trail στην Ελλάδα {year}</h1>
      <HomeClient hubDirectory={directory} />
    </>
  );
}
