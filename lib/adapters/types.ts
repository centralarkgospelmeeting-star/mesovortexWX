export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface CurrentObservation {
  tempF: number;
  feelsLikeF: number;
  dewPointF: number;
  wetBulbF: number;
  humidityPct: number;
  pressureInHg: number;
  pressureMb: number;
  windSpeedKt: number;
  windGustKt: number;
  windDirDeg: number;
  visibilityMi: number;
  conditionText: string;
  stationId?: string;
  timestamp: string;
  provider: 'NWS' | 'OPEN_METEO' | 'METAR';
}

export interface MinutelyPrecipitation {
  minute: number;
  amountInches: number;
  probabilityPct: number;
}

export interface WeatherWarning {
  id: string;
  event: string;
  headline: string;
  severity: 'Extreme' | 'Severe' | 'Moderate' | 'Minor' | 'Unknown';
  urgency: string;
  areaDesc: string;
  sentAt: string;
  expiresAt: string;
  geometry: GeoJSON.Geometry | null;
  wfo: string;
}

export interface SpcOutlookGeoJSON {
  type: 'FeatureCollection';
  features: GeoJSON.Feature[];
  issuedAt?: string;
}
