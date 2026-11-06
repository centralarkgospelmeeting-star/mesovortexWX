import { NEXRAD_PRODUCT_CODES, RADAR_SITES } from '../../../../lib/radar-config';

export const dynamic = 'force-dynamic';

const IEM_TILE_BASE = 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteId = (searchParams.get('site') ?? 'TLX').toUpperCase();
  const productKey = (searchParams.get('product') ?? 'ref').toLowerCase();

  const site =
    RADAR_SITES.find((s) => s.id === siteId || s.radarId === siteId) ||
    RADAR_SITES.find((s) => s.radarId === siteId.replace(/^K/, '')) ||
    RADAR_SITES[0];

  const productCode = NEXRAD_PRODUCT_CODES[productKey] || 'N0Q';

  // Always provide a solid "latest" frame first
  const latestUrl = `${IEM_TILE_BASE}/ridge::${site.radarId}-${productCode}-0/{z}/{x}/{y}.png`;

  // Generate a simple loop of approximate past frames (every 5 min)
  const now = new Date();
  const frames: { time: string; label: string; tileUrl: string; ageMinutes: number }[] = [];

  for (let i = 12; i >= 1; i--) {
    const date = new Date(now.getTime() - i * 5 * 60 * 1000);
    // Round to nearest 5 minutes
    date.setUTCMinutes(Math.floor(date.getUTCMinutes() / 5) * 5, 0, 0);

    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    const h = String(date.getUTCHours()).padStart(2, '0');
    const min = String(date.getUTCMinutes()).padStart(2, '0');
    const stamp = `${y}${m}${d}${h}${min}`;

    const ageMinutes = Math.round((now.getTime() - date.getTime()) / 60000);

    frames.push({
      time: date.toISOString(),
      label: `-${ageMinutes}m`,
      tileUrl: `${IEM_TILE_BASE}/ridge::${site.radarId}-${productCode}-${stamp}/{z}/{x}/{y}.png`,
      ageMinutes,
    });
  }

  // Put LIVE at the end
  frames.push({
    time: now.toISOString(),
    label: 'LIVE',
    tileUrl: latestUrl,
    ageMinutes: 0,
  });

  return Response.json(
    {
      source: 'Iowa Environmental Mesonet',
      station: site.radarId,
      siteId: site.id,
      product: productCode,
      productKey,
      scheme: 'tms',
      frames,
      count: frames.length,
      // also expose a direct latest for easy debugging
      latest: latestUrl,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
