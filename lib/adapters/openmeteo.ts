import { CurrentObservation, MinutelyPrecipitation } from './types';

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1';

export async function getOpenMeteoTelemetry(lat: number, lon: number): Promise<{
  observation: CurrentObservation;
  minutely: MinutelyPrecipitation[];
} | null> {
  try {
    const url = new URL(`${OPEN_METEO_BASE}/forecast`);
    url.searchParams.set('latitude', lat.toFixed(4));
    url.searchParams.set('longitude', lon.toFixed(4));
    url.searchParams.set(
      'current',
      'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code'
    );
    url.searchParams.set('minutely_15', 'precipitation');
    url.searchParams.set('temperature_unit', 'fahrenheit');
    url.searchParams.set('wind_speed_unit', 'knots');
    url.searchParams.set('precipitation_unit', 'inch');
    url.searchParams.set('timezone', 'auto');

    const res = await fetch(url.toString(), {
      next: { revalidate: 120 }, // Cache 2 minutes
    });

    if (!res.ok) return null;
    const json = await res.json();
    const curr = json.current || {};

    const tempF = Math.round(curr.temperature_2m ?? 72);
    const humidity = Math.round(curr.relative_humidity_2m ?? 50);
    const dewPointF = Math.round(tempF - ((100 - humidity) / 5) * 1.8);
    
    // Stull's formula for wet-bulb temperature estimation
    const wetBulbF = Math.round(
      tempF * Math.atan(0.151977 * Math.pow(humidity + 8.313659, 0.5)) +
      Math.atan(tempF + humidity) -
      Math.atan(humidity - 1.676331) +
      0.00391838 * Math.pow(humidity, 1.5) * Math.atan(0.023101 * humidity) -
      4.686035
    );

    const pressureMb = Math.round(curr.surface_pressure ?? 1013);
    const pressureInHg = Number((pressureMb * 0.02953).toFixed(2));

    const minutely: MinutelyPrecipitation[] = (json.minutely_15?.precipitation || [])
      .slice(0, 4)
      .map((val: number, idx: number) => ({
        minute: (idx + 1) * 15,
        amountInches: val,
        probabilityPct: val > 0.01 ? Math.min(100, Math.round(val * 200)) : 0,
      }));

    return {
      observation: {
        tempF,
        feelsLikeF: Math.round(curr.apparent_temperature ?? tempF),
        dewPointF,
        wetBulbF,
        humidityPct: humidity,
        pressureMb,
        pressureInHg,
        windSpeedKt: Math.round(curr.wind_speed_10m ?? 0),
        windGustKt: Math.round(curr.wind_gusts_10m ?? 0),
        windDirDeg: Math.round(curr.wind_direction_10m ?? 0),
        visibilityMi: 10,
        conditionText: parseWeatherCode(curr.weather_code),
        timestamp: curr.time || new Date().toISOString(),
        provider: 'OPEN_METEO',
      },
      minutely,
    };
  } catch (error) {
    console.error('[Open-Meteo Adapter Error]:', error);
    return null;
  }
}

function parseWeatherCode(code: number): string {
  if (code === 0) return 'Clear Skies';
  if (code <= 3) return 'Partly Cloudy';
  if (code <= 48) return 'Foggy / Hazy';
  if (code <= 55) return 'Drizzle';
  if (code <= 65) return 'Rain Showers';
  if (code <= 77) return 'Snow Flurries';
  if (code <= 82) return 'Heavy Rain Showers';
  if (code >= 95) return 'Severe Thunderstorm';
  return 'Overcast';
}
