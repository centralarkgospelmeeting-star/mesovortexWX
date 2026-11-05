'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { RadarMap } from '../components/RadarMap';
import { Sidebar } from '../components/Sidebar';
import { WeatherAssistant } from '../components/WeatherAssistant';
import { AlertBanner } from '../components/AlertBanner';
import { METARPanel } from '../components/METARPanel';
import { RADAR_SITES, RADAR_PRODUCTS } from '../lib/radar-config';

type RadarProduct = 'ref' | 'vel' | 'srvel' | 'cc' | 'zdr' | 'kdp';
type MapType = 'street' | 'terrain' | 'satellite' | 'globe';
type LayoutMode = 'single' | 'dual';

type Frame = {
  time: string;
  label: string;
  tileUrl: string;
  ageMinutes: number;
};

export default function MesoVortexWX() {
  const [product, setProduct] = useState<RadarProduct>('ref');
  const [product2, setProduct2] = useState<RadarProduct>('vel');
  const [radarSite, setRadarSite] = useState('KLZK');
  const [mapType, setMapType] = useState<MapType>('street');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('single');
  const [showAssistant, setShowAssistant] = useState(false);
  const [showMetar, setShowMetar] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);

  // Loop state
  const [frames, setFrames] = useState<Frame[]>([]);
  const [frameIndex, setFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopLoading, setLoopLoading] = useState(false);
  const playTimerRef = useRef<number | null>(null);

  const currentSite = RADAR_SITES.find((s) => s.id === radarSite) || RADAR_SITES[0];
  const productInfo = RADAR_PRODUCTS.find((p) => p.key === product);
  const currentFrame = frames[frameIndex] || null;

  // ---------- Load alerts ----------
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

  // ---------- Load frames when site or product changes ----------
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
        // Start on the newest (LIVE) frame
        setFrameIndex(data.frames.length - 1);
      } else {
        setFrames([]);
        setFrameIndex(0);
      }
    } catch (err) {
      console.error('Failed to load frames', err);
      setFrames([]);
    } finally {
      setLoopLoading(false);
    }
  }, [currentSite.radarId, product]);

  useEffect(() => {
    void loadFrames();
  }, [loadFrames]);

  // ---------- Playback timer ----------
  useEffect(() => {
    if (playTimerRef.current) {
      window.clearInterval(playTimerRef.current);
      playTimerRef.current = null;
    }

    if (!isPlaying || frames.length < 2) return;

    playTimerRef.current = window.setInterval(() => {
      setFrameIndex((prev) => {
        const next = prev + 1;
        return next >= frames.length ? 0 : next; // loop back to start
      });
    }, 700); // ~0.7s per frame – feels good for radar

    return () => {
      if (playTimerRef.current) {
        window.clearInterval(playTimerRef.current);
        playTimerRef.current = null;
      }
    };
  }, [isPlaying, frames.length]);

  // ---------- Helpers ----------
  const goToLive = () => {
    if (frames.length > 0) {
      setFrameIndex(frames.length - 1);
      setIsPlaying(false);
    }
  };

  const togglePlay = () => {
    if (frames.length < 2) return;
    setIsPlaying((p) => !p);
  };

  const onScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = Number(e.target.value);
    setFrameIndex(idx);
    setIsPlaying(false);
  };

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-[#0b1220] text-slate-100">
      {/* TOP BAR */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-800 bg-[#0f172a] px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-lg font-black text-white shadow-lg shadow-cyan-500/25">
            ⚡
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight">
              MesoVortex<span className="text-cyan-400">WX</span>
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
              Pro Radar · AI · Models
            </div>
          </div>
        </div>

        {/* Product buttons */}
        <div className="ml-6 flex items-center gap-1 rounded-lg bg-slate-900/70 p-1">
          {RADAR_PRODUCTS.map((p) => (
            <button
              key={p.key}
              onClick={() => setProduct(p.key as RadarProduct)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase transition ${
                product === p.key
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {p.short}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2.5">
          <select
            value={radarSite}
            onChange={(e) => setRadarSite(e.target.value)}
            className="max-w-[220px] rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
          >
            {RADAR_SITES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <div className="flex rounded-lg bg-slate-900 p-0.5">
            {(['street', 'terrain', 'satellite', 'globe'] as MapType[]).map((t) => (
              <button
                key={t}
                onClick={() => setMapType(t)}
                className={`rounded px-2.5 py-1 text-[11px] font-medium capitalize ${
                  mapType === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <button
            onClick={() => setLayoutMode((m) => (m === 'single' ? 'dual' : 'single'))}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-cyan-600 hover:text-cyan-300"
          >
            {layoutMode === 'single' ? 'Dual' : 'Single'}
          </button>

          <button
            onClick={() => setShowMetar(!showMetar)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-emerald-600 hover:text-emerald-300"
          >
            METAR
          </button>

          <button
            onClick={() => setShowAssistant(true)}
            className="rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:from-violet-500"
          >
            AI Assistant
          </button>
        </div>
      </header>

      {/* ALERTS */}
      <AlertBanner alerts={alerts} />

      {/* MAIN */}
      <div className="relative flex min-h-0 flex-1">
        <Sidebar
          product={product}
          setProduct={setProduct}
          radarSite={radarSite}
          setRadarSite={setRadarSite}
        />

        <div className="relative flex min-w-0 flex-1 flex-col">
          {/* Maps */}
          <div
            className={`grid min-h-0 flex-1 ${
              layoutMode === 'dual' ? 'grid-cols-2' : 'grid-cols-1'
            }`}
          >
            <div className="relative min-h-0">
              <RadarMap
                product={product}
                radarSite={radarSite}
                mapType={mapType}
                frameUrl={currentFrame?.tileUrl ?? null}
                frameLabel={currentFrame?.label}
              />
            </div>

            {layoutMode === 'dual' && (
              <div className="relative min-h-0 border-l border-slate-800">
                <RadarMap
                  product={product2}
                  radarSite={radarSite}
                  mapType={mapType}
                  // Dual pane currently shows latest of second product (can be enhanced later)
                />
              </div>
            )}
          </div>

          {/* TIMELINE / LOOP CONTROLS */}
          <div className="flex h-14 shrink-0 items-center gap-4 border-t border-slate-800 bg-[#0f172a]/95 px-4 backdrop-blur">
            {/* Play / Pause */}
            <button
              onClick={togglePlay}
              disabled={frames.length < 2}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-600 text-sm text-white transition hover:bg-cyan-500 disabled:opacity-40"
              title={isPlaying ? 'Pause' : 'Play loop'}
            >
              {isPlaying ? '❚❚' : '▶'}
            </button>

            {/* Live button */}
            <button
              onClick={goToLive}
              className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-emerald-400 hover:border-emerald-600"
            >
              LIVE
            </button>

            {/* Scrubber */}
            <div className="flex flex-1 items-center gap-3">
              <input
                type="range"
                min={0}
                max={Math.max(frames.length - 1, 0)}
                value={frameIndex}
