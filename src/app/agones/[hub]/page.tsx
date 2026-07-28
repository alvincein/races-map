import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { fetchRacesCached } from '@/lib/races';
import {
  getActiveHubs,
  resolveHub,
  athensToday,
  hubPath,
  getRaceSlug,
  KIND_META,
  type ResolvedHub,
} from '@/lib/hubs';
import { SITE_URL } from '@/lib/site';
import type { RaceWithSubRaces } from '@/types/database';

// Daily refresh keeps "upcoming vs past" honest; the scraper's
// /api/revalidate hook refreshes immediately when race data changes.
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

function distanceLabel(meters: number): string {
  return meters >= 1000 ? `${meters / 1000}χλμ` : `${meters}μ`;
}

function raceDateOf(race: RaceWithSubRaces): string | null {
  return race.start_date || (race.dates && race.dates[0]) || null;
}

function RaceRow({ race }: { race: RaceWithSubRaces }) {
  const d = raceDateOf(race);
  const dateStr = d
    ? new Date(d).toLocaleDateString('el-GR', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Χωρίς ημερομηνία';
  const distances = race.sub_races
    .map((s) => s.distance)
    .filter((x): x is number => typeof x === 'number')
    .sort((a, b) => b - a)
    .slice(0, 4);
  return (
    <li className="hub-race-row">
      {d && <time dateTime={d.slice(0, 10)}>{dateStr}</time>}
      <div className="hub-race-main">
        <Link href={`/race/${getRaceSlug(race)}`}>{race.event_name}</Link>
        <span className="hub-race-place">
          {race.location_place || race.location_city || 'Ελλάδα'}
          {race.status === 'cancelled' && <em className="hub-cancelled"> · ΑΚΥΡΩΘΗΚΕ</em>}
          {race.status === 'postponed' && <em className="hub-cancelled"> · ΑΝΑΒΛΗΘΗΚΕ</em>}
        </span>
      </div>
      <span className="hub-race-distances">
        {distances.map((x) => (
          <span key={x} className="hub-chip">
            {distanceLabel(x)}
          </span>
        ))}
      </span>
    </li>
  );
}

function groupByMonth(races: RaceWithSubRaces[]): [string, RaceWithSubRaces[]][] {
  const groups = new Map<string, RaceWithSubRaces[]>();
  for (const r of races) {
    const d = raceDateOf(r);
    const key = d
      ? new Date(d).toLocaleDateString('el-GR', { month: 'long', year: 'numeric' })
      : 'Χωρίς ημερομηνία';
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  return [...groups.entries()];
}

export default async function HubPage({ params }: Props) {
  const { hub: slug } = await params;
  const races = await fetchRacesCached(supabase);
  const today = athensToday();
  const hub = resolveHub(slug, races, today);
  if (!hub) notFound();

  const allHubs = getActiveHubs(races, today);
  const siblings = allHubs.filter((h) => h.kind === hub.kind && h.slug !== hub.slug).slice(0, 10);
  const monthHubs = allHubs.filter((h) => h.kind === 'month').slice(0, 6);

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
      <nav className="hub-breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Αρχική</Link> › <Link href="/agones">Ημερολόγιο Αγώνων</Link> ›{' '}
        <span>{hub.name}</span>
      </nav>

      <h1>{hub.h1}</h1>
      <p className="hub-intro">{hub.intro}</p>

      {hub.upcoming.length > 0 ? (
        groupByMonth(hub.upcoming).map(([month, group]) => (
          <section key={month} className="hub-month-section">
            <h2>{month}</h2>
            <ul className="hub-race-list">
              {group.map((r) => (
                <RaceRow key={r.id} race={r} />
              ))}
            </ul>
          </section>
        ))
      ) : (
        <p>Δεν υπάρχουν προγραμματισμένοι αγώνες αυτή τη στιγμή.</p>
      )}

      {hub.past.length > 0 && (
        <details className="hub-past">
          <summary>Πρόσφατοι αγώνες που ολοκληρώθηκαν ({hub.past.length})</summary>
          <ul className="hub-race-list">
            {hub.past.map((r) => (
              <RaceRow key={r.id} race={r} />
            ))}
          </ul>
        </details>
      )}

      {monthHubs.length > 0 && hub.kind !== 'month' && (
        <section className="hub-related">
          <h2>Αγώνες ανά μήνα</h2>
          <ul className="hub-link-grid">
            {monthHubs.map((h) => (
              <li key={h.slug}>
                <Link href={hubPath(h)}>
                  {h.name} <span className="hub-count">({h.upcoming.length})</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {siblings.length > 0 && (
        <section className="hub-related">
          <h2>{KIND_META[hub.kind].heading}</h2>
          <ul className="hub-link-grid">
            {siblings.map((h) => (
              <li key={h.slug}>
                <Link href={hubPath(h)}>
                  {h.name} <span className="hub-count">({h.upcoming.length})</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="hub-map-cta">
        <Link href="/">Δες όλους τους αγώνες στον διαδραστικό χάρτη →</Link>
      </p>
    </>
  );
}
