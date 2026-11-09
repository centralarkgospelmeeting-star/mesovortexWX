import { WeatherWarning, CurrentObservation } from './types';

const NWS_BASE = 'https://api.weather.gov';
const USER_AGENT = `MesoVortexWX/2.0 (${process.env.NWS_CONTACT_EMAIL || 'support@mesovortexwx.org'})`;

const HEADERS = {
  'User-Agent': USER_AGENT,
  Accept: 'application/geo+json',
};

/**
 * Fetches active NWS convective and hydrological warnings with geometry.
 * Cached for 30 seconds to provide near-real-time updates without spamming NOAA.
 */
export async function getActiveNwsWarnings(): Promise<WeatherWarning[]> {
  try {
    const res = await fetch(`${NWS_BASE}/alerts/active?status=actual&message_type=alert`, {
      headers: HEADERS,
      next: { revalidate: 30 }, // Next.js ISR cache: 30 seconds
    });

    if (!res.ok) {
      console.warn(`[NOAA] Alerts endpoint returned status ${res.status}`);
      return [];
    }

    const data = await res.json();
    const rawFeatures = data.features || [];

    return rawFeatures
      .filter((f: any) => {
        const event: string = f.properties?.event || '';
        return (
          f.geometry &&
          (event.includes('Warning') ||
            event.includes('Tornado') ||
            event.includes('Thunderstorm') ||
            event.includes('Flash Flood'))
        );
      })
      .map((f: any) => ({
        id: f.id || f.properties?.id,
        event: f.properties?.event || 'Weather Warning',
        headline: f.properties?.headline || f.properties?.event,
        severity: f.properties?.severity || 'Unknown',
        urgency: f.properties?.urgency || 'Immediate',
        areaDesc: f.properties?.areaDesc || 'Affected Area',
        sentAt: f.properties?.sent || new Date().toISOString(),
        expiresAt: f.properties?.expires || '',
        geometry: f.geometry,
        wfo: f.properties?.senderName || 'NWS',
      }));
  } catch (error) {
    console.error('[NOAA Adapter Error - Warnings]:', error);
    return [];
  }
}

/**
 * Fetches latest METAR surface observation from nearest NWS station.
 */
export async function getNwsLatestObservation(stationId: string): Promise<Partial<CurrentObservation> | null> {
  try {
    const cleanId = stationId.replace(/^K/, '');
    const res = await fetch(`${NWS_BASE}/stations/K${cleanId}/observations/latest`, {
      headers: HEADERS,
      next: { revalidate: 120 }, // 2-minute cache
    });

    if (!res.ok) return null;
    const { properties: p } = await res.json();

    const tempC = p?.temperature?.value;
    const dewpC = p?.dewpoint?.value;
    const tempF = tempC !== null ? Math.round((tempC * 9) / 5 + 32) : 70;
    const dewPointF = dewpC !== null ? Math.round((dewpC * 9) / 5 + 32) : 55;
    const pressurePa = p?.barometricPressure?.value;

    return {
      tempF,
      dewPointF,
      pressureMb: pressurePa ? Math.round(pressurePa / 100) : 1013,
      pressureInHg: pressurePa ? Number(((pressurePa / 100) * 0.02953).toFixed(2)) : 29.92,
      windSpeedKt: p?.windSpeed?.value ? Math.round(p.windSpeed.value * 0.539957) : 0,
      windGustKt: p?.windGust?.value ? Math.round(p.windGust.value * 0.539957) : 0,
      windDirDeg: p?.windDirection?.value || 0,
      conditionText: p?.textDescription || 'Fair',
      timestamp: p?.timestamp || new Date().toISOString(),
      provider: 'NWS',
    };
  } catch {
    return null;
  }
}
