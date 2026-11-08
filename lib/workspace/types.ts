export const WORKSPACE_SCHEMA_VERSION = 1;

export type WorkspaceLayerPrefs = {
  showRadarPills: boolean;
  showLightning: boolean;
  showMetars: boolean;
  showLSR: boolean;
  showWatches: boolean;
};

export type WorkspacePrefsV1 = {
  schemaVersion: 1;
  radarSite: string;
  product: string;
  tilt: string;
  palette: string;
  activeTab: string;
  fastScan: boolean;
  dualPane: boolean;
  layers: WorkspaceLayerPrefs;
};

export const DEFAULT_WORKSPACE_PREFS: WorkspacePrefsV1 = {
  schemaVersion: 1,
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
  },
};
