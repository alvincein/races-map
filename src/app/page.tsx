import HomeClient from '@/components/HomeClient';

// Static shell. The race list is loaded client-side from the edge-cached
// /api/races endpoint, so this page carries no per-request data cost and never
// needs time-based revalidation.
export default function Home() {
  return <HomeClient />;
}
