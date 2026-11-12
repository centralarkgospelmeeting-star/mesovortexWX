import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const minutes = Math.min(180, Math.max(5, Number(searchParams.get('minutes') || 60)));
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const radiusKm = Number(searchParams.get('radiusKm') || 150);

  try {
    const url = `https://mping.ou.edu/static/mping/api/v2/reports?minutes=${minutes}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'MesoVortexWX/1.0' },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: 'mPING upstream unavailable', status: res.status },
        { status: 502 }
      );
    }

    const data = await res.json();
    let features = Array.isArray(data?.features) ? data.features : Array.isArray(data) ? data : [];

    if (lat && lon && features.length) {
      const clat = Number(lat);
      const clon = Number(lon);
      if (!Number.isNaN(clat) && !Number.isNaN(clon)) {
        features = features.filter((f: any) => {
          const coords = f?.geometry?.coordinates;
          if (!coords || coords.length < 2) return false;
          const [flon, flat] = coords;
          const dLat = ((flat - clat) * Math.PI) / 180;
          const dLon = ((flon - clon) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos((clat * Math.PI) / 180) *
              Math.cos((flat * Math.PI) / 180) *
              Math.sin(dLon / 2) ** 2;
          const km = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return km <= radiusKm;
        });
      }
    }

    return NextResponse.json({
      type: 'FeatureCollection',
      features,
      meta: {
        source: 'NSSL mPING',
        minutes,
        count: features.length,
        fetchedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'mPING fetch failed', detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}
