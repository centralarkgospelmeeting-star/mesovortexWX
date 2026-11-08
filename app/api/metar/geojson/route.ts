import { NextResponse } from 'next/server';
import { fetchJsonWithTimeout, errorPayload } from '../../../../lib/api-utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  const source = 'https://aviationweather.gov/api/data/metar?format=geojson';
  const result = await fetchJsonWithTimeout(source, {
    headers: { 'User-Agent': 'MesoVortexWX/2.0 (contact@mesovortexwx.internal)' },
    timeoutMs: 12000,
  });

  if (!result.ok) {
    return NextResponse.json(errorPayload({ type: 'FeatureCollection', features: [] }, source, result.error), {
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  return NextResponse.json(
    { ...result.data, _meta: { fetchedAt: new Date().toISOString(), source, ok: true } },
    { headers: { 'Cache-Control': 'public, max-age=120, stale-while-revalidate=300' } }
  );
}
