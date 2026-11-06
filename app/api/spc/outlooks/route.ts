import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Fetch Day 1 Categorical Convective Outlook from NOAA SPC
    const res = await fetch('https://www.spc.noaa.gov/products/outlook/day1otlk_cat.lyr.geojson', {
      headers: { 'User-Agent': 'MesoVortexWX/2.0' },
      next: { revalidate: 600 }, // 10 minutes
    });

    if (!res.ok) {
      return NextResponse.json({ type: 'FeatureCollection', features: [] });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('SPC Outlook fetch error:', error);
    return NextResponse.json({ type: 'FeatureCollection', features: [] });
  }
}
