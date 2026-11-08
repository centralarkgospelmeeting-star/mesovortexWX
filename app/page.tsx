'use client';

import { useState } from 'react';
import Image from 'next/image';
import { RadarProduct, ElevationTilt, WorkstationMode } from '../lib/types/workstation';

export default function MesoVortexWorkstation() {
  // Navigation & Mode
  const [mode, setMode] = useState<WorkstationMode>('Radar');
  const [product, setProduct] = useState<RadarProduct>('ref');
  const [tilt, setTilt] = useState<ElevationTilt>('0.5');
  const [radarSite, setRadarSite] = useState('KLZK');
  const [fastScan, setFastScan] = useState(true);

  // Panel Visibilities (WeatherWise Pro Sidebars)
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#070c14] text-slate-100 select-none">
      
      {/* 1. TOP WEATHERWISE PRO PILL BAR */}
      <header className="pointer-events-none absolute left-0 right-0 top-3 z-30 flex justify-center px-4">
        <nav className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/15 bg-slate-950/90 px-3 py-1.5 shadow-2xl backdrop-blur-2xl">
          <div className="flex items-center gap-2 pr-2 border-r border-white/15">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-600 text-xs font-black">⚡</span>
            <span className="text-xs font-black tracking-wider uppercase">
              MESO<span className="text-cyan-400">VORTEX</span> <span className="text-amber-400 font-bold text-[9px]">PRO</span>
            </span>
          </div>

          {(['Radar', 'Composite', 'Satellite', 'Models', 'Outlooks'] as WorkstationMode[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setMode(tab)}
              className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                mode === tab ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}

          <button
            onClick={() => setFastScan((f) => !f)}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase transition ${
              fastScan ? 'bg-emerald-500 text-slate-950 shadow-[0_0_10px_#10b981]' : 'border border-white/15 text-slate-400'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-slate-950 animate-ping" />
            FastScan
          </button>
        </nav>
      </header>

      {/* 2. LEFT WEATHER INTELLIGENCE SIDEBAR (WeatherWise Dashboard) */}
      <aside className={`absolute left-3 top-16 bottom-16 z-20 w-80 rounded-2xl border border-white/10 bg-slate-950/90 shadow-2xl backdrop-blur-2xl transition-all duration-300 flex flex-col ${
        leftPanelOpen ? 'translate-x-0' : '-translate-x-[110%]'
      }`}>
        <div className="flex items-center justify-between border-b border-white/10 p-3.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">Weather Intelligence</span>
            <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[9px] font-bold text-cyan-300 uppercase">Live</span>
          </div>
          <button onClick={() => setLeftPanelOpen(false)} className="text-slate-400 hover:text-white text-xs">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs font-mono">
          {/* Severe Threat Risk Score Gauge */}
          <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-bold uppercase text-red-400">Personal Risk Score</span>
              <span className="text-xl font-black text-white">84<span className="text-xs text-red-400">/100</span></span>
            </div>
            <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
              <div className="h-full bg-red-500 rounded-full" style={{ width: '84%' }} />
            </div>
            <p className="mt-2 text-[10px] text-slate-300 font-sans leading-tight">
              Favorable low-level shear (0-1km SRH &gt; 220 m²/s²) supports right-moving supercells and potential tornadogenesis.
            </p>
          </div>

          {/* Hyperlocal Atmospheric Telemetry */}
          <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3 space-y-2">
            <div className="text-[11px] font-bold text-cyan-300 font-sans">Neighborhood Telemetry ({radarSite})</div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>Temp: <b className="text-white">78°F</b></div>
              <div>Dewpoint: <b className="text-emerald-400">68°F</b></div>
              <div>Feels-Like: <b className="text-white">82°F</b></div>
              <div>Wet-Bulb: <b className="text-cyan-400">71°F</b></div>
              <div>Pressure: <b className="text-slate-300">29.92 inHg</b></div>
              <div>Humidity: <b className="text-slate-300">72%</b></div>
            </div>
          </div>
        </div>
      </aside>

      {/* Toggle Button for Left Intelligence Sidebar */}
      {!leftPanelOpen && (
        <button
          onClick={() => setLeftPanelOpen(true)}
          className="absolute left-3 top-16 z-20 flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-slate-950/85 text-cyan-400 shadow-xl backdrop-blur-xl"
          title="Open Intelligence Dashboard"
        >
          📊
        </button>
      )}

      {/* 3. RIGHT LAYER & PLACEFILE RACK (WeatherWise Layer Manager) */}
      <aside className={`absolute right-3 top-16 bottom-16 z-20 w-72 rounded-2xl border border-white/10 bg-slate-950/90 shadow-2xl backdrop-blur-2xl transition-all duration-300 flex flex-col ${
        rightPanelOpen ? 'translate-x-0' : 'translate-x-[110%]'
      }`}>
        <div className="flex items-center justify-between border-b border-white/10 p-3.5">
          <span className="text-sm font-bold text-white">Workstation Layers</span>
          <button onClick={() => setRightPanelOpen(false)} className="text-slate-400 hover:text-white text-xs">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
          {/* Dual-Pol & Algorithmic Products */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Products</div>
            <div className="grid grid-cols-3 gap-1.5 font-bold text-[11px]">
              {(['ref', 'vel', 'srvel', 'cc', 'zdr', 'kdp', 'mesh', 'azshear', 'tops'] as RadarProduct[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setProduct(p)}
                  className={`rounded-lg py-1.5 uppercase transition ${
                    product === p ? 'bg-cyan-600 text-white shadow-md' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Elevation Tilt Slices */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Elevation Tilt</div>
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

      {/* Toggle Button for Right Layer Rack */}
      {!rightPanelOpen && (
        <button
          onClick={() => setRightPanelOpen(true)}
          className="absolute right-3 top-16 z-20 flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-slate-950/85 text-cyan-400 shadow-xl backdrop-blur-xl"
          title="Open Layer Rack"
        >
          ⚙
        </button>
      )}

      {/* 4. BOTTOM FLOATING PLAYBACK TIMELINE */}
      <footer className="pointer-events-none absolute bottom-3 left-0 right-0 z-20 flex justify-center px-4">
        <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-white/15 bg-slate-950/90 px-4 py-2 shadow-2xl backdrop-blur-2xl">
          <button className="text-slate-300 hover:text-white">‹</button>
          <button className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-600 text-white text-xs">▶</button>
          <button className="text-slate-300 hover:text-white">›</button>
          <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="w-3/4 h-full bg-cyan-400 rounded-full" />
          </div>
          <span className="font-mono text-xs font-bold text-emerald-400">LIVE · 8s</span>
        </div>
      </footer>

    </div>
  );
}
