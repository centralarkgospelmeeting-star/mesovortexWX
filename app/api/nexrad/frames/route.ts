import { NEXRAD_PRODUCT_CODES, RADAR_SITES } from '../../../../lib/radar-config';

export const dynamic = 'force-dynamic';

// IEM has two useful endpoints:
// 1. Single-site ridge tiles
// 2. CONUS composite (very reliable)
const IEM_TILE = 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteId = (searchParams.get('site') ?? 'TLX').toUpperCase();
  const productKey = (searchParams.get('product') ?? 'ref').toLowerCase();

  const site =
    RADAR_SITES.find((s) => s.id === siteId || s.radarId === siteId) ||
    RADAR_SITES.find((s) => s.radarId === siteId.replace(/^K/, '')) ||
    RADAR_SITES[0];

  // Prefer modern product codes. N0B is the current 8-bit base reflectivity.
  const productMap: Record<string, string> = {
    ref: 'N0B',   // was N0Q — N0B is more current on IEM
    vel: 'N0U',
    srvel: 'N0S',
    cc: 'N0C',
    zdr: 'N0X',
    kdp: 'N0K',
  };

  const productCode = productMap[productKey] || NEXRAD_PRODUCT_CODES[productKey] || 'N0B';

  // 1. Single-site latest (primary)
  const singleSiteLatest = `${IEM_TILE}/ridge::${site.radarId}-${productCode}-0/{z}/{x}/{y}.png`;

  // 2. CONUS composite fallback (almost always has data)
  const compositeLatest = `${IEM_TILE}/nexrad-n0q-900913/{z}/{x}/{y}.png`;

  // Simple loop frames (single-site)
  const now = new Date();
  const frames: { time: string; label: string; tileUrl: string; ageMinutes: number }[] = [];

  for (let i = 10; i >= 1; i--) {
    const date = new Date(now.getTime() - i * 5 * 60 * 1000);
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
      tileUrl: `${IEM_TILE}/ridge::${site.radarId}-${productCode}-${stamp}/{z}/{x}/{y}.png`,
      ageMinutes,
    });
  }

  // LIVE frame at the end — try single-site first
  frames.push({
    time: now.toISOString(),
    label: 'LIVE',
    tileUrl: singleSiteLatest,
    ageMinutes: 0,
  });

  return Response.json(
    {
      source: 'Iowa Environmental Mesonet',
      station: site.radarId,
      siteId: site.id,
      product: productCode,
      productKey,
      scheme: 'xyz',          // try xyz first — many IEM layers work better this way
      frames,
      count: frames.length,
      latest: singleSiteLatest,
      composite: compositeLatest, // backup the map can use
    },
    {
      headers: {
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
