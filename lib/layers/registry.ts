export type LayerGroup = 'radar' | 'satellite' | 'observations' | 'hazards' | 'analysis' | 'custom';

export type LayerDef = {
  id: string;
  label: string;
  group: LayerGroup;
  defaultVisible: boolean;
  supportsOpacity?: boolean;
  sourceAttribution?: string;
  description?: string;
};

export const DEFAULT_LAYERS: LayerDef[] = [
  { id: 'radar.tiles', label: 'Radar', group: 'radar', defaultVisible: true, supportsOpacity: true, description: 'NEXRAD/MRMS radar imagery' },
  { id: 'hazards.warnings', label: 'Warnings', group: 'hazards', defaultVisible: true, sourceAttribution: 'NWS', description: 'Active NWS warning polygons' },
  { id: 'hazards.watches', label: 'Watches', group: 'hazards', defaultVisible: true, sourceAttribution: 'NWS', description: 'Active watch polygons' },
  { id: 'obs.metar', label: 'METAR/Surface', group: 'observations', defaultVisible: false, sourceAttribution: 'NWS/NOAA', description: 'Surface observations' },
  { id: 'obs.lsr', label: 'Local Storm Reports', group: 'observations', defaultVisible: true, sourceAttribution: 'IEM/NWS', description: 'Recent storm reports' },
  { id: 'obs.lightning', label: 'Lightning', group: 'observations', defaultVisible: true, description: 'Lightning strikes (source-dependent)' },
  { id: 'custom.placefiles', label: 'Placefiles', group: 'custom', defaultVisible: true, description: 'User/community placefile overlays' },
  { id: 'analysis.radarPills', label: 'Radar Site Markers', group: 'analysis', defaultVisible: true, description: 'Radar site labels/markers' },
];
