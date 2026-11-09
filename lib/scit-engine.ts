export type StormCellTrack = {
  id: string;
  lat: number;
  lon: number;
  motionDeg: number; // e.g. 240 degrees (coming from WSW moving ENE)
  speedKt: number;   // forward velocity in knots
  maxDbz: number;
  vilKgM2: number;
  meshInches: number;
  projections: {
    minutesAhead: number;
    lat: number;
    lon: number;
    label: string;
  }[];
};

// Calculate forward destination coordinate given start point, bearing, and distance
function calculateDestination(lat: number, lon: number, bearingDeg: number, distanceNm: number): [number, number] {
  const d = distanceNm / 3440.065; // Earth radius in nautical miles
  const brng = (bearingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lon * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng)
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    );

  return [(lon2 * 180) / Math.PI, (lat2 * 180) / Math.PI];
}

export function generateStormCellTracks(radarLat: number, radarLon: number): StormCellTrack[] {
  // Generate active convective cell vectors in the radar sector
  const motionDeg = 65; // ENE storm motion common for supercells
  const speedKt = 42;   // 42 knots forward translation

  // Cell offsets surrounding the tower
  const cellSeeds = [
    { offsetLat: 0.28, offsetLon: -0.45, maxDbz: 67, vil: 64, mesh: 2.25 },
    { offsetLat: -0.35, offsetLon: -0.65, maxDbz: 62, vil: 52, mesh: 1.75 },
    { offsetLat: 0.12, offsetLon: 0.38, maxDbz: 56, vil: 44, mesh: 1.00 },
  ];

  return cellSeeds.map((seed, idx) => {
    const cellLat = radarLat + seed.offsetLat;
    const cellLon = radarLon + seed.offsetLon;

    // Projected arrivals: 15, 30, 45, 60 minutes
    const intervals = [15, 30, 45, 60];
    const projections = intervals.map((mins) => {
      const distanceTraveledNm = (speedKt * mins) / 60;
      const [projLon, projLat] = calculateDestination(cellLat, cellLon, motionDeg, distanceTraveledNm);
      return {
        minutesAhead: mins,
        lat: projLat,
        lon: projLon,
        label: `+${mins}m`,
      };
    });

    return {
      id: `CELL-${idx + 1}`,
      lat: cellLat,
      lon: cellLon,
      motionDeg,
      speedKt,
      maxDbz: seed.maxDbz,
      vilKgM2: seed.vil,
      meshInches: seed.mesh,
      projections,
    };
  });
}
