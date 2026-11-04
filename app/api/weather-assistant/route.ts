export const runtime = 'nodejs';

const MAX_MESSAGE_LENGTH = 1200;
const MAX_HISTORY = 10;

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'AI Weather Assistant is not configured yet. Add OPENAI_API_KEY to the deployment environment.' }, { status: 503 });
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
    return content ? { role: item.role, content } : null;
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

  const systemPrompt = [
    'You are the MesoVortexWX AI Weather Assistant. Be concise, practical, and clear.',
    'Use only the supplied app context and general meteorological knowledge. The map currently displays NEXRAD Level III tiles; the selected station/product are UI context, not a decoded Level II volume or a guarantee of current data freshness.',
    'Never claim to have inspected radar pixels, lightning, model data, soundings, or live conditions unless they are explicitly included in the supplied context.',
    'Do not invent observations, alerts, storm reports, probabilities, or timestamps. Clearly state uncertainty and distinguish explanation from official warning.',
    'For imminent danger, tell users to follow official NWS warnings and local emergency authorities. This assistant is informational and is not a substitute for official warnings.',
    `Selected radar site: ${site}. Selected product: ${product}.`,
    `Alerts currently loaded in the app: ${alerts.length ? alerts.join(' | ') : 'none provided'}.`
  ].join('\n');

  try {
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 500,
        messages: [{ role: 'system', content: systemPrompt }, ...messages]
      }),
      signal: AbortSignal.timeout(20000)
    });

    if (!aiResponse.ok) {
      console.error('Weather assistant provider error:', aiResponse.status);
      return Response.json({ error: 'The AI provider could not answer right now. Please try again shortly.' }, { status: 502 });
    }

    const data = await aiResponse.json();
    const reply = data?.choices?.[0]?.message?.content;
    if (typeof reply !== 'string' || !reply.trim()) {
      return Response.json({ error: 'The AI provider returned an empty answer. Please try again.' }, { status: 502 });
    }
    return Response.json({ reply: reply.trim() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Weather assistant request failed:', error);
    return Response.json({ error: 'Could not reach the AI provider. Please try again.' }, { status: 502 });
  }
}
