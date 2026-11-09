import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const day = searchParams.get('day') || '1'; // 1, 2, or 3

  const endpointMap: Record<string, string> = {
    '1': 'https://www.spc.noaa.gov/products/outlook/day1otlk_cat.lyr.geojson',
    '2': 'https://www.spc.noaa.gov/products/outlook/day2otlk_cat.lyr.geojson',
    '3': 'https://www.spc.noaa.gov/products/outlook/day3otlk_cat.lyr.geojson',
  };

  const targetUrl = endpointMap[day] || endpointMap['1'];

  try {
    const res = await fetch(targetUrl, {
      headers: { 'User-Agent': 'MesoVortexWX-PublicEngine/2.0' },
      next: { revalidate: 600 }, // SPC updates every 2-4 hours; 10-minute cache is ideal
    });

    if (!res.ok) {
      return NextResponse.json({ type: 'FeatureCollection', features: [] });
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
      },
    });
  } catch (error) {
    console.error('[SPC Outlook Error]:', error);
    return NextResponse.json({ type: 'FeatureCollection', features: [] });
  }
}
