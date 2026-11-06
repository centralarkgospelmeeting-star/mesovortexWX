'use client';

import { useState, useEffect, useRef } from 'react';

// Generates the official 1050 Hz NOAA Weather Radio Alert Tone
function play1050HzSiren(durationSeconds = 3) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // 1050 Hz is the standard NOAA warning tone frequency
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1050, ctx.currentTime);

    // Fade in and out to prevent speaker popping
    gain.gain.setValueAtTime(0.01, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSeconds);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + durationSeconds);
  } catch (err) {
    console.error('Audio playback was blocked:', err);
  }
}

// Simple point-in-polygon math: checks if user [lon, lat] is inside warning boundary coordinates
function pointInPolygon(point: [number, number], vs: number[][]) {
  const x = point[0];
  const y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], yi = vs[i][1];
    const xj = vs[j][0], yj = vs[j][1];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function EmergencyAlertTone() {
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [activeWarningHeadline, setActiveWarningHeadline] = useState<string | null>(null);
  const userLocation = useRef<[number, number] | null>(null);
  const alertedIdsRef = useRef<Set<string>>(new Set());

  // Ask for location and notification permission
  const enableAlerts = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          userLocation.current = [pos.coords.longitude, pos.coords.latitude];
          setAlertsEnabled(true);

          if ('Notification' in window && Notification.permission !== 'granted') {
            Notification.requestPermission();
          }

          // Play a brief 0.5s confirmation beep so the user knows audio is ready
          play1050HzSiren(0.5);
        },
        (err) => {
          alert('Location permission is required to detect nearby warnings.');
          console.error(err);
        }
      );
    }
  };

  // Check NWS warnings against the user's location every 45 seconds
  useEffect(() => {
    if (!alertsEnabled) return;

    async function checkWarnings() {
      if (!userLocation.current) return;
      try {
        const res = await fetch('/api/warnings');
        if (!res.ok) return;
        const data = await res.json();
        const features = data.features || [];

        for (const f of features) {
          const event = f.properties?.event || '';
          const alertId = f.id || f.properties?.id;

          // Only trigger tone for critical Tornado and Severe Thunderstorm Warnings
          const isCritical = event.includes('Tornado Warning') || event.includes('Severe Thunderstorm Warning');
          if (!isCritical) continue;

          // Check coordinates
          if (f.geometry?.type === 'Polygon') {
            const coords = f.geometry.coordinates[0];
            if (pointInPolygon(userLocation.current, coords)) {
              if (!alertedIdsRef.current.has(alertId)) {
                alertedIdsRef.current.add(alertId);

                // Play 1050 Hz NOAA Siren
                play1050HzSiren(4);
                setActiveWarningHeadline(`${event}: Take shelter if threatened!`);

                // Display desktop/phone notification
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification(`⚠️ EMERGENCY WEATHER ALERT: ${event}`, {
                    body: f.properties?.headline || 'Your current location is inside this warning polygon.',
                    icon: '/icons/app-icon.svg',
                  });
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Could not check emergency warnings:', err);
      }
    }

    checkWarnings();
    const interval = setInterval(checkWarnings, 45000);
    return () => clearInterval(interval);
  }, [alertsEnabled]);

  return (
    <>
      {/* Location / Siren Activation Pill */}
      {!alertsEnabled ? (
        <button
          onClick={enableAlerts}
          className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-cyan-500/40 bg-slate-950/90 px-3.5 py-2 text-xs font-semibold text-cyan-300 shadow-2xl backdrop-blur transition hover:bg-cyan-950/60"
        >
          <span>🔔</span> Enable Live Warning Siren
        </button>
      ) : (
        <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-emerald-500/40 bg-slate-950/90 px-3 py-1.5 text-[11px] font-medium text-emerald-400 shadow-xl backdrop-blur">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Warning Siren Armed
        </div>
      )}

      {/* Flashing Banner If User Is Inside a Warning Polygon */}
      {activeWarningHeadline && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl border border-red-500 bg-red-600/95 px-5 py-3 text-white shadow-2xl backdrop-blur animate-bounce">
          <span className="text-xl">⚠️</span>
          <div className="text-xs font-bold uppercase tracking-wide">
            {activeWarningHeadline}
          </div>
          <button
            onClick={() => setActiveWarningHeadline(null)}
            className="ml-3 rounded bg-black/30 px-2 py-0.5 text-xs text-white hover:bg-black/50"
          >
            Dismiss
          </button>
        </div>
      )}
    </>
  );
}
