// Client-side max reflectivity compositing for IEM ridge reflectivity tiles.
// Composites per-pixel maximum dBZ over a set of scan frame tile URLs.
// Preserves the source reflectivity color table by selecting the pixel
// whose color maps to the highest dBZ value.

export type MaxRefWindow = 5 | 10 | 20 | 30;

// Standard NWS reflectivity color scale (approximate, matches common IEM N0Q/N0B rendering)
// dBZ -> [r,g,b]. Ordered ascending.
const REF_DBZ_TABLE: Array<{ dbz: number; rgb: [number, number, number] }> = [
  { dbz: -30, rgb: [0, 0, 0] },
  { dbz: 5, rgb: [4, 233, 231] },
  { dbz: 10, rgb: [1, 159, 244] },
  { dbz: 15, rgb: [3, 0, 244] },
  { dbz: 20, rgb: [2, 253, 2] },
  { dbz: 25, rgb: [1, 197, 1] },
  { dbz: 30, rgb: [0, 142, 0] },
  { dbz: 35, rgb: [253, 248, 2] },
  { dbz: 40, rgb: [229, 188, 0] },
  { dbz: 45, rgb: [253, 149, 0] },
  { dbz: 50, rgb: [253, 0, 0] },
  { dbz: 55, rgb: [212, 0, 0] },
  { dbz: 60, rgb: [188, 0, 0] },
  { dbz: 65, rgb: [248, 0, 253] },
  { dbz: 70, rgb: [152, 84, 198] },
  { dbz: 75, rgb: [173, 144, 240] },
  { dbz: 80, rgb: [255, 255, 255] },
];

// Build a fast RGB->dBZ lookup (quantized 5 bits per channel = 32^3 entries)
const LUT_BITS = 5;
const LUT_SIZE = 1 << LUT_BITS;
const lut = new Int8Array(LUT_SIZE * LUT_SIZE * LUT_SIZE); // stores dBZ (-128..127)

function colorDist2(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) {
  const dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
  return dr * dr + dg * dg + db * db;
}

function buildLut() {
  for (let ri = 0; ri < LUT_SIZE; ri++) {
    for (let gi = 0; gi < LUT_SIZE; gi++) {
      for (let bi = 0; bi < LUT_SIZE; bi++) {
        const r = (ri << (8 - LUT_BITS)) + (1 << (7 - LUT_BITS));
        const g = (gi << (8 - LUT_BITS)) + (1 << (7 - LUT_BITS));
        const b = (bi << (8 - LUT_BITS)) + (1 << (7 - LUT_BITS));
        // transparent/black-ish treated as no echo
        let bestDbz = -100;
        if (!(r < 10 && g < 10 && b < 10)) {
          let bestD = Infinity;
          for (const e of REF_DBZ_TABLE) {
            const d = colorDist2(r, g, b, e.rgb[0], e.rgb[1], e.rgb[2]);
            if (d < bestD) { bestD = d; bestDbz = e.dbz; }
          }
          // if too far from any reflectivity color, treat as non-reflectivity
          if (bestD > 80 * 80) bestDbz = -100;
        }
        lut[(ri << (LUT_BITS * 2)) | (gi << LUT_BITS) | bi] = bestDbz;
      }
    }
  }
}
buildLut();

function rgbToDbz(r: number, g: number, b: number, a: number): number {
  if (a < 20) return -100; // transparent
  const ri = r >> (8 - LUT_BITS);
  const gi = g >> (8 - LUT_BITS);
  const bi = b >> (8 - LUT_BITS);
  return lut[(ri << (LUT_BITS * 2)) | (gi << LUT_BITS) | bi];
}

const tileCache = new Map<string, Promise<ImageData | null>>();

async function fetchTileImageData(url: string): Promise<ImageData | null> {
  const cached = tileCache.get(url);
  if (cached) return cached;
  const p = (async () => {
    try {
      const resp = await fetch(url, { cache: 'force-cache' });
      if (!resp.ok) return null;
      const blob = await resp.blob();
      const bmp = await createImageBitmap(blob);
      const c = document.createElement('canvas');
      c.width = bmp.width; c.height = bmp.height;
      const ctx = c.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(bmp, 0, 0);
      bmp.close();
      return ctx.getImageData(0, 0, c.width, c.height);
    } catch {
      return null;
    }
  })();
  tileCache.set(url, p);
  // simple cache bound
  if (tileCache.size > 400) {
    const first = tileCache.keys().next().value;
    if (first) tileCache.delete(first);
  }
  return p;
}

export async function compositeMaxRefTile(frameTileUrls: string[], z: number, x: number, y: number): Promise<ImageBitmap | null> {
  if (!frameTileUrls.length) return null;
  const urls = frameTileUrls.map((t) => t.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y)));
  const images = await Promise.all(urls.map(fetchTileImageData));
  const valid = images.filter((im): im is ImageData => !!im);
  if (!valid.length) return null;

  const w = valid[0].width, h = valid[0].height;
  const out = new ImageData(w, h);
  const outData = out.data;
  // init transparent
  for (let i = 0; i < outData.length; i += 4) { outData[i + 3] = 0; }
  const bestDbz = new Int16Array(w * h);
  for (let i = 0; i < bestDbz.length; i++) bestDbz[i] = -1000;

  for (const img of valid) {
    const d = img.data;
    const len = Math.min(bestDbz.length, (d.length / 4) | 0);
    for (let i = 0; i < len; i++) {
      const o = i * 4;
      const dbz = rgbToDbz(d[o], d[o + 1], d[o + 2], d[o + 3]);
      if (dbz > bestDbz[i]) {
        bestDbz[i] = dbz;
        outData[o] = d[o]; outData[o + 1] = d[o + 1]; outData[o + 2] = d[o + 2]; outData[o + 3] = d[o + 3];
      }
    }
  }
  return createImageBitmap(out);
}

export function clearMaxRefTileCache() {
  tileCache.clear();
}
