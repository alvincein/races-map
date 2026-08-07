import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SITE_URL as baseUrl } from "@/lib/site";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin", "greek"],
  variable: "--font-inter",
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Αγώνες Δρόμου & Trail στην Ελλάδα – Διαδραστικός Χάρτης | RaceMap",
    template: "%s | RaceMap",
  },
  description: "Όλοι οι αγώνες δρόμου, βουνού και trail στην Ελλάδα σε έναν διαδραστικό χάρτη: ημερομηνίες, αποστάσεις, διαδρομές GPX, υψομετρικά προφίλ και σύνδεσμοι εγγραφής.",
  alternates: {
    canonical: "./",
  },
  // Google only accepts a favicon that is square and a multiple of 48px, so
  // these are padded squares — distinct from the logo-* assets, which keep the
  // mark's natural aspect ratio for in-app and OG use. The dark #121214 tile is
  // baked into the files: SERPs render favicons on white, where the mark's
  // white pin is invisible. apple-icon is full-bleed because iOS applies its
  // own corner mask; the rounded tile is for everything else.
  icons: {
    icon: "/icon-192.png",
    shortcut: "/icon-192.png",
    apple: "/apple-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'RaceMap',
  },
  openGraph: {
    title: "Αγώνες Δρόμου & Trail στην Ελλάδα – Διαδραστικός Χάρτης | RaceMap",
    description: "Όλοι οι αγώνες δρόμου, βουνού και trail στην Ελλάδα σε έναν διαδραστικό χάρτη: ημερομηνίες, αποστάσεις, διαδρομές GPX, υψομετρικά προφίλ και σύνδεσμοι εγγραφής.",
    url: baseUrl,
    siteName: "RaceMap",
    locale: "el_GR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Αγώνες Δρόμου & Trail στην Ελλάδα – Διαδραστικός Χάρτης | RaceMap",
    description: "Όλοι οι αγώνες δρόμου, βουνού και trail στην Ελλάδα σε έναν διαδραστικό χάρτη: ημερομηνίες, αποστάσεις, διαδρομές GPX, υψομετρικά προφίλ και σύνδεσμοι εγγραφής.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return (
    <html lang="el" suppressHydrationWarning>
      <body className={inter.variable} suppressHydrationWarning>
        {/* React hoists these into <head>: warm up the two third-party
            origins every page hits (map tiles, race data). */}
        <link rel="preconnect" href="https://basemaps.cartocdn.com" />
        {supabaseOrigin && <link rel="preconnect" href={supabaseOrigin} />}
        {children}
        <Analytics />
      </body>
    </html>
  );
}
