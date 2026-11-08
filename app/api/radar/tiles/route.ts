import { fetchJsonWithTimeout, errorPayload } from '../../../../lib/api-utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  const source = 'https://api.rainviewer.com/public/weather-maps-timestamps';
  const result = await fetchJsonWithTimeout(source, { timeoutMs: 10000 });
  if (!result.ok) {
    return Response.json(errorPayload({ tiles: [], attribution: 'RainViewer' }, source, result.error), {
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const timestamps = result.data.nowcast || result.data.radar || [];
  const tiles = timestamps.slice(0, 6).map((ts: number) => ({
    timestamp: ts,
    url: `https://tilecache.rainviewer.com/v2/radar/${ts}/tiles/12/2048/2048/2/1_1.png`,
  }));

  return Response.json(
    {
      tiles,
      attribution: 'RainViewer',
      timestamp: new Date().toISOString(),
      _meta: { fetchedAt: new Date().toISOString(), source, ok: true, count: tiles.length },
    },
    { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=120' } }
  );
}
