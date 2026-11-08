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

export type RadarProductDef = {
  key: RadarProductKey;
  label: string;
  short: string;
  description: string;
  sourceKind: ProductSourceKind;
  /** When true, current implementation may not reflect the canonical product semantics. */
  substitute: boolean;
  /** True when historical time-stepped frames are genuinely available from the current source path. */
  loopExpected: boolean;
  sourceNote?: string;
  attribution?: string;
};

export const PRODUCT_ATTRIBUTION_IEM = 'Iowa Environmental Mesonet (IEM) / NOAA NEXRAD & MRMS tile services';

export const RADAR_PRODUCTS: readonly RadarProductDef[] = [
  { key: 'ref', label: 'Reflectivity', short: 'REF', description: 'Base reflectivity', sourceKind: 'nexrad-level3', substitute: false, loopExpected: true, attribution: PRODUCT_ATTRIBUTION_IEM },
  { key: 'vel', label: 'Velocity', short: 'VEL', description: 'Base velocity', sourceKind: 'nexrad-level3', substitute: false, loopExpected: true, attribution: PRODUCT_ATTRIBUTION_IEM },
  { key: 'srvel', label: 'Storm Relative Velocity', short: 'SRV', description: 'Storm-relative motion', sourceKind: 'nexrad-level3', substitute: false, loopExpected: true, attribution: PRODUCT_ATTRIBUTION_IEM },
  { key: 'cc', label: 'Correlation Coefficient', short: 'CC', description: 'Displayed as a correlation-coefficient style layer', sourceKind: 'mrms', substitute: true, loopExpected: false, sourceNote: 'Frames API currently maps CC to an MRMS tile (not single-site NEXRAD Level 3 CC). Verify semantics before operational use.', attribution: PRODUCT_ATTRIBUTION_IEM },
  { key: 'zdr', label: 'Differential Reflectivity', short: 'ZDR', description: 'Displayed as a differential-reflectivity style layer', sourceKind: 'mrms', substitute: true, loopExpected: false, sourceNote: 'Frames API currently maps ZDR to an MRMS tile (not single-site NEXRAD Level 3 ZDR). Verify semantics before operational use.', attribution: PRODUCT_ATTRIBUTION_IEM },
  { key: 'kdp', label: 'Specific Differential Phase', short: 'KDP', description: 'Displayed as a KDP-style layer', sourceKind: 'mrms', substitute: true, loopExpected: false, sourceNote: 'Frames API currently maps KDP to an MRMS tile (not single-site NEXRAD Level 3 KDP). Verify semantics before operational use.', attribution: PRODUCT_ATTRIBUTION_IEM },
  { key: 'tops', label: 'Echo Tops', short: 'TOPS', description: 'Echo tops estimate', sourceKind: 'nexrad-level3', substitute: false, loopExpected: true, attribution: PRODUCT_ATTRIBUTION_IEM },
  { key: 'vil', label: 'Vertically Integrated Liquid', short: 'VIL', description: 'VIL estimate', sourceKind: 'nexrad-level3', substitute: false, loopExpected: true, attribution: PRODUCT_ATTRIBUTION_IEM },
  { key: 'mesh', label: 'MESH', short: 'MESH', description: 'Maximum Estimated Size of Hail (MRMS-derived)', sourceKind: 'mrms', substitute: false, loopExpected: false, sourceNote: 'MRMS-derived hail estimate; current tile path may not provide true per-frame historical stepping.', attribution: PRODUCT_ATTRIBUTION_IEM },
  { key: 'azshear', label: 'AzShear / Rotation Tracks', short: 'ROT', description: 'Low-level azimuthal shear (MRMS-derived)', sourceKind: 'mrms', substitute: false, loopExpected: false, sourceNote: 'MRMS-derived rotation/shear; current tile path may not provide true per-frame historical stepping.', attribution: PRODUCT_ATTRIBUTION_IEM },
] as const;

export function getProductDef(key: string): RadarProductDef | undefined {
  return RADAR_PRODUCTS.find((p) => p.key === key);
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
