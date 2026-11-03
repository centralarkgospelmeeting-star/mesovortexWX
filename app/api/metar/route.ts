export async function GET() {
  const headers = {
    'User-Agent': 'MesoVortexWX/1.0 (centralarkgospelmeeting@gmail.com)'
  };

  try {
    // Get points for central US (Great Plains)
    const points = [
      { lat: 35.4676, lon: -97.5164, name: 'KOUN' }, // Norman, OK
      { lat: 37.6245, lon: -101.9987, name: 'KAMA' }, // Amarillo, TX
      { lat: 32.8753, lon: -96.5167, name: 'KDFW' }   // Dallas, TX
    ];

    const observations: any[] = [];

    // Fetch observations from multiple points
    for (const point of points) {
      try {
        // First, get the grid point to find the nearest station
        const gridRes = await fetch(`https://api.weather.gov/points/${point.lat},${point.lon}`, {
          headers,
          next: { revalidate: 600 }
        });

        if (!gridRes.ok) continue;

        const gridData = await gridRes.json();
        const stationsUrl = gridData.properties?.observationStations;

        if (!stationsUrl) continue;

        // Get the stations list
        const stationsRes = await fetch(stationsUrl, {
          headers,
          next: { revalidate: 600 }
        });

        if (!stationsRes.ok) continue;

        const stationsData = await stationsRes.json();
        const firstStation = stationsData.features?.[0]?.id;

        if (!firstStation) continue;

        // Get the latest observation from the station
        const obsRes = await fetch(`${firstStation}/observations/latest`, {
          headers,
          next: { revalidate: 300 }
        });

        if (!obsRes.ok) continue;

        const obsData = obsRes.json();
        const props = (await obsData).properties;

        if (props) {
          observations.push({
            station: point.name,
            text: `${props.weather?.[0]?.coverage || 'Clear'} skies`,
            temp: props.temperature?.value ? `${Math.round(props.temperature.value * 9/5 + 32)}°F` : 'N/A',
            dewpoint: props.dewpoint?.value ? `${Math.round(props.dewpoint.value * 9/5 + 32)}°F` : 'N/A',
            wind: props.windSpeed?.value ? `${Math.round(props.windSpeed.value * 2.237)} kt` : 'Calm'
          });
        }
      } catch (err) {
        // Continue to next station if one fails
        continue;
      }
    }

    return Response.json({
      observations: observations.length > 0 ? observations : []
    });
  } catch (error) {
    console.error('METAR fetch failed:', error);
    return Response.json({ observations: [] });
  }
}
