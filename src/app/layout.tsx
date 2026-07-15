import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
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

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://racemap.gr';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "RaceMap | Διαδραστικός Χάρτης Αγώνων",
    template: "%s | RaceMap",
  },
  description: "Δείτε όλους τους αγώνες ορεινού τρεξίματος και ασφάλτου στην Ελλάδα. Διαδραστικός χάρτης, διαδρομές, υψομετρικά προφίλ και ημερολόγιο αγώνων.",
  alternates: {
    canonical: "./",
  },
  icons: {
    icon: "/logo-white.svg",
    shortcut: "/logo-white.svg",
    apple: "/logo-white.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'RaceMap',
  },
  openGraph: {
    title: "RaceMap | Διαδραστικός Χάρτης Αγώνων",
    description: "Δείτε όλους τους αγώνες ορεινού τρεξίματος και ασφάλτου στην Ελλάδα. Διαδραστικός χάρτης, διαδρομές, υψομετρικά προφίλ και ημερολόγιο αγώνων.",
    url: baseUrl,
    siteName: "RaceMap",
    locale: "el_GR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RaceMap | Διαδραστικός Χάρτης Αγώνων",
    description: "Δείτε όλους τους αγώνες ορεινού τρεξίματος και ασφάλτου στην Ελλάδα. Διαδραστικός χάρτης, διαδρομές, υψομετρικά προφίλ και ημερολόγιο αγώνων.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.variable} suppressHydrationWarning>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
