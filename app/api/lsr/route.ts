import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Official Iowa Environmental Mesonet (IEM) real-time LSR GeoJSON feed
    const res = await fetch('https://mesonet.agron.iastate.edu/geojson/lsr.geojson', {
      headers: { 'User-Agent': 'MesoVortexWX/2.0' },
      next: { revalidate: 60 }, // 1-minute cache
    });

    if (!res.ok) {
      return NextResponse.json({ type: 'FeatureCollection', features: [] });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('LSR fetch error:', error);
    return NextResponse.json({ type: 'FeatureCollection', features: [] });
  }
}
