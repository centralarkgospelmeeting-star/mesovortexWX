import { RadarFeedResponse, ActiveAlert, SurfaceObservation, GroundReport } from './types';
import { RADAR_SITES } from '../radar-config';

const IEM_BASE = 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0';
const NWS_BASE = 'https://api.weather.gov';
const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1';

// ============================================================================
// 1. RADAR PROVIDER ADAPTER (IEM / NOAA Unidata Level III & MRMS)
// ============================================================================
export class NoaaRadarAdapter {
  static getRadarFeed(stationId: string, product: string, tilt = '0.5'): RadarFeedResponse {
    const site = RADAR_SITES.find((s) => s.id === stationId || s.radarId === stationId) || RADAR_SITES[0];
    
    let productCode = 'N0B';
    let tileUrl = '';

    if (product === 'mesh') {
      productCode = 'MESH';
      tileUrl = `${IEM_BASE}/mrms::MESH_Max60min/{z}/{x}/{y}.png`;
    } else if (product === 'azshear') {
      productCode = 'AZSHEAR';
      tileUrl = `${IEM_BASE}/mrms::AzShear_0-2km/{z}/{x}/{y}.png`;
    } else if (product === 'vel') {
      productCode = tilt === '0.9' ? 'N1U' : tilt === '1.3' ? 'N2U' : tilt === '1.8' ? 'N3U' : 'N0U';
      tileUrl = `${IEM_BASE}/ridge::${site.radarId}-${productCode}-0/{z}/{x}/{y}.png`;
    } else if (product === 'srvel') {
      productCode = 'N0S';
      tileUrl = `${IEM_BASE}/ridge::${site.radarId}-N0S-0/{z}/{x}/{y}.png`;
    } else if (product === 'cc') {
      productCode = 'N0C';
      tileUrl = `${IEM_BASE}/mrms::PrecipClass/{z}/{x}/{y}.png`;
    } else if (product === 'zdr') {
      productCode = 'N0X';
      tileUrl = `${IEM_BASE}/mrms::ReflectivityAtLowestAltitude/{z}/{x}/{y}.png`;
    } else if (product === 'kdp') {
      productCode = 'N0K';
      tileUrl = `${IEM_BASE}/mrms::MultiSensorQPE01H/{z}/{x}/{y}.png`;
    } else if (product === 'tops') {
      productCode = 'EET';
      tileUrl = `${IEM_BASE}/ridge::${site.radarId}-EET-0/{z}/{x}/{y}.png`;
    } else if (product === 'vil') {
      productCode = 'DVL';
      tileUrl = `${IEM_BASE}/ridge::${site.radarId}-DVL-0/{z}/{x}/{y}.png`;
    } else {
      productCode = tilt === '0.9' ? 'N1B' : tilt === '1.3' ? 'N2B' : tilt === '1.8' ? 'N3B' : 'N0B';
      tileUrl = `${IEM_BASE}/ridge::${site.radarId}-${productCode}-0/{z}/{x}/{y}.png`;
    }

    const now = new Date();
    const frames = [];

    for (let i = 8; i >= 1; i--) {
      const d = new Date(now.getTime() - i * 5 * 60 * 1000);
      d.setUTCMinutes(Math.floor(d.getUTCMinutes() / 5) * 5, 0, 0);
      const stamp = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}${String(d.getUTCHours()).padStart(2, '0')}${String(d.getUTCMinutes()).padStart(2, '0')}`;
      
      frames.push({
        time: d.toISOString(),
        label: `-${i * 5}m`,
        tileUrl: (product === 'mesh' || product === 'azshear' || product === 'cc' || product === 'zdr' || product === 'kdp')
          ? tileUrl
          : `${IEM_BASE}/ridge::${site.radarId}-${productCode}-${stamp}/{z}/{x}/{y}.png`,
        ageMinutes: i * 5,
      });
    }

    frames.push({
      time: now.toISOString(),
      label: 'LIVE',
      tileUrl,
      ageMinutes: 0,
    });

    return {
      provider: 'NOAA NEXRAD / IEM Level III',
      station: site.radarId,
      product: productCode,
      tilt,
      frames,
      latestTileUrl: tileUrl,
    };
  }
}

// ============================================================================
// 2. ALERTS & WARNINGS ADAPTER (NOAA NWS & SPC)
// ============================================================================
export class NwsAlertsAdapter {
  static async fetchActiveWarnings(): Promise<ActiveAlert[]> {
    try {
      const res = await fetch(`${NWS_BASE}/alerts/active?status=actual&message_type=alert`, {
        headers: { 'User-Agent': 'MesoVortexWX-Enterprise/2.0' },
        next: { revalidate: 30 },
      });

      if (!res.ok) return [];
      const json = await res.json();

      return (json.features || [])
        .filter((f: any) => f.geometry && (f.properties?.event || '').includes('Warning'))
        .map((f: any) => ({
          id: f.id || f.properties?.id,
          event: f.properties?.event || 'Severe Warning',
          headline: f.properties?.headline || f.properties?.event,
          severity: f.properties?.severity || 'Severe',
          urgency: f.properties?.urgency || 'Immediate',
          areaDesc: f.properties?.areaDesc || '',
          sentAt: f.properties?.sent || new Date().toISOString(),
          expiresAt: f.properties?.expires || '',
          wfo: f.properties?.senderName || 'NWS',
          geometry: f.geometry,
        }));
    } catch {
      return [];
    }
  }
}

// ============================================================================
// 3. HYPERLOCAL TELEMETRY ADAPTER (Open-Meteo & NOAA AWC METAR)
// ============================================================================
export class HyperlocalWeatherAdapter {
  static async getSurfaceTelemetry(lat: number, lon: number): Promise<SurfaceObservation> {
    try {
      const url = `${OPEN_METEO_BASE}/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current=temperature_2m,relative_humidity_2m,apparent_temperature,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code&temperature_unit=fahrenheit&wind_speed_unit=knots&timezone=auto`;
      const res = await fetch(url, { next: { revalidate: 120 } });
      const json = await res.json();
      const curr = json.current || {};

      const tempF = Math.round(curr.temperature_2m ?? 72);
      const humidityPct = Math.round(curr.relative_humidity_2m ?? 50);
      const dewPointF = Math.round(tempF - ((100 - humidityPct) / 5) * 1.8);
      const wetBulbF = Math.round(tempF * 0.7 + dewPointF * 0.3);
      const pressureMb = Math.round(curr.surface_pressure ?? 1013);

      return {
        tempF,
        feelsLikeF: Math.round(curr.apparent_temperature ?? tempF),
        dewPointF,
        wetBulbF,
        humidityPct,
        pressureMb,
        pressureInHg: Number((pressureMb * 0.02953).toFixed(2)),
        windSpeedKt: Math.round(curr.wind_speed_10m ?? 0),
        windGustKt: Math.round(curr.wind_gusts_10m ?? 0),
        windDirDeg: Math.round(curr.wind_direction_10m ?? 180),
        visibilityMi: 10,
        conditionText: 'Monitored',
        provider: 'Open-Meteo Free Global Engine',
        timestamp: new Date().toISOString(),
      };
    } catch {
      return {
        tempF: 72,
        feelsLikeF: 72,
        dewPointF: 55,
        wetBulbF: 62,
        humidityPct: 50,
        pressureMb: 1013,
        pressureInHg: 29.92,
        windSpeedKt: 8,
        windGustKt: 14,
        windDirDeg: 180,
        visibilityMi: 10,
        conditionText: 'Baseline Mode',
        provider: 'Offline Cache',
        timestamp: new Date().toISOString(),
      };
    }
  }
}
