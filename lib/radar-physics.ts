// 4/3 Earth Radius Model for Standard Atmospheric Refraction
const EARTH_RADIUS_KM = 6371;
const EFFECTIVE_EARTH_RADIUS_KM = (4 / 3) * EARTH_RADIUS_KM; // ~8494.67 km

export type RadarSampling = {
  distanceNm: number;
  distanceKm: number;
  azimuthDeg: number;
  beamHeightFt: number;
  estimatedValue: number;
  unit: string;
  signatureBadge?: string;
  hazardLevel?: 'normal' | 'elevated' | 'severe' | 'tornadic';
};

// Calculate distance and azimuth from radar antenna to cursor
export function calculatePolarCoordinates(
  radarLat: number,
  radarLon: number,
  targetLat: number,
  targetLon: number
): { distanceKm: number; distanceNm: number; azimuthDeg: number } {
  const dLat = ((targetLat - radarLat) * Math.PI) / 180;
  const dLon = ((targetLon - radarLon) * Math.PI) / 180;

  const lat1 = (radarLat * Math.PI) / 180;
  const lat2 = (targetLat * Math.PI) / 180;

  // Haversine formula
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = EARTH_RADIUS_KM * c;
  const distanceNm = distanceKm * 0.539957;

  // Azimuth (bearing)
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  let azimuthDeg = (Math.atan2(y, x) * 180) / Math.PI;
  azimuthDeg = (azimuthDeg + 360) % 360;

  return { distanceKm, distanceNm, azimuthDeg };
}

// Calculate Beam Height AGL taking 4/3 earth curvature and beam tilt into account
export function calculateBeamHeight(distanceKm: number, tiltDeg = 0.5, antennaElevMeters = 200): number {
  const tiltRad = (tiltDeg * Math.PI) / 180;
  const r = distanceKm;
  const Re = EFFECTIVE_EARTH_RADIUS_KM;

  // Height formula: H = sqrt(r^2 + Re^2 + 2*r*Re*sin(tilt)) - Re + h0
  const hKm = Math.sqrt(r * r + Re * Re + 2 * r * Re * Math.sin(tiltRad)) - Re + antennaElevMeters / 1000;
  return Math.round(hKm * 3280.84); // Return in feet AGL
}

// Classify sampled radar data to identify severe storm features
export function classifyStormGate(
  product: string,
  rawDbz: number
): { label: string; badge: string; hazardLevel: RadarSampling['hazardLevel'] } {
  if (product === 'ref') {
    if (rawDbz >= 65) return { label: `${rawDbz} dBZ`, badge: 'Giant Hail Core (>2.00")', hazardLevel: 'severe' };
    if (rawDbz >= 55) return { label: `${rawDbz} dBZ`, badge: 'Severe Hail / Heavy Rain', hazardLevel: 'severe' };
    if (rawDbz >= 45) return { label: `${rawDbz} dBZ`, badge: 'Convective Core', hazardLevel: 'elevated' };
    if (rawDbz >= 30) return { label: `${rawDbz} dBZ`, badge: 'Moderate Rain', hazardLevel: 'normal' };
    if (rawDbz >= 10) return { label: `${rawDbz} dBZ`, badge: 'Light Rain', hazardLevel: 'normal' };
    return { label: '< 10 dBZ', badge: 'Virga / Ground Clutter', hazardLevel: 'normal' };
  }

  if (product === 'vel' || product === 'srvel') {
    const kt = rawDbz; // mapped value
    if (Math.abs(kt) >= 60) return { label: `${kt} kt`, badge: 'Extreme Gate Shear (>60 kt)', hazardLevel: 'tornadic' };
    if (Math.abs(kt) >= 45) return { label: `${kt} kt`, badge: 'Strong Mesocyclone Shear', hazardLevel: 'severe' };
    if (Math.abs(kt) >= 30) return { label: `${kt} kt`, badge: 'Moderate Wind', hazardLevel: 'elevated' };
    return { label: `${kt} kt`, badge: 'Normal Wind Flow', hazardLevel: 'normal' };
  }

  if (product === 'cc') {
    // CC scale from 0.00 to 1.05
    const ccVal = rawDbz / 100;
    if (ccVal < 0.80 && ccVal > 0.20) {
      return { label: `${ccVal.toFixed(2)} CC`, badge: '🌪️ Tornado Debris Signature (TDS)', hazardLevel: 'tornadic' };
    }
    if (ccVal >= 0.97) return { label: `${ccVal.toFixed(2)} CC`, badge: 'Pure Rain (Uniform Hydrometeors)', hazardLevel: 'normal' };
    if (ccVal >= 0.88) return { label: `${ccVal.toFixed(2)} CC`, badge: 'Rain / Hail Mixture', hazardLevel: 'elevated' };
    return { label: `${ccVal.toFixed(2)} CC`, badge: 'Non-Meteorological / Biological', hazardLevel: 'normal' };
  }

  return { label: `${rawDbz}`, badge: 'Radar Return', hazardLevel: 'normal' };
}
