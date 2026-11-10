export const WORKSPACE_SCHEMA_VERSION = 2;

export type WorkspaceLayerPrefs = {
  showRadarPills: boolean;
  showLightning: boolean;
  showMetars: boolean;
  showLSR: boolean;
  showWatches: boolean;
  showWarnings: boolean;
  showSatellite: boolean;
  showMping: boolean;
  showSpotterReports: boolean;
};

export type WorkspacePrefsV1 = {
  schemaVersion: 1 | 2;
  radarSite: string;
  product: string;
  tilt: string;
  palette: string;
  activeTab: string;
  fastScan: boolean;
  dualPane: boolean;
  layers: WorkspaceLayerPrefs;
  favorites?: string[];
  mapCenter?: { lat: number; lon: number; zoom: number };
};

export const DEFAULT_WORKSPACE_PREFS: WorkspacePrefsV1 = {
  schemaVersion: 2,
  radarSite: 'KLZK',
  product: 'ref',
  tilt: '0.5',
  palette: 'radarscope',
  activeTab: 'Radar',
  fastScan: true,
  dualPane: false,
  layers: {
    showRadarPills: true,
    showLightning: true,
    showMetars: false,
    showLSR: true,
    showWatches: true,
    showWarnings: true,
    showSatellite: false,
    showMping: false,
    showSpotterReports: false,
  },
  favorites: ['KLZK', 'KSRX', 'KNQA'],
  mapCenter: undefined,
};
