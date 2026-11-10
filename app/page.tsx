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
import { LayerManagerPanel } from '../components/workstation/LayerManagerPanel';
import { AlertBanner } from '../components/AlertBanner';
import { Sidebar } from '../components/Sidebar';
import { RADAR_SITES, RADAR_PRODUCTS } from '../lib/radar-config';
import { PLACEFILE_NATION_CATALOG } from '../lib/placefile-catalog';
import { SoundingProfile, generateThermodynamicSounding } from '../lib/skewt-engine';
import { loadWorkspacePrefs, saveWorkspacePrefs } from '../lib/workspace/storage';
import type { WorkspacePrefsV1 } from '../lib/workspace/types';

type RadarProduct = 'ref' | 'maxref' | 'vel' | 'srvel' | 'cc' | 'zdr' | 'kdp' | 'tops' | 'vil' | 'mesh' | 'azshear';

type Frame = { time: string; label: string; tileUrl: string; ageMinutes: number; };

type FrameMeta = {
  source?: string; attribution?: string; fetchedAt?: string; siteName?: string;
  productLabel?: string; sourceKind?: string; substitute?: boolean; loopAvailable?: boolean; notes?: string[];
};

const VCP_TILTS = ['0.5', '0.9', '1.3', '1.8'];

export default function MesoVortexWX() {
  const [product, setProduct] = useState<RadarProduct>('ref');
  const [radarSite, setRadarSite] = useState('KLZK');
  const [activeTab, setActiveTab] = useState<ModeTab>('Radar');
  const [tilt, setTilt] = useState('0.5');
  const [palette, setPalette] = useState<PaletteType>('radarscope');
  const [activeSounding, setActiveSounding] = useState<SoundingProfile | null>(null);
  const [showThreatMatrix, setShowThreatMatrix] = useState(false);
  const [palCurve, setPalCurve] = useState<ParsedPalCurve | null>(null);
  const [showPalModal, setShowPalModal] = useState(false);
  const [showPlacefileModal, setShowPlacefileModal] = useState(false);
  const [placefiles, setPlacefiles] = useState<ActivePlacefile[]>(() =>
    PLACEFILE_NATION_CATALOG.map((item) => ({ id: item.id, name: item.name, url: item.url, enabled: Boolean(item.defaultEnabled) }))
  );
  const [fastScan, setFastScan] = useState(true);
  const [showRadarPills, setShowRadarPills] = useState(true);
  const [showLightning, setShowLightning] = useState(true);
  const [showMetars, setShowMetars] = useState(false);
  const [showLSR, setShowLSR] = useState(true);
  const [showWatches, setShowWatches] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);
  const [showQuad, setShowQuad] = useState(false);
  const [showLayerManager, setShowLayerManager] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [spotterCoords, setSpotterCoords] = useState<[number, number] | null>(null);
  const [spotterReports, setSpotterReports] = useState<SpotterPin[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<Array<{ id?: string; headline: string; severity: string; area: string }>>([]);
  const [dualPane, setDualPane] = useState(false);
  const [product2, setProduct2] = useState<RadarProduct>('vel');
  const [frames, setFrames] = useState<Frame[]>([]);
  const [maxRefWindow, setMaxRefWindow] = useState<5 | 10 | 20 | 30>(10);
  const [frameMeta, setFrameMeta] = useState<FrameMeta | null>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopLoading, setLoopLoading] = useState(false);
  const playTimerRef = useRef<number | null>(null);
  const [workspaceHydrated, setWorkspaceHydrated] = useState(false);

  useEffect(() => {
    const prefs = loadWorkspacePrefs();
    if (prefs.radarSite) setRadarSite(prefs.radarSite);
    if (prefs.product) setProduct(prefs.product as RadarProduct);
    if (prefs.tilt) setTilt(prefs.tilt);
    if (prefs.palette) setPalette(prefs.palette as PaletteType);
    if (prefs.activeTab) setActiveTab(prefs.activeTab as ModeTab);
    setFastScan(!!prefs.fastScan);
    setDualPane(!!prefs.dualPane);
    if (prefs.layers) {
      setShowRadarPills(!!prefs.layers.showRadarPills);
      setShowLightning(!!prefs.layers.showLightning);
      setShowMetars(!!prefs.layers.showMetars);
      setShowLSR(!!prefs.layers.showLSR);
      setShowWatches(!!prefs.layers.showWatches);
    }
    setWorkspaceHydrated(true);
  }, []);

  useEffect(() => {
    if (!workspaceHydrated) return;
    const prefs: WorkspacePrefsV1 = {
      schemaVersion: 1, radarSite, product, tilt, palette, activeTab, fastScan, dualPane,
      layers: { showRadarPills, showLightning, showMetars, showLSR, showWatches, showWarnings: true, showSatellite: false, showMping: false, showSpotterReports: false },
    };
    saveWorkspacePrefs(prefs);
  }, [workspaceHydrated, radarSite, product, tilt, palette, activeTab, fastScan, dualPane, showRadarPills, showLightning, showMetars, showLSR, showWatches]);

  const currentSite = RADAR_SITES.find((s) => s.id === radarSite || s.radarId === radarSite) || RADAR_SITES[0];
  const productInfo = RADAR_PRODUCTS.find((p) => p.key === product);
  const currentFrame = frames[frameIndex] || null;

  const loadFrames = useCallback(async () => {
    setLoopLoading(true);
    try {
      const cacheBuster = `&_t=${Date.now()}`;
      const res = await fetch(`/api/nexrad/frames?site=${encodeURIComponent(currentSite.radarId)}&product=${encodeURIComponent(product)}&tilt=${encodeURIComponent(tilt)}&hours=1.5${cacheBuster}`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && Array.isArray(data.frames) && data.frames.length > 0) {
        setFrames(data.frames);
        setFrameIndex(data.frames.length - 1);
        setFrameMeta({ source: data.source, attribution: data.attribution, fetchedAt: data.fetchedAt, siteName: data.siteName, productLabel: data.productLabel, sourceKind: data.sourceKind, substitute: data.substitute, loopAvailable: data.loopAvailable, notes: data.notes });
      } else { setFrames([]); setFrameIndex(0); setFrameMeta(null); }
    } catch { setFrames([]); setFrameMeta(null); } finally { setLoopLoading(false); }
  }, [currentSite.radarId, product, tilt]);

  useEffect(() => { void loadFrames(); }, [loadFrames]);

  useEffect(() => {
    if (!fastScan && product !== 'maxref') return;
    const ms = fastScan ? 60000 : 120000;
    const t = window.setInterval(() => { void loadFrames(); }, ms);
    return () => window.clearInterval(t);
  }, [fastScan, product, loadFrames]);

  useEffect(() => {
    let cancelled = false;
    const loadAlerts = async () => {
      try {
        const res = await fetch('/api/alerts', { cache: 'no-store' });
        const data = await res.json();
        if (!cancelled && Array.isArray(data?.alerts)) setActiveAlerts(data.alerts);
      } catch { if (!cancelled) setActiveAlerts([]); }
    };
    void loadAlerts();
    const t = window.setInterval(loadAlerts, 120000);
    return () => { cancelled = true; window.clearInterval(t); };
  }, []);

  const goToLive = useCallback(() => { if (frames.length > 0) { setFrameIndex(frames.length - 1); setIsPlaying(false); } }, [frames.length]);
  const stepFrame = useCallback((dir: -1 | 1) => {
    setIsPlaying(false);
    setFrameIndex((prev) => { const next = prev + dir; if (next < 0) return frames.length - 1; if (next >= frames.length) return 0; return next; });
  }, [frames.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || (e.target as HTMLElement | null)?.isContentEditable) return;
      if (e.code === 'Space') { e.preventDefault(); setIsPlaying((p) => !p); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); stepFrame(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); stepFrame(1); }
      else if (e.key.toLowerCase() === 'l') { e.preventDefault(); goToLive(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stepFrame, goToLive]);

  useEffect(() => {
    if (playTimerRef.current) { window.clearInterval(playTimerRef.current); playTimerRef.current = null; }
    if (!isPlaying || frames.length < 2) return;
    playTimerRef.current = window.setInterval(() => { setFrameIndex((prev) => (prev + 1 >= frames.length ? 0 : prev + 1)); }, 650);
    return () => { if (playTimerRef.current) window.clearInterval(playTimerRef.current); };
  }, [isPlaying, frames.length]);

  const handleSpotterSubmit = (report: SpotterReport) => {
    setSpotterReports((prev) => [...prev, { id: report.id, hazardType: report.hazardType, description: report.description, hailSize: report.hailSize, lat: report.lat, lon: report.lon, timestamp: report.timestamp, callsign: report.callsign }]);
    setSpotterCoords(null);
  };

  const handleTogglePlacefile = (id: string) => setPlacefiles((prev) => prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)));
  const handleAddPlacefile = (name: string, url: string) => setPlacefiles((prev) => [...prev, { id: `pf-${Date.now()}`, name, url, enabled: true }]);
  const handleDeletePlacefile = (id: string) => setPlacefiles((prev) => prev.filter((p) => p.id !== id));

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#070c14] text-slate-100 select-none">
      <div className={`absolute inset-0 ${dualPane ? 'grid grid-cols-2' : ''}`}>
        <div className="relative h-full w-full">
          <RadarMap product={product} radarSite={radarSite} mode={activeTab} tilt={tilt} mapType="satellite" palette={palette} palCurve={palCurve} activePlacefiles={placefiles} frameUrl={currentFrame?.tileUrl ?? null} frameLabel={currentFrame?.label} frames={frames} maxRefWindow={maxRefWindow} fastScan={fastScan} showLightning={showLightning} showMetars={showMetars} showLSR={showLSR} showWatches={showWatches} showRadarPills={showRadarPills} spotterReports={spotterReports} onSelectSite={(siteId) => setRadarSite(siteId)} onOpenSounding={(profile) => setActiveSounding(profile)} onMapClickCoordinates={(coords) => setSpotterCoords(coords)} />
        </div>
        {dualPane && (
          <div className="relative h-full w-full border-l border-white/10">
            <RadarMap product={product2} radarSite={radarSite} mode={activeTab} tilt={tilt} mapType="satellite" palette={palette} palCurve={palCurve} activePlacefiles={placefiles} frames={frames} maxRefWindow={maxRefWindow} fastScan={fastScan} showLightning={showLightning} showMetars={showMetars} showLSR={showLSR} showWatches={showWatches} showRadarPills={showRadarPills} onSelectSite={(siteId) => setRadarSite(siteId)} onOpenSounding={(profile) => setActiveSounding(profile)} />
          </div>
        )}
      </div>

      <header className="pointer-events-none absolute left-0 right-0 top-3 z-30 flex justify-center px-4">
        <nav aria-label="Mode switcher" className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-white/15 bg-slate-950/90 p-1.5 shadow-2xl backdrop-blur-xl">
          <button onClick={() => setShowSidebar((v) => !v)} className={`flex h-8 w-8 items-center justify-center rounded-full text-sm transition ${showSidebar ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`} title={showSidebar ? 'Hide sidebar' : 'Show sidebar'}>☰</button>
          <div className="flex items-center gap-2 pl-1 pr-3">
            <Image src="/logo.png" alt="MesoVortex Wx" width={26} height={26} className="rounded-full" priority />
            <span className="hidden text-xs font-black tracking-wider uppercase sm:inline text-white">MESO<span className="text-cyan-400">VORTEX</span> <span className="text-[9px] text-amber-400 font-bold ml-0.5">PRO</span></span>
          </div>
          <div className="h-4 w-px bg-white/15" />
          {(['Radar', 'Composite', 'Satellite', 'Models', 'Outlooks'] as ModeTab[]).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-full px-3 py-1 text-xs font-bold transition ${activeTab === tab ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>{tab}</button>
          ))}
          <button onClick={() => setFastScan((f) => !f)} className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider transition ${fastScan ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.5)]' : 'border border-white/20 bg-slate-900 text-slate-400 hover:text-white'}`} title="FastScan Technology: Sub-minute scan updates">
            <span className={`h-2 w-2 rounded-full ${fastScan ? 'bg-slate-950 animate-ping' : 'bg-slate-500'}`} /><span>FastScan</span>
          </button>
        </nav>
      </header>

      {activeAlerts.length > 0 && (
        <div className="pointer-events-auto absolute left-1/2 top-[4.5rem] z-30 w-[min(92vw,720px)] -translate-x-1/2 overflow-hidden rounded-xl border border-white/10 shadow-2xl">
          <AlertBanner alerts={activeAlerts} />
        </div>
      )}
      {showSidebar && (
        <div className="pointer-events-auto absolute bottom-0 left-0 top-0 z-[25] shadow-2xl">
          <Sidebar product={product} setProduct={setProduct as any} radarSite={radarSite} setRadarSite={setRadarSite} />
        </div>
      )}

      <div className="pointer-events-none absolute left-4 top-16 z-20 flex flex-col gap-2">
        <div className="pointer-events-auto flex items-center gap-2.5 rounded-2xl border border-white/15 bg-slate-950/90 px-3.5 py-2 shadow-2xl backdrop-blur-xl">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wide text-white">{activeTab === 'Radar' ? currentSite.id : activeTab.toUpperCase()}</span>
              <span className="text-[11px] font-medium text-slate-300">{activeTab === 'Radar' ? currentSite.name : `CONUS ${activeTab} View`}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
              <span className="text-cyan-400 font-semibold">{frameMeta?.productLabel || productInfo?.label || product.toUpperCase()}</span>
              <span>•</span>
              <div className="flex items-center gap-1 bg-slate-900 rounded px-1.5 py-0.5 border border-white/10">
                <span className="text-slate-500">Tilt:</span>
                {VCP_TILTS.map((t) => (<button key={t} onClick={() => setTilt(t)} className={`px-1 rounded text-[10px] font-bold ${tilt === t ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}>{t}°</button>))}
              </div>
              <span>•</span>
              <span className="text-amber-400 font-semibold">{fastScan ? '⚡ FastScan' : 'VCP 212'}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-400">
              <span className="text-slate-300">Src: {frameMeta?.source || '—'}</span>
              {frameMeta?.fetchedAt && <span>Fetched {new Date(frameMeta.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>}
              {currentFrame?.time && <span>Frame {new Date(currentFrame.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({currentFrame.label})</span>}
              {frameMeta?.substitute && <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-semibold text-amber-300">SUBSTITUTE SOURCE</span>}
              {frameMeta && frameMeta.loopAvailable === false && <span className="rounded bg-slate-700/70 px-1.5 py-0.5 text-slate-300">Loop limited</span>}
            </div>
            {frameMeta?.notes?.[0] && <div className="mt-1 max-w-[520px] text-[10px] leading-snug text-amber-200/90" title={frameMeta.notes.join(' ')}>{frameMeta.notes[0]}</div>}
          </div>
        </div>

        <div className="pointer-events-auto flex flex-wrap items-center gap-1 rounded-xl border border-white/10 bg-slate-950/85 p-1 shadow-xl backdrop-blur-lg max-w-[380px]">
          {RADAR_PRODUCTS.map((p) => {
            const active = product === p.key;
            const accent = p.key === 'mesh' ? { on: 'bg-pink-500 text-slate-950 shadow-[0_0_10px_rgba(236,72,153,0.6)]', off: 'text-pink-300 hover:bg-white/10 hover:text-white' }
              : p.key === 'azshear' ? { on: 'bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.6)]', off: 'text-red-300 hover:bg-white/10 hover:text-white' }
              : p.key === 'tops' ? { on: 'bg-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)]', off: 'text-purple-300 hover:bg-white/10 hover:text-white' }
              : p.key === 'vil' ? { on: 'bg-amber-500 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.5)]', off: 'text-amber-300 hover:bg-white/10 hover:text-white' }
              : { on: 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.5)]', off: 'text-slate-300 hover:bg-white/10 hover:text-white' };
            return (<button key={p.key} onClick={() => setProduct(p.key as RadarProduct)} title={p.sourceNote ? `${p.description} — ${p.sourceNote}` : p.description} className={`rounded-lg px-2.5 py-1 text-[11px] font-extrabold transition ${active ? accent.on : accent.off}`}>{p.short}</button>);
          })}
        </div>

        {product === 'maxref' && (
          <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-slate-950/90 px-3 py-1.5 shadow-xl backdrop-blur-lg text-[11px]">
            <span className="font-black text-cyan-300 tracking-wider">MAX REF</span>
            <span className="text-slate-400">Window:</span>
            {[5,10,20,30].map((w) => (
              <button key={w} onClick={() => setMaxRefWindow(w as 5|10|20|30)} className={`rounded px-2 py-0.5 font-bold ${maxRefWindow===w ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:text-white'}`} title={`Last ${w} scans (~${w*5} min)`}>{w}</button>
            ))}
            <span className="text-slate-400">scans</span>
          </div>
        )}
      </div>

      <div className="absolute right-4 top-16 z-20 flex flex-col gap-2">
        <button onClick={() => setShowThreatMatrix(true)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/50 bg-red-600/30 text-red-200 shadow-xl backdrop-blur-xl hover:bg-red-600/50 transition" title="Severe Threat Matrix & Risk Score (0-100)">📊</button>
        <button onClick={() => { const profile = generateThermodynamicSounding(currentSite.lat, currentSite.lon); setActiveSounding(profile); }} className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/50 bg-cyan-600/30 text-cyan-200 shadow-xl backdrop-blur-xl hover:bg-cyan-600/50 transition" title="Skew-T Sounding & Hodograph at Radar Site">📈</button>
        <button onClick={() => setShowPlacefileModal(true)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/50 bg-cyan-600/30 text-cyan-200 shadow-xl backdrop-blur-xl hover:bg-cyan-600/50 transition" title="PlacefileNation Suite (54 Feeds)">📡</button>
       
