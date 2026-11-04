export const runtime = 'nodejs';

const MAX_MESSAGE_LENGTH = 1200;
const MAX_HISTORY = 10;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'AI Weather Assistant is not configured. Add GEMINI_API_KEY to the Vercel environment and redeploy.' }, { status: 503 });
  }

  let body: { messages?: unknown; context?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return Response.json({ error: 'Send a message to start the conversation.' }, { status: 400 });
  }

  const messages = body.messages.slice(-MAX_HISTORY).map((message: unknown) => {
    if (!message || typeof message !== 'object') return null;
    const item = message as { role?: unknown; content?: unknown };
    if ((item.role !== 'user' && item.role !== 'assistant') || typeof item.content !== 'string') return null;
    const content = item.content.trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!content) return null;
    return { role: item.role === 'assistant' ? 'model' : 'user', parts: [{ text: content }] };
  });

  if (messages.some((message) => message === null) || messages[messages.length - 1]?.role !== 'user') {
    return Response.json({ error: 'Conversation contains an invalid message.' }, { status: 400 });
  }

  const context = body.context && typeof body.context === 'object' ? body.context as Record<string, unknown> : {};
  const site = typeof context.site === 'string' ? context.site.slice(0, 100) : 'not selected';
  const product = typeof context.product === 'string' ? context.product.slice(0, 100) : 'not selected';
  const alerts = Array.isArray(context.alerts)
    ? context.alerts.filter((alert): alert is string => typeof alert === 'string').slice(0, 5).map((alert) => alert.slice(0, 240))
    : [];

  const systemInstruction = [
    'You are the MesoVortexWX AI Weather Assistant. Be concise, practical, and clear.',
    'Use only the supplied app context and general meteorological knowledge. The map currently displays NEXRAD Level III tiles; the selected station/product are UI context, not a decoded Level II volume or a guarantee of current data freshness.',
    'Never claim to have inspected radar pixels, lightning, model data, soundings, or live conditions unless they are explicitly included in the supplied context.',
    'Do not invent observations, alerts, storm reports, probabilities, or timestamps. Clearly state uncertainty and distinguish explanation from official warning.',
    'For imminent danger, tell users to follow official NWS warnings and local emergency authorities. This assistant is informational and is not a substitute for official warnings.',
    `Selected radar site: ${site}. Selected product: ${product}.`,
    `Alerts currently loaded in the app: ${alerts.length ? alerts.join(' | ') : 'none provided'}.`
  ].join('\n');

  try {
    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: messages,
        generationConfig: { temperature: 0.3, maxOutputTokens: 500 }
      }),
      signal: AbortSignal.timeout(20000)
    });

    if (!aiResponse.ok) {
      console.error('Gemini Weather Assistant provider error:', aiResponse.status);
      return Response.json({ error: 'Google Gemini could not answer right now. Check the API key and model access, then try again.' }, { status: 502 });
    }

    const data = await aiResponse.json();
    const reply = data?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: unknown }) => typeof part.text === 'string' ? part.text : '')
      .join('')
      .trim();
    if (typeof reply !== 'string' || !reply) {
      return Response.json({ error: 'Gemini returned an empty answer. Please try again.' }, { status: 502 });
    }

    return Response.json({ reply }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Gemini Weather Assistant request failed:', error);
    return Response.json({ error: 'Could not reach Google Gemini. Please try again.' }, { status: 502 });
  }
}
