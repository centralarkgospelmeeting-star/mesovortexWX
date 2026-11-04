export const RADAR_SITES = [
  { id: 'KOUN', radarId: 'OUN', name: 'Norman, OK', lat: 35.236, lon: -97.4622, elevation: 360 },
  { id: 'KAMA', radarId: 'AMA', name: 'Amarillo, TX', lat: 35.2347, lon: -101.7141, elevation: 3585 },
  { id: 'KFWS', radarId: 'FWS', name: 'Dallas/Fort Worth, TX', lat: 32.573, lon: -97.303, elevation: 701 },
  { id: 'KICT', radarId: 'ICT', name: 'Wichita, KS', lat: 37.6543, lon: -97.4331, elevation: 1294 },
  { id: 'KLBB', radarId: 'LBB', name: 'Lubbock, TX', lat: 33.6542, lon: -101.814, elevation: 3255 },
  { id: 'KSJT', radarId: 'SJT', name: 'San Angelo, TX', lat: 31.3725, lon: -100.4969, elevation: 1921 },
  { id: 'KMAF', radarId: 'MAF', name: 'Midland, TX', lat: 31.9437, lon: -102.1891, elevation: 2838 },
  { id: 'KMLB', radarId: 'MLB', name: 'Melbourne, FL', lat: 28.113, lon: -80.654, elevation: 30 }
] as const;

export const RADAR_PRODUCTS = [
  { key: 'ref', label: 'Base Reflectivity', description: 'NEXRAD Level III N0Q' },
  { key: 'vel', label: 'Base Velocity', description: 'NEXRAD Level III N0U' },
  { key: 'srvel', label: 'Storm Relative Velocity', description: 'NEXRAD Level III N0S' }
] as const;

export const NEXRAD_PRODUCT_CODES: Record<string, string> = {
  ref: 'N0Q',
  vel: 'N0U',
  srvel: 'N0S'
};
