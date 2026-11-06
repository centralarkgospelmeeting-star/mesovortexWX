'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { RadarMap, SpotterPin, PaletteType } from '../components/RadarMap';
import { WeatherAssistant } from '../components/WeatherAssistant';
import { EmergencyAlertTone } from '../components/EmergencyAlertTone';
import { SynchronizedQuadView } from '../components/SynchronizedQuadView';
import { SpotterReportModal, SpotterReport } from '../components/SpotterReportModal';
import { RADAR_SITES, RADAR_PRODUCTS } from '../lib/radar-config';

type RadarProduct = 'ref' | 'vel' | 'srvel' | 'cc' | 'zdr' | 'kdp';
type MapType = 'street' | 'terrain' | 'satellite' | 'globe';
type ModeTab = 'Radar' | 'Composite' | 'Satellite' | 'Models' | 'Outlooks';

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
  const [activeTab, setActiveTab] = useState<ModeTab>('Radar');
  const [palette, setPalette] = useState<PaletteType>('nws');
  const [showAssistant, setShowAssistant] = useState(false);
  const [showQuad, setShowQuad] = useState(false);

  // WeatherWise Layer Toggles
  const [showRadarPills, setShowRadarPills] = useState(true);
  const [showLightning, setShowLightning] = useState(true);
  const [showMetars, setShowMetars] = useState(false);
  const [showLSR, setShowLSR] = useState(true);
  const [showWatches, setShowWatches] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Spotter reporting state
  const [spotterCoords, setSpotterCoords] = useState<[number, number] | null>(null);
  const [spotterReports, setSpotterReports] = useState<SpotterPin[]>([]);

  // Split View
  const [dualPane, setDualPane] = useState(false);
  const [product2, setProduct2] = useState<RadarProduct>('vel');

  // Loop & Playback
  const [frames, setFrames] = useState<Frame[]>([]);
  const [frameIndex, setFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopLoading, setLoopLoading] = useState(false);
  const playTimerRef = useRef<number | null>(null);

  const currentSite = RADAR_SITES.find((s) => s.id === radarSite || s.radarId === radarSite) || RADAR_SITES[0];
  const productInfo = RADAR_PRODUCTS.find((p) => p.key === product);
  const currentFrame = frames[frameIndex] || null;

  // Load LIVE frames
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

  // Playback timer
  useEffect(() => {
    if (playTimerRef.current) {
      window.clearInterval(playTimerRef.current);
      playTimerRef.current = null;
    }
    if (!isPlaying || frames.length < 2) return;

    playTimerRef.current = window.setInterval(() => {
      setFrameIndex((prev) => (prev + 1 >= frames.length ? 0 : prev + 1));
    }, 650);

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

  const handleSpotterSubmit = (report: SpotterReport) => {
    const pin: SpotterPin = {
      id: report.id,
      hazardType: report.hazardType,
      description: report.description,
      hailSize: report.hailSize,
      lat: report.lat,
      lon: report.lon,
      timestamp: report.timestamp,
      callsign: report.callsign,
    };
    setSpotterReports((prev) => [...prev, pin]);
    setSpotterCoords(null);
  };

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#070c14] text-slate-100 select-none">
      {/* 1. FULL SCREEN MAP CANVAS */}
      <div className={`absolute inset-0 ${dualPane ? 'grid grid-cols-2' : ''}`}>
        <div className="relative h-full w-full">
          <RadarMap
            product={product}
            radarSite={radarSite}
            mapType={mapType}
            palette={palette}
            frameUrl={currentFrame?.tileUrl ?? null}
            frameLabel={currentFrame?.label}
            showLightning={showLightning}
            showMetars={showMetars}
            showLSR={showLSR}
            showWatches={showWatches}
            showRadarPills={showRadarPills}
            spotterReports={spotterReports}
            onSelectSite={(siteId) => setRadarSite(siteId)}
            onMapClickCoordinates={(coords) => setSpotterCoords(coords)}
          />
        </div>
        {dualPane && (
          <div className="relative h-full w-full border-l border-white/10">
            <RadarMap
              product={product2}
              radarSite={radarSite}
              mapType={mapType}
              palette={palette}
              showLightning={showLightning}
              showMetars={showMetars}
              showLSR={showLSR}
              showWatches={showWatches}
              showRadarPills={showRadarPills}
              onSelectSite={(siteId) => setRadarSite(siteId)}
            />
          </div>
        )}
      </div>

      {/* 2. TOP FLOATING PILL BAR (WeatherWise Pro Style) */}
      <header className="pointer-events-none absolute left-0 right-0 top-3 z-30 flex justify-center px-4">
        <nav aria-label="Mode switcher" className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/15 bg-slate-950/85 p-1.5 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-2 pl-2 pr-3">
            <Image src="/logo.png" alt="MesoVortex Wx" width={26} height={26} className="rounded-full" priority />
            <span className="hidden text-xs font-black tracking-wider uppercase sm:inline text-white">
              MESO<span className="text-cyan-400">VORTEX</span> <span className="text-[9px] text-amber-400 font-bold ml-0.5">PRO</span>
            </span>
          </div>

          <div className="h-4 w-px bg-white/15" />

          {(['Radar', 'Composite', 'Satellite', 'Models', 'Outlooks'] as ModeTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                activeTab === tab
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </header>

      {/* 3. WEATHERWISE TOP-LEFT RADAR HUD & PRODUCT PILLS */}
      <div className="pointer-events-none absolute left-4 top-16 z-20 flex flex-col gap-2">
        {/* Radar Info Pill */}
        <div className="pointer-events-auto flex items-center gap-2.5 rounded-2xl border border-white/15 bg-slate-950/85 px-3.5 py-2 shadow-2xl backdrop-blur-xl">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wide text-white">{currentSite.id}</span>
              <span className="text-[11px] font-medium text-slate-300">{currentSite.name}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
              <span className="text-cyan-400 font-semibold">{productInfo?.label}</span>
              <span>•</span>
              <span>Tilt 0.5°</span>
              <span>•</span>
              <span className="text-amber-400 font-semibold">VCP 212</span>
            </div>
          </div>
        </div>

        {/* On-Map Radar Product Switcher Pills */}
        <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-white/10 bg-slate-950/80 p-1 shadow-xl backdrop-blur-lg">
          {RADAR_PRODUCTS.map((p) => {
            const active = product === p.key;
            return (
              <button
                key={p.key}
                onClick={() => setProduct(p.key as RadarProduct)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-extrabold transition ${
                  active
                    ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {p.short}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. WEATHERWISE RIGHT-HAND FLOATING ACTION DOCK */}
      <div className="absolute right-4 top-16 z-20 flex flex-col gap-2">
        <button
          onClick={() => setShowLightning((v) => !v)}
          className={`flex h-9 w-9 items-center justify-center rounded-xl border shadow-xl backdrop-blur-xl transition ${
            showLightning
              ? 'border-amber-400/50 bg-amber-500/20 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.35)]'
              : 'border-white/10 bg-slate-950/85 text-slate-400 hover:text-white'
          }`}
          title="Toggle Live Lightning (GOES GLM)"
        >
          ⚡
        </button>
        <button
          onClick={() => setShowLSR((v) => !v)}
          className={`flex h-9 w-9 items-center justify-center rounded-xl border shadow-xl backdrop-blur-xl transition ${
            showLSR
              ? 'border-sky-400/50 bg-sky-500/20 text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.35)]'
              : 'border-white/10 bg-slate-950/85 text-slate-400 hover:text-white'
          }`}
          title="Toggle NWS Storm Reports (LSR)"
        >
          🌪️
        </button>
        <button
          onClick={() => setShowWatches((v) => !v)}
          className={`flex h-9 w-9 items-center justify-center rounded-xl border shadow-xl backdrop-blur-xl transition ${
            showWatches
              ? 'border-rose-400/50 bg-rose-500/20 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.35)]'
              : 'border-white/10 bg-slate-950/85 text-slate-400 hover:text-white'
          }`}
          title="Toggle Watch Boxes"
        >
          🛡️
        </button>
        <button
          onClick={() => setShowMetars((v) => !v)}
          className={`flex h-9 w-9 items-center justify-center rounded-xl border shadow-xl backdrop-blur-xl transition ${
            showMetars
              ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.35)]'
              : 'border-white/10 bg-slate-950/85 text-slate-400 hover:text-white'
          }`}
          title="Toggle Airport METAR Stations"
        >
          🌡️
        </button>
        <button
          onClick={() => setShowRadarPills((v) => !v)}
          className={`flex h-9 w-9 items-center justify-center rounded-xl border shadow-xl backdrop-blur-xl transition ${
            showRadarPills
              ? 'border-cyan-400/50 bg-cyan-500/20 text-cyan-300'
              : 'border-white/10 bg-slate-950/85 text-slate-400 hover:text-white'
          }`}
          title="Toggle On-Map Radar Tower Pills"
        >
          📡
        </button>
        <button
          onClick={() => setShowQuad(true)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-slate-950/85 text-cyan-400 shadow-xl backdrop-blur-xl hover:bg-slate-900"
          title="Quad Synchro View"
        >
          ⊞
        </button>
        <button
          onClick={() => setDualPane((v) => !v)}
          className={`flex h-9 w-9 items-center justify-center rounded-xl border shadow-xl backdrop-blur-xl transition ${
            dualPane ? 'border-cyan-500/50 bg-cyan-600/30 text-cyan-200' : 'border-white/10 bg-slate-950/85 text-slate-400 hover:text-white'
          }`}
          title="Split Dual View"
        >
          ▦
        </button>
        <button
          onClick={() => setSettingsOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-slate-950/85 text-slate-300 shadow-xl backdrop-blur-xl hover:bg-slate-900 hover:text-white"
          title="Color Palettes & Customizations"
        >
          ⚙
        </button>
        <button
          onClick={() => setShowAssistant(true)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-500/40 bg-violet-600/20 text-violet-300 shadow-xl backdrop-blur-xl hover:bg-violet-600/30"
          title="AI Meteorologist Copilot"
        >
          🤖
        </button>
      </div>

      {/* 5. WEATHERWISE PRO BOTTOM FLOATING PLAYER BAR */}
      <footer className="pointer-events-none absolute bottom-9 left-0 right-0 z-20 flex justify-center px-4">
        <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-white/15 bg-slate-950/90 px-4 py-2 shadow-2xl backdrop-blur-2xl">
          {/* Step Back */}
          <button
            onClick={() => stepFrame(-1)}
            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-300 hover:bg-white/10"
            title="Step Back"
          >
            ‹
          </button>

          {/* Play/Pause */}
          <button
            onClick={() => setIsPlaying((p) => !p)}
            disabled={frames.length < 2}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-600 text-white shadow-lg transition hover:bg-cyan-500 disabled:opacity-40"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '❚❚' : '▶'}
          </button>

          {/* Step Forward */}
          <button
            onClick={() => stepFrame(1)}
            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-300 hover:bg-white/10"
            title="Step Forward"
          >
            ›
          </button>

          {/* Timeline Scrubber */}
          <div className="flex items-center gap-2 px-1">
            <input
              type="range"
              min={0}
              max={Math.max(0, frames.length - 1)}
              value={frameIndex}
              onChange={(e) => {
                setIsPlaying(false);
                setFrameIndex(Number(e.target.value));
              }}
              className="w-32 sm:w-48 accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Timestamp Badge */}
          <span className="font-mono text-xs font-bold text-slate-200 min-w-[50px] text-center">
            {loopLoading ? '...' : currentFrame?.label || 'LIVE'}
          </span>

          {/* Jump to LIVE Pill */}
          <button
            onClick={goToLive}
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider transition ${
              currentFrame?.label === 'LIVE'
                ? 'bg-emerald-500 text-slate-950 shadow-[0_0_8px_#10b981]'
                : 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
            }`}
          >
            LIVE
          </button>
        </div>
      </footer>

      {/* 6. STREAMLINED BOTTOM LEGEND SCALE BAR */}
      <aside aria-label="Reflectivity legend" className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 flex h-6 items-center justify-between border-t border-white/10 bg-slate-950/90 px-4 text-[9px] font-mono backdrop-blur-md">
        <span className="font-bold text-slate-400">dBZ:</span>
        <div className="mx-3 flex-1 h-2 rounded-full overflow-hidden flex border border-white/10">
          <div className="flex-1 bg-[#04e9e7]" />
          <div className="flex-1 bg-[#019ff4]" />
          <div className="flex-1 bg-[#0300f4]" />
          <div className="flex-1 bg-[#02fd02]" />
          <div className="flex-1 bg-[#01c501]" />
          <div className="flex-1 bg-[#008e00]" />
          <div className="flex-1 bg-[#fdf802]" />
          <div className="flex-1 bg-[#e5bc00]" />
          <div className="flex-1 bg-[#fd9500]" />
          <div className="flex-1 bg-[#fd0000]" />
          <div className="flex-1 bg-[#d40000]" />
          <div className="flex-1 bg-[#f800fd]" />
          <div className="flex-1 bg-[#9854c6]" />
          <div className="flex-1 bg-[#ffffff]" />
        </div>
        <span className="text-slate-400">5 • 15 • 30 • 45 • 60 • 70+</span>
      </aside>

      {/* 7. SETTINGS & COLOR PALETTES POPUP */}
      {settingsOpen && (
        <div className="absolute right-16 top-16 z-30 w-72 rounded-2xl border border-white/15 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-2xl">
          <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-white">Display &amp; Palettes</span>
            <button onClick={() => setSettingsOpen(false)} className="text-slate-400 hover:text-white">✕</button>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <div className="mb-1.5 font-bold text-cyan-300">Radar Color Palettes</div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { key: 'nws', label: 'NWS Classic' },
                  { key: 'radarscope', label: 'RadarScope' },
                  { key: 'cod', label: 'COD Pastels' },
                  { key: 'smooth', label: 'DG Noah' },
                  { key: 'couplet', label: 'Couplet' },
                ].map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setPalette(p.key as PaletteType)}
                    className={`rounded-lg py-1 px-2 text-left text-[11px] font-bold transition ${
                      palette === p.key ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1 font-bold text-slate-300">Basemap Style</div>
              <div className="grid grid-cols-3 gap-1">
                {(['street', 'satellite', 'terrain'] as MapType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setMapType(t)}
                    className={`rounded py-1 text-[10px] font-bold uppercase ${
                      mapType === t ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center justify-between text-slate-300">
              <span>Show On-Map Radar Pills</span>
              <input
                type="checkbox"
                checked={showRadarPills}
                onChange={(e) => setShowRadarPills(e.target.checked)}
                className="accent-cyan-500"
              />
            </label>
          </div>
        </div>
      )}

      {/* 8. AI ASSISTANT MODAL */}
      {showAssistant && (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/50 p-4 sm:items-center">
          <div className="h-[75vh] w-full max-w-md overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl">
            <WeatherAssistant
              context={{ site: radarSite, product: productInfo?.label, alerts: [] }}
              onClose={() => setShowAssistant(false)}
            />
          </div>
        </div>
      )}

      {/* 9. QUAD SYNCHRO VIEW MODAL */}
      {showQuad && <SynchronizedQuadView radarSite={radarSite} onClose={() => setShowQuad(false)} />}

      {/* 10. SPOTTER REPORT MODAL */}
      {spotterCoords && (
        <SpotterReportModal
          currentCoords={spotterCoords}
          onClose={() => setSpotterCoords(null)}
          onSubmit={handleSpotterSubmit}
        />
      )}

      {/* 11. EMERGENCY SIREN AUDIO ENGINE */}
      <EmergencyAlertTone />
    </div>
  );
}
