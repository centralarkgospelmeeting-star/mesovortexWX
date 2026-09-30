export async function GET() {
  const headers = {
    'User-Agent': 'MesoVortexWX/1.0 (centralarkgospelmeeting@gmail.com)',
    Accept: 'application/geo+json'
  };

  try {
    const res = await fetch('https://api.weather.gov/alerts/active?status=actual&message_type=alert', {
      headers,
      next: { revalidate: 300 }
    });

    if (!res.ok) {
      return Response.json({ alerts: [] });
    }

    const data = await res.json();
    const alerts = (data.features || [])
      .slice(0, 4)
      .map((feature: any) => ({
        id: feature.id,
        headline: feature.properties?.event || 'Weather Advisory',
        severity: feature.properties?.severity || 'Moderate',
        area: feature.properties?.areaDesc || 'Regional',
        sent: feature.properties?.sent || ''
      }));

    return Response.json({ alerts });
  } catch {
    return Response.json({ alerts: [] });
  }
}
