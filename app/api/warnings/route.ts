import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch('https://api.weather.gov/alerts/active?status=actual&message_type=alert', {
      headers: {
        'User-Agent': 'MesoVortexWX/2.0 (contact@mesovortexwx.internal)',
        'Accept': 'application/geo+json',
      },
      next: { revalidate: 30 }, // 30 second cache
    });

    if (!res.ok) {
      return NextResponse.json({ type: 'FeatureCollection', features: [] });
    }

    const data = await res.json();

    // Filter down to convective & hydrologic polygon warnings with actual geometries
    const validFeatures = (data.features || []).filter((f: any) => {
      const event = f.properties?.event || '';
      return (
        f.geometry &&
        (event.includes('Tornado Warning') ||
         event.includes('Severe Thunderstorm Warning') ||
         event.includes('Flash Flood Warning') ||
         event.includes('Special Marine Warning'))
      );
    });

    return NextResponse.json({
      type: 'FeatureCollection',
      features: validFeatures,
    });
  } catch (error) {
    console.error('Warnings fetch error:', error);
    return NextResponse.json({ type: 'FeatureCollection', features: [] });
  }
}
