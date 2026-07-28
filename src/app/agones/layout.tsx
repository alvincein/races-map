import Link from 'next/link';

// Hub pages are normal scrollable documents, unlike the fixed-viewport map
// app. The body has `overflow: hidden` globally, so scrolling happens inside
// this full-height wrapper.
export default function AgonesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="hub-viewport">
      <header className="hub-header">
        <Link href="/" className="hub-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-128.png" alt="RaceMap" width={34} height={34} />
          <span>RaceMap</span>
        </Link>
        <nav className="hub-header-nav">
          <Link href="/agones">Ημερολόγιο</Link>
          <Link href="/">Χάρτης</Link>
        </nav>
      </header>
      <main className="hub-main">{children}</main>
      <footer className="hub-footer">
        <p>
          RaceMap — ο διαδραστικός χάρτης αγώνων τρεξίματος στην Ελλάδα.{' '}
          <Link href="/">Άνοιξε τον χάρτη</Link> ή δες το <Link href="/agones">πλήρες ημερολόγιο</Link>.
        </p>
      </footer>
    </div>
  );
}
