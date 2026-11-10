import { NextResponse } from 'next/server';
import { RadarSiteRegistry, RadarNetworkType } from '@/lib/radar/radar-provider';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const network = searchParams.get('network') as RadarNetworkType | null;
  const search = searchParams.get('search')?.toLowerCase();

  let stations = RadarSiteRegistry.getAllStations(network || undefined);

  if (search) {
    stations = stations.filter(
      (s) =>
        s.id.toLowerCase().includes(search) ||
        s.callsign.toLowerCase().includes(search) ||
        s.name.toLowerCase().includes(search) ||
        (s.state && s.state.toLowerCase().includes(search))
    );
  }

  return NextResponse.json(
    {
      total: stations.length,
      stations,
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    }
  );
}
