import { NextResponse } from 'next/server';
import { getAgroWeatherData } from '@/lib/adapters/agromonitoring';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '34.836');
  const lon = parseFloat(searchParams.get('lon') || '-92.262');

  const data = await getAgroWeatherData(lat, lon);

  if (!data) {
    return NextResponse.json(
      { error: 'AgroMonitoring unavailable or key not configured' },
      { status: 503 }
    );
  }

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
