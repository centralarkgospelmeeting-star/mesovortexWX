import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI Copilot is not configured. Add GEMINI_API_KEY to Vercel environment variables.' },
      { status: 503 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request' }, { status: 400 });
  }

  const { site, product, tilt, sounding, alerts } = body;

  const prompt = `
You are the Lead Forecaster at the NOAA Storm Prediction Center (SPC) in Norman, Oklahoma.
Draft an official, highly technical, and urgent MESOSCALE CONVECTIVE DISCUSSION (MCD) based on the following real-time data:

- RADAR SITE: ${site.id} (${site.name}) at Lat: ${site.lat}, Lon: ${site.lon}
- PRODUCT & TILT: ${product.toUpperCase()} at ${tilt}° elevation beam
- THERMODYNAMIC INDICES:
  * SBCAPE: ${sounding?.indices?.sbcape || 2400} J/kg
  * 0-1km SRH: ${sounding?.indices?.srh01 || 220} m²/s²
  * 0-6km Bulk Shear: ${sounding?.indices?.shear06 || 48} kt
  * Significant Tornado Parameter (STP): ${sounding?.indices?.stp || 2.4}
- ACTIVE WARNINGS / ALERTS: ${alerts && alerts.length > 0 ? alerts.join(' | ') : 'Elevated convective activity under radar surveillance'}

Format your response exactly like an official SPC MCD:
1. HEADER: MESOSCALE CONVECTIVE DISCUSSION [DISC NUMBER]
2. CONCERNING: [Target Area and Radar Station]
3. VALID TIME: [Current UTC Time Range]
4. PROBABILITY OF WATCH ISSUANCE: [e.g. 80% or 95%]
5. SUMMARY: 2-3 sentences summarizing the immediate threat (Tornado, Giant Hail, Damaging Winds).
6. DISCUSSION: 2-3 detailed meteorological paragraphs analyzing low-level jet advection, boundary layer kinematics, hodograph curvature, hook echo evolution, and storm mode.
7. AREAS AFFECTED: Specific counties and regional coordinates.

Keep your tone professional, authoritative, and concise. Return the result in a JSON object with a single property named "mcd".
`;

  try {
    const aiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'models/gemini-2.5-flash',
        input: prompt,
        generation_config: { max_output_tokens: 1200 },
        response_mime_type: 'application/json',
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('Gemini MCD Error:', errText);
      return NextResponse.json({ error: 'AI failed to generate discussion.' }, { status: 502 });
    }

    const data = await aiResponse.json();
    let mcdText = '';

    try {
      const parsed = JSON.parse(data.output_text || data.outputs?.[0]?.text || '{}');
      mcdText = parsed.mcd || JSON.stringify(parsed);
    } catch {
      mcdText = data.output_text || 'Discussion generated.';
    }

    return NextResponse.json({ mcd: mcdText });
  } catch (err) {
    console.error('MCD request error:', err);
    return NextResponse.json({ error: 'Could not contact AI Copilot.' }, { status: 502 });
  }
}
