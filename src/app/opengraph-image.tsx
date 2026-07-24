import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const alt = 'RaceMap – Αγώνες Δρόμου & Trail στην Ελλάδα σε διαδραστικό χάρτη';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const [interRegular, interBold, logo] = await Promise.all([
    readFile(join(process.cwd(), 'assets/Inter-Regular.ttf')),
    readFile(join(process.cwd(), 'assets/Inter-Bold.ttf')),
    readFile(join(process.cwd(), 'public/logo-512.png')),
  ]);
  const logoSrc = `data:image/png;base64,${logo.toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 30,
          background: 'linear-gradient(135deg, #0B0F19 0%, #111827 60%, #1a2333 100%)',
          fontFamily: 'Inter',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} width={170} height={170} alt="" />
        <div style={{ display: 'flex', fontSize: 64, fontWeight: 700, color: '#ffffff' }}>RaceMap</div>
        <div style={{ display: 'flex', fontSize: 34, color: '#D1D5DB', textAlign: 'center' }}>
          Αγώνες Δρόμου & Trail στην Ελλάδα – Διαδραστικός Χάρτης
        </div>
        <div style={{ display: 'flex', fontSize: 28, fontWeight: 700, color: '#FFE800' }}>racemap.gr</div>
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
