export interface AgroTelemetry {
  tempF: number;
  feelsLikeF: number;
  pressureMb: number;
  humidityPct: number;
  windSpeedMph: number;
  windGustMph: number;
  windDeg: number;
  cloudCoverPct: number;
  condition: string;
  soilTempF?: number;
  soilMoisturePct?: number;
  timestamp: string;
}

const AGRO_BASE = 'https://api.agromonitoring.com/agro/1.0';

export async function getAgroWeatherData(lat: number, lon: number): Promise<AgroTelemetry | null> {
  const apiKey = process.env.AGROMONITORING_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    // 1. Fetch current weather from AgroMonitoring
    const weatherRes = await fetch(
      `${AGRO_BASE}/weather?lat=${lat}&lon=${lon}&appid=${apiKey}`,
      { next: { revalidate: 300 } } // 5-minute cache
    );

    if (!weatherRes.ok) return null;
    const wData = await weatherRes.json();

    // 2. Fetch soil data (Soil Temperature & Moisture)
    let soilTempF: number | undefined;
    let soilMoisturePct: number | undefined;

    try {
      const soilRes = await fetch(
        `${AGRO_BASE}/soil?lat=${lat}&lon=${lon}&appid=${apiKey}`,
        { next: { revalidate: 600 } }
      );
      if (soilRes.ok) {
        const sData = await soilRes.json();
        // Kelvin to Fahrenheit for 10cm soil depth
        if (sData.t10) soilTempF = Math.round((sData.t10 - 273.15) * 1.8 + 32);
        if (sData.moisture) soilMoisturePct = Math.round(sData.moisture * 100);
      }
    } catch {
      // Continue without soil if plan does not include endpoint
    }

    // Kelvin to Fahrenheit conversion
    const tempF = Math.round((wData.main.temp - 273.15) * 1.8 + 32);
    const feelsLikeF = Math.round((wData.main.feels_like - 273.15) * 1.8 + 32);
    const windSpeedMph = Math.round((wData.wind?.speed || 0) * 2.237);
    const windGustMph = Math.round((wData.wind?.gust || wData.wind?.speed || 0) * 2.237);

    return {
      tempF,
      feelsLikeF,
      pressureMb: wData.main.pressure,
      humidityPct: wData.main.humidity,
      windSpeedMph,
      windGustMph,
      windDeg: wData.wind?.deg || 0,
      cloudCoverPct: wData.clouds?.all || 0,
      condition: wData.weather?.[0]?.description || 'Overcast',
      soilTempF,
      soilMoisturePct,
      timestamp: new Date(wData.dt * 1000).toISOString(),
    };
  } catch (err) {
    console.error('[AgroMonitoring Adapter Error]:', err);
    return null;
  }
}
