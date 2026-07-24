import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { supabase } from '@/lib/supabase';
import { fetchRacesCached } from '@/lib/races';
import { getRaceSlug } from '@/lib/slugs';
import { getRegionLabel } from '@/lib/regions';

export const alt = 'Στοιχεία αγώνα στο RaceMap – ημερομηνία, τοποθεσία και αποστάσεις';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const TYPE_CHIP: Record<string, { label: string; bg: string; color: string }> = {
  road: { label: 'ΔΡΟΜΟΣ', bg: '#FFE800', color: '#111827' },
  trail: { label: 'ΒΟΥΝΟ', bg: '#3B82F6', color: '#ffffff' },
};

function distanceLabel(meters: number): string {
  return meters >= 1000 ? `${meters / 1000}χλμ` : `${meters}μ`;
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [interRegular, interBold, logo, races] = await Promise.all([
    readFile(join(process.cwd(), 'assets/Inter-Regular.ttf')),
    readFile(join(process.cwd(), 'assets/Inter-Bold.ttf')),
    readFile(join(process.cwd(), 'public/logo-128.png')),
    fetchRacesCached(supabase),
  ]);
  const race = races.find((r) => getRaceSlug(r) === slug || r.id === slug);
  const logoSrc = `data:image/png;base64,${logo.toString('base64')}`;

  const name = race?.event_name ?? 'RaceMap';
  const typeChip = race?.event_type ? TYPE_CHIP[race.event_type.toLowerCase()] : undefined;
  const cancelled = race?.status === 'cancelled';
  const dateStr = race?.dates?.[0]
    ? new Date(race.dates[0]).toLocaleDateString('el-GR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  const place = race
    ? [race.location_place || race.location_city, race.location_region ? getRegionLabel(race.location_region) : null]
        .filter(Boolean)
        .join(', ')
    : null;
  const distances = (race?.sub_races ?? [])
    .map((s) => s.distance)
    .filter((d): d is number => typeof d === 'number')
    .sort((a, b) => b - a)
    .slice(0, 6);

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
        {/* Header: brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} width={72} height={72} alt="" />
          <span style={{ fontSize: 40, fontWeight: 700, color: '#ffffff' }}>RaceMap</span>
        </div>

        {/* Middle: chips + race name + meta */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          <div style={{ display: 'flex', gap: 14 }}>
            {typeChip && (
              <span
                style={{
                  display: 'flex',
                  background: typeChip.bg,
                  color: typeChip.color,
                  fontSize: 26,
                  fontWeight: 700,
                  padding: '8px 22px',
                  borderRadius: 999,
                }}
              >
                {typeChip.label}
              </span>
            )}
            {cancelled && (
              <span
                style={{
                  display: 'flex',
                  background: '#DC2626',
                  color: '#ffffff',
                  fontSize: 26,
                  fontWeight: 700,
                  padding: '8px 22px',
                  borderRadius: 999,
                }}
              >
                ΑΚΥΡΩΘΗΚΕ
              </span>
            )}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: name.length > 55 ? 52 : 66,
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.15,
            }}
          >
            {name}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {dateStr && <span style={{ fontSize: 32, color: '#D1D5DB' }}>{dateStr}</span>}
            {place && <span style={{ fontSize: 32, color: '#9CA3AF' }}>{place}</span>}
          </div>
        </div>

        {/* Footer: distances + domain */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            {distances.map((d) => (
              <span
                key={d}
                style={{
                  display: 'flex',
                  border: '2px solid rgba(255, 232, 0, 0.55)',
                  color: '#FFE800',
                  fontSize: 26,
                  fontWeight: 700,
                  padding: '6px 18px',
                  borderRadius: 999,
                }}
              >
                {distanceLabel(d)}
              </span>
            ))}
          </div>
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
