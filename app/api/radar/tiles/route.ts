export async function GET(request: Request) {
  try {
    // Using RainViewer's free tier for real-time radar data
    // Alternative: Openweather, Mapbox, or direct AWS S3 NEXRAD access
    const response = await fetch('https://api.rainviewer.com/public/weather-maps-timestamps', {
      next: { revalidate: 60 } // Cache for 1 minute
    });

    if (!response.ok) {
      return Response.json({ tiles: [] });
    }

    const data = await response.json();
    const timestamps = data.nowcast || data.radar || [];

    // Map timestamps to tile URLs
    const tiles = timestamps.slice(0, 6).map((ts: number) => ({
      timestamp: ts,
      url: `https://tilecache.rainviewer.com/v2/radar/${ts}/tiles/12/2048/2048/2/1_1.png`
    }));

    return Response.json({
      tiles,
      attribution: 'RainViewer',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Radar tile fetch error:', error);
    return Response.json({
      tiles: [],
      error: 'Failed to fetch radar tiles'
    });
  }
}
