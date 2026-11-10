export type RadarProductKey =
  | 'ref'
  | 'vel'
  | 'srvel'
  | 'cc'
  | 'zdr'
  | 'kdp'
  | 'tops'
  | 'vil'
  | 'mesh'
  | 'azshear';

export type ProductSourceKind = 'nexrad-level3' | 'mrms' | 'derived' | 'unknown';

export type LegendStop = {
  value: number;
  color: string;
  label?: string;
};

export type RadarProductDef = {
  key: RadarProductKey;
  label: string;
  short: string;
  description: string;
  unit: string;
  unitLabel: string;
  sourceKind: ProductSourceKind;
  substitute: boolean;
  loopExpected: boolean;
  sourceNote?: string;
  attribution?: string;
  dataRange: [number, number];
  legendStops: LegendStop[];
};

export const PRODUCT_ATTRIBUTION_IEM =
  'Iowa Environmental Mesonet (IEM) / NOAA NEXRAD & MRMS tile services';

export const RADAR_PRODUCTS: readonly RadarProductDef[] = [
  {
    key: 'ref',
    label: 'Reflectivity',
    short: 'REF',
    description: 'Base reflectivity (horizontal)',
    unit: 'dBZ',
    unitLabel: 'dBZ',
    sourceKind: 'nexrad-level3',
    substitute: false,
    loopExpected: true,
    attribution: PRODUCT_ATTRIBUTION_IEM,
    dataRange: [-30, 75],
    legendStops: [
      { value: -30, color: '#000000', label: 'ND' },
      { value: 5, color: '#00ECEC' },
      { value: 15, color: '#01A0F6' },
      { value: 25, color: '#0000F6' },
      { value: 35, color: '#00FF00' },
      { value: 45, color: '#FFFF00' },
      { value: 55, color: '#FF9000' },
      { value: 65, color: '#FF0000' },
      { value: 75, color: '#FF00FF', label: '75+' },
    ],
  },
  {
    key: 'vel',
    label: 'Velocity',
    short: 'VEL',
    description: 'Base radial velocity',
    unit: 'kt',
    unitLabel: 'knots',
    sourceKind: 'nexrad-level3',
    substitute: false,
    loopExpected: true,
    attribution: PRODUCT_ATTRIBUTION_IEM,
    dataRange: [-100, 100],
    legendStops: [
      { value: -100, color: '#FF00FF', label: '← outbound' },
      { value: -50, color: '#FF0000' },
      { value: -20, color: '#FFFF00' },
      { value: 0, color: '#808080', label: '0' },
      { value: 20, color: '#00FF00' },
      { value: 50, color: '#00FFFF' },
      { value: 100, color: '#0000FF', label: 'inbound →' },
    ],
  },
  {
    key: 'srvel',
    label: 'Storm Relative Velocity',
    short: 'SRV',
    description: 'Storm-relative radial velocity',
    unit: 'kt',
    unitLabel: 'knots',
    sourceKind: 'nexrad-level3',
    substitute: false,
    loopExpected: true,
    attribution: PRODUCT_ATTRIBUTION_IEM,
    dataRange: [-80, 80],
    legendStops: [
      { value: -80, color: '#FF00FF' },
      { value: -40, color: '#FF0000' },
      { value: -15, color: '#FFFF00' },
      { value: 0, color: '#808080', label: '0' },
      { value: 15, color: '#00FF00' },
      { value: 40, color: '#00FFFF' },
      { value: 80, color: '#0000FF' },
    ],
  },
  {
    key: 'cc',
    label: 'Correlation Coefficient (Proxy)',
    short: 'CC',
    description: 'MRMS proxy for single-site CC',
    unit: 'unitless',
    unitLabel: 'ρHV',
    sourceKind: 'mrms',
    substitute: true,
    loopExpected: false,
    sourceNote: 'MRMS RhoHV proxy; not single-site N0C.',
    attribution: PRODUCT_ATTRIBUTION_IEM,
    dataRange: [0.7, 1.05],
    legendStops: [
      { value: 0.7, color: '#0000FF', label: '0.70' },
      { value: 0.85, color: '#00FFFF' },
      { value: 0.93, color: '#00FF00' },
      { value: 0.97, color: '#FFFF00' },
      { value: 1.0, color: '#FF0000', label: '1.00' },
    ],
  },
  {
    key: 'zdr',
    label: 'Differential Reflectivity',
    short: 'ZDR',
    description: 'Differential reflectivity style layer',
    unit: 'dB',
    unitLabel: 'dB',
    sourceKind: 'mrms',
    substitute: true,
    loopExpected: false,
    attribution: PRODUCT_ATTRIBUTION_IEM,
    dataRange: [-4, 8],
    legendStops: [
      { value: -4, color: '#0000FF', label: '-4' },
      { value: 0, color: '#00FF00', label: '0' },
      { value: 2, color: '#FFFF00' },
      { value: 4, color: '#FF9000' },
      { value: 8, color: '#FF0000', label: '8+' },
    ],
  },
  {
    key: 'kdp',
    label: 'Specific Differential Phase',
    short: 'KDP',
    description: 'KDP-style layer',
    unit: 'deg/km',
    unitLabel: '°/km',
    sourceKind: 'mrms',
    substitute: true,
    loopExpected: false,
    attribution: PRODUCT_ATTRIBUTION_IEM,
    dataRange: [-2, 8],
    legendStops: [
      { value: -2, color: '#0000FF' },
      { value: 0, color: '#00FF00', label: '0' },
      { value: 2, color: '#FFFF00' },
      { value: 4, color: '#FF9000' },
      { value: 8, color: '#FF0000', label: '8+' },
    ],
  },
  {
    key: 'tops',
    label: 'Echo Tops',
    short: 'TOPS',
    description: 'Echo tops estimate',
    unit: 'kft',
    unitLabel: 'kft',
    sourceKind: 'nexrad-level3',
    substitute: false,
    loopExpected: true,
    attribution: PRODUCT_ATTRIBUTION_IEM,
    dataRange: [0, 70],
    legendStops: [
      { value: 0, color: '#000000', label: '0' },
      { value: 20, color: '#00FFFF' },
      { value: 35, color: '#00FF00' },
      { value: 50, color: '#FFFF00' },
      { value: 60, color: '#FF0000' },
      { value: 70, color: '#FF00FF', label: '70+' },
    ],
  },
  {
    key: 'vil',
    label: 'Vertically Integrated Liquid',
    short: 'VIL',
    description: 'VIL estimate',
    unit: 'kg/m²',
    unitLabel: 'kg m⁻²',
    sourceKind: 'nexrad-level3',
    substitute: false,
    loopExpected: true,
    attribution: PRODUCT_ATTRIBUTION_IEM,
    dataRange: [0, 80],
    legendStops: [
      { value: 0, color: '#000000', label: '0' },
      { value: 10, color: '#00FFFF' },
      { value: 25, color: '#00FF00' },
      { value: 40, color: '#FFFF00' },
      { value: 55, color: '#FF9000' },
      { value: 80, color: '#FF0000', label: '80+' },
    ],
  },
  {
    key: 'mesh',
    label: 'MESH',
    short: 'MESH',
    description: 'Maximum Estimated Size of Hail (MRMS)',
    unit: 'in',
    unitLabel: 'inches',
    sourceKind: 'mrms',
    substitute: false,
    loopExpected: false,
    attribution: PRODUCT_ATTRIBUTION_IEM,
    dataRange: [0, 4],
    legendStops: [
      { value: 0, color: '#000000', label: '0' },
      { value: 0.5, color: '#00FF00' },
      { value: 1.0, color: '#FFFF00', label: '1.0"' },
      { value: 2.0, color: '#FF9000', label: '2.0"' },
      { value: 4.0, color: '#FF0000', label: '4.0"+' },
    ],
  },
  {
    key: 'azshear',
    label: 'AzShear / Rotation Tracks',
    short: 'ROT',
    description: 'Low-level azimuthal shear (MRMS)',
    unit: 's⁻¹',
    unitLabel: 's⁻¹ ×10⁻³',
    sourceKind: 'mrms',
    substitute: false,
    loopExpected: false,
    attribution: PRODUCT_ATTRIBUTION_IEM,
    dataRange: [0, 0.02],
    legendStops: [
      { value: 0, color: '#000000', label: '0' },
      { value: 0.004, color: '#00FF00' },
      { value: 0.008, color: '#FFFF00' },
      { value: 0.012, color: '#FF9000' },
      { value: 0.02, color: '#FF0000', label: 'strong' },
    ],
  },
] as const;

export function getProductDef(key: string): RadarProductDef | undefined {
  return RADAR_PRODUCTS.find((p) => p.key === key);
}

export function getProductUnit(key: string): string {
  return getProductDef(key)?.unitLabel ?? '';
}

export function getProductLegend(key: string): LegendStop[] {
  return getProductDef(key)?.legendStops ?? [];
}

export type FrameProvenance = {
  source: string;
  attribution?: string;
  fetchedAt: string;
  productKey: string;
  productLabel?: string;
  productCode?: string;
  sourceKind?: ProductSourceKind;
  substitute: boolean;
  loopAvailable: boolean;
  notes?: string[];
};
