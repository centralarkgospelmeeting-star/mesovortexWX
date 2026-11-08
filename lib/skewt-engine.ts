export type SoundingIndices = {
  sbcape: number;
  mlcape: number;
  srh01: number;
  srh03: number;
  shear06: number;
  liftedIndex: number;
  pwat: number;
  stp: number; // Significant Tornado Parameter
  hazardRating: 'LOW' | 'ELEVATED' | 'SEVERE' | 'EXTREME TORNADIC';
};

export type SoundingProfile = {
  station: string;
  lat: number;
  lon: number;
  elevationM: number;
  indices: SoundingIndices;
  levels: { pressureMb: number; heightM: number; tempC: number; dewC: number; windSpdKt: number; windDirDeg: number }[];
};

export function computeSignificantTornadoParameter(cape: number, srh01: number, shear06: number, lclHeightM = 800): number {
  const capeTerm = cape / 1500;
  const lclTerm = (2000 - lclHeightM) / 1000;
  const srhTerm = srh01 / 150;
  const shearTerm = shear06 / 20;

  const stp = Math.max(0, capeTerm * lclTerm * srhTerm * shearTerm);
  return Math.round(stp * 10) / 10;
}

export function generateThermodynamicSounding(lat: number, lon: number): SoundingProfile {
  // Approximate sounding profiles based on latitude and regional instability
  const sbcape = Math.round(1800 + Math.sin(lat * 0.1) * 1400);
  const mlcape = Math.round(sbcape * 0.78);
  const srh01 = Math.round(180 + Math.cos(lon * 0.05) * 120);
  const srh03 = Math.round(srh01 * 1.65);
  const shear06 = Math.round(42 + Math.sin(lon) * 18);
  const stp = computeSignificantTornadoParameter(sbcape, srh01, shear06);

  let hazardRating: SoundingIndices['hazardRating'] = 'LOW';
  if (stp >= 3.0) hazardRating = 'EXTREME TORNADIC';
  else if (stp >= 1.0) hazardRating = 'SEVERE';
  else if (sbcape > 1500) hazardRating = 'ELEVATED';

  // Standard atmospheric pressure levels (1000mb down to 200mb)
  const pressureLevels = [1000, 925, 850, 700, 500, 400, 300, 250, 200];
  const levels = pressureLevels.map((p, idx) => ({
    pressureMb: p,
    heightM: Math.round(100 + idx * 1350),
    tempC: Math.round(24 - idx * 9),
    dewC: Math.round(18 - idx * 13),
    windSpdKt: Math.round(15 + idx * 9),
    windDirDeg: (180 + idx * 12) % 360,
  }));

  return {
    station: `SND-${Math.round(lat)}/${Math.round(lon)}`,
    lat,
    lon,
    elevationM: 180,
    indices: {
      sbcape,
      mlcape,
      srh01,
      srh03,
      shear06,
      liftedIndex: -5,
      pwat: 1.45,
      stp,
      hazardRating,
    },
    levels,
  };
}
