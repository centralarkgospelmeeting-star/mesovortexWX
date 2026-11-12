import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const headers = {
    'User-Agent': 'MesoVortexWX/1.0 (centralarkgospelmeeting@gmail.com)'
  };

  try {
    // Fetch active weather alerts from NWS API
    const res = await fetch('https://api.weather.gov/alerts/active?status=actual&message_type=alert', {
      headers,
      next: { revalidate: 300 } // Cache for 5 minutes
    });

    if (!res.ok) {
      return Response.json({ alerts: [] });
    }

    const data = await res.json();
    const alerts = (data.features || [])
      .slice(0, 5) // Top 5 alerts
      .map((feature: any) => ({
        id: feature.id,
        headline: feature.properties?.event || 'Weather Advisory',
        severity: feature.properties?.severity || 'Moderate',
        area: feature.properties?.areaDesc || 'Regional Area',
        sent: feature.properties?.sent || new Date().toISOString()
      }));

    return Response.json({ alerts });
  } catch (error) {
    console.error('Alert fetch failed:', error);
    return Response.json({ alerts: [] });
  }
}
