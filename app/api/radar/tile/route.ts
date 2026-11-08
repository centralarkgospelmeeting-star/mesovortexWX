export const dynamic = 'force-dynamic';

// Transparent 1x1 PNG for graceful fallback (prevents broken tile errors)
const TRANSPARENT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAA=',
  'base64'
);

// 2.0-inspired resilient radar tile proxy (adapted for Next.js Route Handler)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const product = String(searchParams.get('product') || 'ref');
  const site = String(searchParams.get('site') || 'LZK').toUpperCase().replace(/^K/, '') || 'LZK';
  const tilt = String(searchParams.get('tilt') || '0.5');
  const z = searchParams.get('z');
  const x = searchParams.get('x');
  const y = searchParams.get('y');

  if (!z || !x || !y) {
    return new Response(TRANSPARENT_PNG, { status: 200, headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=60' } });
  }

  const candidates: string[] = [];
  const IEM = 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0';

  if (product === 'azshear') {
    candidates.push(`${IEM}/mrms::AzShear_0-2km/${z}/${x}/${y}.png`);
    candidates.push(`${IEM}/ridge::${site}-N0S-0/${z}/${x}/${y}.png`);
  } else if (product === 'mesh') {
    candidates.push(`${IEM}/mrms::MESH_Max60min/${z}/${x}/${y}.png`);
  } else if (product === 'cc' || product === 'zdr' || product === 'kdp') {
    // Keep current project mappings (substitutes noted in registry) as fallbacks
    if (product === 'cc') candidates.push(`${IEM}/mrms::PrecipClass/${z}/${x}/${y}.png`);
    if (product === 'zdr') candidates.push(`${IEM}/mrms::ReflectivityAtLowestAltitude/${z}/${x}/${y}.png`);
    if (product === 'kdp') candidates.push(`${IEM}/mrms::MultiSensorQPE01H/${z}/${x}/${y}.png`);
  } else if (product === 'tops') {
    candidates.push(`${IEM}/ridge::${site}-EET-0/${z}/${x}/${y}.png`);
  } else if (product === 'vil') {
    candidates.push(`${IEM}/ridge::${site}-DVL-0/${z}/${x}/${y}.png`);
  } else if (product === 'srvel') {
    candidates.push(`${IEM}/ridge::${site}-N0S-0/${z}/${x}/${y}.png`);
  } else if (product === 'vel') {
    let code = 'N0U';
    if (tilt === '0.9') code = 'N1U';
    if (tilt === '1.3') code = 'N2U';
    if (tilt === '1.8') code = 'N3U';
    candidates.push(`${IEM}/ridge::${site}-${code}-0/${z}/${x}/${y}.png`);
  } else {
    let code = 'N0B';
    if (tilt === '0.9') code = 'N1B';
    if (tilt === '1.3') code = 'N2B';
    if (tilt === '1.8') code = 'N3B';
    candidates.push(`${IEM}/ridge::${site}-${code}-0/${z}/${x}/${y}.png`);
  }

  candidates.push(`${IEM}/ridge::${site}-N0B-0/${z}/${x}/${y}.png`);

  for (const url of candidates) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const upstream = await fetch(url, { signal: controller.signal, cache: 'no-store' });
      clearTimeout(timer);
      if (upstream.ok) {
        const buffer = await upstream.arrayBuffer();
        return new Response(buffer, {
          status: 200,
          headers: {
            'Content-Type': upstream.headers.get('Content-Type') || 'image/png',
            'Cache-Control': 'public, max-age=120',
          },
        });
      }
    } catch {
      // try next
    }
  }

  return new Response(TRANSPARENT_PNG, {
    status: 200,
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=60' },
  });
}
