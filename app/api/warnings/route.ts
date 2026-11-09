import { NextResponse } from 'next/server';
import { NwsAlertsAdapter } from '@/lib/adapters/providers';

export const dynamic = 'force-dynamic';

export async function GET() {
  const alerts = await NwsAlertsAdapter.fetchActiveWarnings();

  return NextResponse.json(
    {
      type: 'FeatureCollection',
      features: alerts.map((a) => ({
        type: 'Feature',
        id: a.id,
        geometry: a.geometry,
        properties: {
          id: a.id,
          event: a.event,
          headline: a.headline,
          severity: a.severity,
          urgency: a.urgency,
          areaDesc: a.areaDesc,
          wfo: a.wfo,
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
