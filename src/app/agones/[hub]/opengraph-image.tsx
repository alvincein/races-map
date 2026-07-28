import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { supabase } from '@/lib/supabase';
import { fetchRacesCached } from '@/lib/races';
import { resolveHub } from '@/lib/hubs';

export const alt = 'Ημερολόγιο αγώνων τρεξίματος στο RaceMap';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ hub: string }> }) {
  const { hub: slug } = await params;
  const [interRegular, interBold, logo, races] = await Promise.all([
    readFile(join(process.cwd(), 'assets/Inter-Regular.ttf')),
    readFile(join(process.cwd(), 'assets/Inter-Bold.ttf')),
    readFile(join(process.cwd(), 'public/logo-128.png')),
    fetchRacesCached(supabase),
  ]);
  const hub = resolveHub(slug, races);
  const logoSrc = `data:image/png;base64,${logo.toString('base64')}`;
  const title = hub?.h1 ?? 'Ημερολόγιο Αγώνων';
  const count = hub?.upcoming.length ?? 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #0B0F19 0%, #111827 60%, #1a2333 100%)',
          padding: '56px 64px',
          fontFamily: 'Inter',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} width={72} height={72} alt="" />
          <span style={{ fontSize: 40, fontWeight: 700, color: '#ffffff' }}>RaceMap</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <span
            style={{
              display: 'flex',
              background: '#FFE800',
              color: '#111827',
              fontSize: 26,
              fontWeight: 700,
              padding: '8px 22px',
              borderRadius: 999,
              alignSelf: 'flex-start',
            }}
          >
            ΗΜΕΡΟΛΟΓΙΟ ΑΓΩΝΩΝ
          </span>
          <div
            style={{
              display: 'flex',
              fontSize: title.length > 45 ? 54 : 64,
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.15,
            }}
          >
            {title}
          </div>
          {count > 0 && (
            <span style={{ fontSize: 32, color: '#D1D5DB' }}>
              {count} προγραμματισμένοι αγώνες
            </span>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: 30, fontWeight: 700, color: '#FFE800' }}>racemap.gr</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Inter', data: interRegular, style: 'normal', weight: 400 },
        { name: 'Inter', data: interBold, style: 'normal', weight: 700 },
      ],
    },
  );
}
