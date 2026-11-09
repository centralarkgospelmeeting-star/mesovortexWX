export interface GeoPoint {
  lat: number;
  lon: number;
}

export type WorkstationMode = 'Radar' | 'Composite' | 'Satellite' | 'Models' | 'Outlooks';
export type DashboardPreset = 'Default' | 'Storm Chaser' | 'Emergency Manager' | 'Aviation' | 'Marine';
export type RadarProduct = 'ref' | 'vel' | 'srvel' | 'cc' | 'zdr' | 'kdp' | 'mesh' | 'azshear' | 'tops' | 'vil';
export type ElevationTilt = '0.5' | '0.9' | '1.3' | '1.8';
export type PaletteType = 'nws' | 'radarscope' | 'cod' | 'smooth' | 'couplet' | 'palFile';

// 1. Radar Tile Contract
export interface RadarFrame {
  time: string;
  label: string;
  tileUrl: string;
  ageMinutes: number;
}

export interface RadarFeedResponse {
  provider: string;
  station: string;
  product: string;
  tilt: string;
  frames: RadarFrame[];
  latestTileUrl: string;
}

// 2. Severe Alert Contract (NWS / SPC)
export interface ActiveAlert {
  id: string;
  event: string;
  headline: string;
  severity: 'Extreme' | 'Severe' | 'Moderate' | 'Minor' | 'Unknown';
  urgency: string;
  areaDesc: string;
  sentAt: string;
  expiresAt: string;
  wfo: string;
  geometry: GeoJSON.Geometry | null;
}

// 3. Surface & Hyperlocal Observation Contract (NOAA / Open-Meteo / Mesonets)
export interface SurfaceObservation {
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
  provider: string;
  timestamp: string;
}

// 4. Storm Spotter & Crowd Observation Contract (mPING / Spotter Network)
export interface GroundReport {
  id: string;
  hazardType: 'Tornado' | 'Wall Cloud' | 'Hail' | 'Wind Damage' | 'Flooding';
  magnitude?: string;
  description: string;
  lat: number;
  lon: number;
  timestamp: string;
  source: 'mPING' | 'SpotterNetwork' | 'NWS_LSR' | 'Community';
  callsign?: string;
}
