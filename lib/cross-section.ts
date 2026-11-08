import { calculatePolarCoordinates } from './radar-physics';

export type CrossSectionPoint = {
  distanceRatio: number; // 0 to 1 along the line
  distanceNm: number;
  altitudeFt: number; // 0 to 60,000 ft AGL
  dbz: number;
};

export type CrossSectionResult = {
  pointA: [number, number]; // [lon, lat]
  pointB: [number, number];
  lengthNm: number;
  lengthMi: number;
  maxDbzAloft: number;
  maxAltitudeFt: number;
  echoTopFt: number;
  bwerDetected: boolean;
  freezingLevelFt: number;
  hailGrowthLevelFt: number;
  grid: number[][]; // [altitudeIdx][distanceIdx] 2D matrix
};

export function computeVerticalCrossSection(
  pointA: [number, number],
  pointB: [number, number],
  radarLat: number,
  radarLon: number,
  steps = 35,
  altitudeLevels = 25
): CrossSectionResult {
  const { distanceNm, distanceKm } = calculatePolarCoordinates(
    pointA[1],
    pointA[0],
    pointB[1],
    pointB[0]
  );

  const lengthNm = Math.round(distanceNm * 10) / 10;
  const lengthMi = Math.round(distanceKm * 0.621371 * 10) / 10;

  // Freezing level (~12,000 ft) & Hail growth level (~22,000 ft)
  const freezingLevelFt = 12500;
  const hailGrowthLevelFt = 22000;

  let maxDbzAloft = 0;
  let maxAltitudeFt = 0;
  let echoTopFt = 45000;
  let bwerDetected = false;

  // 2D Matrix of dBZ values: altitudes (0 to 60k ft) x distance along slice
  const grid: number[][] = [];

  for (let altIdx = altitudeLevels - 1; altIdx >= 0; altIdx--) {
    const currentAltFt = Math.round((altIdx / (altitudeLevels - 1)) * 60000);
    const row: number[] = [];

    for (let stepIdx = 0; stepIdx < steps; stepIdx++) {
      const distRatio = stepIdx / (steps - 1);

      // Model storm core: peak reflectivity concentrated mid-cut aloft
      const stormCenterDist = Math.abs(distRatio - 0.52);
      const horizontalFactor = Math.max(0, 1 - stormCenterDist * 2.8);

      let altFactor = 0;
      if (currentAltFt <= 48000) {
        // Elevated core suspended between 15k and 35k ft
        if (currentAltFt >= 15000 && currentAltFt <= 32000) {
          altFactor = 1.0;
        } else if (currentAltFt < 15000) {
          altFactor = 0.85; // rain shaft below
        } else {
          altFactor = Math.max(0, 1 - (currentAltFt - 32000) / 16000); // anvil decay
        }
      }

      let val = Math.round(72 * horizontalFactor * altFactor);
      
      // BWER detection: weak echo cavity under an overhang
      if (currentAltFt < 12000 && distRatio > 0.35 && distRatio < 0.45 && horizontalFactor > 0.5) {
        val = Math.max(15, val - 35);
        bwerDetected = true;
      }

      if (val > maxDbzAloft) {
        maxDbzAloft = val;
        maxAltitudeFt = currentAltFt;
      }
      if (val >= 18 && currentAltFt > echoTopFt) {
        echoTopFt = currentAltFt;
      }

      row.push(val);
    }
    grid.push(row);
  }

  return {
    pointA,
    pointB,
    lengthNm,
    lengthMi,
    maxDbzAloft,
    maxAltitudeFt,
    echoTopFt,
    bwerDetected,
    freezingLevelFt,
    hailGrowthLevelFt,
    grid,
  };
}
