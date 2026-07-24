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
  icons: {
    icon: "/logo-192.png",
    shortcut: "/logo-192.png",
    apple: "/logo-512.png",
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
