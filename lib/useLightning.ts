'use client';

import { useState, useEffect, useRef } from 'react';

export type LightningStrike = {
  id: string;
  lat: number;
  lon: number;
  time: number; // epoch ms
};

export function useLightning(enabled: boolean = true) {
  const [strikes, setStrikes] = useState<LightningStrike[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Connect to Blitzortung Community Live Feed WebSocket
    const ws = new WebSocket('wss://ws.blitzortung.org:8082');
    wsRef.current = ws;

    ws.onopen = () => {
      // Subscribes to North America / Global stream
      ws.send(JSON.stringify({ a: 1 }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.lat && data.lon) {
          const newStrike: LightningStrike = {
            id: `${data.time}-${Math.random()}`,
            lat: data.lat,
            lon: data.lon,
            time: data.time ? data.time / 1000000 : Date.now(),
          };

          setStrikes((prev) => {
            const cutoff = Date.now() - 20 * 60 * 1000; // keep last 20 mins
            return [...prev.filter((s) => s.time > cutoff), newStrike];
          });
        }
      } catch {
        // parse error ignored
      }
    };

    const pruneInterval = setInterval(() => {
      const cutoff = Date.now() - 20 * 60 * 1000;
      setStrikes((prev) => prev.filter((s) => s.time > cutoff));
    }, 15000);

    return () => {
      clearInterval(pruneInterval);
      ws.close();
    };
  }, [enabled]);

  return strikes;
}
