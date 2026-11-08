import { NextResponse } from 'next/server';
import { fetchJsonWithTimeout, errorPayload } from '../../../lib/api-utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  const source = 'https://api.weather.gov/alerts/active';
  const result = await fetchJsonWithTimeout(`${source}?status=actual&message_type=alert`, {
    headers: {
      'User-Agent': 'MesoVortexWX/2.0 (contact@mesovortexwx.internal)',
      Accept: 'application/geo+json',
    },
    timeoutMs: 12000,
  });

  if (!result.ok) {
    return NextResponse.json(errorPayload({ type: 'FeatureCollection', features: [] }, source, result.error), {
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const watchFeatures = (result.data.features || []).filter((f: any) => {
    const event = f.properties?.event || '';
    return f.geometry && (event.includes('Tornado Watch') || event.includes('Severe Thunderstorm Watch'));
  });

  return NextResponse.json(
    {
      type: 'FeatureCollection',
      features: watchFeatures,
      _meta: { fetchedAt: new Date().toISOString(), source, ok: true, count: watchFeatures.length },
    },
    { headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=60' } }
  );
}
