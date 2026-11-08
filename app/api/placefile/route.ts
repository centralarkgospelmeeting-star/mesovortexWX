import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type GeoFeature = {
  type: 'Feature';
  geometry: {
    type: 'Point' | 'LineString' | 'Polygon';
    coordinates: any;
  };
  properties: {
    id: string;
    text?: string;
    hoverText?: string;
    color: string;
    fillColor?: string;
  };
};

function parseFullGibsonRidgePlacefile(rawText: string): GeoFeature[] {
  const lines = rawText.split(/\r?\n/);
  const features: GeoFeature[] = [];

  let currentColor = '#38bdf8';
  let featureCount = 0;

  let currentBlockType: 'Line' | 'Polygon' | null = null;
  let currentCoords: [number, number][] = [];
  let currentBlockHover = '';

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line || line.startsWith(';') || line.startsWith('//')) continue;

    // 1. Color commands
    if (line.startsWith('Color:')) {
      const parts = line.replace('Color:', '').trim().split(/\s+/).map(Number);
      if (parts.length >= 3) {
        currentColor = `rgb(${parts[0]}, ${parts[1]}, ${parts[2]})`;
      }
      continue;
    }

    // 2. Block Finish (End:)
    if (line.startsWith('End:') || line.startsWith('END:')) {
      if (currentBlockType === 'Line' && currentCoords.length >= 2) {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: currentCoords,
          },
          properties: {
            id: `pf-line-${featureCount++}`,
            color: currentColor,
            hoverText: currentBlockHover,
          },
        });
      } else if (currentBlockType === 'Polygon' && currentCoords.length >= 3) {
        const closed = [...currentCoords];
        if (
          closed[0][0] !== closed[closed.length - 1][0] ||
          closed[0][1] !== closed[closed.length - 1][1]
        ) {
          closed.push(closed[0]);
        }
        features.push({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [closed],
          },
          properties: {
            id: `pf-poly-${featureCount++}`,
            color: currentColor,
            fillColor: currentColor,
            hoverText: currentBlockHover,
          },
        });
      }
      currentBlockType = null;
      currentCoords = [];
      currentBlockHover = '';
      continue;
    }

    // 3. Line Block Start
    if (line.startsWith('Line:') || line.startsWith('LINE:')) {
      currentBlockType = 'Line';
      currentCoords = [];
      const hoverMatch = line.match(/"([^"]*)"/);
      currentBlockHover = hoverMatch ? hoverMatch[1] : '';
      continue;
    }

    // 4. Polygon Block Start
    if (line.startsWith('Polygon:') || line.startsWith('POLYGON:')) {
      currentBlockType = 'Polygon';
      currentCoords = [];
      const hoverMatch = line.match(/"([^"]*)"/);
      currentBlockHover = hoverMatch ? hoverMatch[1] : '';
      continue;
    }

    // 5. Inside Coordinate Block
    if (currentBlockType) {
      const coordMatch = line.match(/^\s*([-\d.]+)\s*,\s*([-\d.]+)/);
      if (coordMatch) {
        const lat = parseFloat(coordMatch[1]);
        const lon = parseFloat(coordMatch[2]);
        if (!isNaN(lat) && !isNaN(lon)) {
          currentCoords.push([lon, lat]);
        }
      }
      continue;
    }

    // 6. Text Elements
    if (line.startsWith('Text:')) {
      const match = line.match(/Text:\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*\d+\s*,\s*"([^"]*)"(?:\s*,\s*"([^"]*)")?/);
      if (match) {
        const lat = parseFloat(match[1]);
        const lon = parseFloat(match[2]);
        const text = match[3];
        const hover = match[4] || text;
        if (!isNaN(lat) && !isNaN(lon)) {
          features.push({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [lon, lat],
            },
            properties: {
              id: `pf-txt-${featureCount++}`,
              text: text.replace(/\\n/g, ' '),
              hoverText: hover.replace(/\\n/g, '\n'),
              color: currentColor,
            },
          });
        }
      }
      continue;
    }

    // 7. Icon / Dot Elements
    if (line.startsWith('Icon:') || line.startsWith('ICON:') || line.startsWith('Point:')) {
      const match = line.match(/(?:Icon|Point):\s*([-\d.]+)\s*,\s*([-\d.]+)(?:[^\n"]*"([^"]*)")?/);
      if (match) {
        const lat = parseFloat(match[1]);
        const lon = parseFloat(match[2]);
        const hover = match[3] || 'Placefile Observation';
        if (!isNaN(lat) && !isNaN(lon)) {
          features.push({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [lon, lat],
            },
            properties: {
              id: `pf-pt-${featureCount++}`,
              text: '•',
              hoverText: hover.replace(/\\n/g, '\n'),
              color: currentColor,
            },
          });
        }
      }
    }
  }

  return features;
}

function isBlockedPlacefileHost(hostname: string) {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h === '::1' || h.endsWith('.local')) return true;
  if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return true;
  return false;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing placefile url query parameter' }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid placefile URL' }, { status: 400 });
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || isBlockedPlacefileHost(parsed.hostname)) {
    return NextResponse.json({ error: 'Placefile URL is not allowed' }, { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(parsed.toString(), {
      headers: { 'User-Agent': 'MesoVortexWX/2.0 (Placefile Engine)' },
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ type: 'FeatureCollection', features: [], _meta: { ok: false, status: res.status, source: parsed.hostname } }, { headers: { 'Cache-Control': 'no-store' } });
    }

    let rawText = await res.text();
    if (rawText.length > 2_000_000) rawText = rawText.slice(0, 2_000_000);
    const features = parseFullGibsonRidgePlacefile(rawText);

    return NextResponse.json(
      { type: 'FeatureCollection', features, _meta: { fetchedAt: new Date().toISOString(), ok: true, source: parsed.hostname, count: features.length } },
      { headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=60' } }
    );
  } catch (err: any) {
    const msg = err?.name === 'AbortError' ? 'Timeout fetching placefile' : 'Placefile download error';
    return NextResponse.json({ type: 'FeatureCollection', features: [], _meta: { ok: false, error: msg, source: parsed.hostname } }, { headers: { 'Cache-Control': 'no-store' } });
  } finally {
    clearTimeout(timer);
  }
}
