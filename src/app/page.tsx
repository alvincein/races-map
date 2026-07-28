import HomeClient from '@/components/HomeClient';
import { SITE_URL } from '@/lib/site';

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

// Static shell. The race list is loaded client-side from the edge-cached
// /api/races endpoint, so this page carries no per-request data cost and never
// needs time-based revalidation.
export default function Home() {
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
      <HomeClient />
    </>
  );
}
