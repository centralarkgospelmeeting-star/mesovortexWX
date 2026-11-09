import { NextResponse } from 'next/server';
import { getActiveNwsWarnings } from '@/lib/adapters/noaa';

export const dynamic = 'force-dynamic';

export async function GET() {
  const warnings = await getActiveNwsWarnings();

  return NextResponse.json(
    {
      type: 'FeatureCollection',
      features: warnings.map((w) => ({
        type: 'Feature',
        id: w.id,
        geometry: w.geometry,
        properties: {
          id: w.id,
          event: w.event,
          headline: w.headline,
          severity: w.severity,
          urgency: w.urgency,
          areaDesc: w.areaDesc,
          sentAt: w.sentAt,
          expiresAt: w.expiresAt,
          wfo: w.wfo,
        },
      })),
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    }
  );
}
