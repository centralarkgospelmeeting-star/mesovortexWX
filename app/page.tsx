'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { RadarMap } from '../components/RadarMap';
import { WeatherAssistant } from '../components/WeatherAssistant';
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
  // Core state
  const [product, setProduct] = useState<RadarProduct>('ref');
  const [radarSite, setRadarSite] = useState('KLZK');
  const [mapType, setMapType] = useState<MapType>('street');
  const [showAssistant, setShowAssistant] = useState(false);
  const [cardExpanded, setCardExpanded] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Customizations
  const [radarOpacity, setRadarOpacity] = useState(0.85);
  const [showRangeRings, setShowRangeRings] = useState(true);
  const [showSiteLabels, setShowSiteLabels] = useState(true);
  const [smoothing, setSmoothing] = useState(false);
  const [dualPane, setDualPane] = useState(false);
  const [product2, setProduct2] = useState<RadarProduct>('vel');

  // Loop
  const [frames, setFrames] = useState<Frame[]>([]);
  const [frameIndex, setFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopLoading, setLoopLoading] = useState(false);
  const playTimerRef = useRef<number | null>(null);

  const currentSite = RADAR_SITES.find((s) => s.id === radarSite) || RADAR_SITES[0];
  const productInfo = RADAR_PRODUCTS.find((p) => p.key === product);
  const currentFrame = frames[frameIndex] || null;

  // Load frames
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
      <div className={`absolute inset-0 ${dualPane ? 'grid grid-cols-2' : ''}`}>
        <div className="relative h-full w-full">
          <RadarMap
            product={product}
            radarSite={radarSite}
            mapType={mapType}
            frameUrl={currentFrame?.tileUrl ?? null}
            frameLabel={currentFrame?.label}
          />
        </div>
        {dualPane && (
          <div className="relative h-full w-full border-l border-white/10">
            <RadarMap
              product={product2}
              radarSite={radarSite}
              mapType={mapType}
            />
          </div>
        )}
      </div>

      {/* TOP FLOATING PILL */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-30 flex justify-center pt-3">
        <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/10 bg-slate-950/85 px-2 py-1.5 shadow-2xl backdrop-blur-xl">
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
      </div>

      {/* LEFT FLOATING CONTROLS */}
      <div className="absolute left-3 top-20 z-20 flex flex-col gap-2">
        <button
          onClick={() => setCardExpanded((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate-950/80 text-slate-200 shadow-lg backdrop-blur hover:bg-slate-900"
          title="Radar controls"
        >
          ☰
        </button>
        <button
          onClick={() => setSettingsOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate-950/80 text-slate-200 shadow-lg backdrop-blur hover:bg-slate-900"
          title="Customizations"
        >
          ⚙
        </button>
        <button
          onClick={() => setMapType((m) => (m === 'street' ? 'satellite' : m === 'satellite' ? 'terrain' : 'street'))}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate-950/80 text-slate-200 shadow-lg backdrop-blur hover:bg-slate-900"
          title="Basemap"
        >
          🗺
        </button>
        <button
          onClick={() => setDualPane((v) => !v)}
          className={`flex h-10 w-10 items-center justify-center rounded-full border shadow-lg backdrop-blur ${
            dualPane
              ? 'border-cyan-500/50 bg-cyan-600/30 text-cyan-200'
              : 'border-white/10 bg-slate-950/80 text-slate-200 hover:bg-slate-900'
          }`}
          title="Dual pane"
        >
          ▦
        </button>
      </div>

      {/* SETTINGS PANEL */}
      {settingsOpen && (
        <div className="absolute left-16 top-20 z-30 w-64 rounded-2xl border border-white/10 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold">Customizations</span>
            <button onClick={() => setSettingsOpen(false)} className="text-slate-400 hover:text-white">
              ✕
            </button>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <div className="mb-1.5 flex justify-between text-slate-400">
                <span>Radar Opacity</span>
                <span>{Math.round(radarOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.2}
                max={1}
                step={0.05}
                value={radarOpacity}
                onChange={(e) => setRadarOpacity(Number(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            <label className="flex items-center justify-between">
              <span className="text-slate-300">Range Rings</span>
              <input
                type="checkbox"
                checked={showRangeRings}
                onChange={(e) => setShowRangeRings(e.target.checked)}
                className="accent-cyan-500"
              />
            </label>

            <label className="flex items-center justify-between">
              <span className="text-slate-300">Site Labels</span>
              <input
                type="checkbox"
                checked={showSiteLabels}
                onChange={(e) => setShowSiteLabels(e.target.checked)}
                className="accent-cyan-500"
              />
            </label>

            <label className="flex items-center justify-between">
              <span className="text-slate-300">Smoothing</span>
              <input
                type="checkbox"
                checked={smoothing}
                onChange={(e) => setSmoothing(e.target.checked)}
                className="accent-cyan-500"
              />
            </label>

            <div>
              <div className="mb-1.5 text-slate-400">Basemap</div>
              <div className="grid grid-cols-2 gap-1.5">
                {(['street', 'satellite', 'terrain', 'globe'] as MapType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setMapType(t)}
                    className={`rounded-lg py-1.5 capitalize ${
                      mapType === t
                        ? 'bg-cyan-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COLLAPSIBLE BOTTOM-LEFT PRODUCT CARD */}
      <div className="absolute bottom-4 left-4 z-30 w-[300px]">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/90 shadow-2xl backdrop-blur-xl">
          {/* Always-visible header */}
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

            <span className="text-slate-500">{cardExpanded ? '▾' : '▴'}</span>
          </div>

          {/* Expanded */}
          {cardExpanded && (
            <div className="border-t border-white/10 px-3 pb-3 pt-2">
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
                      <div className="mt-0.5 text-[9px] leading-tight opacity-70">
                        {p.label.split(' ')[0]}
                      </div>
                    </button>
                  );
                })}
              </div>

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

      {/* AI Assistant */}
      {showAssistant && (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/50 p-4 sm:items-center">
          <div className="h-[75vh] w-full max-w-md overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl">
            <WeatherAssistant
              context={{
                site: radarSite,
                product: productInfo?.label,
                alerts: [],
              }}
              onClose={() => setShowAssistant(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
