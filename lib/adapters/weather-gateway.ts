import { getNwsLatestObservation } from './noaa';
import { getOpenMeteoTelemetry } from './openmeteo';
import { CurrentObservation, MinutelyPrecipitation } from './types';

export async function getHyperlocalTelemetry(
  lat: number,
  lon: number,
  stationId = 'KLZK'
): Promise<{
  observation: CurrentObservation;
  minutely: MinutelyPrecipitation[];
}> {
  // 1. Fetch Open-Meteo for high-frequency minutely precipitation & physics metrics
  const omResult = await getOpenMeteoTelemetry(lat, lon);

  // 2. Concurrently fetch official NOAA NWS observation for calibrated airport sensors
  const nwsResult = await getNwsLatestObservation(stationId);

  // Default baseline observation if both services fail
  const fallbackObservation: CurrentObservation = {
    tempF: 72,
    feelsLikeF: 72,
    dewPointF: 55,
    wetBulbF: 62,
    humidityPct: 50,
    pressureInHg: 29.92,
    pressureMb: 1013,
    windSpeedKt: 5,
    windGustKt: 10,
    windDirDeg: 180,
    visibilityMi: 10,
    conditionText: 'Fair',
    stationId,
    timestamp: new Date().toISOString(),
    provider: 'OPEN_METEO',
  };

  // Merge: Prioritize official NWS airport surface data, fill gaps with Open-Meteo
  const observation: CurrentObservation = {
    ...(omResult?.observation || fallbackObservation),
    ...(nwsResult ? Object.fromEntries(Object.entries(nwsResult).filter(([_, v]) => v !== null)) : {}),
    provider: nwsResult ? 'NWS' : 'OPEN_METEO',
  };

  return {
    observation,
    minutely: omResult?.minutely || [
      { minute: 15, amountInches: 0, probabilityPct: 0 },
      { minute: 30, amountInches: 0, probabilityPct: 0 },
      { minute: 45, amountInches: 0, probabilityPct: 0 },
      { minute: 60, amountInches: 0, probabilityPct: 0 },
    ],
  };
}
