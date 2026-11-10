import { NextResponse } from 'next/server';
import { RadarSiteRegistry } from '../../../../lib/radar/radar-provider';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteId = (searchParams.get('site') ?? 'KLZK').toUpperCase();
  const product = (searchParams.get('product') ?? 'ref').toLowerCase();
  const tilt = searchParams.get('tilt') ?? '0.5';

  // 1. Resolve Station dynamically across WSR-88D, TDWR, Mobile, Research, Private
  const station = RadarSiteRegistry.getStation(siteId);

  // 2. Resolve pluggable driver for this station's network
  const driver = RadarSiteRegistry.getDriverForStation(station);

  // 3. Delegate tile generation to the registered provider driver
  const frames = driver.getFrameLoop({
    station,
    product,
    tilt,
  });

  const latestTileUrl = driver.getTileUrl({
    station,
    product,
    tilt,
  });

  return NextResponse.json(
    {
      provider: driver.networkType,
      station: station.id,
      callsign: station.callsign,
      name: station.name,
      network: station.network,
      product,
      tilt,
      frames,
      latestTileUrl,
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
