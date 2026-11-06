import { NextResponse } from 'next/server';

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
    // Return plain text if not JSON
  }
  return raw.trim();
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI Weather Assistant is not configured. Add GEMINI_API_KEY to environment variables.' },
      { status: 503 }
    );
  }

  let body: { messages?: unknown; context?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: 'Send a message to start the conversation.' }, { status: 400 });
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
    return NextResponse.json({ error: 'Conversation contains an invalid message.' }, { status: 400 });
  }

  const context = body.context && typeof body.context === 'object' ? (body.context as Record<string, unknown>) : {};
  const site = typeof context.site === 'string' ? context.site.slice(0, 100) : 'not selected';
  const product = typeof context.product === 'string' ? context.product.slice(0, 100) : 'not selected';
  const alerts = Array.isArray(context.alerts)
    ? context.alerts.filter((alert): alert is string => typeof alert === 'string').slice(0, 5).map((alert) => alert.slice(0, 240))
    : [];

  const systemInstruction = [
    'You are the MesoVortexWX Meteorologist Copilot, an operational radar and severe storms analyst.',
    'Your knowledge base matches an experienced NWS Warning Coordination Meteorologist (WCM) and severe storm researcher.',
    'Analyze radar signatures utilizing Dual-Polarization radar principles:',
    '- Correlation Coefficient (CC): Values dropping < 0.80 coincident with high Reflectivity (>50 dBZ) and tight velocity shear indicate a Tornado Debris Signature (TDS), confirming a damaging tornado on the ground.',
    '- Differential Reflectivity (ZDR): Negative or near-zero ZDR with high Z represents randomly oriented tumbling hail; high positive ZDR (>3 dB) represents large oblate rain drops.',
    '- Specific Differential Phase (KDP): High KDP values identify heavy rain columns, useful for flash flooding and microburst precursors.',
    '- Storm Relative Velocity (SRM): Identify cyclonic velocity couplets, mesocyclones, and bounded weak echo regions (BWER).',
    'When evaluating severe threats, integrate 0-1km SRH, 0-6km Bulk Shear, CAPE, and Significant Tornado Parameter (STP).',
    'If prompted to write an MCD (Mesoscale Convective Discussion), format it professionally with SUMMARY, DISCUSSION, and LAT/LON areas of interest.',
    'Distinguish clearly between radar observations and official NWS warnings.',
    'Always return a valid JSON object with the property "reply" containing your structured analysis.',
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
      console.error('Gemini error:', aiResponse.status, providerError.slice(0, 1000));
      return NextResponse.json({ error: 'AI Copilot could not answer. Check GEMINI_API_KEY settings.' }, { status: 502 });
    }

    const data = (await aiResponse.json()) as Record<string, unknown>;
    const reply = getReply(data);
    if (!reply) {
      return NextResponse.json({ error: 'AI returned an empty response. Please try again.' }, { status: 502 });
    }

    return NextResponse.json({ reply }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Gemini request failed:', error);
    return NextResponse.json({ error: 'Could not reach the AI assistant. Please try again.' }, { status: 502 });
  }
}
