import { NextResponse } from 'next/server';
import { fetchJsonWithTimeout, errorPayload } from '../../../lib/api-utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  const source = 'https://www.spc.noaa.gov/products/outlook/day1otlk_cat.lyr.geojson';
  const result = await fetchJsonWithTimeout(source, {
    headers: { 'User-Agent': 'MesoVortexWX/2.0' },
    timeoutMs: 12000,
  });

  if (!result.ok) {
    return NextResponse.json(errorPayload({ type: 'FeatureCollection', features: [] }, source, result.error), {
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  return NextResponse.json(
    { ...result.data, _meta: { fetchedAt: new Date().toISOString(), source, ok: true } },
    { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' } }
  );
}
