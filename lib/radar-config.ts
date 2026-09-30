export const RADAR_SITES = [
  { id: 'KOUN', name: 'Norman, OK', lat: 35.3395, lon: -97.4867, elevation: 345 },
  { id: 'KAMA', name: 'Amarillo, TX', lat: 35.2347, lon: -101.7141, elevation: 3585 },
  { id: 'KDFW', name: 'Dallas/Fort Worth, TX', lat: 32.8753, lon: -96.6514, elevation: 617 },
  { id: 'KICT', name: 'Wichita, KS', lat: 37.6543, lon: -97.4331, elevation: 1294 },
  { id: 'KFWS', name: 'Fort Worth, TX', lat: 32.5573, lon: -97.3031, elevation: 701 },
  { id: 'KLBB', name: 'Lubbock, TX', lat: 33.6542, lon: -101.8140, elevation: 3255 },
  { id: 'KSJT', name: 'San Angelo, TX', lat: 31.3725, lon: -100.4969, elevation: 1921 },
  { id: 'KVTX', name: 'Fort Stockton, TX', lat: 30.7741, lon: -103.1987, elevation: 2867 },
  { id: 'KMAF', name: 'Midland, TX', lat: 31.9437, lon: -102.1891, elevation: 2838 },
  { id: 'KMLB', name: 'Mobile, AL', lat: 30.6859, lon: -88.2393, elevation: 65 }
];

export const RADAR_PRODUCTS = [
  { key: 'ref', label: 'Base Reflectivity', description: 'Precipitation intensity' },
  { key: 'vel', label: 'Base Velocity', description: 'Wind toward/away radar' },
  { key: 'srvel', label: 'Storm Relative Velocity', description: 'Wind relative to storm' },
  { key: 'dualpol', label: 'Dual-Pol (ZDR)', description: 'Drop size discrimination' },
  { key: 'et', label: 'Echo Tops', description: 'Storm height' },
  { key: 'vil', label: 'VIL / POSH', description: 'Hail potential' }
];

// NEXRAD AWS S3 base URL for Level 2 radar data
export const NEXRAD_AWS_BASE = 'https://noaa-nexrad-level2.s3.amazonaws.com';

// OpenWeather NEXRAD tile URLs (publicly available)
export const getRadarTileUrl = (site: string, product: string, timestamp: number): string => {
  // Using NOAA tile layers for radar imagery
  // Format: https://mesonet.agron.iastate.edu/json/radarserver.py
  // Alternative: https://tilecache.rainviewer.com/v2/radar/{timestamp}/tiles/z/x/y/2/1_1.png
  return `https://mesonet.agron.iastate.edu/json/radarserver.py?ts=${timestamp}&radar=${site}&product=${product}`;
};

// RainViewer radar tile service (free tier)
export const getRainViewerTileUrl = (timestamp: number, z: number, x: number, y: number): string => {
  return `https://tilecache.rainviewer.com/v2/radar/${timestamp}/tiles/${z}/${x}/${y}/2/1_1.png`;
};

// Get current NEXRAD frame list from AWS
export const fetchNEXRADFrames = async (site: string, limit: number = 6): Promise<string[]> => {
  try {
    // This fetches the latest Level 2 radar files from AWS
    const response = await fetch(`/api/nexrad/frames?site=${site}&limit=${limit}`);
    const data = await response.json();
    return data.frames || [];
  } catch (error) {
    console.error('Failed to fetch NEXRAD frames:', error);
    return [];
  }
};

// Color table for reflectivity
export const reflectivityColors = [
  { dbz: -10, color: '#38bdf8', label: 'Light' },      // Cyan
  { dbz: 0, color: '#0ea5e9', label: 'Very Light' },   // Sky Blue
  { dbz: 10, color: '#06b6d4', label: 'Light-Moderate' }, // Teal
  { dbz: 20, color: '#10b981', label: 'Moderate' },    // Emerald
  { dbz: 30, color: '#84cc16', label: 'Moderate-Heavy' }, // Lime
  { dbz: 40, color: '#fbbf24', label: 'Heavy' },       // Amber
  { dbz: 50, color: '#f97316', label: 'Very Heavy' },  // Orange
  { dbz: 60, color: '#ef4444', label: 'Severe' }       // Red
];

// Velocity color table
export const velocityColors = [
  { knots: -100, color: '#3b82f6', label: 'Away' },    // Blue
  { knots: 0, color: '#9ca3af', label: 'No Motion' },  // Gray
  { knots: 100, color: '#ef4444', label: 'Toward' }    // Red
];
