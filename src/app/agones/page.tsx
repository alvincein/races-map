import Link from 'next/link';
import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import { fetchRacesCached } from '@/lib/races';
import { getActiveHubs, athensToday, hubPath, KIND_META, type HubKind } from '@/lib/hubs';
import { SITE_URL } from '@/lib/site';

// Refreshed daily (cheap: one page) and on-demand via /api/revalidate.
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

const KIND_ORDER: HubKind[] = ['month', 'city', 'mountain', 'distance', 'type', 'region'];

export default async function AgonesIndexPage() {
  const races = await fetchRacesCached(supabase);
  const today = athensToday();
  const hubs = getActiveHubs(races, today);
  const year = today.slice(0, 4);
  const upcomingTotal = new Set(
    hubs.flatMap((h) => h.upcoming.map((r) => r.id)),
  ).size;

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
      <h1>Ημερολόγιο Αγώνων Δρόμου & Trail στην Ελλάδα {year}</h1>
      <p className="hub-intro">
        Όλοι οι αγώνες τρεξίματος στην Ελλάδα σε ένα καλεντάρι — {upcomingTotal} προγραμματισμένοι
        αγώνες δρόμου, βουνού και trail. Διάλεξε πόλη, βουνό, μήνα ή απόσταση, ή δες τους όλους στον{' '}
        <Link href="/">διαδραστικό χάρτη</Link>. Το ημερολόγιο ενημερώνεται καθημερινά από τις
        επίσημες σελίδες των διοργανωτών.
      </p>

      {KIND_ORDER.map((kind) => {
        const group = hubs.filter((h) => h.kind === kind);
        if (group.length === 0) return null;
        return (
          <section key={kind} className="hub-index-section">
            <h2>{KIND_META[kind].heading}</h2>
            <ul className="hub-link-grid">
              {group.map((h) => (
                <li key={h.slug}>
                  <Link href={hubPath(h)}>
                    {h.name} <span className="hub-count">({h.upcoming.length})</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}
