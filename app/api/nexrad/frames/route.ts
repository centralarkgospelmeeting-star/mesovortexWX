import { NEXRAD_PRODUCT_CODES, RADAR_SITES } from '../../../../lib/radar-config';

export const dynamic = 'force-dynamic';

const IEM_TILE_BASE = 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0';
const IEM_RADAR_JSON = 'https://mesonet.agron.iastate.edu/json/radar.py';

function formatIemTimestamp(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const h = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  return `${y}${m}${d}${h}${min}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteId = (searchParams.get('site') ?? '').toUpperCase();
  const productKey = (searchParams.get('product') ?? 'ref').toLowerCase();
  const hours = Math.min(Number(searchParams.get('hours') ?? 1.5), 3); // max 3 hours for now

  // Accept both full id (KTLX) and short radarId (TLX)
  const site =
    RADAR_SITES.find((s) => s.id === siteId || s.radarId === siteId) ||
    RADAR_SITES.find((s) => s.radarId === siteId.replace(/^K/, ''));

  const productCode = NEXRAD_PRODUCT_CODES[productKey];

  if (!site || !productCode) {
    return Response.json({ error: 'Unsupported NEXRAD site or product.' }, { status: 400 });
  }

  const now = new Date();
  const start = new Date(now.getTime() - hours * 60 * 60 * 1000);

  let frames: { time: string; label: string; tileUrl: string; ageMinutes: number }[] = [];

  try {
    // Ask IEM for available scans
    const listUrl =
      `${IEM_RADAR_JSON}?operation=list` +
      `&radar=${site.radarId}` +
      `&product=${productCode}` +
      `&start=${start.toISOString().slice(0, 16)}Z` +
      `&end=${now.toISOString().slice(0, 16)}Z`;

    const res = await fetch(listUrl, {
      headers: { 'User-Agent': 'MesoVortexWX/1.0 (centralarkgospelmeeting@gmail.com)' },
      next: { revalidate: 30 },
    });

      if (res.ok) {
      const data = await res.json();
      const scans: any[] = data.scans || data || [];

      const mapped = scans
        .map((scan: any) => {
          const ts = scan.valid || scan.time || scan;
          const date = new Date(ts);
          if (isNaN(date.getTime())) return null;

          const ageMinutes = Math.round((now.getTime() - date.getTime()) / 60000);
          const stamp = formatIemTimestamp(date);

          return {
            time: date.toISOString(),
            label: ageMinutes <= 2 ? 'LIVE' : `-${ageMinutes}m`,
            tileUrl: `${IEM_TILE_BASE}/ridge::${site.radarId}-${productCode}-${stamp}/{z}/{x}/{y}.png`,
            ageMinutes,
          };
        })
        .filter((f): f is { time: string; label: string; tileUrl: string; ageMinutes: number } => f !== null);

      frames = mapped.sort((a, b) => a.ageMinutes - b.ageMinutes);
    }
  } catch (err) {
    console.error('IEM list failed, falling back to synthetic frames', err);
  }

  // Fallback: generate approximate frames every 5–6 minutes if list failed or returned too few
  if (frames.length < 4) {
    frames = [];
    for (let i = 12; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 5 * 60 * 1000);
      // round to nearest 5 min for better hit rate
      date.setUTCMinutes(Math.floor(date.getUTCMinutes() / 5) * 5, 0, 0);
      const stamp = formatIemTimestamp(date);
      const ageMinutes = Math.round((now.getTime() - date.getTime()) / 60000);
      frames.push({
        time: date.toISOString(),
        label: ageMinutes <= 3 ? 'LIVE' : `-${ageMinutes}m`,
        tileUrl: `${IEM_TILE_BASE}/ridge::${site.radarId}-${productCode}-${stamp}/{z}/{x}/{y}.png`,
        ageMinutes,
      });
    }
  }

  // Always include a true "latest" frame at the end
  const latestUrl = `${IEM_TILE_BASE}/ridge::${site.radarId}-${productCode}-0/{z}/{x}/{y}.png`;
  if (!frames.some((f) => f.label === 'LIVE')) {
    frames.push({
      time: now.toISOString(),
      label: 'LIVE',
      tileUrl: latestUrl,
      ageMinutes: 0,
    });
  } else {
    // make sure the last frame uses the -0 (latest) path
    frames[frames.length - 1].tileUrl = latestUrl;
  }

  return Response.json(
    {
      source: 'Iowa Environmental Mesonet NEXRAD Level III',
      station: site.radarId,
      siteId: site.id,
      product: productCode,
      productKey,
      scheme: 'tms',
      frames,
      count: frames.length,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
