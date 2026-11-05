'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { RadarMap } from '../components/RadarMap';
import { WeatherAssistant } from '../components/WeatherAssistant';
import { AlertBanner } from '../components/AlertBanner';
import { RADAR_SITES, RADAR_PRODUCTS } from '../lib/radar-config';

type RadarProduct = 'ref' | 'vel' | 'srvel' | 'cc' | 'zdr' | 'kdp';
type MapType = 'street' | 'terrain' | 'satellite' | 'globe';

type Frame = {
  time: string;
  label: string;
  tileUrl: string;
  ageMinutes: number;
};

export default function MesoVortexWX() {
  const [product, setProduct] = useState<RadarProduct>('ref');
  const [radarSite, setRadarSite] = useState('KLZK');
  const [mapType, setMapType] = useState<MapType>('street');
  const [showAssistant, setShowAssistant] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [cardExpanded, setCardExpanded] = useState(true);

  // Loop
  const [frames, setFrames] = useState<Frame[]>([]);
  const [frameIndex, setFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopLoading, setLoopLoading] = useState(false);
  const playTimerRef = useRef<number | null>(null);

  const currentSite = RADAR_SITES.find((s) => s.id === radarSite) || RADAR_SITES[0];
  const productInfo = RADAR_PRODUCTS.find((p) => p.key === product);
  const currentFrame = frames[frameIndex] || null;

  // Alerts
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/alerts');
        if (res.ok) {
          const data = await res.json();
          setAlerts(data.alerts || []);
        }
      } catch {}
    }
    load();
    const id = setInterval(load, 90_000);
    return () => clearInterval(id);
  }, []);

  // Frames
  const loadFrames = useCallback(async () => {
    setLoopLoading(true);
    try {
      const res = await fetch(
        `/api/nexrad/frames?site=${encodeURIComponent(currentSite.radarId)}&product=${encodeURIComponent(product)}&hours=1.5`,
        { cache: 'no-store' }
      );
      const data = await res.json();
      if (res.ok && Array.isArray(data.frames) && data.frames.length > 0) {
        setFrames(data.frames);
        setFrameIndex(data.frames.length - 1);
      } else {
        setFrames([]);
        setFrameIndex(0);
      }
    } catch {
      setFrames([]);
    } finally {
      setLoopLoading(false);
    }
  }, [currentSite.radarId, product]);

  useEffect(() => {
    void loadFrames();
  }, [loadFrames]);

  // Playback
  useEffect(() => {
    if (playTimerRef.current) {
      window.clearInterval(playTimerRef.current);
      playTimerRef.current = null;
    }
    if (!isPlaying || frames.length < 2) return;

    playTimerRef.current = window.setInterval(() => {
      setFrameIndex((prev) => (prev + 1 >= frames.length ? 0 : prev + 1));
    }, 700);

    return () => {
      if (playTimerRef.current) window.clearInterval(playTimerRef.current);
    };
  }, [isPlaying, frames.length]);

  const goToLive = () => {
    if (frames.length > 0) {
      setFrameIndex(frames.length - 1);
      setIsPlaying(false);
    }
  };

  const stepFrame = (dir: -1 | 1) => {
    setIsPlaying(false);
    setFrameIndex((prev) => {
      const next = prev + dir;
      if (next < 0) return frames.length - 1;
      if (next >= frames.length) return 0;
      return next;
    });
  };

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#0b1220] text-slate-100">
      {/* FULL SCREEN MAP */}
      <div className="absolute inset-0">
        <RadarMap
          product={product}
          radarSite={radarSite}
          mapType={mapType}
          frameUrl={currentFrame?.tileUrl ?? null}
          frameLabel={currentFrame?.label}
        />
      </div>

      {/* TOP FLOATING PILL TOOLBAR */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-30 flex justify-center pt-3">
        <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/10 bg-slate-950/80 px-2 py-1.5 shadow-xl backdrop-blur-xl">
          {/* Logo */}
          <div className="flex items-center gap-2 pl-1 pr-3">
            <Image
              src="/logo.png"
              alt="MesoVortex Wx"
              width={28}
              height={28}
              className="rounded-full"
              priority
            />
            <span className="hidden text-sm font-bold tracking-tight sm:inline">
              Meso<span className="text-cyan-400">Vortex</span>
            </span>
          </div>

          <div className="h-5 w-px bg-white/10" />

          {/* Mode tabs */}
          {['Radar', 'Composite', 'Satellite', 'Models', 'Outlooks'].map((tab) => (
            <button
              key={tab}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                tab === 'Radar'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Alerts badge */}
        {alerts.length > 0 && (
          <div className="pointer-events-auto absolute right-4 top-3">
            <button className="flex h-9 items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/20 px-3 text-xs font-bold text-amber-300 backdrop-blur">
              <span className="text-base">⚠</span>
              {alerts.length}
            </button>
          </div>
        )}
      </div>

      {/* LEFT FLOATING CONTROLS */}
      <div className="absolute left-3 top-20 z-20 flex flex-col gap-2">
        <button
          onClick={() => setCardExpanded((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate-950/80 text-slate-200 shadow-lg backdrop-blur hover:bg-slate-900"
          title="Toggle radar controls"
        >
          ☰
        </button>
        <button
          onClick={() => setMapType((m) => (m === 'street' ? 'satellite' : 'street'))}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate-950/80 text-slate-200 shadow-lg backdrop-blur hover:bg-slate-900"
          title="Toggle basemap"
        >
          🗺
        </button>
      </div>

      {/* COLLAPSIBLE BOTTOM-LEFT PRODUCT CARD */}
      <div className="absolute bottom-4 left-4 z-30 w-[280px]">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/90 shadow-2xl backdrop-blur-xl">
          {/* Header (always visible) */}
          <div
            className="flex cursor-pointer items-center gap-3 px-3.5 py-2.5"
            onClick={() => setCardExpanded((v) => !v)}
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-white">
                {currentSite.radarId} · {productInfo?.label || product}
              </div>
              <div className="text-[11px] text-slate-400">
                {loopLoading ? 'Loading…' : currentFrame?.label || '—'}
                {currentFrame?.label === 'LIVE' && (
                  <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                )}
              </div>
            </div>

            {/* Mini transport */}
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => stepFrame(-1)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-slate-300 hover:bg-white/10"
              >
                ‹
              </button>
              <button
                onClick={() => setIsPlaying((p) => !p)}
                disabled={frames.length < 2}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-600 text-white hover:bg-cyan-500 disabled:opacity-40"
              >
                {isPlaying ? '❚❚' : '▶'}
              </button>
              <button
                onClick={() => stepFrame(1)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-slate-300 hover:bg-white/10"
              >
                ›
              </button>
            </div>

            <button className="text-slate-500 hover:text-white">
              {cardExpanded ? '▾' : '▴'}
            </button>
          </div>

          {/* Expanded content */}
          {cardExpanded && (
            <div className="border-t border-white/10 px-3 pb-3 pt-2">
              {/* Site picker */}
              <select
                value={radarSite}
                onChange={(e) => setRadarSite(e.target.value)}
                className="mb-2.5 w-full rounded-lg border border-white/10 bg-slate-900 px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
              >
                {RADAR_SITES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              {/* Product grid */}
              <div className="grid grid-cols-3 gap-1.5">
                {RADAR_PRODUCTS.map((p) => {
                  const active = product === p.key;
                  return (
                    <button
                      key={p.key}
                      onClick={() => setProduct(p.key as RadarProduct)}
                      className={`rounded-xl px-2 py-2.5 text-center transition ${
                        active
                          ? 'bg-cyan-600/30 ring-1 ring-cyan-500 text-cyan-100'
                          : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="text-[11px] font-bold">{p.short}</div>
                      <div className="mt-0.5 text-[9px] opacity-70 leading-tight">
                        {p.label.split(' ')[0]}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Extra actions */}
              <div className="mt-2.5 flex gap-1.5">
                <button
                  onClick={goToLive}
                  className="flex-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 py-1.5 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-500/20"
                >
                  LIVE
                </button>
                <button
                  onClick={() => void loadFrames()}
                  className="rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-[11px] text-slate-300 hover:bg-slate-800"
                >
                  ↻
                </button>
                <button
                  onClick={() => setShowAssistant(true)}
                  className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-[11px] font-semibold text-violet-300 hover:bg-violet-500/20"
                >
                  AI
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Alerts strip (optional, top) */}
      {alerts.length > 0 && (
        <div className="absolute left-1/2 top-16 z-20 w-full max-w-lg -translate-x-1/2 px-4">
          <AlertBanner alerts={alerts.slice(0, 1)} />
        </div>
      )}

      {/* AI Assistant modal */}
      {showAssistant && (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/50 p-4 sm:items-center">
          <div className="h-[75vh] w-full max-w-md overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl">
            <WeatherAssistant
              context={{
                site: radarSite,
                product: productInfo?.label,
                alerts: alerts.map((a) => a.headline),
              }}
              onClose={() => setShowAssistant(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
