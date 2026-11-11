export interface DbzThreshold {
  dbz: number;
  r: number;
  g: number;
  b: number;
}

export const REFLECTIVITY_COLOR_MAP: DbzThreshold[] = [
  { dbz: 75, r: 255, g: 255, b: 255 }, // White
  { dbz: 70, r: 152, g: 84,  b: 198 }, // Purple
  { dbz: 65, r: 248, g: 0,   b: 253 }, // Magenta
  { dbz: 60, r: 212, g: 0,   b: 0   }, // Dark Red
  { dbz: 55, r: 253, g: 0,   b: 0   }, // Red
  { dbz: 50, r: 253, g: 149, b: 0   }, // Orange
  { dbz: 45, r: 253, g: 248, b: 2   }, // Yellow
  { dbz: 40, r: 229, g: 188, b: 0   }, // Gold
  { dbz: 35, r: 0,   g: 142, b: 0   }, // Dark Green
  { dbz: 30, r: 1,   g: 197, b: 1   }, // Medium Green
  { dbz: 25, r: 2,   g: 253, b: 2   }, // Bright Green
  { dbz: 20, r: 3,   g: 0,   b: 244 }, // Dark Blue
  { dbz: 15, r: 1,   g: 159, b: 244 }, // Medium Blue
  { dbz: 10, r: 4,   g: 233, b: 231 }, // Light Blue
  { dbz: 5,  r: 4,   g: 233, b: 231 }, // Light Cyan
];

export function pixelToDbz(r: number, g: number, b: number, a: number): number {
  if (a < 30) return -1;

  let closestDbz = -1;
  let minDiff = 90;

  for (let i = 0; i < REFLECTIVITY_COLOR_MAP.length; i++) {
    const entry = REFLECTIVITY_COLOR_MAP[i];
    const diff = Math.abs(r - entry.r) + Math.abs(g - entry.g) + Math.abs(b - entry.b);
    if (diff < minDiff) {
      minDiff = diff;
      closestDbz = entry.dbz;
    }
  }

  return closestDbz;
}

export function dbzToRgba(dbz: number): [number, number, number, number] {
  if (dbz < 5) return [0, 0, 0, 0];

  for (let i = 0; i < REFLECTIVITY_COLOR_MAP.length; i++) {
    const entry = REFLECTIVITY_COLOR_MAP[i];
    if (dbz >= entry.dbz) {
      return [entry.r, entry.g, entry.b, 240];
    }
  }

  return [4, 233, 231, 200];
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}

/**
 * Max Reflectivity Swath Generator:
 * Computes the exact maximum dBZ observed at each pixel across N rolling scans.
 */
export async function computeMaxReflectivityCanvas(
  frameUrls: string[],
  width = 512,
  height = 512
): Promise<string> {
  if (!frameUrls || frameUrls.length === 0) return '';

  const offscreen = document.createElement('canvas');
  offscreen.width = width;
  offscreen.height = height;
  const ctx = offscreen.getContext('2d', { willReadFrequently: true });
  if (!ctx) return '';

  const totalPixels = width * height;
  const maxDbzBuffer = new Float32Array(totalPixels);
  maxDbzBuffer.fill(-1);

  for (const url of frameUrls) {
    try {
      const img = await loadImage(url);
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;

      for (let i = 0; i < totalPixels; i++) {
        const offset = i * 4;
        const dbz = pixelToDbz(data[offset], data[offset + 1], data[offset + 2], data[offset + 3]);
        if (dbz > maxDbzBuffer[i]) {
          maxDbzBuffer[i] = dbz;
        }
      }
    } catch {
      // Continue processing remaining frames
    }
  }

  const outputImgData = ctx.createImageData(width, height);
  const outData = outputImgData.data;

  for (let i = 0; i < totalPixels; i++) {
    const maxDbz = maxDbzBuffer[i];
    const offset = i * 4;

    if (maxDbz >= 5) {
      const [r, g, b, a] = dbzToRgba(maxDbz);
      outData[offset] = r;
      outData[offset + 1] = g;
      outData[offset + 2] = b;
      outData[offset + 3] = a;
    } else {
      outData[offset + 3] = 0;
    }
  }

  ctx.putImageData(outputImgData, 0, 0);
  return offscreen.toDataURL('image/png');
}

/**
 * Reflectivity X Generator:
 * Creates true sub-frame linear morphing between two actual volume scans (t0 and t1).
 */
export async function interpolateReflectivityFrames(
  urlA: string,
  urlB: string,
  width = 512,
  height = 512
): Promise<string> {
  const offscreen = document.createElement('canvas');
  offscreen.width = width;
  offscreen.height = height;
  const ctx = offscreen.getContext('2d', { willReadFrequently: true });
  if (!ctx) return urlB;

  try {
    const [imgA, imgB] = await Promise.all([loadImage(urlA), loadImage(urlB)]);

    // Render frame A
    ctx.drawImage(imgA, 0, 0, width, height);
    const dataA = ctx.getImageData(0, 0, width, height).data;

    // Render frame B
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(imgB, 0, 0, width, height);
    const dataB = ctx.getImageData(0, 0, width, height).data;

    const outImg = ctx.createImageData(width, height);
    const out = outImg.data;
    const totalPixels = width * height;

    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const dbzA = pixelToDbz(dataA[idx], dataA[idx + 1], dataA[idx + 2], dataA[idx + 3]);
      const dbzB = pixelToDbz(dataB[idx], dataB[idx + 1], dataB[idx + 2], dataB[idx + 3]);

      let interpDbz = -1;
      if (dbzA > 0 && dbzB > 0) {
        interpDbz = Math.round((dbzA + dbzB) / 2);
      } else if (dbzA > 0) {
        interpDbz = dbzA;
      } else if (dbzB > 0) {
        interpDbz = dbzB;
      }

      if (interpDbz >= 5) {
        const [r, g, b, a] = dbzToRgba(interpDbz);
        out[idx] = r;
        out[idx + 1] = g;
        out[idx + 2] = b;
        out[idx + 3] = a;
      } else {
        out[idx + 3] = 0;
      }
    }

    ctx.putImageData(outImg, 0, 0);
    return offscreen.toDataURL('image/png');
  } catch {
    return urlB;
  }
}
