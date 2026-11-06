import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Official NOAA Aviation Weather Center Free GeoJSON METAR Feed
    const res = await fetch('https://aviationweather.gov/api/data/metar?format=geojson', {
      headers: {
        'User-Agent': 'MesoVortexWX/2.0 (contact@mesovortexwx.internal)',
      },
      next: { revalidate: 300 }, // 5-minute cache
    });

    if (!res.ok) {
      return NextResponse.json({ type: 'FeatureCollection', features: [] });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('METAR GeoJSON fetch error:', error);
    return NextResponse.json({ type: 'FeatureCollection', features: [] });
  }
}
