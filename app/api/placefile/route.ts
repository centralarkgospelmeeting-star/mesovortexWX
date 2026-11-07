import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type PlacefileItem = {
  lat: number;
  lon: number;
  text?: string;
  hoverText?: string;
  color?: string;
  type: 'text' | 'icon' | 'dot';
};

function parsePlacefileText(text: string): PlacefileItem[] {
  const lines = text.split('\n');
  const items: PlacefileItem[] = [];

  let currentColor = '#ffffff';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith(';') || line.startsWith('//')) continue;

    // Parse Color: r g b or r g b a
    if (line.startsWith('Color:')) {
      const parts = line.replace('Color:', '').trim().split(/\s+/).map(Number);
      if (parts.length >= 3) {
        currentColor = `rgb(${parts[0]}, ${parts[1]}, ${parts[2]})`;
      }
      continue;
    }

    // Parse Text: lat, lon, font, "string", "hover"
    if (line.startsWith('Text:')) {
      const match = line.match(/Text:\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*\d+\s*,\s*"([^"]*)"(?:\s*,\s*"([^"]*)")?/);
      if (match) {
        const lat = parseFloat(match[1]);
        const lon = parseFloat(match[2]);
        const str = match[3];
        const hover = match[4] || str;
        if (!isNaN(lat) && !isNaN(lon)) {
          items.push({
            lat,
            lon,
            text: str.replace(/\\n/g, ' '),
            hoverText: hover.replace(/\\n/g, '\n'),
            color: currentColor,
            type: 'text',
          });
        }
      }
      continue;
    }

    // Parse Icon: lat, lon, heading, iconFile, iconIndex, "hover"
    if (line.startsWith('Icon:')) {
      const match = line.match(/Icon:\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*[-\d.]+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*"([^"]*)")?/);
      if (match) {
        const lat = parseFloat(match[1]);
        const lon = parseFloat(match[2]);
        const hover = match[3] || 'Placefile Icon';
        if (!isNaN(lat) && !isNaN(lon)) {
          items.push({
            lat,
            lon,
            text: '⚡',
            hoverText: hover.replace(/\\n/g, '\n'),
            color: currentColor,
            type: 'icon',
          });
        }
      }
      continue;
    }

    // Parse Dot / Point: lat, lon
    if (line.startsWith('Point:')) {
      const match = line.match(/Point:\s*([-\d.]+)\s*,\s*([-\d.]+)/);
      if (match) {
        const lat = parseFloat(match[1]);
        const lon = parseFloat(match[2]);
        if (!isNaN(lat) && !isNaN(lon)) {
          items.push({
            lat,
            lon,
            text: '•',
            hoverText: 'Placefile point',
            color: currentColor,
            type: 'dot',
          });
        }
      }
    }
  }

  return items;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing placefile url query parameter' }, { status: 400 });
  }

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'MesoVortexWX/2.0 (Placefile Engine)',
      },
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      return NextResponse.json({ type: 'FeatureCollection', features: [] });
    }

    const rawText = await res.text();
    const parsedItems = parsePlacefileText(rawText);

    const features = parsedItems.map((item, idx) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [item.lon, item.lat],
      },
      properties: {
        id: `pf-${idx}`,
        text: item.text || '',
        hoverText: item.hoverText || '',
        color: item.color || '#38bdf8',
        type: item.type,
      },
    }));

    return NextResponse.json({
      type: 'FeatureCollection',
      features,
    });
  } catch (err) {
    console.error('Placefile download error:', err);
    return NextResponse.json({ type: 'FeatureCollection', features: [] });
  }
}
