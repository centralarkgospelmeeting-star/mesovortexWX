'use client';

import { useState, useEffect, useCallback } from 'react';
import { RadarMap } from '../components/RadarMap';
import { Sidebar } from '../components/Sidebar';
import { WeatherAssistant } from '../components/WeatherAssistant';
import { AlertBanner } from '../components/AlertBanner';
import { METARPanel } from '../components/METARPanel';
import { RADAR_SITES, RADAR_PRODUCTS } from '../lib/radar-config';

type RadarProduct = 'ref' | 'vel' | 'srvel' | 'cc' | 'zdr' | 'kdp';
type MapType = 'street' | 'terrain' | 'satellite' | 'globe';
type LayoutMode = 'single' | 'dual';

export default function MesoVortexWX() {
  const [product, setProduct] = useState<RadarProduct>('ref');
  const [product2, setProduct2] = useState<RadarProduct>('vel');
  const [radarSite, setRadarSite] = useState('KTLX');
  const [mapType, setMapType] = useState<MapType>('street');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('single');
  const [showAssistant, setShowAssistant] = useState(false);
  const [showMetar, setShowMetar] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [frameIndex, setFrameIndex] = useState(0);

  // Load active alerts
  useEffect(() => {
    async function loadAlerts() {
      try {
        const res = await fetch('/api/alerts');
        if (res.ok) {
          const data = await res.json();
          setAlerts(data.features?.slice(0, 12) || []);
        }
      } catch {}
    }
    loadAlerts();
    const id = setInterval(loadAlerts, 60_000);
    return () => clearInterval(id);
  }, []);

  // Simple playback simulation
  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      setFrameIndex((i) => (i + 1) % 6);
    }, 1100);
    return () => clearInterval(id);
  }, [isPlaying]);

  const currentSite = RADAR_SITES.find((s) => s.id === radarSite) || RADAR_SITES[0];
  const productLabel = RADAR_PRODUCTS.find((p) => p.key === product)?.label || product.toUpperCase();

  return (
    <div className="radar-app flex h-dvh w-full flex-col overflow-hidden bg-[#0b1220] text-slate-100">
      {/* Top Toolbar */}
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-slate-800 bg-[#0f172a] px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-lg font-black text-white shadow-lg shadow-cyan-500/20">
            ⚡
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-white">MesoVortex<span className="text-cyan-400">WX</span></div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400">Pro Radar · AI · Models</div>
          </div>
        </div>

        <div className="ml-4 flex items-center gap-1 rounded-lg bg-slate-900/80 p-1">
          {(['ref', 'vel', 'srvel', 'cc', 'zdr', 'kdp'] as RadarProduct[]).map((p) => (
            <button
              key={p}
              onClick={() => setProduct(p)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase transition ${
                product === p
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <select
            value={radarSite}
            onChange={(e) => setRadarSite(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
          >
            {RADAR_SITES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1 rounded-lg bg-slate-900 p-1">
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
            {layoutMode === 'single' ? 'Dual Pane' : 'Single'}
          </button>

          <button
            onClick={() => setShowAssistant(true)}
            className="rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:from-violet-500 hover:to-indigo-500"
          >
            AI Assistant
          </button>
        </div>
      </header>

      {/* Alert Banner */}
      {alerts.length > 0 && (
        <div className="shrink-0">
          <AlertBanner alerts={alerts} />
        </div>
      )}

      {/* Main Content */}
      <div className="relative flex min-h-0 flex-1">
        {/* Left Sidebar */}
        <Sidebar
          product={product}
          setProduct={setProduct}
          radarSite={radarSite}
          setRadarSite={setRadarSite}
        />

        {/* Map Area */}
        <div className="relative flex min-w-0 flex-1 flex-col">
          <div className={`grid min-h-0 flex-1 ${layoutMode === 'dual' ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <div className="relative min-h-0">
              <RadarMap product={product} radarSite={radarSite} mapType={mapType} />
            </div>
            {layoutMode === 'dual' && (
              <div className="relative min-h-0 border-l border-slate-800">
                <RadarMap product={product2} radarSite={radarSite} mapType={mapType} />
              </div>
            )}
          </div>

          {/* Timeline Bar */}
          <div className="flex h-12 shrink-0 items-center gap-4 border-t border-slate-800 bg-[#0f172a]/90 px-4 backdrop-blur">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-600 text-white hover:bg-cyan-500"
            >
              {isPlaying ? '❚❚' : '▶'}
            </button>
            <div className="flex flex-1 items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-cyan-500 transition-all"
                  style={{ width: `${((frameIndex + 1) / 6) * 100}%` }}
                />
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {['-50m', '-40m', '-30m', '-20m', '-10m', 'LIVE'][frameIndex]}
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              {currentSite.name} · {productLabel}
            </div>
          </div>
        </div>

        {/* Right panels */}
        {showMetar && (
          <div className="w-80 shrink-0 border-l border-slate-800 bg-slate-950">
            <METARPanel site={radarSite} onClose={() => setShowMetar(false)} />
          </div>
        )}
      </div>

      {/* AI Assistant Overlay */}
      {showAssistant && (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/40 p-4 sm:items-center sm:justify-end">
          <div className="h-[70vh] w-full max-w-md overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl">
            <WeatherAssistant
              context={{
                site: radarSite,
                product: productLabel,
                alerts: alerts.map((a) => a.properties?.event || 'Alert'),
              }}
              onClose={() => setShowAssistant(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
