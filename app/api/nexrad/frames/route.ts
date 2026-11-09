import { NextResponse } from 'next/server';
import { NoaaRadarAdapter } from '@/lib/adapters/providers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const site = searchParams.get('site') || 'LZK';
  const product = searchParams.get('product') || 'ref';
  const tilt = searchParams.get('tilt') || '0.5';

  const feed = NoaaRadarAdapter.getRadarFeed(site, product, tilt);

  return NextResponse.json(feed, {
    headers: {
      'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
