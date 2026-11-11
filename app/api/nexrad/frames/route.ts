import { NextResponse } from 'next/server';
import { RADAR_SITES } from '../../../../lib/radar-config';

export const dynamic = 'force-dynamic';

const IEM_TILE = 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteId = (searchParams.get('site') ?? 'KLZK').toUpperCase();
  const productKey = (searchParams.get('product') ?? 'ref').toLowerCase();
  const tilt = searchParams.get('tilt') ?? '0.5';

  const site =
    RADAR_SITES.find((s) => s.id === siteId || s.radarId === siteId) ||
    RADAR_SITES.find((s) => s.radarId === siteId.replace(/^K/, '')) ||
    RADAR_SITES[0];

  let productCode = 'N0B';

  // 1. Accurate NWS Level III Product Codes
  switch (productKey) {
    case 'vel':
      productCode = tilt === '0.9' ? 'N1U' : tilt === '1.3' ? 'N2U' : tilt === '1.8' ? 'N3U' : 'N0U';
      break;
    case 'srvel':
      productCode = 'N0S';
      break;
    case 'norm_vel':
      productCode = 'N0U';
      break;
    case 'sw':
      productCode = 'N0W'; // Spectrum Width
      break;
    case 'cc':
    case 'min_cc':
      productCode = 'N0C'; // Correlation Coefficient
      break;
    case 'zdr':
      productCode = 'N0X'; // Differential Reflectivity
      break;
    case 'kdp':
      productCode = 'N0K'; // Specific Differential Phase
      break;
    case 'tops':
      productCode = 'EET'; // Enhanced Echo Tops
      break;
    case 'vil':
      productCode = 'DVL'; // Digital Vertically Integrated Liquid
      break;
    case 'hhc':
      productCode = 'HHC'; // Hydrometeor Classification
      break;
    case 'qpe':
      productCode = 'DPR'; // Digital Precipitation Rate
      break;
    case 'max_ref':
    case 'ref_x':
    case 'ref':
    default:
      productCode = tilt === '0.9' ? 'N1B' : tilt === '1.3' ? 'N2B' : tilt === '1.8' ? 'N3B' : 'N0B';
      break;
  }

  const latestTileUrl = `${IEM_TILE}/ridge::${site.radarId}-${productCode}-0/{z}/{x}/{y}.png`;
  const compositeTileUrl = `${IEM_TILE}/nexrad-n0q-900913/{z}/{x}/{y}.png`;

  const now = new Date();
  const frames: { time: string; label: string; tileUrl: string; ageMinutes: number }[] = [];

  for (let i = 10; i >= 1; i--) {
    const d = new Date(now.getTime() - i * 5 * 60 * 1000);
    d.setUTCMinutes(Math.floor(d.getUTCMinutes() / 5) * 5, 0, 0);
    const stamp = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}${String(d.getUTCHours()).padStart(2, '0')}${String(d.getUTCMinutes()).padStart(2, '0')}`;
    const ageMinutes = Math.round((now.getTime() - d.getTime()) / 60000);

    frames.push({
      time: d.toISOString(),
      label: `-${ageMinutes}m`,
      tileUrl: `${IEM_TILE}/ridge::${site.radarId}-${productCode}-${stamp}/{z}/{x}/{y}.png`,
      ageMinutes,
    });
  }

  frames.push({
    time: now.toISOString(),
    label: 'LIVE',
    tileUrl: latestTileUrl,
    ageMinutes: 0,
  });

  return NextResponse.json(
    {
      provider: 'NOAA NEXRAD Level III / IEM RIDGE',
      station: site.radarId,
      siteId: site.id,
      product: productCode,
      productKey,
      tilt,
      frames,
      latestTileUrl,
      compositeTileUrl,
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
