import { RADAR_SITES } from '../../../../lib/radar-config';
import { getProductDef, PRODUCT_ATTRIBUTION_IEM } from '../../../../lib/product-registry';

export const dynamic = 'force-dynamic';

const IEM_TILE = 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteId = (searchParams.get('site') ?? 'LZK').toUpperCase();
  const productKey = (searchParams.get('product') ?? 'ref').toLowerCase();
  const tilt = searchParams.get('tilt') ?? '0.5';

  const site =
    RADAR_SITES.find((s) => s.id === siteId || s.radarId === siteId) ||
    RADAR_SITES.find((s) => s.radarId === siteId.replace(/^K/, '')) ||
    RADAR_SITES[0];

  let productCode = 'N0B';
  let tileUrl = '';

  // 1. NOAA MRMS Algorithmic Severe Products
  if (productKey === 'mesh') {
    productCode = 'MESH';
    tileUrl = `${IEM_TILE}/mrms::MESH_Max60min/{z}/{x}/{y}.png`;
  } else if (productKey === 'azshear') {
    productCode = 'AZSHEAR';
    tileUrl = `${IEM_TILE}/mrms::AzShear_0-2km/{z}/{x}/{y}.png`;
  }
  // 2. Multi-Tilt Reflectivity (and Max Reflectivity base frames)
  else if (productKey === 'ref' || productKey === 'maxref') {
    if (tilt === '0.9') productCode = 'N1B';
    else if (tilt === '1.3') productCode = 'N2B';
    else if (tilt === '1.8') productCode = 'N3B';
    else productCode = 'N0B';
    tileUrl = `${IEM_TILE}/ridge::${site.radarId}-${productCode}-0/{z}/{x}/{y}.png`;
  }
  // 3. Multi-Tilt Velocity
  else if (productKey === 'vel') {
    if (tilt === '0.9') productCode = 'N1U';
    else if (tilt === '1.3') productCode = 'N2U';
    else if (tilt === '1.8') productCode = 'N3U';
    else productCode = 'N0U';
    tileUrl = `${IEM_TILE}/ridge::${site.radarId}-${productCode}-0/{z}/{x}/{y}.png`;
  }
  // 4. Storm Relative Motion (SRM)
  else if (productKey === 'srvel') {
    productCode = 'N0S';
    tileUrl = `${IEM_TILE}/ridge::${site.radarId}-N0S-0/{z}/{x}/{y}.png`;
  }
  // 5. Echo Tops & VIL
  else if (productKey === 'tops') {
    productCode = 'EET';
    tileUrl = `${IEM_TILE}/ridge::${site.radarId}-EET-0/{z}/{x}/{y}.png`;
  } else if (productKey === 'vil') {
    productCode = 'DVL';
    tileUrl = `${IEM_TILE}/ridge::${site.radarId}-DVL-0/{z}/{x}/{y}.png`;
  }
  // 6. Dual-Pol CC, ZDR, KDP (proxies/substitutes)
  else if (productKey === 'cc') {
    productCode = 'MRMS_RHOHV_PROXY';
    tileUrl = `${IEM_TILE}/mrms::RhoHV/{z}/{x}/{y}.png`;
  } else if (productKey === 'zdr') {
    productCode = 'MRMS_PROXY';
    tileUrl = `${IEM_TILE}/mrms::ReflectivityAtLowestAltitude/{z}/{x}/{y}.png`;
  } else if (productKey === 'kdp') {
    productCode = 'MRMS_PROXY';
    tileUrl = `${IEM_TILE}/mrms::MultiSensorQPE01H/{z}/{x}/{y}.png`;
  }

  const compositeLatest = `${IEM_TILE}/nexrad-n0q-900913/{z}/{x}/{y}.png`;
  const def = getProductDef(productKey);
  const loopAvailable = def?.loopExpected ?? !['mesh', 'azshear', 'cc', 'zdr', 'kdp'].includes(productKey);
  const frameCount = productKey === 'maxref' ? 30 : 10;
  const notes: string[] = [];
  if (def?.sourceNote) notes.push(def.sourceNote);
  if (!loopAvailable) notes.push('Historical time-stepped loop may be limited or static for this product/source path.');

  const now = new Date();
  const frames: { time: string; label: string; tileUrl: string; ageMinutes: number }[] = [];

  for (let i = frameCount; i >= 1; i--) {
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
    if (productKey === 'mesh' || productKey === 'azshear' || productKey === 'cc' || productKey === 'zdr' || productKey === 'kdp') {
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
      source: 'IEM & NOAA MRMS Severe Ingest',
      attribution: PRODUCT_ATTRIBUTION_IEM,
      fetchedAt: now.toISOString(),
      station: site.radarId,
      siteId: site.id,
      siteName: site.name,
      product: productCode,
      productKey,
      productLabel: def?.label ?? productKey.toUpperCase(),
      sourceKind: def?.sourceKind ?? 'unknown',
      substitute: def?.substitute ?? false,
      loopAvailable,
      notes: notes.length ? notes : undefined,
      tilt,
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
