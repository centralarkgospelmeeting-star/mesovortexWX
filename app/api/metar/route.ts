import { fetchJsonWithTimeout } from '../../../lib/api-utils';

export const dynamic = 'force-dynamic';

const UA = { 'User-Agent': 'MesoVortexWX/1.0 (centralarkgospelmeeting@gmail.com)', Accept: 'application/geo+json' };

async function fetchObservation(lat: number, lon: number, name: string) {
  const grid = await fetchJsonWithTimeout(`https://api.weather.gov/points/${lat},${lon}`, { headers: UA, timeoutMs: 8000 });
  if (!grid.ok) return null;
  const stationsUrl = grid.data.properties?.observationStations;
  if (!stationsUrl) return null;
  const stations = await fetchJsonWithTimeout(stationsUrl, { headers: UA, timeoutMs: 8000 });
  if (!stations.ok) return null;
  const firstStation = stations.data.features?.[0]?.id;
  if (!firstStation) return null;
  const obs = await fetchJsonWithTimeout(`${firstStation}/observations/latest`, { headers: UA, timeoutMs: 8000 });
  if (!obs.ok) return null;
  const props = obs.data.properties;
  if (!props) return null;
  return {
    station: name,
    text: `${props.weather?.[0]?.coverage || 'Clear'} skies`,
    temp: props.temperature?.value != null ? `${Math.round(props.temperature.value * 9 / 5 + 32)}°F` : 'N/A',
    dewpoint: props.dewpoint?.value != null ? `${Math.round(props.dewpoint.value * 9 / 5 + 32)}°F` : 'N/A',
    wind: props.windSpeed?.value != null ? `${Math.round(props.windSpeed.value * 2.237)} kt` : 'Calm',
  };
}

export async function GET() {
  const source = 'https://api.weather.gov (points/stations/observations)';
  const points = [
    { lat: 35.4676, lon: -97.5164, name: 'KOUN' },
    { lat: 37.6245, lon: -101.9987, name: 'KAMA' },
    { lat: 32.8753, lon: -96.5167, name: 'KDFW' },
  ];

  try {
    const observations = (await Promise.all(points.map((p) => fetchObservation(p.lat, p.lon, p.name)))).filter(Boolean);
    return Response.json(
      { observations, _meta: { fetchedAt: new Date().toISOString(), source, ok: true, count: observations.length } },
      { headers: { 'Cache-Control': 'public, max-age=120, stale-while-revalidate=300' } }
    );
  } catch (error: any) {
    return Response.json(
      { observations: [], _meta: { fetchedAt: new Date().toISOString(), source, ok: false, error: error?.message || 'Failed' } },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
