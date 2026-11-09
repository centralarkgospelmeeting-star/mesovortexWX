'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { RadarMap, SpotterPin, PaletteType, ModeTab } from '../components/RadarMap';
import { WeatherAssistant } from '../components/WeatherAssistant';
import { EmergencyAlertTone } from '../components/EmergencyAlertTone';
import { SynchronizedQuadView } from '../components/SynchronizedQuadView';
import { SpotterReportModal, SpotterReport } from '../components/SpotterReportModal';
import { PalColorTableModal, ParsedPalCurve } from '../components/PalColorTableModal';
import { PlacefileManagerModal, ActivePlacefile } from '../components/PlacefileManagerModal';
import { SkewTSoundingModal } from '../components/SkewTSoundingModal';
import { ThreatMatrixPanel } from '../components/ThreatMatrixPanel';
import { CrossSectionModal } from '../components/CrossSectionModal';
import { MCDModal } from '../components/MCDModal';
import { HyperlocalDashboardModal } from '../components/HyperlocalDashboardModal';
import { RADAR_SITES, RADAR_PRODUCTS } from '../lib/radar-config';
import { PLACEFILE_NATION_CATALOG } from '../lib/placefile-catalog';
import { SoundingProfile, generateThermodynamicSounding } from '../lib/skewt-engine';
import { computeVerticalCrossSection, CrossSectionResult } from '../lib/cross-section';

type RadarProduct = 'ref' | 'vel' | 'srvel' | 'cc' | 'zdr' | 'kdp' | 'tops' | 'vil' | 'mesh' | 'azshear';
type DashboardPreset = 'Default' | 'Storm Chaser' | 'Emergency Manager' | 'Aviation' | 'Marine';

type Frame = {
  time: string;
  label: string;
  tileUrl: string;
  ageMinutes: number;
};

const VCP_TILTS = ['0.5', '0.9', '1.3', '1.8'];

export default function MesoVortexWX() {
  // Core state
  const [product, setProduct] = useState<RadarProduct>('ref');
  const [radarSite, setRadarSite] = useState('KLZK');
  const [activeTab, setActiveTab] = useState<ModeTab>('Radar');
  const [dashboardPreset, setDashboardPreset] = useState<DashboardPreset>('Default');
  const [tilt, setTilt] = useState('0.5');
  const [palette, setPalette] = useState<PaletteType>('radarscope');
  const [radarOpacity, setRadarOpacity] = useState(0.88);

  // WeatherWise Pro Dedicated Dock State
  const [leftDockOpen, setLeftDockOpen] = useState(true);
  const [rightDockOpen, setRightDockOpen] = useState(true);

  // Layer Toggles
  const [showStormTracks, setShowStormTracks] = useState(true);
  const [showRadarPills, setShowRadarPills] = useState(true);
  const [showLightning, setShowLightning] = useState(true);
  const [showMetars, setShowMetars] = useState(false);
  const [showLSR, setShowLSR] = useState(true);
  const [showWatches, setShowWatches] = useState(true);

  // Cross-Section & Measurement Tools
  const [crossSectionMode, setCrossSectionMode] = useState(false);
  const [crossSectionData, setCrossSectionData] = useState<CrossSectionResult | null>(null);
  const [measureMode, setMeasureMode] = useState(false);
  const [measuredDistance, setMeasuredDistance] = useState<{ nm: number; mi: number } | null>(null);

  // Modals
  const [activeSounding, setActiveSounding] = useState<SoundingProfile | null>(null);
  const [showThreatMatrix, setShowThreatMatrix] = useState(false);
  const [showHyperlocal, setShowHyperlocal] = useState(false);
  const [showMCDModal, setShowMCDModal] = useState(false);
  const [mcdText, setMcdText] = useState('');
  const [mcdLoading, setMcdLoading] = useState(false);
  const [palCurve, setPalCurve] = useState<ParsedPalCurve | null>(null);
  const [showPalModal, setShowPalModal] = useState(false);
  const [showPlacefileModal, setShowPlacefileModal] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);
  const [showQuad, setShowQuad] = useState(false);

  // Placefiles
  const [placefiles, setPlacefiles] = useState<ActivePlacefile[]>(() =>
    PLACEFILE_NATION_CATALOG.map((item) => ({
      id: item.id,
      name: item.name,
      url: item.url,
      enabled: Boolean(item.defaultEnabled),
    }))
  );

  // FastScan Engine
  const [fastScan, setFastScan] = useState(true);

  // Spotter network
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

  // Handle Preset Switching
  const handleSelectPreset = (preset: DashboardPreset) => {
    setDashboardPreset(preset);
    if (preset === 'Storm Chaser') {
      setProduct('vel');
      setShowStormTracks(true);
      setShowLSR(true);
      setShowLightning(true);
    } else if (preset === 'Emergency Manager') {
      setShowWatches(true);
      setShowLSR(true);
      setShowThreatMatrix(true);
    } else if (preset === 'Aviation') {
      setShowMetars(true);
      setProduct('tops');
    } else if (preset === 'Marine') {
      setActiveTab('Composite');
    } else {
      setProduct('ref');
      setTilt('0.5');
    }
  };

  // Load LIVE frames
  const loadFrames = useCallback(async () => {
    setLoopLoading(true);
    try {
      const cacheBuster = `&_t=${Date.now()}`;
      const res = await fetch(
        `/api/nexrad/frames?site=${encodeURIComponent(currentSite.radarId)}&product=${encodeURIComponent(product)}&tilt=${encodeURIComponent(tilt)}&hours=1.5${cacheBuster}`,
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
  }, [currentSite.radarId, product, tilt]);

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

  const handleGenerateMCD = async () => {
    setShowMCDModal(true);
    setMcdLoading(true);
    try {
      const sounding = generateThermodynamicSounding(currentSite.lat, currentSite.lon);
      const res = await fetch('/api/copilot/mcd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site: currentSite,
          product,
          tilt,
          sounding,
        }),
      });
      const data = await res.json();
      if (data.mcd) setMcdText(data.mcd);
      else setMcdText('Could not generate discussion. Check GEMINI_API_KEY.');
    } catch {
      setMcdText('Network error reaching AI Copilot.');
    } finally {
      setMcdLoading(false);
    }
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#050811] text-slate-100 select-none font-sans">
      
      {/* 1. TOP WEATHERWISE PRO WORKSTATION HEADER */}
      <header className="absolute top-0 left-0 right-0 z-30 h-14 border-b border-white/10 bg-slate-950/90 px-4 flex items-center justify-between shadow-2xl backdrop-blur-2xl">
        {/* Brand & Left Dock Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLeftDockOpen((v) => !v)}
            className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${
              leftDockOpen ? 'border-cyan-500/50 bg-cyan-950/50 text-cyan-400' : 'border-white/10 bg-slate-900 text-slate-400 hover:text-white'
            }`}
            title="Toggle Weather Layers & Map Controls Sidebar"
          >
            ☰
          </button>

          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-cyan-600 text-white font-black text-xs shadow-md">
              ⚡
            </span>
            <span className="text-sm font-black tracking-wider uppercase text-white hidden sm:inline">
              MESO<span className="text-cyan-400">VORTEX</span> <span className="text-amber-400 text-[10px] font-bold">PRO</span>
            </span>
          </div>

          {/* Station Selector Badge */}
          <select
            value={radarSite}
            onChange={(e) => setRadarSite(e.target.value)}
            className="rounded-xl border border-white/15 bg-slate-900 px-3 py-1.5 text-xs font-bold text-white focus:border-cyan-400 focus:outline-none cursor-pointer"
          >
            {RADAR_SITES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} · {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Center: Workstation Mode & Dashboard Switcher */}
        <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-white/15 bg-slate-900/80 p-1">
          {(['Default', 'Storm Chaser', 'Emergency Manager', 'Aviation', 'Marine'] as DashboardPreset[]).map((p) => (
            <button
              key={p}
              onClick={() => handleSelectPreset(p)}
              className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                dashboardPreset === p ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-2">
          {/* FastScan Engine Indicator */}
          <button
            onClick={() => setFastScan((f) => !f)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider transition ${
              fastScan
                ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                : 'border border-white/20 bg-slate-900 text-slate-400 hover:text-white'
            }`}
            title="FastScan: Ultra-low-latency real-time updates"
          >
            <span className={`h-2 w-2 rounded-full ${fastScan ? 'bg-slate-950 animate-ping' : 'bg-slate-500'}`} />
            <span>FastScan</span>
          </button>

          <button
            onClick={() => setRightDockOpen((v) => !v)}
            className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${
              rightDockOpen ? 'border-cyan-500/50 bg-cyan-950/50 text-cyan-400' : 'border-white/10 bg-slate-900 text-slate-400 hover:text-white'
            }`}
            title="Toggle Weather Intelligence Sidebar"
          >
            📊
          </button>
        </div>
      </header>

      {/* 2. MAIN MAP CANVAS */}
      <div className="absolute inset-0 pt-14 pb-16">
        <RadarMap
          product={product}
          radarSite={radarSite}
          mode={activeTab}
          tilt={tilt}
          mapType="satellite"
          palette={palette}
          radarOpacity={radarOpacity}
          palCurve={palCurve}
          activePlacefiles={placefiles}
          frameUrl={currentFrame?.tileUrl ?? null}
          frameLabel={currentFrame?.label}
          fastScan={fastScan}
          measureMode={measureMode}
          crossSectionMode={crossSectionMode}
          showStormTracks={showStormTracks}
          showLightning={showLightning}
          showMetars={showMetars}
          showLSR={showLSR}
          showWatches={showWatches}
          showRadarPills={showRadarPills}
          spotterReports={spotterReports}
          onSelectSite={(siteId) => setRadarSite(siteId)}
          onOpenSounding={(profile) => setActiveSounding(profile)}
          onMeasureComplete={(nm, mi) => setMeasuredDistance({ nm, mi })}
          onCrossSectionCut={(pA, pB) => {
            const res = computeVerticalCrossSection(pA, pB, currentSite.lat, currentSite.lon);
            setCrossSectionData(res);
            setCrossSectionMode(false);
          }}
          onMapClickCoordinates={(coords) => setSpotterCoords(coords)}
        />
      </div>

      {/* 3. DEDICATED LEFT SIDEBAR (Weather Layers & Map Controls) */}
      <aside
        className={`absolute left-0 top-14 bottom-16 z-20 w-80 border-r border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur-2xl transition-transform duration-300 flex flex-col ${
          leftDockOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-3.5 bg-slate-900/60">
          <span className="text-xs font-black uppercase tracking-wider text-cyan-300">Weather Layers &amp; Controls</span>
          <span className="text-[10px] text-slate-400 font-mono">VCP 212</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Radar Opacity Slider */}
          <div>
            <div className="flex justify-between text-slate-300 mb-1.5 font-bold">
              <span>Radar Layer Opacity</span>
              <span className="text-cyan-400 font-mono">{Math.round(radarOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.2}
              max={1.0}
              step={0.05}
              value={radarOpacity}
              onChange={(e) => setRadarOpacity(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* NEXRAD Products */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">
              Radar Products (Level III &amp; MRMS)
            </span>
            <div className="grid grid-cols-3 gap-1.5 font-bold text-[11px]">
              {(['ref', 'vel', 'srvel', 'cc', 'zdr', 'kdp', 'mesh', 'azshear', 'tops', 'vil'] as RadarProduct[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setProduct(p)}
                  className={`rounded-lg py-1.5 uppercase transition ${
                    product === p
                      ? 'bg-cyan-500 text-slate-950 font-black shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* VCP Elevation Tilt Slices */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">
              Elevation Beam Tilts (VCP Slices)
            </span>
            <div className="grid grid-cols-4 gap-1.5 font-mono text-xs">
              {VCP_TILTS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTilt(t)}
                  className={`rounded-lg py-1 transition font-bold ${
                    tilt === t ? 'bg-cyan-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {t}°
                </button>
              ))}
            </div>
          </div>

          {/* Overlays Checklist */}
          <div className="space-y-2 border-t border-white/10 pt-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Workstation Overlays
            </span>
            {[
              { label: '⚡ Live Lightning (GOES GLM)', checked: showLightning, toggle: () => setShowLightning((v) => !v) },
              { label: '🌪️ NWS Storm Damage (LSR)', checked: showLSR, toggle: () => setShowLSR((v) => !v) },
              { label: '🛡️ Active Watch Boxes', checked: showWatches, toggle: () => setShowWatches((v) => !v) },
              { label: '↗️ SCIT Storm Motion Vectors', checked: showStormTracks, toggle: () => setShowStormTracks((v) => !v) },
              { label: '🌡️ Airport METAR Stations', checked: showMetars, toggle: () => setShowMetars((v) => !v) },
              { label: '📡 On-Map Radar Tower Pills', checked: showRadarPills, toggle: () => setShowRadarPills((v) => !v) },
            ].map((item) => (
              <label key={item.label} className="flex items-center justify-between text-slate-300 cursor-pointer">
                <span>{item.label}</span>
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={item.toggle}
                  className="accent-cyan-400 h-4 w-4 rounded"
                />
              </label>
            ))}
          </div>

          {/* Placefiles & Palettes Access */}
          <div className="border-t border-white/10 pt-3 flex gap-2">
            <button
              onClick={() => setShowPlacefileModal(true)}
              className="flex-1 rounded-xl border border-cyan-500/30 bg-cyan-950/40 py-2 text-center text-xs font-bold text-cyan-300 hover:bg-cyan-950/60"
            >
              Placefile Suite
            </button>
            <button
              onClick={() => setShowPalModal(true)}
              className="flex-1 rounded-xl border border-amber-500/30 bg-amber-950/40 py-2 text-center text-xs font-bold text-amber-300 hover:bg-amber-950/60"
            >
              Load .pal
            </button>
          </div>
        </div>
      </aside>

      {/* 4. DEDICATED RIGHT SIDEBAR (Weather Intelligence & Analysis) */}
      <aside
        className={`absolute right-0 top-14 bottom-16 z-20 w-84 border-l border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur-2xl transition-transform duration-300 flex flex-col ${
          rightDockOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-3.5 bg-slate-900/60">
          <span className="text-xs font-black uppercase tracking-wider text-cyan-300">Weather Intelligence</span>
          <span className="text-[10px] text-emerald-400 font-mono">● Active</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-mono">
          {/* Severe Threat Risk Score Gauge */}
          <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-3.5 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase text-red-400">Total Severe Risk Score</span>
              <span className="text-2xl font-black text-white">84<span className="text-xs text-red-400">/100</span></span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden border border-white/5">
              <div className="h-full bg-red-500 rounded-full" style={{ width: '84%' }} />
            </div>
            <p className="text-[10px] text-slate-300 font-sans leading-tight">
              Elevated supercell composite with favorable low-level helicity supporting mesocyclone rotation.
            </p>
          </div>

          {/* Hyperlocal Neighborhood Readout */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-3.5 space-y-2 font-sans">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Neighborhood Conditions</span>
              <button onClick={() => setShowHyperlocal(true)} className="text-[10px] text-cyan-400 underline">Details</button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div>Temp: <b className="text-white">78°F</b></div>
              <div>Feels-Like: <b className="text-cyan-400">82°F</b></div>
              <div>Dewpoint: <b className="text-emerald-400">68°F</b></div>
              <div>Wet-Bulb: <b className="text-cyan-300">71°F</b></div>
              <div>Pressure: <b className="text-slate-300">29.92 inHg</b></div>
              <div>Humidity: <b className="text-slate-300">72%</b></div>
            </div>
          </div>

          {/* Dedicated Analysis Tools Launcher */}
          <div className="space-y-1.5 font-sans">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Interactive Analysis Tools
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setCrossSectionMode((v) => !v);
                  setMeasureMode(false);
                }}
                className={`rounded-xl border p-2 text-left font-bold transition ${
                  crossSectionMode ? 'border-purple-400 bg-purple-950/50 text-purple-300' : 'border-white/10 bg-slate-900 text-slate-300'
                }`}
              >
                ✂️ RHI Cut
              </button>
              <button
                onClick={() => {
                  const profile = generateThermodynamicSounding(currentSite.lat, currentSite.lon);
                  setActiveSounding(profile);
                }}
                className="rounded-xl border border-white/10 bg-slate-900 p-2 text-left font-bold text-slate-300 hover:text-white"
              >
                📈 Skew-T
              </button>
              <button
                onClick={() => {
                  setMeasureMode((m) => !m);
                  setCrossSectionMode(false);
                }}
                className={`rounded-xl border p-2 text-left font-bold transition ${
                  measureMode ? 'border-cyan-400 bg-cyan-950/50 text-cyan-300' : 'border-white/10 bg-slate-900 text-slate-300'
                }`}
              >
                📏 Measure
              </button>
              <button
                onClick={handleGenerateMCD}
                className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-2 text-left font-bold text-amber-300 hover:bg-amber-950/50"
              >
                📝 AI MCD
              </button>
            </div>
          </div>

          {/* Embedded AI Copilot Panel */}
          <div className="rounded-2xl border border-violet-500/30 bg-violet-950/20 p-3.5 space-y-2 font-sans">
            <div className="flex items-center gap-2">
              <span>🤖</span>
              <span className="text-xs font-bold text-violet-300">AI Meteorologist Copilot</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Monitoring Doppler couplets, dual-pol debris drops, and thermodynamic soundings in real time.
            </p>
            <button
              onClick={() => setShowAssistant(true)}
              className="w-full rounded-xl bg-violet-600 py-1.5 text-xs font-bold text-white shadow-md hover:bg-violet-500"
            >
              Open Copilot Consultation
            </button>
          </div>
        </div>
      </aside>

      {/* 5. FULL METEOROLOGICAL BOTTOM TIMELINE BAR */}
      <footer className="absolute bottom-0 left-0 right-0 z-30 h-16 border-t border-white/10 bg-slate-950/95 px-6 flex items-center justify-between shadow-2xl backdrop-blur-2xl">
        {/* Playback Steppers */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => stepFrame(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-slate-900 text-slate-300 hover:text-white"
          >
            ‹
          </button>
          <button
            onClick={() => setIsPlaying((p) => !p)}
            disabled={frames.length < 2}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-600 text-white font-bold shadow-lg hover:bg-cyan-500"
          >
            {isPlaying ? '❚❚' : '▶'}
          </button>
          <button
            onClick={() => stepFrame(1)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-slate-900 text-slate-300 hover:text-white"
          >
            ›
          </button>
        </div>

        {/* Timeline Scrubber */}
        <div className="flex-1 mx-6 flex items-center gap-4">
          <input
            type="range"
            min={0}
            max={Math.max(0, frames.length - 1)}
            value={frameIndex}
            onChange={(e) => {
              setIsPlaying(false);
              setFrameIndex(Number(e.target.value));
            }}
            className="flex-1 accent-cyan-400 cursor-pointer"
          />
          <span className="font-mono text-xs font-bold text-slate-300 min-w-[70px]">
            {loopLoading ? 'Syncing…' : currentFrame?.label || 'LIVE'}
          </span>
        </div>

        {/* LIVE Jump Button */}
        <button
          onClick={goToLive}
          className={`rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-wider transition ${
            currentFrame?.label === 'LIVE'
              ? 'bg-emerald-500 text-slate-950 shadow-[0_0_10px_#10b981]'
              : 'border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20'
          }`}
        >
          LIVE
        </button>
      </footer>

      {/* MODALS */}
      {crossSectionData && (
        <CrossSectionModal data={crossSectionData} onClose={() => setCrossSectionData(null)} />
      )}
      {activeSounding && (
        <SkewTSoundingModal sounding={activeSounding} onClose={() => setActiveSounding(null)} />
      )}
      {showThreatMatrix && (
        <ThreatMatrixPanel onClose={() => setShowThreatMatrix(false)} />
      )}
      {showHyperlocal && (
        <HyperlocalDashboardModal
          lat={currentSite.lat}
          lon={currentSite.lon}
          siteName={currentSite.name}
          onClose={() => setShowHyperlocal(false)}
        />
      )}
      {showMCDModal && (
        <MCDModal
          mcdText={mcdText}
          loading={mcdLoading}
          onClose={() => setShowMCDModal(false)}
          onRegenerate={handleGenerateMCD}
        />
      )}
      {showPalModal && (
        <PalColorTableModal
          onClose={() => setShowPalModal(false)}
          onApplyPal={(parsed) => {
            setPalCurve(parsed);
            setPalette('palFile');
          }}
        />
      )}
      {showPlacefileModal && (
        <PlacefileManagerModal
          placefiles={placefiles}
          onClose={() => setShowPlacefileModal(false)}
          onToggle={(id) => setPlacefiles((prev) => prev.map((p) => p.id === id ? { ...p, enabled: !p.enabled } : p))}
          onAdd={(name, url) => setPlacefiles((prev) => [...prev, { id: `pf-${Date.now()}`, name, url, enabled: true }])}
          onDelete={(id) => setPlacefiles((prev) => prev.filter((p) => p.id !== id))}
        />
      )}
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
      {showQuad && <SynchronizedQuadView radarSite={radarSite} onClose={() => setShowQuad(false)} />}
      {spotterCoords && (
        <SpotterReportModal
          currentCoords={spotterCoords}
          onClose={() => setSpotterCoords(null)}
          onSubmit={handleSpotterSubmit}
        />
      )}
      <EmergencyAlertTone />
    </div>
  );
}
