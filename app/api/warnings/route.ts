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

  const validFeatures = (result.data.features || []).filter((f: any) => {
    const event = f.properties?.event || '';
    return (
      f.geometry &&
      (event.includes('Tornado Warning') ||
        event.includes('Severe Thunderstorm Warning') ||
        event.includes('Flash Flood Warning') ||
        event.includes('Special Marine Warning'))
    );
  });

  return NextResponse.json(
    {
      type: 'FeatureCollection',
      features: validFeatures,
      _meta: { fetchedAt: new Date().toISOString(), source, ok: true, count: validFeatures.length },
    },
    { headers: { 'Cache-Control': 'public, max-age=15, stale-while-revalidate=30' } }
  );
}
