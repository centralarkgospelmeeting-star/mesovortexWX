export const dynamic = 'force-dynamic';

const RAINVIEWER_API = 'https://api.rainviewer.com/public/weather-maps.json';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedLimit = Number.parseInt(searchParams.get('limit') ?? '8', 10);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 2), 12) : 8;

  try {
    const response = await fetch(RAINVIEWER_API, { cache: 'no-store' });
    if (!response.ok) {
      return Response.json({ source: 'RainViewer', frames: [], error: 'Radar provider is unavailable' }, { status: 502 });
    }

    const data = await response.json();
    const frames = Array.isArray(data?.radar?.past) ? data.radar.past.slice(-limit) : [];
    const validFrames = frames
      .filter((frame: { path?: unknown; time?: unknown }) => typeof frame.path === 'string' && Number.isFinite(frame.time))
      .map((frame: { path: string; time: number }) => ({ path: frame.path, time: frame.time }));

    if (validFrames.length === 0) {
      return Response.json({ source: 'RainViewer', frames: [], error: 'No recent radar scans are available' }, { status: 503 });
    }

    return Response.json({ source: 'RainViewer global radar composite', frames: validFrames });
  } catch (error) {
    console.error('RainViewer radar request failed:', error);
    return Response.json({ source: 'RainViewer', frames: [], error: 'Could not retrieve live radar scans' }, { status: 502 });
  }
}
