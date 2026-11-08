export type HyperlocalTelemetry = {
  tempF: number;
  feelsLikeF: number;
  dewPointF: number;
  wetBulbF: number;
  heatIndexF: number;
  windChillF: number;
  humidity: number;
  pressureInHg: number;
  pressureTrend: 'falling_rapidly' | 'falling' | 'steady' | 'rising';
  pressureTrendMbHr: number;
  windSpeedKt: number;
  windGustKt: number;
  windDirDeg: number;
  windDirCard: string;
  visibilityMi: number;
  cloudCoverPct: number;
  aqi: number;
  aqiStatus: 'Good' | 'Moderate' | 'Unhealthy for Sensitive' | 'Unhealthy' | 'Very Unhealthy';
  pm25: number;
  ozonePpb: number;
  uvIndex: number;
};

export type MinutePrecipitation = {
  minute: number;
  intensityMmHr: number;
  probability: number;
  type: 'none' | 'light_rain' | 'moderate_rain' | 'heavy_rain' | 'hail_mix' | 'snow';
};

export type WeatherModelComparison = {
  name: 'HRRR' | 'GFS' | 'ECMWF' | 'NAM 3km' | 'ICON';
  tempF: number;
  dewPointF: number;
  capeJkg: number;
  windGustKt: number;
  precipNext6hIn: number;
  confidenceScore: number; // 0 - 100%
  description: string;
};

export type DecodedMETAR = {
  raw: string;
  station: string;
  name: string;
  flightCategory: 'VFR' | 'MVFR' | 'IFR' | 'LIFR';
  tempC: number;
  dewC: number;
  tempF: number;
  dewPointF: number;
  altimeterInHg: number;
  windSpeedKt: number;
  windGustKt?: number;
  windDirDeg: number;
  visibilitySm: number;
  clouds: string;
  remarks: string;
};

export type MarineBuoy = {
  stationId: string;
  name: string;
  waveHeightFt: number;
  dominantPeriodSec: number;
  swellDir: string;
  waterTempF: number;
  airTempF: number;
  tideFeet: number;
  tideTrend: 'Rising' | 'Falling' | 'Slack High' | 'Slack Low';
  nextTideTime: string;
};

export type AgriculturalMetrics = {
  soilMoistureTopPct: number; // 0-2 inches
  soilMoistureDeepPct: number; // 4-8 inches
  soilTemp2inF: number;
  soilTemp4inF: number;
  gddBase50: number; // Growing Degree Days
  frostRiskLevel: 'NONE' | 'LOW' | 'ELEVATED' | 'CRITICAL FREEZE';
  cropStressIndex: number; // 0 - 100
  droughtCategory: 'None' | 'D0 Abnormally Dry' | 'D1 Moderate' | 'D2 Severe' | 'D3 Extreme';
};

// Calculate Wet Bulb Temperature via Stull's approximation
export function calculateWetBulbF(tempF: number, humidityPct: number): number {
  const T = ((tempF - 32) * 5) / 9;
  const RH = Math.min(100, Math.max(1, humidityPct));
  const TwC =
    T * Math.atan(0.151977 * Math.pow(RH + 8.313659, 0.5)) +
    Math.atan(T + RH) -
    Math.atan(RH - 1.676331) +
    0.00391838 * Math.pow(RH, 1.5) * Math.atan(0.023101 * RH) -
    4.686035;
  const TwF = (TwC * 9) / 5 + 32;
  return Math.round(TwF * 10) / 10;
}

// Calculate Heat Index (Rothfusz equation)
export function calculateHeatIndexF(tempF: number, humidityPct: number): number {
  if (tempF < 80) return tempF;
  const T = tempF;
  const R = humidityPct;
  const HI =
    -42.379 +
    2.04901523 * T +
    10.14333127 * R -
    0.22475541 * T * R -
    0.00683783 * T * T -
    0.05481717 * R * R +
    0.00122874 * T * T * R +
    0.00085282 * T * R * R -
    0.00000199 * T * T * R * R;
  return Math.round(HI);
}

// Calculate Personal Weather Risk Score (0 - 100)
export function calculatePersonalRiskScore(params: {
  hasTornadoWarning: boolean;
  hasSevereWarning: boolean;
  hasFlashFloodWarning: boolean;
  lightningDistanceMi: number;
  azShearMax: number;
  meshMax: number;
  srh01km: number;
  windGustKt: number;
}): { score: number; level: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH' | 'EXTREME'; factors: string[] } {
  let score = 0;
  const factors: string[] = [];

  if (params.hasTornadoWarning) {
    score += 55;
    factors.push('Active Tornado Warning in area');
  } else if (params.hasSevereWarning) {
    score += 30;
    factors.push('Severe Thunderstorm Warning active');
  }

  if (params.hasFlashFloodWarning) {
    score += 12;
    factors.push('Flash Flood Warning active');
  }

  if (params.lightningDistanceMi < 5) {
    score += 15;
    factors.push(`Lightning very close (${params.lightningDistanceMi.toFixed(1)} mi)`);
  } else if (params.lightningDistanceMi < 15) {
    score += 6;
    factors.push(`Lightning nearby (${params.lightningDistanceMi.toFixed(1)} mi)`);
  }

  if (params.azShearMax > 0.02) {
    score += 18;
    factors.push('Strong low-level rotation detected (AzShear)');
  } else if (params.azShearMax > 0.01) {
    score += 8;
    factors.push('Elevated low-level rotation detected');
  }

  if (params.meshMax > 2.0) {
    score += 12;
    factors.push(`Significant hail potential (MESH ${params.meshMax.toFixed(1)}")`);
  } else if (params.meshMax > 1.0) {
    score += 5;
    factors.push(`Hail possible (MESH ${params.meshMax.toFixed(1)}")`);
  }

  if (params.srh01km > 250) {
    score += 10;
    factors.push(`High 0-1km SRH (${Math.round(params.srh01km)} m²/s²) favors tornadogenesis`);
  } else if (params.srh01km > 150) {
    score += 4;
    factors.push(`Favorable 0-1km SRH (${Math.round(params.srh01km)} m²/s²)`);
  }

  if (params.windGustKt > 60) {
    score += 10;
    factors.push(`Destructive wind gusts (${params.windGustKt} kt)`);
  } else if (params.windGustKt > 45) {
    score += 4;
    factors.push(`Strong gusty winds (${params.windGustKt} kt)`);
  }

  score = Math.min(100, Math.max(0, score));

  let level: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH' | 'EXTREME';
  if (score >= 80) level = 'EXTREME';
  else if (score >= 60) level = 'HIGH';
  else if (score >= 35) level = 'ELEVATED';
  else if (score >= 15) level = 'MODERATE';
  else level = 'LOW';

  if (factors.length === 0) factors.push('No significant severe threats detected in immediate area');

  return { score, level, factors };
}

// Compute feels-like (wind chill or heat index as appropriate)
export function computeFeelsLikeF(tempF: number, humidityPct: number, windSpeedMph: number): number {
  if (tempF <= 50 && windSpeedMph >= 3) {
    const wc =
      35.74 +
      0.6215 * tempF -
      35.75 * Math.pow(windSpeedMph, 0.16) +
      0.4275 * tempF * Math.pow(windSpeedMph, 0.16);
    return Math.round(wc);
  }
  if (tempF >= 80) {
    return calculateHeatIndexF(tempF, humidityPct);
  }
  return Math.round(tempF);
}

// Wind direction degrees to cardinal
export function degreesToCardinal(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const idx = Math.round(((deg % 360) / 22.5)) % 16;
  return dirs[idx];
}

// Calculate AQI category
export function getAqiStatus(aqi: number): HyperlocalTelemetry['aqiStatus'] {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for Sensitive';
  if (aqi <= 200) return 'Unhealthy';
  return 'Very Unhealthy';
}

// Generate synthetic minute-by-minute precipitation (demo foundation)
export function generateMinuteByMinutePrecip(params: {
  reflectivityDbz: number;
  probability: number;
  hasStormCore: boolean;
}): MinutePrecipitation[] {
  const result: MinutePrecipitation[] = [];
  let baseIntensity = 0;

  if (params.reflectivityDbz >= 55) baseIntensity = 50;
  else if (params.reflectivityDbz >= 45) baseIntensity = 20;
  else if (params.reflectivityDbz >= 35) baseIntensity = 5;
  else if (params.reflectivityDbz >= 20) baseIntensity = 1;

  for (let i = 0; i < 60; i++) {
    const decay = Math.max(0, 1 - i / 75);
    const wave = 0.85 + 0.3 * Math.sin(i / 4);
    const intensityMmHr = Math.round(baseIntensity * decay * wave * 10) / 10;
    const prob = Math.min(100, Math.max(0, Math.round(params.probability * decay * (0.9 + 0.2 * Math.cos(i / 6)))));

    let type: MinutePrecipitation['type'] = 'none';
    if (intensityMmHr >= 30) type = params.hasStormCore ? 'hail_mix' : 'heavy_rain';
    else if (intensityMmHr >= 10) type = 'moderate_rain';
    else if (intensityMmHr >= 0.5) type = 'light_rain';

    result.push({ minute: i, intensityMmHr, probability: prob, type });
  }

  return result;
}

// Mock multi-model comparison (production would pull from HRRR/GFS/ECMWF endpoints)
export function getMultiModelComparison(baseTempF: number, baseCape: number): WeatherModelComparison[] {
  return [
    { name: 'HRRR', tempF: Math.round(baseTempF), dewPointF: Math.round(baseTempF - 12), capeJkg: Math.round(baseCape), windGustKt: 38, precipNext6hIn: 0.45, confidenceScore: 88, description: 'High-res 3km rapid refresh; best for near-term convective timing' },
    { name: 'NAM 3km', tempF: Math.round(baseTempF - 1), dewPointF: Math.round(baseTempF - 11), capeJkg: Math.round(baseCape * 0.92), windGustKt: 35, precipNext6hIn: 0.38, confidenceScore: 82, description: 'Mesoscale nest; reliable for storm mode and boundaries' },
    { name: 'GFS', tempF: Math.round(baseTempF + 2), dewPointF: Math.round(baseTempF - 14), capeJkg: Math.round(baseCape * 0.78), windGustKt: 31, precipNext6hIn: 0.28, confidenceScore: 74, description: 'Global model; useful for synoptic pattern and longer range' },
    { name: 'ECMWF', tempF: Math.round(baseTempF + 1), dewPointF: Math.round(baseTempF - 13), capeJkg: Math.round(baseCape * 0.85), windGustKt: 33, precipNext6hIn: 0.33, confidenceScore: 84, description: 'High-skill global model; strong for system evolution' },
    { name: 'ICON', tempF: Math.round(baseTempF), dewPointF: Math.round(baseTempF - 12), capeJkg: Math.round(baseCape * 0.88), windGustKt: 34, precipNext6hIn: 0.36, confidenceScore: 79, description: 'DWD global model; additional consensus member' },
  ];
}
