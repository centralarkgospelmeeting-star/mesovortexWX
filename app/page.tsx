'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { RadarMap } from '../components/RadarMap';
import { WeatherWiseRadarCard } from '../components/WeatherWiseRadarCard';
import { WeatherWiseAlertsPanel, WeatherAlertItem } from '../components/WeatherWiseAlertsPanel';
import { RADAR_SITES } from '../lib/radar-config';
import { WorkstationMode, DashboardPreset, RadarProduct, ElevationTilt, PaletteType } from '../lib/adapters/types';

export default function MesoVortexWorkstation() {
  // Navigation & Product
  const [mode, setMode] = useState<WorkstationMode>('Radar');
  const [dashboard, setDashboard] = useState<DashboardPreset>('Default');
  const [product, setProduct] = useState<RadarProduct>('ref');
  const [tilt, setTilt] = useState<ElevationTilt>('0.5');
  const [palette, setPalette] = useState<PaletteType>('radarscope');
  const [radarSite, setRadarSite] = useState('KLZK');
  const [radarOpacity, setRadarOpacity] = useState(0.88);
  const [isPlaying, setIsPlaying] = useState(false);

  // WeatherWise Sidebars State
  const [leftDockOpen, setLeftDockOpen] = useState(false);
  const [rightDockOpen, setRightDockOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);

  // Live Feeds
  const [liveAlerts, setLiveAlerts] = useState<WeatherAlertItem[]>([]);
  const [gateTelemetry, setGateTelemetry] = useState<{ az: number; distNm: number; altFt: number; val: number } | null>(null);

  const currentSite = RADAR_SITES.find((s) => s.id === radarSite || s.radarId === radarSite) || RADAR_SITES[0];

  // Load real-time alerts
  useEffect(() => {
    fetch('/api/warnings')
      .then((res) => res.json())
      .then((data) => {
        const items = (data.features || []).map((f: any, i: number) => ({
          id: f.id || `alert-${i}`,
          event: f.properties?.event || 'Severe Warning',
          headline: f.properties?.headline || f.properties?.event,
          severity: f.properties?.severity || 'Severe',
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
    <div className="relative h-screen w-screen overflow-hidden bg-[#070c14] select-none font-sans text-slate-100">
      
      {/* 1. TOP RAINBOW THREAT SCALE (Matches WeatherWise Screenshots) */}
      <div className="absolute top-0 left-0 right-0 z-40 h-5 flex text-[9px] font-black text-slate-900 shadow-md">
        <div className="flex-1 bg-[#c1e9c1] flex items-center justify-center">General Risk</div>
        <div className="flex-1 bg-[#7fc57f] flex items-center justify-center">Marginal Risk</div>
        <div className="flex-1 bg-[#f6f67d] flex items-center justify-center">Slight Risk</div>
        <div className="flex-1 bg-[#edbf69] flex items-center justify-center">Enhanced Risk</div>
        <div className="flex-1 bg-[#e56d6d] flex items-center justify-center text-white">Moderate Risk</div>
        <div className="flex-1 bg-[#ff66ff] flex items-center justify-center text-white">High Risk</div>
      </div>

      {/* 2. TOP WEATHERWISE NAVIGATION HEADER */}
      <div className="pointer-events-none absolute top-7 left-0 right-0 z-40 flex items-center justify-between px-4">
        {/* Left Drawer Trigger */}
        <button
          onClick={() => setLeftDockOpen((v) => !v)}
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-400 text-slate-950 shadow-xl hover:bg-amber-300 transition font-black text-lg border border-amber-300 cursor-pointer"
          title="Open Layers & Workstation Controls"
        >
          ☰
        </button>

        {/* Center Floating Pill Bar */}
        <div className="pointer-events-auto flex flex-col items-center">
          <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1 shadow-2xl border border-slate-200 text-slate-800">
            <div className="flex items-center gap-2 pr-2 border-r border-slate-200 font-black text-xs text-slate-900">
              <Image src="/logo.png" alt="MesoVortex" width={24} height={24} className="rounded-full shadow-sm" priority />
              <span>MesoVortex</span>
              <span className="text-[10px] text-slate-400">▾</span>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-1 font-bold text-xs">
              {(['Radar', 'Composite', 'Satellite', 'Outlooks'] as WorkstationMode[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setMode(tab)}
                  className={`rounded-full px-3 py-1 transition cursor-pointer ${
                    mode === tab ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Warnings Counter & Intelligence Trigger */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={() => setAlertsOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-full bg-amber-400 hover:bg-amber-300 px-3 py-1.5 text-slate-950 font-black text-xs shadow-xl border border-amber-300 transition cursor-pointer"
            title="Active Warning Polygons"
          >
            <span>⚠️</span>
            <span>{liveAlerts.length}</span>
          </button>
          <button
            onClick={() => setRightDockOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-cyan-400 shadow-xl hover:bg-slate-800 transition font-bold border border-white/20 cursor-pointer"
            title="Open Weather Intelligence Dock"
          >
            📊
          </button>
        </div>
      </div>

      {/* 3. FULL MAP CANVAS */}
      <div className="absolute inset-0">
        <RadarMap
          product={product}
          radarSite={radarSite}
          mode={mode}
          tilt={tilt}
          palette={palette}
          radarOpacity={radarOpacity}
          showWarnings={true}
          showWatches={true}
          showLightning={true}
          showLSR={true}
          showRadarPills={true}
          onSelectSite={(id) => setRadarSite(id)}
          onHoverTelemetry={(data) => setGateTelemetry(data)}
        />
      </div>

      {/* 4. BOTTOM-LEFT WEATHERWISE RADAR CARD */}
      <WeatherWiseRadarCard
        siteId={currentSite.id}
        siteName={currentSite.name}
        product={product as any}
        tilt={tilt}
        isPlaying={isPlaying}
        onSelectProduct={(p) => setProduct(p as any)}
        onSelectTilt={(t) => setTilt(t as any)}
        onTogglePlay={() => setIsPlaying((p) => !p)}
      />

      {/* 5. DEDICATED LEFT LAYERS DOCK */}
      {leftDockOpen && (
        <aside className="absolute left-4 top-20 bottom-8 z-40 w-80 rounded-3xl border border-white/10 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-2xl flex flex-col font-sans">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <span className="text-xs font-black uppercase tracking-wider text-cyan-400">Weather Layers &amp; Controls</span>
            <button onClick={() => setLeftDockOpen(false)} className="text-slate-400 hover:text-white">✕</button>
          </div>

          <div className="flex-1 overflow-y-auto pt-3 space-y-4 text-xs">
            <div>
              <div className="flex justify-between font-bold text-slate-300 mb-1.5">
                <span>Radar Opacity</span>
                <span className="font-mono text-cyan-400">{Math.round(radarOpacity * 100)}%</span>
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

            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 mb-2 block">NEXRAD Products</span>
              <div className="grid grid-cols-3 gap-1.5 font-bold text-[11px]">
                {(['ref', 'vel', 'srvel', 'cc', 'zdr', 'kdp', 'mesh', 'azshear'] as RadarProduct[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setProduct(p)}
                    className={`rounded-lg py-1.5 uppercase transition ${
                      product === p ? 'bg-cyan-500 text-slate-950 font-black' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 mb-2 block">VCP Elevation Tilts</span>
              <div className="grid grid-cols-4 gap-1.5 font-mono text-xs">
                {(['0.5', '0.9', '1.3', '1.8'] as ElevationTilt[]).map((t) => (
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
          </div>
        </aside>
      )}

      {/* 6. DEDICATED RIGHT WEATHER INTELLIGENCE DOCK */}
      {rightDockOpen && (
        <aside className="absolute right-4 top-20 bottom-8 z-40 w-80 rounded-3xl border border-white/10 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-2xl flex flex-col font-sans">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <span className="text-xs font-black uppercase tracking-wider text-cyan-400">Weather Intelligence</span>
            <button onClick={() => setRightDockOpen(false)} className="text-slate-400 hover:text-white">✕</button>
          </div>

          <div className="flex-1 overflow-y-auto pt-3 space-y-4 text-xs font-mono">
            {/* Severe Threat Risk Meter */}
            <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-3.5 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase text-red-400">Severe Risk Score</span>
                <span className="text-2xl font-black text-white">84<span className="text-xs text-red-400">/100</span></span>
              </div>
              <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full" style={{ width: '84%' }} />
              </div>
            </div>

            {/* Neighborhood Conditions */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-3 space-y-1.5 font-sans">
              <span className="text-xs font-bold text-white block">Hyperlocal Telemetry</span>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>Temp: <b className="text-white">78°F</b></div>
                <div>Feels: <b className="text-cyan-400">82°F</b></div>
                <div>Dew: <b className="text-emerald-400">68°F</b></div>
                <div>Pressure: <b className="text-slate-300">29.92</b></div>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* 7. SLIDING CURRENT ALERTS PANEL */}
      {alertsOpen && (
        <WeatherWiseAlertsPanel
          alerts={liveAlerts}
          onClose={() => setAlertsOpen(false)}
          onSelectAlert={(alert) => console.log('Inspecting:', alert)}
        />
      )}

      {/* Gate Telemetry Overlay */}
      {gateTelemetry && (
        <div className="pointer-events-none absolute bottom-5 right-5 z-30 rounded-2xl border border-white/15 bg-slate-950/90 px-3.5 py-2 text-xs font-mono shadow-2xl backdrop-blur-xl">
          <span className="text-slate-400">Beam:</span> <b className="text-cyan-400">{gateTelemetry.altFt.toLocaleString()} ft</b> ·{' '}
          <span className="text-slate-400">Z:</span> <b className="text-emerald-400">{gateTelemetry.val} dBZ</b> ·{' '}
          <span className="text-slate-400">Az:</span> <b className="text-white">{gateTelemetry.az}°</b>
        </div>
      )}
    </div>
  );
}
