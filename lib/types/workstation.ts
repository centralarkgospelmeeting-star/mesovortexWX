export type RadarProduct = 
  | 'ref' | 'vel' | 'srvel' 
  | 'cc' | 'zdr' | 'kdp' 
  | 'mesh' | 'azshear' | 'tops' | 'vil';

export type ElevationTilt = '0.5' | '0.9' | '1.3' | '1.8';

export type WorkstationMode = 'Radar' | 'Composite' | 'Satellite' | 'Models' | 'Outlooks';

export type PalettePreset = 'nws' | 'radarscope' | 'cod' | 'smooth' | 'couplet' | 'palFile';

export type SevereThreatScores = {
  overallRisk: number; // 0 - 100
  tornado: number;
  hail: number;
  wind: number;
  flood: number;
  category: 'LOW' | 'ELEVATED' | 'SEVERE' | 'CRITICAL TORNADIC';
};

export type HyperlocalTelemetry = {
  tempF: number;
  feelsLikeF: number;
  dewPointF: number;
  wetBulbF: number;
  humidity: number;
  pressureInHg: number;
  windSpeedKt: number;
  windGustKt: number;
  windDirDeg: number;
  precipArrivalMin: number | null;
};
