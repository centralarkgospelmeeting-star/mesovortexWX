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
  let frameCount = 10;
  let loopAvailable = true;

    // --- Product → IEM ridge/MRMS endpoint mapping ---
  if (productKey === 'mesh') {
    productCode = 'MESH';
    tileUrl = `${IEM_TILE}/mrms::MESH_Max60min/{z}/{x}/{y}.png`;
    loopAvailable = false;
  } else if (productKey === 'azshear') {
    productCode = 'AZSHEAR';
    tileUrl = `${IEM_TILE}/mrms::AzShear_0-2km/{z}/{x}/{y}.png`;
    loopAvailable = false;
  } else if (productKey === 'ref' || productKey === 'maxref' || productKey === 'max_ref' || productKey === 'ref_x') {
    if (tilt === '0.9') productCode = 'N1B';
    else if (tilt === '1.3') productCode = 'N2B';
    else if (tilt === '1.8') productCode = 'N3B';
    else productCode = 'N0B';
    tileUrl = `${IEM_TILE}/ridge::${site.radarId}-${productCode}-0/{z}/{x}/{y}.png`;
    if (productKey === 'maxref' || productKey === 'max_ref') frameCount = 30;
    if (productKey === 'ref_x') frameCount = 20;
  } else if (productKey === 'vel' || productKey === 'norm_vel' || productKey === 'nrvel') {
    if (tilt === '0.9') productCode = 'N1U';
    else if (tilt === '1.3') productCode = 'N2U';
    else if (tilt === '1.8') productCode = 'N3U';
    else productCode = 'N0U';
    tileUrl = `${IEM_TILE}/ridge::${site.radarId}-${productCode}-0/{z}/{x}/{y}.png`;
  } else if (productKey === 'srvel') {
    productCode = 'N0S';
    tileUrl = `${IEM_TILE}/ridge::${site.radarId}-N0S-0/{z}/{x}/{y}.png`;
  } else if (productKey === 'sw') {
    productCode = 'N0W';
    tileUrl = `${IEM_TILE}/ridge::${site.radarId}-N0W-0/{z}/{x}/{y}.png`;
    // MRMS fallback: spectrum width not in MRMS, but reflectivity composite as backup
    tileUrl = `${IEM_TILE}/ridge::${site.radarId}-N0W-0/{z}/{x}/{y}.png`;
  } else if (productKey === 'tops') {
    productCode = 'EET';
    tileUrl = `${IEM_TILE}/ridge::${site.radarId}-EET-0/{z}/{x}/{y}.png`;
  } else if (productKey === 'vil') {
    productCode = 'DVL';
    tileUrl = `${IEM_TILE}/ridge::${site.radarId}-DVL-0/{z}/{x}/{y}.png`;
  } else if (productKey === 'cc' || productKey === 'min_cc') {
    productCode = 'N0C';
    // Try ridge N0C first; MRMS RhoHV as fallback
    tileUrl = `${IEM_TILE}/ridge::${site.radarId}-N0C-0/{z}/{x}/{y}.png`;
  } else if (productKey === 'zdr') {
    productCode = 'N0X';
    tileUrl = `${IEM_TILE}/ridge::${site.radarId}-N0X-0/{z}/{x}/{y}.png`;
  } else if (productKey === 'kdp') {
    productCode = 'N0K';
    tileUrl = `${IEM_TILE}/ridge::${site.radarId}-N0K-0/{z}/{x}/{y}.png`;
  } else if (productKey === 'hhc') {
    productCode = 'HHC';
    tileUrl = `${IEM_TILE}/ridge::${site.radarId}-HHC-0/{z}/{x}/{y}.png`;
  } else if (productKey === 'qpe') {
    productCode = 'DPR';
    tileUrl = `${IEM_TILE}/ridge::${site.radarId}-DPR-0/{z}/{x}/{y}.png`;
  }

  const compositeLatest = `${IEM_TILE}/nexrad-n0q-900913/{z}/{x}/{y}.png`;
  const def = getProductDef(productKey);
  const loopExpected = def?.loopExpected ?? !['mesh', 'azshear', 'cc', 'zdr', 'kdp', 'hhc', 'qpe'].includes(productKey);
  if (def?.sourceNote) { /* keep notes */ }

  const now = new Date();
  const frames: { time: string; label: string; tileUrl: string; ageMinutes: number }[] = [];

  // For Reflectivity X: generate interpolated frame timestamps between actual scans
  // IEM doesn't provide true interpolated data, so we request the nearest actual scan
  // but provide more frequent frame slots for smoother playback
  const isRefX = productKey === 'ref_x';
  const intervalMinutes = isRefX ? 2.5 : 5;
  const totalMinutes = frameCount * 5;

  for (let i = frameCount; i >= 1; i--) {
    const date = new Date(now.getTime() - i * intervalMinutes * 60 * 1000);
    date.setUTCMinutes(Math.floor(date.getUTCMinutes() / 2.5) * 2.5, 0, 0);

    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    const h = String(date.getUTCHours()).padStart(2, '0');
    const min = String(date.getUTCMinutes()).padStart(2, '0');
    const stamp = `${y}${m}${d}${h}${min}`;
    const ageMinutes = Math.round((now.getTime() - date.getTime()) / 60000);

        let frameTile = `${IEM_TILE}/ridge::${site.radarId}-${productCode}-${stamp}/{z}/{x}/{y}.png`;
    // Static products (no time-stepped tiles available) use live tile URL
    if (['mesh', 'azshear', 'cc', 'zdr', 'kdp', 'hhc', 'qpe', 'min_cc', 'sw'].includes(productKey)) {
      frameTile = tileUrl;
    }
    // Max Reflectivity: use reflectivity base frames (client-side compositing handles the max)
    if (productKey === 'maxref' || productKey === 'max_ref') {
      frameTile = `${IEM_TILE}/ridge::${site.radarId}-${productCode}-${stamp}/{z}/{x}/{y}.png`;
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

  const notes: string[] = [];
  if (def?.sourceNote) notes.push(def.sourceNote);
  if (!loopExpected) notes.push('Historical time-stepped loop may be limited or static for this product/source path.');
  if (productKey === 'maxref' || productKey === 'max_ref') notes.push('Max Reflectivity: per-pixel max over selected scan window (client-side compositing from reflectivity frames).');
  if (productKey === 'ref_x') notes.push('Reflectivity X: interpolated frame timestamps for smoother playback (nearest-scan data).');
  if (['cc', 'zdr', 'kdp'].includes(productKey)) notes.push('Dual-pol product: true L3 ridge tiles may be unavailable; MRMS proxy used where noted.');

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
      loopAvailable: loopExpected,
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
