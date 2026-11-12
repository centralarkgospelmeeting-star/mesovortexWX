import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = (searchParams.get('mode') || 'positions').toLowerCase();
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const radiusKm = Number(searchParams.get('radiusKm') || 250);

  try {
    const endpoint =
      mode === 'reports'
        ? 'https://www.spotternetwork.org/feeds/reports.json'
        : 'https://www.spotternetwork.org/feeds/positions.json';

    const res = await fetch(endpoint, {
      headers: { Accept: 'application/json', 'User-Agent': 'MesoVortexWX/1.0' },
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      return NextResponse.json({
        type: 'FeatureCollection',
        features: [],
        meta: {
          source: 'Spotter Network',
          mode,
          count: 0,
          warning: `Upstream returned ${res.status}`,
          fetchedAt: new Date().toISOString(),
        },
      });
    }

    const data = await res.json();
    let features: any[] = [];

    if (Array.isArray(data?.features)) {
      features = data.features;
    } else if (Array.isArray(data)) {
      features = data
        .filter((r: any) => r.lat != null && r.lon != null)
        .map((r: any) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [Number(r.lon), Number(r.lat)] },
          properties: {
            id: r.id ?? r.spotter_id,
            name: r.name ?? r.callsign ?? 'Spotter',
            report: r.report ?? r.text ?? r.description,
            time: r.time ?? r.timestamp ?? r.reported_at,
            ...r,
          },
        }));
    } else if (data?.spotters || data?.positions) {
      const list = data.spotters || data.positions || [];
      features = list
        .filter((r: any) => r.lat != null && (r.lon != null || r.lng != null))
        .map((r: any) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [Number(r.lon ?? r.lng), Number(r.lat)],
          },
          properties: {
            id: r.id ?? r.spotter_id,
            name: r.name ?? r.callsign ?? 'Spotter',
            time: r.time ?? r.last_report,
            ...r,
          },
        }));
    }

    if (lat && lon && features.length) {
      const clat = Number(lat);
      const clon = Number(lon);
      if (!Number.isNaN(clat) && !Number.isNaN(clon)) {
        features = features.filter((f) => {
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
        source: 'Spotter Network',
        mode,
        count: features.length,
        fetchedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json({
      type: 'FeatureCollection',
      features: [],
      meta: {
        source: 'Spotter Network',
        mode,
        count: 0,
        error: String(err?.message || err),
        fetchedAt: new Date().toISOString(),
      },
    });
  }
}
