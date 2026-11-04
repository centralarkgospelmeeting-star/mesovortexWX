'use client';

import { FormEvent, useState } from 'react';

type ChatMessage = { role: 'user' | 'assistant'; content: string };
type WeatherContext = {
  site?: string;
  product?: string;
  alerts?: string[];
};

export function WeatherAssistant({ context, onClose }: { context: WeatherContext; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || isSending) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setError('');
    setIsSending(true);

    try {
      const response = await fetch('/api/weather-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages.slice(-10), context })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Assistant request failed.');
      setMessages((current) => [...current, { role: 'assistant', content: data.reply }]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not reach the assistant.');
    } finally {
      setIsSending(false);
    }
  }

  return (
    <section className="assistant-panel" aria-label="AI Weather Assistant">
      <header className="assistant-header">
        <div><span className="eyebrow">MESOVORTEXWX</span><h2>AI Weather Assistant</h2><p>Weather context · not an official warning source</p></div>
        <button type="button" className="feature-close" onClick={onClose} aria-label="Close AI Weather Assistant">×</button>
      </header>
      <div className="assistant-context">
        <strong>Current view</strong>
        <span>{context.site || 'Radar site'} · {context.product || 'Radar'}</span>
        {context.alerts?.length ? <span>{context.alerts.length} active alert(s) loaded</span> : <span>No active alerts loaded in the app</span>}
      </div>
      <div className="assistant-messages" aria-live="polite">
        {messages.length === 0 && <div className="assistant-welcome">Ask about radar concepts, weather terminology, or the current view. I’ll distinguish the data shown here from verified forecasts and warnings.</div>}
        {messages.map((message, index) => <div key={`${message.role}-${index}`} className={`assistant-message ${message.role}`}>{message.content}</div>)}
        {isSending && <div className="assistant-thinking">Checking weather context…</div>}
        {error && <div className="assistant-error">{error}</div>}
      </div>
      <form className="assistant-form" onSubmit={sendMessage}>
        <textarea value={input} onChange={(event) => setInput(event.target.value)} maxLength={1200} rows={2} placeholder="Ask a weather question…" aria-label="Message the AI Weather Assistant" disabled={isSending} />
        <button type="submit" disabled={isSending || !input.trim()}>{isSending ? '…' : 'Send'}</button>
      </form>
      <div className="assistant-disclaimer">AI can be wrong. For safety decisions, verify with the National Weather Service and local officials.</div>
    </section>
  );
}
