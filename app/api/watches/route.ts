import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Fetch active Tornado & Severe Thunderstorm Watches from NWS API
    const res = await fetch('https://api.weather.gov/alerts/active?status=actual&message_type=alert', {
      headers: {
        'User-Agent': 'MesoVortexWX/2.0 (contact@mesovortexwx.internal)',
        'Accept': 'application/geo+json',
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return NextResponse.json({ type: 'FeatureCollection', features: [] });
    }

    const data = await res.json();
    const watchFeatures = (data.features || []).filter((f: any) => {
      const event = f.properties?.event || '';
      return (
        f.geometry &&
        (event.includes('Tornado Watch') || event.includes('Severe Thunderstorm Watch'))
      );
    });

    return NextResponse.json({
      type: 'FeatureCollection',
      features: watchFeatures,
    });
  } catch (error) {
    console.error('Watches fetch error:', error);
    return NextResponse.json({ type: 'FeatureCollection', features: [] });
  }
}
