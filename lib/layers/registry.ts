export type LayerGroup = 'radar' | 'satellite' | 'observations' | 'hazards' | 'analysis' | 'custom';

export type LayerDef = {
  id: string;
  label: string;
  group: LayerGroup;
  defaultVisible: boolean;
  supportsOpacity?: boolean;
  sourceAttribution?: string;
  description?: string;
  tileUrl?: string;
};

export const DEFAULT_LAYERS: LayerDef[] = [
  {
    id: 'radar.tiles',
    label: 'Radar',
    group: 'radar',
    defaultVisible: true,
    supportsOpacity: true,
    description: 'NEXRAD / TDWR / MRMS radar imagery',
  },
  {
    id: 'sat.visible',
    label: 'GOES Visible',
    group: 'satellite',
    defaultVisible: false,
    supportsOpacity: true,
    sourceAttribution: 'NOAA/NESDIS via IEM',
    description: 'GOES visible channel',
    tileUrl: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/goes-vis-ir-CONUS/{z}/{x}/{y}.png',
  },
  {
    id: 'sat.ir',
    label: 'GOES Infrared',
    group: 'satellite',
    defaultVisible: false,
    supportsOpacity: true,
    sourceAttribution: 'NOAA/NESDIS via IEM',
    description: 'GOES IR window',
    tileUrl: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/goes-ir-4km/{z}/{x}/{y}.png',
  },
  {
    id: 'sat.waterVapor',
    label: 'GOES Water Vapor',
    group: 'satellite',
    defaultVisible: false,
    supportsOpacity: true,
    sourceAttribution: 'NOAA/NESDIS via IEM',
    description: 'GOES water vapor',
    tileUrl: 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/goes-wv-4km/{z}/{x}/{y}.png',
  },
  {
    id: 'hazards.warnings',
    label: 'Warnings',
    group: 'hazards',
    defaultVisible: true,
    sourceAttribution: 'NWS',
    description: 'Active NWS warning polygons',
  },
  {
    id: 'hazards.watches',
    label: 'Watches',
    group: 'hazards',
    defaultVisible: true,
    sourceAttribution: 'NWS',
    description: 'Active watch polygons',
  },
  {
    id: 'obs.metar',
    label: 'METAR/Surface',
    group: 'observations',
    defaultVisible: false,
    sourceAttribution: 'NWS/NOAA',
    description: 'Surface observations',
  },
  {
    id: 'obs.lsr',
    label: 'Local Storm Reports',
    group: 'observations',
    defaultVisible: true,
    sourceAttribution: 'IEM/NWS',
    description: 'Recent storm reports',
  },
  {
    id: 'obs.lightning',
    label: 'Lightning',
    group: 'observations',
    defaultVisible: true,
    description: 'Lightning strikes',
  },
  {
    id: 'obs.mping',
    label: 'mPING Reports',
    group: 'observations',
    defaultVisible: false,
    sourceAttribution: 'NSSL mPING',
    description: 'Crowdsourced precip type & intensity',
  },
  {
    id: 'obs.spotter',
    label: 'Spotter Network',
    group: 'observations',
    defaultVisible: false,
    sourceAttribution: 'SpotterNetwork.org',
    description: 'Spotter positions and reports',
  },
  {
    id: 'custom.placefiles',
    label: 'Placefiles',
    group: 'custom',
    defaultVisible: true,
    description: 'User/community placefile overlays',
  },
  {
    id: 'analysis.radarPills',
    label: 'Radar Site Markers',
    group: 'analysis',
    defaultVisible: true,
    description: 'Radar site labels/markers',
  },
];

export function getLayersByGroup(group: LayerGroup): LayerDef[] {
  return DEFAULT_LAYERS.filter((l) => l.group === group);
}

export function getSatelliteLayers(): LayerDef[] {
  return getLayersByGroup('satellite');
}
