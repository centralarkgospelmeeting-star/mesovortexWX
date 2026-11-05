export const RADAR_SITES = [
  // Arkansas & nearby (priority)
  { id: 'KLZK', radarId: 'LZK', name: 'Little Rock, AR', lat: 34.836, lon: -92.262, elevation: 570 },
  { id: 'KSRX', radarId: 'SRX', name: 'Fort Smith, AR', lat: 35.290, lon: -94.362, elevation: 640 },
  { id: 'KNQA', radarId: 'NQA', name: 'Memphis, TN', lat: 35.345, lon: -89.873, elevation: 280 },
  { id: 'KPAH', radarId: 'PAH', name: 'Paducah, KY', lat: 37.068, lon: -88.772, elevation: 360 },

  // Core Southern Plains
  { id: 'KTLX', radarId: 'TLX', name: 'Oklahoma City / Norman, OK', lat: 35.3331, lon: -97.2775, elevation: 372 },
  { id: 'KOUN', radarId: 'OUN', name: 'Norman, OK (Research)', lat: 35.236, lon: -97.462, elevation: 1170 },
  { id: 'KAMA', radarId: 'AMA', name: 'Amarillo, TX', lat: 35.233, lon: -101.709, elevation: 3585 },
  { id: 'KFWS', radarId: 'FWS', name: 'Dallas / Fort Worth, TX', lat: 32.573, lon: -97.303, elevation: 701 },
  { id: 'KICT', radarId: 'ICT', name: 'Wichita, KS', lat: 37.6543, lon: -97.4331, elevation: 1294 },
  { id: 'KLBB', radarId: 'LBB', name: 'Lubbock, TX', lat: 33.6542, lon: -101.814, elevation: 3255 },
  { id: 'KSJT', radarId: 'SJT', name: 'San Angelo, TX', lat: 31.3725, lon: -100.4969, elevation: 1921 },
  { id: 'KMAF', radarId: 'MAF', name: 'Midland, TX', lat: 31.9437, lon: -102.1891, elevation: 2838 },
  { id: 'KMLB', radarId: 'MLB', name: 'Melbourne, FL', lat: 28.113, lon: -80.654, elevation: 30 },
] as const;

export const RADAR_PRODUCTS = [
  { key: 'ref', label: 'Reflectivity', short: 'REF', description: 'NEXRAD Level III N0Q' },
  { key: 'vel', label: 'Velocity', short: 'VEL', description: 'NEXRAD Level III N0U' },
  { key: 'srvel', label: 'Storm Relative Velocity', short: 'SRV', description: 'NEXRAD Level III N0S' },
  { key: 'cc', label: 'Correlation Coefficient', short: 'CC', description: 'NEXRAD Level III N0C' },
  { key: 'zdr', label: 'Differential Reflectivity', short: 'ZDR', description: 'NEXRAD Level III N0X' },
  { key: 'kdp', label: 'Specific Differential Phase', short: 'KDP', description: 'NEXRAD Level III N0K' },
] as const;

export const NEXRAD_PRODUCT_CODES: Record<string, string> = {
  ref: 'N0Q',
  vel: 'N0U',
  srvel: 'N0S',
  cc: 'N0C',
  zdr: 'N0X',
  kdp: 'N0K',
};
