import type { RadarSite, RadarNetwork } from './radar-config';
import { RADAR_SITES } from './radar-config';

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function nearestRadarSite(lat: number, lon: number, opts?: { network?: RadarNetwork | 'ALL'; sites?: RadarSite[] }) {
  const pool = (opts?.sites ?? RADAR_SITES).filter((s) => !opts?.network || opts.network === 'ALL' || s.network === opts.network);
  let best: RadarSite | null = null;
  let bestD = Infinity;
  for (const s of pool) {
    const d = haversineKm(lat, lon, s.lat, s.lon);
    if (d < bestD) { bestD = d; best = s; }
  }
  return best ? { site: best, distanceKm: bestD } : null;
}

export const RADAR_RANGE_KM: Record<RadarNetwork, number> = {
  NEXRAD: 460, // approx max reflectivity range
  TDWR: 90,    // approx long-range
};

export function radarCoverageCircle(site: RadarSite, steps = 72) {
  const radiusKm = RADAR_RANGE_KM[site.network] ?? 460;
  const coords: [number, number][] = [];
  const latRad = (site.lat * Math.PI) / 180;
  const angDist = radiusKm / 6371;
  for (let i = 0; i <= steps; i++) {
    const brng = (i / steps) * 2 * Math.PI;
    const lat2 = Math.asin(Math.sin(latRad) * Math.cos(angDist) + Math.cos(latRad) * Math.sin(angDist) * Math.cos(brng));
    const lon2 = (site.lon * Math.PI) / 180 + Math.atan2(
      Math.sin(brng) * Math.sin(angDist) * Math.cos(latRad),
      Math.cos(angDist) - Math.sin(latRad) * Math.sin(lat2)
    );
    coords.push([(lon2 * 180) / Math.PI, (lat2 * 180) / Math.PI]);
  }
  return {
    type: 'Feature' as const,
    properties: { id: site.id, name: site.name, network: site.network, radiusKm },
    geometry: { type: 'Polygon' as const, coordinates: [coords] },
  };
}
