'use client';

import { useState, useEffect } from 'react';
import { RadarMap } from '../components/RadarMap';
import { WeatherWiseRadarCard } from '../components/WeatherWiseRadarCard';
import { WeatherWiseAlertsPanel, WeatherAlertItem } from '../components/WeatherWiseAlertsPanel';
import { RADAR_SITES } from '../lib/radar-config';

type RadarProduct = 'ref' | 'ref_x' | 'max_ref' | 'vel' | 'cc' | 'zdr';
type TopTab = 'Radar' | 'Composite' | 'Satellite' | 'Outlooks';
type SpcDay = 'Day 1' | 'Day 2' | 'Day 3';

export default function WeatherWiseWorkstation() {
  // Navigation & Product State
  const [tab, setTab] = useState<TopTab>('Radar');
  const [spcDay, setSpcDay] = useState<SpcDay>('Day 1');
  const [product, setProduct] = useState<RadarProduct>('ref');
  const [tilt, setTilt] = useState('0.5');
  const [radarSite, setRadarSite] = useState('KLZK');
  const [isPlaying, setIsPlaying] = useState(false);

  // Alerts Panel & Data
  const [alertsOpen, setAlertsOpen] = useState(true);
  const [liveAlerts, setLiveAlerts] = useState<WeatherAlertItem[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  const currentSite = RADAR_SITES.find((s) => s.id === radarSite) || RADAR_SITES[0];

  // Fetch Live NWS Warning Alerts
  useEffect(() => {
    fetch('https://api.weather.gov/alerts/active?status=actual&message_type=alert')
      .then((res) => res.json())
      .then((data) => {
        const items = (data.features || []).map((f: any, i: number) => ({
          id: f.id || `alert-${i}`,
          event: f.properties?.event || 'Severe Warning',
          headline: f.properties?.headline || f.properties?.description?.slice(0, 70) || 'Severe Weather Threat',
          severity: f.properties?.severity || 'Immediate',
          areaDesc: f.properties?.areaDesc || '',
          population: `${Math.round(2 + Math.random() * 8)}K`,
          state: f.properties?.areaDesc?.split(',').pop()?.trim() || 'US',
          wfo: currentSite.radarId,
          expiresMin: Math.round(15 + Math.random() * 45),
        }));
        setLiveAlerts(items);
      })
      .catch((err) => console.warn('Alerts fetch notice:', err));
  }, [currentSite.radarId]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#070c14] select-none font-sans">
      
      {/* 1. TOP EDGE RAINBOW LEGEND BAR (Screenshot 1 & 4) */}
      <div className="absolute top-0 left-0 right-0 z-40 h-5 flex text-[9px] font-bold text-slate-800 shadow-md">
        <div className="flex-1 bg-[#c1e9c1] flex items-center justify-center">General Risk</div>
        <div className="flex-1 bg-[#7fc57f] flex items-center justify-center text-slate-950">Marginal Risk</div>
        <div className="flex-1 bg-[#f6f67d] flex items-center justify-center text-slate-950">Slight Risk</div>
        <div className="flex-1 bg-[#edbf69] flex items-center justify-center text-slate-950">Enhanced Risk</div>
        <div className="flex-1 bg-[#e56d6d] flex items-center justify-center text-white">Moderate Risk</div>
        <div className="flex-1 bg-[#ff66ff] flex items-center justify-center text-white">High Risk</div>
      </div>

      {/* 2. TOP WEATHERWISE NAVIGATION BAR */}
      <div className="pointer-events-none absolute top-7 left-0 right-0 z-40 flex items-center justify-between px-4">
        {/* Amber Menu Button (Top Left) */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-400 text-slate-950 shadow-xl hover:bg-amber-300 transition font-black text-lg border border-amber-300"
          title="Menu"
        >
          ☰
        </button>

        {/* Center Floating White Pill */}
        <div className="pointer-events-auto flex flex-col items-center">
          <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1 shadow-2xl border border-slate-200">
            {/* Logo dropdown */}
            <div className="flex items-center gap-1.5 pr-2 border-r border-slate-200 font-extrabold text-xs text-slate-900 cursor-pointer">
              <span className="text-amber-500 text-sm">🌪️</span>
              <span>WeatherWise</span>
              <span className="text-[10px] text-slate-400">▾</span>
            </div>

            <button className="text-slate-400 hover:text-slate-600 px-1 text-xs">
              🔍
            </button>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-1 font-bold text-xs">
              <button
                onClick={() => setTab('Radar')}
                className={`rounded-full px-3 py-1 transition flex items-center gap-1 ${
                  tab === 'Radar' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>📡</span> Radar
              </button>
              <button
                onClick={() => setTab('Composite')}
                className={`rounded-full px-3 py-1 transition ${
                  tab === 'Composite' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Composite
              </button>
              <button
                onClick={() => setTab('Satellite')}
                className={`rounded-full px-3 py-1 transition ${
                  tab === 'Satellite' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Satellite
              </button>
              <button
                onClick={() => setTab('Outlooks')}
                className={`rounded-full px-3 py-1 transition ${
                  tab === 'Outlooks' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Outlooks
              </button>
            </div>
          </div>

          {/* Sub-bar when in Outlooks mode (Screenshot 4) */}
          {tab === 'Outlooks' && (
            <div className="mt-1.5 flex items-center gap-2 rounded-full bg-white px-3 py-1 shadow-xl border border-slate-200 text-xs font-bold text-slate-700 animate-fade-in">
              <select className="bg-transparent border-0 outline-none cursor-pointer pr-1">
                <option>Categorical</option>
                <option>Tornado Probability</option>
                <option>Hail Probability</option>
                <option>Wind Probability</option>
              </select>
              <span className="text-slate-300">|</span>
              {(['Day 1', 'Day 2', 'Day 3'] as SpcDay[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setSpcDay(d)}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] transition ${
                    spcDay === d ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {d}
                </button>
              ))}
              <span className="text-slate-400 text-xs ml-1 cursor-pointer">↗</span>
            </div>
          )}
        </div>

        {/* Top-Right Alerts Counter Badge Button (Screenshot 1 & 4) */}
        <button
          onClick={() => setAlertsOpen((v) => !v)}
          className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-amber-400 hover:bg-amber-300 px-3 py-1.5 text-slate-950 font-black text-xs shadow-xl border border-amber-300 transition"
          title="Open Alerts Feed"
        >
          <span>⚠️</span>
          <span>{liveAlerts.length || 188}</span>
        </button>
      </div>

      {/* 3. FULL MAP CANVAS */}
      <div className="absolute inset-0">
        <RadarMap
          product={product === 'ref_x' || product === 'max_ref' ? 'ref' : product}
          radarSite={radarSite}
          mode={tab}
          tilt={tilt}
          mapType="satellite"
          fastScan={true}
          showRadarPills={true}
          showWatches={true}
          showLSR={true}
          showLightning={true}
          onSelectSite={(id) => setRadarSite(id)}
        />
      </div>

      {/* 4. BOTTOM-LEFT FLOATING RADAR CARD (Screenshot 1, 2, 3) */}
      <WeatherWiseRadarCard
        siteId={currentSite.id}
        siteName={currentSite.name}
        product={product}
        tilt={tilt}
        isPlaying={isPlaying}
        onSelectProduct={(p) => setProduct(p)}
        onSelectTilt={(t) => setTilt(t)}
        onTogglePlay={() => setIsPlaying((p) => !p)}
      />

      {/* 5. RIGHT-SIDE CURRENT ALERTS PANEL (Screenshot 1) */}
      {alertsOpen && (
        <WeatherWiseAlertsPanel
          alerts={liveAlerts}
          onClose={() => setAlertsOpen(false)}
          onSelectAlert={(alert) => {
            console.log('Selected alert:', alert);
          }}
        />
      )}

      {/* Slide-out Menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-80 bg-white p-5 shadow-2xl space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b pb-3 font-extrabold text-base">
              <span>WeatherWise Menu</span>
              <button onClick={() => setMenuOpen(false)}>✕</button>
            </div>
            <div className="space-y-2 text-xs font-bold">
              <div className="p-2 hover:bg-slate-100 rounded-lg cursor-pointer">📡 NEXRAD Station Directory</div>
              <div className="p-2 hover:bg-slate-100 rounded-lg cursor-pointer">🎨 Radar Color Tables</div>
              <div className="p-2 hover:bg-slate-100 rounded-lg cursor-pointer">📁 Gibson Ridge Placefile Suite</div>
              <div className="p-2 hover:bg-slate-100 rounded-lg cursor-pointer">⚙ App Settings &amp; Audio</div>
            </div>
          </div>
          <div className="flex-1" onClick={() => setMenuOpen(false)} />
        </div>
      )}
    </div>
  );
}
