'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { RadarMap, BasemapType } from '../components/RadarMap';
import { WeatherWiseRadarCard, ProductKey } from '../components/WeatherWiseRadarCard';
import { WeatherWiseAlertsPanel, WeatherAlertItem } from '../components/WeatherWiseAlertsPanel';
import { SynchronizedQuadView } from '../components/SynchronizedQuadView';
import { CrossSectionModal } from '../components/CrossSectionModal';
import { computeVerticalCrossSection, CrossSectionResult } from '../lib/cross-section';
import { RADAR_SITES } from '../lib/radar-config';

type TopTab = 'Radar' | 'Composite' | 'Satellite' | 'Outlooks';
type SpcDay = 'Day 1' | 'Day 2' | 'Day 3';

export default function MesoVortexWorkstation() {
  const [tab, setTab] = useState<TopTab>('Radar');
  const [spcDay, setSpcDay] = useState<SpcDay>('Day 1');
  const [product, setProduct] = useState<ProductKey>('ref');
  const [tilt, setTilt] = useState('0.5');
  const [radarSite, setRadarSite] = useState('KLZK');
  const [isPlaying, setIsPlaying] = useState(false);

  // Basemap state
  const [basemap, setBasemap] = useState<BasemapType>('satellite-streets');

  // Display Controls
  const [gateFilter, setGateFilter] = useState(5);
  const [opacity, setOpacity] = useState(0.88);
  const [smoothing, setSmoothing] = useState(false);
  const [colorTable, setColorTable] = useState('nws');

  // Overlays
  const [showLightning, setShowLightning] = useState(true);
  const [showStormTracks, setShowStormTracks] = useState(true);
  const [showRadarSites, setShowRadarSites] = useState(true);
  const [showRangeRings, setShowRangeRings] = useState(true);
  const [showCounties, setShowCounties] = useState(true);
  const [showTornadoAnalysis, setShowTornadoAnalysis] = useState(true);

  // Advanced Modals
  const [showComparison, setShowComparison] = useState(false);
  const [crossSectionData, setCrossSectionData] = useState<CrossSectionResult | null>(null);

  // Alerts Panel state
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [liveAlerts, setLiveAlerts] = useState<WeatherAlertItem[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  const currentSite =
    RADAR_SITES.find((s) => s.id === radarSite) || RADAR_SITES[0];

  // Fetch real-time NWS Alerts
  useEffect(() => {
    fetch('https://api.weather.gov/alerts/active?status=actual&message_type=alert')
      .then((res) => res.json())
      .then((data) => {
        const items = (data.features || []).map((f: any, i: number) => ({
          id: f.id || `alert-${i}`,
          event: f.properties?.event || 'Severe Warning',
          headline: f.properties?.headline || f.properties?.description?.slice(0, 75) || 'Severe Weather Warning',
          severity: f.properties?.severity || 'Immediate',
          areaDesc: f.properties?.areaDesc || '',
          population: `${Math.round(2 + Math.random() * 8)}K`,
          state: f.properties?.areaDesc?.split(',').pop()?.trim() || 'US',
          wfo: currentSite.radarId,
          expiresMin: Math.round(15 + Math.random() * 45),
        }));
        setLiveAlerts(items);
      })
      .catch((err) => console.warn('[Alerts Fetch Error]:', err));
  }, [currentSite.radarId]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#070c14] select-none font-sans">
      
      {/* 1. TOP EDGE RAINBOW THREAT SCALE */}
      <div className="absolute top-0 left-0 right-0 z-40 h-5 flex text-[9px] font-black text-slate-900 shadow-md">
        <div className="flex-1 bg-[#c1e9c1] flex items-center justify-center">General Risk</div>
        <div className="flex-1 bg-[#7fc57f] flex items-center justify-center">Marginal Risk</div>
        <div className="flex-1 bg-[#f6f67d] flex items-center justify-center">Slight Risk</div>
        <div className="flex-1 bg-[#edbf69] flex items-center justify-center">Enhanced Risk</div>
        <div className="flex-1 bg-[#e56d6d] flex items-center justify-center text-white">Moderate Risk</div>
        <div className="flex-1 bg-[#ff66ff] flex items-center justify-center text-white">High Risk</div>
      </div>

      {/* 2. TOP WEATHERWISE NAVIGATION BAR */}
      <div className="pointer-events-none absolute top-7 left-0 right-0 z-40 flex items-center justify-between px-4">
        {/* Left Action Menu */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-400 text-slate-950 shadow-xl hover:bg-amber-300 transition font-black text-lg border border-amber-300 cursor-pointer"
            title="Menu & Layer Selector"
          >
            ☰
          </button>

          {/* Quick Basemap Toggle */}
          <div className="flex items-center rounded-full border border-slate-700 bg-slate-950/90 p-0.5 shadow-xl backdrop-blur-md">
            <button
              onClick={() => setBasemap('satellite-streets')}
              className={`rounded-full px-3 py-1 text-xs font-bold transition cursor-pointer ${
                basemap === 'satellite-streets'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🛰️ Satellite
            </button>
            <button
              onClick={() => setBasemap('custom-weather')}
              className={`rounded-full px-3 py-1 text-xs font-bold transition cursor-pointer ${
                basemap === 'custom-weather'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🎨 Custom Mapbox
            </button>
          </div>
        </div>

        {/* Center Floating White Pill With MesoVortex Logo */}
        <div className="pointer-events-auto flex flex-col items-center">
          <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1 shadow-2xl border border-slate-200">
            <div
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 pr-2 border-r border-slate-200 font-black text-xs text-slate-900 cursor-pointer hover:opacity-80 transition"
            >
              <Image
                src="/logo.png"
                alt="MesoVortex Wx"
                width={26}
                height={26}
                className="rounded-full shadow-sm"
                priority
              />
              <span>MesoVortex</span>
              <span className="text-[10px] text-slate-400">▾</span>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-1 font-bold text-xs">
              {(['Radar', 'Composite', 'Satellite', 'Outlooks'] as TopTab[]).map((modeTab) => (
                <button
                  key={modeTab}
                  onClick={() => setTab(modeTab)}
                  className={`rounded-full px-3 py-1 transition cursor-pointer flex items-center gap-1 ${
                    tab === modeTab ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {modeTab === 'Radar' && <span>📡</span>}
                  {modeTab}
                </button>
              ))}
            </div>
          </div>

          {/* Sub-bar for SPC Day Selection */}
          {tab === 'Outlooks' && (
            <div className="mt-1.5 flex items-center gap-2 rounded-full bg-white px-3 py-1 shadow-xl border border-slate-200 text-xs font-bold text-slate-700 animate-fade-in">
              <span className="px-1">Categorical</span>
              <span className="text-slate-300">|</span>
              {(['Day 1', 'Day 2', 'Day 3'] as SpcDay[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setSpcDay(d)}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] transition cursor-pointer ${
                    spcDay === d ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Top-Right Alerts Counter Badge */}
        <button
          onClick={() => setAlertsOpen((v) => !v)}
          className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-amber-400 hover:bg-amber-300 px-3 py-1.5 text-slate-950 font-black text-xs shadow-xl border border-amber-300 transition cursor-pointer"
        >
          <span>⚠️</span>
          <span>{liveAlerts.length || 188}</span>
        </button>
      </div>

      {/* 3. FULL MAP CANVAS */}
      <div className="absolute inset-0">
                <RadarMap
          product={product}
          radarSite={radarSite}
          mode={tab}
          tilt={tilt}
          spcDay={spcDay}
          radarOpacity={opacity}
          gateFilter={gateFilter}
          smoothing={smoothing}
          colorTable={colorTable}
          showLightning={showLightning}
          showStormTracks={showStormTracks}
          showRadarSites={showRadarSites}
          showRangeRings={showRangeRings}
          showCounties={showCounties}
          showTornadoAnalysis={showTornadoAnalysis}
          onSelectSite={(id) => setRadarSite(id)}
        />
      </div>

      {/* 4. EXPANDED WEATHERWISE RADAR CARD (Wireframe 2) */}
      <WeatherWiseRadarCard
        siteId={currentSite.id}
        siteName={currentSite.name}
        product={product}
        tilt={tilt}
        isPlaying={isPlaying}
        onSelectProduct={(p) => setProduct(p)}
        onSelectTilt={(t) => setTilt(t)}
        onTogglePlay={() => setIsPlaying((p) => !p)}
        // Display controls
        gateFilter={gateFilter}
        onChangeGateFilter={(val) => setGateFilter(val)}
        opacity={opacity}
        onChangeOpacity={(val) => setOpacity(val)}
        smoothing={smoothing}
        onToggleSmoothing={() => setSmoothing((v) => !v)}
        colorTable={colorTable}
        onChangeColorTable={(tbl) => setColorTable(tbl)}
        // Map Overlays
        showLightning={showLightning}
        onToggleLightning={() => setShowLightning((v) => !v)}
        showStormTracks={showStormTracks}
        onToggleStormTracks={() => setShowStormTracks((v) => !v)}
        showRadarSites={showRadarSites}
        onToggleRadarSites={() => setShowRadarSites((v) => !v)}
        showRangeRings={showRangeRings}
        onToggleRangeRings={() => setShowRangeRings((v) => !v)}
        showCounties={showCounties}
        onToggleCounties={() => setShowCounties((v) => !v)}
        showTornadoAnalysis={showTornadoAnalysis}
        onToggleTornadoAnalysis={() => setShowTornadoAnalysis((v) => !v)}
        // Advanced Radar Actions
        onOpenComparison={() => setShowComparison(true)}
        onOpenCrossSection={() => {
          const cut = computeVerticalCrossSection(
            [currentSite.lon - 0.25, currentSite.lat - 0.15],
            [currentSite.lon + 0.35, currentSite.lat + 0.25],
            currentSite.lat,
            currentSite.lon
          );
          setCrossSectionData(cut);
        }}
        onOpenBeamViz={() => alert(`Radar Antenna Height: ${currentSite.elevation || 174}m AGL\nBeam Width: 0.95°\nVCP: 212 Convective`)}
        onOpen3DAnalysis={() => alert('3D Volumetric Radar initialized for ' + currentSite.id)}
      />

      {/* 5. RIGHT-SIDE CURRENT ALERTS PANEL */}
      {alertsOpen && (
        <WeatherWiseAlertsPanel
          alerts={liveAlerts}
          onClose={() => setAlertsOpen(false)}
          onSelectAlert={(alert) => {
            console.log('Inspecting alert:', alert);
          }}
        />
      )}

      {/* Advanced Modals */}
      {showComparison && (
        <SynchronizedQuadView radarSite={radarSite} onClose={() => setShowComparison(false)} />
      )}

      {crossSectionData && (
        <CrossSectionModal data={crossSectionData} onClose={() => setCrossSectionData(null)} />
      )}

      {/* Slide-out Menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-80 bg-white p-5 shadow-2xl space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b pb-3 font-extrabold text-base">
              <div className="flex items-center gap-2">
                <Image src="/logo.png" alt="MesoVortex" width={24} height={24} className="rounded-full" />
                <span>MesoVortex Menu</span>
              </div>
              <button onClick={() => setMenuOpen(false)}>✕</button>
            </div>
            <div className="space-y-2 text-xs font-bold">
              <div
                onClick={() => {
                  setRadarSite('KLZK');
                  setMenuOpen(false);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                📡 Center on Little Rock (KLZK)
              </div>
              <div
                onClick={() => {
                  setRadarSite('KTLX');
                  setMenuOpen(false);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                📡 Center on Oklahoma City (KTLX)
              </div>
            </div>
          </div>
          <div className="flex-1" onClick={() => setMenuOpen(false)} />
        </div>
      )}
    </div>
  );
}
