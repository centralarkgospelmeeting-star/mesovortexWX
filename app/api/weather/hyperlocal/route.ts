import { NextResponse } from 'next/server';
import { getHyperlocalTelemetry } from '@/lib/adapters/weather-gateway';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '34.836');
  const lon = parseFloat(searchParams.get('lon') || '-92.262');
  const stationId = searchParams.get('stationId') || 'KLZK';

  const telemetry = await getHyperlocalTelemetry(lat, lon, stationId);

  return NextResponse.json(telemetry, {
    headers: {
      'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
    },
  });
}
