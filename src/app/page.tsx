import HomeClient from '@/components/HomeClient';

// Static shell. The race list is loaded client-side from the edge-cached
// /api/races endpoint, so this page carries no per-request data cost and never
// needs time-based revalidation.
export default function Home() {
  return (
    <>
      {/* The map UI has no visible page heading; give crawlers and screen
          readers an explicit one. */}
      <h1 className="sr-only">
        Αγώνες Δρόμου & Trail στην Ελλάδα – Διαδραστικός Χάρτης Αγώνων
      </h1>
      <HomeClient />
    </>
  );
}
