import { NEXRAD_PRODUCT_CODES, RADAR_SITES } from '../../../../lib/radar-config';

export const dynamic = 'force-dynamic';

const IEM_TILE_BASE = 'https://mesonet1.agron.iastate.edu/c/tile.py/1.0.0';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteId = (searchParams.get('site') ?? '').toUpperCase();
  const productKey = (searchParams.get('product') ?? 'ref').toLowerCase();
  const site = RADAR_SITES.find((item) => item.radarId === siteId);
  const productCode = NEXRAD_PRODUCT_CODES[productKey];

  if (!site || !productCode) {
    return Response.json({ error: 'Unsupported NEXRAD site or product.' }, { status: 400 });
  }

  return Response.json({
    source: 'Iowa Environmental Mesonet NEXRAD Level III tiles',
    station: site.radarId,
    product: productCode,
    scheme: 'tms',
    tileUrl: `${IEM_TILE_BASE}/ridge::${site.radarId}-${productCode}-0/{z}/{x}/{y}.png`
  }, { headers: { 'Cache-Control': 'no-store' } });
}
