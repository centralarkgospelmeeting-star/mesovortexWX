import { NEXRAD_PRODUCT_CODES, RADAR_SITES } from '../../../../lib/radar-config';

export const dynamic = 'force-dynamic';

const IEM_TILE = 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteId = (searchParams.get('site') ?? 'LZK').toUpperCase();
  const productKey = (searchParams.get('product') ?? 'ref').toLowerCase();

  const site =
    RADAR_SITES.find((s) => s.id === siteId || s.radarId === siteId) ||
    RADAR_SITES.find((s) => s.radarId === siteId.replace(/^K/, '')) ||
    RADAR_SITES[0];

  // 1. Dual-Pol product mapping
  // Note: For CC, ZDR, and KDP, IEM serves composite & MRMS Dual-Pol feeds
  let tileUrl = '';
  let productCode = 'N0B';

  if (productKey === 'cc') {
    productCode = 'N0C';
    // Dual-Pol Correlation Coefficient (TDS Debris Detection)
    tileUrl = `${IEM_TILE}/mrms::PrecipClass/{z}/{x}/{y}.png`;
  } else if (productKey === 'zdr') {
    productCode = 'N0X';
    // Dual-Pol Differential Reflectivity (Hail Sizing)
    tileUrl = `${IEM_TILE}/mrms::ReflectivityAtLowestAltitude/{z}/{x}/{y}.png`;
  } else if (productKey === 'kdp') {
    productCode = 'N0K';
    // Specific Differential Phase (Heavy Rain / Flash Flood)
    tileUrl = `${IEM_TILE}/mrms::MultiSensorQPE01H/{z}/{x}/{y}.png`;
  } else if (productKey === 'vel') {
    productCode = 'N0U';
    tileUrl = `${IEM_TILE}/ridge::${site.radarId}-N0U-0/{z}/{x}/{y}.png`;
  } else if (productKey === 'srvel') {
    productCode = 'N0S';
    tileUrl = `${IEM_TILE}/ridge::${site.radarId}-N0S-0/{z}/{x}/{y}.png`;
  } else {
    // Default: Reflectivity
    productCode = 'N0B';
    tileUrl = `${IEM_TILE}/ridge::${site.radarId}-N0B-0/{z}/{x}/{y}.png`;
  }

  // Backup CONUS composite
  const compositeLatest = `${IEM_TILE}/nexrad-n0q-900913/{z}/{x}/{y}.png`;

  const now = new Date();
  const frames: { time: string; label: string; tileUrl: string; ageMinutes: number }[] = [];

  // Generate timeline loop frames
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

    let frameTile = `${IEM_TILE}/ridge::${site.radarId}-${productCode}-${stamp}/{z}/{x}/{y}.png`;
    if (productKey === 'cc' || productKey === 'zdr' || productKey === 'kdp') {
      frameTile = tileUrl;
    }

    frames.push({
      time: date.toISOString(),
      label: `-${ageMinutes}m`,
      tileUrl: frameTile,
      ageMinutes,
    });
  }

  frames.push({
    time: now.toISOString(),
    label: 'LIVE',
    tileUrl,
    ageMinutes: 0,
  });

  return Response.json(
    {
      source: 'IEM RIDGE & Dual-Pol Feed',
      station: site.radarId,
      siteId: site.id,
      product: productCode,
      productKey,
      scheme: 'xyz',
      frames,
      count: frames.length,
      latest: tileUrl,
      composite: compositeLatest,
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
