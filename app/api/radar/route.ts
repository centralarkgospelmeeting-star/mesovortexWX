export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json(
    {
      status: 'LEGACY_MOCK',
      note: 'This endpoint returns placeholder data. Use /api/nexrad/frames for live radar tiles.',
      site: 'KOUN',
      product: 'ref',
      frames: ['/images/radar-frame-1.jpg', '/images/radar-frame-2.jpg', '/images/radar-frame-3.jpg'],
      _meta: { fetchedAt: new Date().toISOString(), source: 'internal-mock', ok: true },
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
