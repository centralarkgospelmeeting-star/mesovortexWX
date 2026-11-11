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
import { RightDock } from '../components/workstation/RightDock';
import { Sidebar } from '../components/Sidebar';
import { RADAR_SITES, RADAR_PRODUCTS, type RadarNetwork } from '../lib/radar-config';
import { nearestRadarSite } from '../lib/radar-utils';
import { PLACEFILE_NATION_CATALOG } from '../lib/placefile-catalog';
import { SoundingProfile, generateThermodynamicSounding } from '../lib/skewt-engine';
import { loadWorkspacePrefs, saveWorkspacePrefs } from '../lib/workspace/storage';
import type { WorkspacePrefsV1 } from '../lib/workspace/types';

type RadarProduct = 'ref' | 'maxref' | 'vel' | 'srvel' | 'cc' | 'zdr' | 'kdp' | 'tops' | 'vil' | 'mesh' | 'azshear';

type Frame = {
  time: string;
  label: string;
  tileUrl: string;
  ageMinutes: number;
};

type FrameMeta = {
  source?: string;
  attribution?: string;
  fetchedAt?: string;
  siteName?: string;
  productLabel?: string;
  sourceKind?: string;
  substitute?: boolean;
  loopAvailable?: boolean;
  notes?: string[];
};

const VCP_TILTS = ['0.5', '0.9', '1.3', '1.8'];

export default function MesoVortexWX() {
  // Core state
  const [product, setProduct] = useState<RadarProduct>('ref');
  const [radarSite, setRadarSite] = useState('KLZK');
  const [activeTab, setActiveTab] = useState<ModeTab>('Radar');
  const [tilt, setTilt] = useState('0.5');
  const [palette, setPalette] = useState<PaletteType>('radarscope');

  // Sounding & Threat Matrix Modals
  const [activeSounding, setActiveSounding] = useState<SoundingProfile | null>(null);
  const [showThreatMatrix, setShowThreatMatrix] = useState(false);

  // Gibson Ridge .pal Curve State
  const [palCurve, setPalCurve] = useState<ParsedPalCurve | null>(null);
  const [showPalModal, setShowPalModal] = useState(false);

  // Gibson Ridge Placefiles State
  const [showPlacefileModal, setShowPlacefileModal] = useState(false);
  const [placefiles, setPlacefiles] = useState<ActivePlacefile[]>(() =>
    PLACEFILE_NATION_CATALOG.map((item) => ({
      id: item.id,
      name: item.name,
      url: item.url,
      enabled: Boolean(item.defaultEnabled),
    }))
  );

  // FastScan Ultra-Low Latency Engine
  const [fastScan, setFastScan] = useState(true);

  // Layer Toggles
  const [showRadarPills, setShowRadarPills] = useState(true);
  const [showLightning, setShowLightning] = useState(true);
  const [showMetars, setShowMetars] = useState(false);
  const [showLSR, setShowLSR] = useState(true);
  const [showWatches, setShowWatches] = useState(true);
  const [showAssistant, setShowAssistant] = useState(false);
  const [showQuad, setShowQuad] = useState(false);
  const [showLayerManager, setShowLayerManager] = useState(false);
  const [showLeftDock, setShowLeftDock] = useState(true);
  const [showRightDock, setShowRightDock] = useState(true);
  const [siteNetworkFilter, setSiteNetworkFilter] = useState<RadarNetwork | 'ALL'>('ALL');
  const [showCoverage, setShowCoverage] = useState(false);
  const [showStatusPanel, setShowStatusPanel] = useState(false);

  // Spotter reporting state
  const [spotterCoords, setSpotterCoords] = useState<[number, number] | null>(null);
  const [spotterReports, setSpotterReports] = useState<SpotterPin[]>([]);

  // Active alerts (NWS)
  const [activeAlerts, setActiveAlerts] = useState<Array<{ id?: string; headline: string; severity: string; area: string }>>([]);

  // Split View
  const [dualPane, setDualPane] = useState(false);
  const [product2, setProduct2] = useState<RadarProduct>('vel');

  // Loop & Playback
  const [frames, setFrames] = useState<Frame[]>([]);
  const [maxRefWindow, setMaxRefWindow] = useState<5 | 10 | 20 | 30>(10);
  const [frameMeta, setFrameMeta] = useState<FrameMeta | null>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopLoading, setLoopLoading] = useState(false);
  const playTimerRef = useRef<number | null>(null);
  const [workspaceHydrated, setWorkspaceHydrated] = useState(false);

  // P1: hydrate workspace preferences (client-only)
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

  // P1: persist workspace preferences
  useEffect(() => {
    if (!workspaceHydrated) return;
    const prefs: WorkspacePrefsV1 = {
      schemaVersion: 1,
      radarSite,
      product,
      tilt,
      palette,
      activeTab,
      fastScan,
      dualPane,
      layers: { showRadarPills, showLightning, showMetars, showLSR, showWatches, showWarnings: true, showSatellite: false, showMping: false, showSpotterReports: false },
    };
    saveWorkspacePrefs(prefs);
  }, [workspaceHydrated, radarSite, product, tilt, palette, activeTab, fastScan, dualPane, showRadarPills, showLightning, showMetars, showLSR, showWatches]);

  const filteredSites = RADAR_SITES.filter((s) => siteNetworkFilter === 'ALL' || s.network === siteNetworkFilter);
  const currentSite = RADAR_SITES.find((s) => s.id === radarSite || s.radarId === radarSite) || RADAR_SITES[0];
  const productInfo = RADAR_PRODUCTS.find((p) => p.key === product);
  const currentFrame = frames[frameIndex] || null;

  const selectNearestRadar = useCallback(() => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nearest = nearestRadarSite(pos.coords.latitude, pos.coords.longitude, { network: siteNetworkFilter });
        if (nearest) setRadarSite(nearest.site.id);
      },
      () => {},
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }, [siteNetworkFilter]);

  // Load LIVE frames (Multi-Tilt + MRMS Support)
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
        setFrameMeta({
          source: data.source,
          attribution: data.attribution,
          fetchedAt: data.fetchedAt,
          siteName: data.siteName,
          productLabel: data.productLabel,
          sourceKind: data.sourceKind,
          substitute: data.substitute,
          loopAvailable: data.loopAvailable,
          notes: data.notes,
        });
      } else {
        setFrames([]);
        setFrameIndex(0);
        setFrameMeta(null);
      }
    } catch {
      setFrames([]);
      setFrameMeta(null);
    } finally {
      setLoopLoading(false);
    }
  }, [currentSite.radarId, product, tilt]);

  useEffect(() => { void loadFrames(); }, [loadFrames]);

  // Auto-refresh frames
  useEffect(() => {
    if (!fastScan && product !== 'maxref') return;
    const ms = fastScan ? 60000 : 120000;
    const t = window.setInterval(() => { void loadFrames(); }, ms);
    return () => window.clearInterval(t);
  }, [fastScan, product, loadFrames]);

  // Fetch active alerts
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

  const goToLive = useCallback(() => {
    if (frames.length > 0) { setFrameIndex(frames.length - 1); setIsPlaying(false); }
  }, [frames.length]);

  const stepFrame = useCallback((dir: -1 | 1) => {
    setIsPlaying(false);
    setFrameIndex((prev) => {
      const next = prev + dir;
      if (next < 0) return frames.length - 1;
      if (next >= frames.length) return 0;
      return next;
    });
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
    const pin: SpotterPin = { id: report.id, hazardType: report.hazardType, description: report.description, hailSize: report.hailSize, lat: report.lat, lon: report.lon, timestamp: report.timestamp, callsign: report.callsign };
    setSpotterReports((prev) => [...prev, pin]);
    setSpotterCoords(null);
  };

  const handleTogglePlacefile = (id: string) => setPlacefiles((prev) => prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)));
  const handleAddPlacefile = (name: string, url: string) => setPlacefiles((prev) => [...prev, { id: `pf-${Date.now()}`, name, url, enabled: true }]);
  const handleDeletePlacefile = (id: string) => setPlacefiles((prev) => prev.filter((p) => p.id !== id));
  const openSoundingAtSite = () => setActiveSounding(generateThermodynamicSounding(currentSite.lat, currentSite.lon));

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#070c14] text-slate-100 select-none">
      {/* TOP WORKSTATION BAR */}
      <header className="flex h-[40px] shrink-0 items-center gap-2 border-b border-slate-800 bg-[#0a111d] px-2 text-[11px]">
        <button onClick={() => setShowLeftDock((v) => !v)} className={`flex h-7 w-7 items-center justify-center rounded border ${showLeftDock ? 'border-cyan-700 bg-cyan-900/40 text-cyan-200' : 'border-slate-700 bg-slate-900 text-slate-300 hover:text-white'}`} title="Toggle left panel">☰</button>
        <div className="flex items-center gap-1.5 pr-1">
          <Image src="/logo.png" alt="MesoVortexWX" width={22} height={22} className="rounded" priority />
          <span className="hidden md:inline font-black tracking-wide text-white">MESO<span className="text-cyan-400">VORTEX</span><span className="text-amber-400 ml-1">WX</span></span>
        </div>
        <div className="h-5 w-px bg-slate-700" />
        <div className="flex items-center gap-0.5">
          {(['Radar', 'Composite', 'Satellite', 'Models', 'Outlooks'] as ModeTab[]).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded px-2 py-1 font-bold ${activeTab === tab ? 'bg-cyan-700 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>{tab}</button>
          ))}
        </div>
        <div className="h-5 w-px bg-slate-700" />

        <div className="flex items-center gap-1">
          <select value={siteNetworkFilter} onChange={(e) => setSiteNetworkFilter(e.target.value as RadarNetwork | 'ALL')} className="h-7 rounded border border-slate-700 bg-slate-900 px-1 text-[10px] text-slate-200" title="Radar network filter">
            <option value="ALL">ALL</option>
            <option value="NEXRAD">NEXRAD</option>
            <option value="TDWR">TDWR</option>
          </select>
          <label className="flex items-center gap-1">
            <span className="text-slate-400 font-semibold">SITE</span>
            <select value={radarSite} onChange={(e) => setRadarSite(e.target.value)} className="h-7 max-w-[220px] rounded border border-slate-700 bg-slate-900 px-1.5 text-[11px] text-slate-100 focus:border-cyan-600 focus:outline-none" title="Radar site">
              {filteredSites.map((site) => (
                <option key={site.id} value={site.id}>{site.id} — {site.name} [{site.network}]</option>
              ))}
            </select>
          </label>
          <button onClick={selectNearestRadar} className="h-7 rounded border border-slate-700 bg-slate-900 px-1.5 text-[10px] font-bold text-cyan-300 hover:bg-slate-800" title="Select nearest radar to your location">NEAR</button>
          <button onClick={() => setShowCoverage((v) => !v)} className={`h-7 rounded border px-1.5 text-[10px] font-bold ${showCoverage ? 'border-cyan-600 bg-cyan-900/40 text-cyan-200' : 'border-slate-700 bg-slate-900 text-slate-300'}`} title="Toggle radar coverage rings">COV</button>
          <button onClick={() => setShowStatusPanel((v) => !v)} className={`h-7 rounded border px-1.5 text-[10px] font-bold ${showStatusPanel ? 'border-cyan-600 bg-cyan-900/40 text-cyan-200' : 'border-slate-700 bg-slate-900 text-slate-300'}`} title="Radar/network status">STAT</button>
        </div>

        <label className="flex items-center gap-1">
          <span className="text-slate-400 font-semibold">PROD</span>
          <select value={product} onChange={(e) => setProduct(e.target.value as RadarProduct)} className="h-7 rounded border border-slate-700 bg-slate-900 px-1.5 text-[11px] text-slate-100 focus:border-cyan-600 focus:outline-none" title="Radar product">
            {RADAR_PRODUCTS.map((p) => (<option key={p.key} value={p.key}>{p.short} — {p.label}</option>))}
          </select>
        </label>

        <div className="flex items-center gap-0.5 rounded border border-slate-700 bg-slate-900 px-1 py-0.5">
          <span className="px-1 text-slate-400 font-semibold">TILT</span>
          {VCP_TILTS.map((t) => (<button key={t} onClick={() => setTilt(t)} className={`rounded px-1.5 py-0.5 font-bold ${tilt === t ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>{t}°</button>))}
        </div>

        {product === 'maxref' && (
          <div className="flex items-center gap-0.5 rounded border border-cyan-800 bg-cyan-950/40 px-1 py-0.5">
            <span className="px-1 text-cyan-300 font-semibold">MAX</span>
            {[5,10,20,30].map((w) => (<button key={w} onClick={() => setMaxRefWindow(w as 5|10|20|30)} className={`rounded px-1.5 py-0.5 font-bold ${maxRefWindow===w ? 'bg-cyan-600 text-white' : 'text-cyan-200/80 hover:bg-cyan-900/50'}`}>{w}</button>))}
          </div>
        )}

        <button onClick={() => setFastScan((f) => !f)} className={`ml-1 flex items-center gap-1 rounded border px-2 py-1 font-black ${fastScan ? 'border-emerald-600 bg-emerald-900/40 text-emerald-200' : 'border-slate-700 bg-slate-900 text-slate-400'}`} title="FastScan auto-refresh">
          <span className={`h-1.5 w-1.5 rounded-full ${fastScan ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />FASTSCAN
        </button>

        <div className="ml-auto flex items-center gap-2 text-[10px] text-slate-400 min-w-0">
          {frameMeta?.substitute && <span className="rounded bg-amber-900/50 px-1.5 py-0.5 font-bold text-amber-300">SUB</span>}
          <span className="truncate max-w-[220px]" title={frameMeta?.source || ''}>{frameMeta?.source || '—'}</span>
          <span className="font-mono text-slate-300">{currentFrame?.time ? new Date(currentFrame.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}</span>
        </div>
        <button onClick={() => setShowRightDock((v) => !v)} className={`flex h-7 w-7 items-center justify-center rounded border ${showRightDock ? 'border-cyan-700 bg-cyan-900/40 text-cyan-200' : 'border-slate-700 bg-slate-900 text-slate-300 hover:text-white'}`} title="Toggle right panel">▣</button>
      </header>

      {/* MAIN WORKSTATION AREA */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {showLeftDock && (
          <Sidebar
            product={product}
            setProduct={setProduct as any}
            showLightning={showLightning} setShowLightning={setShowLightning}
            showMetars={showMetars} setShowMetars={setShowMetars}
            showLSR={showLSR} setShowLSR={setShowLSR}
            showWatches={showWatches} setShowWatches={setShowWatches}
            showRadarPills={showRadarPills} setShowRadarPills={setShowRadarPills}
            placefiles={placefiles}
            onTogglePlacefile={handleTogglePlacefile}
            onOpenPlacefileManager={() => setShowPlacefileModal(true)}
            onOpenPal={() => setShowPalModal(true)}
            onOpenLayerManager={() => setShowLayerManager(true)}
          />
        )}

        <main className={`relative min-w-0 flex-1 bg-black ${dualPane ? 'grid grid-cols-2' : ''}`}>
          <div className="relative h-full w-full">
            <RadarMap
              product={product}
              radarSite={radarSite}
              mode={activeTab}
              tilt={tilt}
              mapType="satellite"
              palette={palette}
              palCurve={palCurve}
              activePlacefiles={placefiles}
              frameUrl={currentFrame?.tileUrl ?? null}
              frameLabel={currentFrame?.label}
              frames={frames}
              maxRefWindow={maxRefWindow}
              fastScan={fastScan}
              showLightning={showLightning}
              showMetars={showMetars}
              showLSR={showLSR}
              showWatches={showWatches}
              showRadarPills={showRadarPills}
              showCoverage={showCoverage}
              coverageFilter={siteNetworkFilter}
              spotterReports={spotterReports}
              onSelectSite={(siteId) => setRadarSite(siteId)}
              onOpenSounding={(profile) => setActiveSounding(profile)}
              onMapClickCoordinates={(coords) => setSpotterCoords(coords)}
            />
            <div className="pointer-events-none absolute left-2 top-2 z-10 max-w-[70%] rounded border border-slate-700/80 bg-slate-950/80 px-2 py-1 text-[10px] leading-tight text-slate-300 shadow">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="font-bold text-cyan-300">{currentSite.id}</span>
                <span className="text-slate-400">[{currentSite.network}]</span>
                <span>{frameMeta?.productLabel || productInfo?.label || product.toUpperCase()}</span>
                <span>Tilt {tilt}°</span>
                {frameMeta?.fetchedAt && <span>Fetched {new Date(frameMeta.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                {frameMeta?.loopAvailable === false && <span className="text-amber-300">Loop limited</span>}
              </div>
              {frameMeta?.notes?.[0] && <div className="mt-0.5 text-[9px] text-amber-200/90 line-clamp-2" title={frameMeta.notes.join(' ')}>{frameMeta.notes[0]}</div>}
            </div>
          </div>
          {dualPane && (
            <div className="relative h-full w-full border-l border-slate-700">
              <RadarMap
                product={product2}
                radarSite={radarSite}
                mode={activeTab}
                tilt={tilt}
                mapType="satellite"
                palette={palette}
                palCurve={palCurve}
                activePlacefiles={placefiles}
                frames={frames}
                maxRefWindow={maxRefWindow}
                fastScan={fastScan}
                showLightning={showLightning}
                showMetars={showMetars}
                showLSR={showLSR}
                showWatches={showWatches}
                showRadarPills={showRadarPills}
                showCoverage={showCoverage}
                coverageFilter={siteNetworkFilter}
                onSelectSite={(siteId) => setRadarSite(siteId)}
                onOpenSounding={(profile) => setActiveSounding(profile)}
              />
              <div className="pointer-events-auto absolute left-2 top-2 z-10 rounded border border-slate-700 bg-slate-950/85 px-1.5 py-1 text-[10px]">
                <label className="flex items-center gap-1"><span className="text-slate-400">P2</span>
                  <select value={product2} onChange={(e) => setProduct2(e.target.value as RadarProduct)} className="rounded border border-slate-700 bg-slate-900 px-1 py-0.5 text-[10px]">
                    {RADAR_PRODUCTS.map((p) => <option key={p.key} value={p.key}>{p.short}</option>)}
                  </select>
                </label>
              </div>
            </div>
          )}
        </main>

        {showRightDock && (
          <RightDock alerts={activeAlerts} spotterReports={spotterReports} onOpenThreatMatrix={() => setShowThreatMatrix(true)} onOpenSounding={openSoundingAtSite} onOpenAssistant={() => setShowAssistant(true)} onOpenQuad={() => setShowQuad(true)} onOpenSpotterReport={() => { if (!spotterCoords) setSpotterCoords([currentSite.lon, currentSite.lat]); else setSpotterCoords(spotterCoords); }} dualPane={dualPane} onToggleDualPane={() => setDualPane((v) => !v)} fastScan={fastScan} />
        )}
      </div>

      {/* BOTTOM TIMELINE / PLAYBACK BAR */}
      <footer className="flex h-[34px] shrink-0 items-center gap-2 border-t border-slate-800 bg-[#0a111d] px-2 text-[11px]">
        <button onClick={() => stepFrame(-1)} className="flex h-6 w-6 items-center justify-center rounded border border-slate-700 bg-slate-900 text-slate-300 hover:text-white" title="Previous frame">‹</button>
        <button onClick={() => setIsPlaying((p) => !p)} disabled={frames.length < 2} className="flex h-6 w-8 items-center justify-center rounded border border-cyan-700 bg-cyan-800 text-white disabled:opacity-40" title="Play/Pause">{isPlaying ? '❚❚' : '▶'}</button>
        <button onClick={() => stepFrame(1)} className="flex h-6 w-6 items-center justify-center rounded border border-slate-700 bg-slate-900 text-slate-300 hover:text-white" title="Next frame">›</button>
        <button onClick={goToLive} className={`rounded border px-2 py-0.5 font-black ${currentFrame?.label === 'LIVE' ? 'border-emerald-600 bg-emerald-700 text-white' : 'border-emerald-800 bg-emerald-950/40 text-emerald-300'}`}>LIVE</button>
        <input type="range" min={0} max={Math.max(0, frames.length - 1)} value={frameIndex} onChange={(e) => { setIsPlaying(false); setFrameIndex(Number(e.target.value)); }} className="mx-1 h-1.5 min-w-[140px] flex-1 cursor-pointer accent-cyan-500" title="Frame timeline" />
        <span className="min-w-[150px] font-mono text-[10px] text-slate-300 text-right">
          {loopLoading ? 'Loading…' : `${currentFrame?.label || 'LIVE'}${frames.length ? `  ${frameIndex + 1}/${frames.length}` : ''}${currentFrame?.time ? `  ${new Date(currentFrame.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}`}
        </span>
      </footer>

      {/* REFLECTIVITY / PRODUCT LEGEND STRIP */}
      <aside aria-label="Reflectivity legend" className="flex h-[22px] shrink-0 items-center justify-between border-t border-slate-800 bg-slate-950 px-3 text-[9px] font-mono">
        <span className="font-bold text-slate-400 whitespace-nowrap">
          {product === 'maxref' ? `MAX REF (${Math.min(maxRefWindow, frames.length || maxRefWindow)} scans)` : product === 'mesh' ? 'MESH (in)' : product === 'azshear' ? 'AzShear' : `${productInfo?.short || 'dBZ'}`}
        </span>
        <div className="mx-3 flex-1 h-2 overflow-hidden rounded-sm flex border border-white/10">
          <div className="flex-1 bg-[#04e9e7]" /><div className="flex-1 bg-[#019ff4]" /><div className="flex-1 bg-[#0300f4]" />
          <div className="flex-1 bg-[#02fd02]" /><div className="flex-1 bg-[#01c501]" /><div className="flex-1 bg-[#008e00]" />
          <div className="flex-1 bg-[#fdf802]" /><div className="flex-1 bg-[#e5bc00]" /><div className="flex-1 bg-[#fd9500]" />
          <div className="flex-1 bg-[#fd0000]" /><div className="flex-1 bg-[#d40000]" /><div className="flex-1 bg-[#f800fd]" />
          <div className="flex-1 bg-[#9854c6]" /><div className="flex-1 bg-[#ffffff]" />
        </div>
        <span className="text-slate-400 whitespace-nowrap">
          {product === 'mesh' ? '0.5 • 1.0 • 1.75 • 2.5 • 4.0+' : product === 'azshear' ? '0.005 • 0.010 • 0.015 • 0.020+ s⁻¹' : '5 • 15 • 30 • 45 • 60 • 70+'}
        </span>
      </aside>

      {showStatusPanel && (
        <div className="pointer-events-auto absolute left-2 bottom-[64px] z-30 w-[340px] rounded-md border border-slate-700 bg-slate-950/95 p-2 text-[11px] shadow-2xl">
          <div className="mb-1 flex items-center justify-between border-b border-slate-800 pb-1">
            <div className="font-black uppercase tracking-wider text-cyan-300">Radar Status & Coverage</div>
            <button onClick={() => setShowStatusPanel(false)} className="text-slate-400 hover:text-white">✕</button>
          </div>
          <div className="grid grid-cols-2 gap-1 text-slate-300">
            <div className="rounded border border-slate-800 bg-slate-900/50 p-1.5"><div className="text-[9px] text-slate-400">NEXRAD Sites</div><div className="font-bold text-white">{RADAR_SITES.filter(s=>s.network==='NEXRAD').length}</div></div>
            <div className="rounded border border-slate-800 bg-slate-900/50 p-1.5"><div className="text-[9px] text-slate-400">TDWR Sites</div><div className="font-bold text-white">{RADAR_SITES.filter(s=>s.network==='TDWR').length}</div></div>
            <div className="col-span-2 rounded border border-slate-800 bg-slate-900/50 p-1.5"><div className="text-[9px] text-slate-400">Selected Site</div><div className="font-bold text-cyan-200">{currentSite.id} • {currentSite.name} [{currentSite.network}]</div><div className="text-[9px] text-slate-400">Source: {frameMeta?.source || '—'} • {frameMeta?.substitute ? 'substitute' : 'primary'} • loop {frameMeta?.loopAvailable === false ? 'limited' : 'ok'}</div></div>
            <div className="col-span-2 rounded border border-slate-800 bg-slate-900/50 p-1.5"><div className="text-[9px] text-slate-400">Layers/Feeds</div><div>NEXRAD/TDWR site layers, MRMS severe/precip products, IEM CONUS mosaic, GOES East feed, watches/warnings/LSR/METAR/placefiles. Coverage rings: {showCoverage ? `ON (${siteNetworkFilter})` : 'OFF'}.</div></div>
          </div>
          <div className="mt-1 text-[9px] text-slate-500">Live per-site ingest health dashboard integration: pending (using current source/fetch/frame status as operational indicator).</div>
        </div>
      )}

      <LayerManagerPanel
        open={showLayerManager}
        onClose={() => setShowLayerManager(false)}
        state={{ showRadarPills, showLightning, showMetars, showLSR, showWatches, showWarnings: true, showSatellite: false, showMping: false, showSpotterReports: false }}
        onChange={(patch) => {
          if (typeof patch.showRadarPills === 'boolean') setShowRadarPills(patch.showRadarPills);
          if (typeof patch.showLightning === 'boolean') setShowLightning(patch.showLightning);
          if (typeof patch.showMetars === 'boolean') setShowMetars(patch.showMetars);
          if (typeof patch.showLSR === 'boolean') setShowLSR(patch.showLSR);
          if (typeof patch.showWatches === 'boolean') setShowWatches(patch.showWatches);
        }}
      />

      {activeSounding && <SkewTSoundingModal sounding={activeSounding} onClose={() => setActiveSounding(null)} />}
      {showThreatMatrix && <ThreatMatrixPanel onClose={() => setShowThreatMatrix(false)} />}
      {showPalModal && <PalColorTableModal onClose={() => setShowPalModal(false)} onApplyPal={(parsed) => { setPalCurve(parsed); setPalette('palFile'); }} />}
      {showPlacefileModal && <PlacefileManagerModal placefiles={placefiles} onClose={() => setShowPlacefileModal(false)} onToggle={handleTogglePlacefile} onAdd={handleAddPlacefile} onDelete={handleDeletePlacefile} />}
      {showAssistant && (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/50 p-4 sm:items-center">
          <div className="h-[75vh] w-full max-w-md overflow-hidden rounded-md border border-slate-700 bg-slate-950 shadow-2xl">
            <WeatherAssistant context={{ site: radarSite, product: productInfo?.label, alerts: [] }} onClose={() => setShowAssistant(false)} />
          </div>
        </div>
      )}
      {showQuad && <SynchronizedQuadView radarSite={radarSite} onClose={() => setShowQuad(false)} />}
      {spotterCoords && <SpotterReportModal currentCoords={spotterCoords} onClose={() => setSpotterCoords(null)} onSubmit={handleSpotterSubmit} />}
      <EmergencyAlertTone />
    </div>
  );
}
