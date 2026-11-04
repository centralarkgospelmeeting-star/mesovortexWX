export const runtime = 'nodejs';

const MAX_MESSAGE_LENGTH = 1200;
const MAX_HISTORY = 10;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'models/gemini-3.8-flash';

type ChatMessage = { role: 'user' | 'model'; parts: { text: string }[] };

function extractText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(extractText).filter(Boolean).join('\n');
  if (!value || typeof value !== 'object') return '';

  const object = value as Record<string, unknown>;
  if (typeof object.text === 'string') return object.text;
  if (typeof object.output_text === 'string') return object.output_text;
  if (typeof object.content === 'string') return object.content;
  return extractText(object.content ?? object.parts ?? object.output ?? object.outputs ?? object.steps);
}

function getReply(data: Record<string, unknown>): string {
  const steps = Array.isArray(data.steps) ? data.steps : [];
  const lastStep = steps.length ? steps[steps.length - 1] : undefined;
  const raw = extractText(data.output_text ?? data.output ?? data.outputs ?? lastStep);
  if (!raw) return '';

  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'reply' in parsed && typeof (parsed as { reply?: unknown }).reply === 'string') {
      return (parsed as { reply: string }).reply.trim();
    }
  } catch {
    // If the provider returns plain text despite JSON mode, return the text as-is.
  }
  return raw.trim();
}

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

  const messages = body.messages.slice(-MAX_HISTORY).map((message: unknown): ChatMessage | null => {
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
    'Use general meteorological knowledge and Google Search for current weather information when relevant. Clearly distinguish searched facts from the app context and cite source URLs in your answer when available.',
    'The map displays NEXRAD Level III tiles; the selected station/product are UI context, not a decoded Level II volume or a guarantee of current data freshness.',
    'Never claim to have inspected radar pixels, lightning, model data, soundings, or live conditions unless they are explicitly included in the supplied context or retrieved through Google Search.',
    'Do not invent observations, alerts, storm reports, probabilities, or timestamps. Clearly state uncertainty and distinguish explanation from official warning.',
    'For imminent danger, tell users to follow official NWS warnings and local emergency authorities. This assistant is informational and is not a substitute for official warnings.',
    'Return a JSON object with one string property named reply. Do not include markdown fences around the JSON.',
    `Selected radar site: ${site}. Selected product: ${product}.`,
    `Alerts currently loaded in the app: ${alerts.length ? alerts.join(' | ') : 'none provided'}.`
  ].join('\n');

  const conversation = (messages as ChatMessage[])
    .map((message) => `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.parts[0].text}`)
    .join('\n\n');

  try {
    const aiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GEMINI_MODEL,
        input: `${systemInstruction}\n\nConversation:\n${conversation}`,
        tools: [{ type: 'google_search' }],
        generation_config: { max_output_tokens: 1024, thinking_level: 'medium' },
        response_mime_type: 'application/json'
      }),
      signal: AbortSignal.timeout(30000)
    });

    if (!aiResponse.ok) {
      const providerError = await aiResponse.text();
      console.error('Gemini Interactions API error:', aiResponse.status, providerError.slice(0, 1000));
      return Response.json({ error: 'Google Gemini could not answer. Check GEMINI_API_KEY, model access, and Google Search tool availability.' }, { status: 502 });
    }

    const data = await aiResponse.json() as Record<string, unknown>;
    const reply = getReply(data);
    if (!reply) {
      console.error('Gemini Interactions API returned no text:', JSON.stringify(data).slice(0, 1000));
      return Response.json({ error: 'Gemini returned an empty answer. Please try again.' }, { status: 502 });
    }

    return Response.json({ reply }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Gemini Weather Assistant request failed:', error);
    return Response.json({ error: 'Could not reach Google Gemini. Please try again.' }, { status: 502 });
  }
}
