'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { RadarMap, BasemapId } from '../components/RadarMap';
import { WeatherWiseRadarCard } from '../components/WeatherWiseRadarCard';
import { WeatherWiseAlertsPanel, WeatherAlertItem } from '../components/WeatherWiseAlertsPanel';
import { RADAR_SITES } from '../lib/radar-config';

type RadarProduct = 'ref' | 'ref_x' | 'max_ref' | 'vel' | 'cc' | 'zdr';
type TopTab = 'Radar' | 'Composite' | 'Satellite' | 'Outlooks';
type SpcDay = 'Day 1' | 'Day 2' | 'Day 3';

const BASEMAP_STORAGE_KEY = 'mesovortex_basemap_preference';

export default function MesoVortexWorkstation() {
  const [tab, setTab] = useState<TopTab>('Radar');
  const [spcDay, setSpcDay] = useState<SpcDay>('Day 1');
  const [product, setProduct] = useState<RadarProduct>('ref');
  const [tilt, setTilt] = useState('0.5');
  const [radarSite, setRadarSite] = useState('US');
  const [isPlaying, setIsPlaying] = useState(false);

  // Basemap State with local storage persistence and custom-weather default
  const [basemap, setBasemap] = useState<BasemapId>('custom-weather');
  const [basemapStatus, setBasemapStatus] = useState<string>('Custom Weather (Default)');

  // Alerts Panel state
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [liveAlerts, setLiveAlerts] = useState<WeatherAlertItem[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  const currentSite =
    RADAR_SITES.find((s) => s.id === radarSite) || RADAR_SITES[0];

  // 1. Load saved basemap preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(BASEMAP_STORAGE_KEY) as BasemapId | null;
      if (saved === 'satellite-streets' || saved === 'custom-weather') {
        setBasemap(saved);
        setBasemapStatus(saved === 'custom-weather' ? 'Custom Weather (Default)' : 'Satellite Streets');
      }
    } catch {
      // localStorage unavailable fallback
    }
  }, []);

  // 2. Save basemap preference to localStorage on change
  const handleSelectBasemap = (selected: BasemapId) => {
    setBasemap(selected);
    setBasemapStatus(selected === 'custom-weather' ? 'Custom Weather (Default)' : 'Satellite Streets');
    try {
      localStorage.setItem(BASEMAP_STORAGE_KEY, selected);
    } catch {
      // localStorage unavailable fallback
    }
  };

  // 3. Fallback handler: automatically switch to Satellite Streets if custom style fails
  const handleStyleLoadFailed = (failedBasemap: BasemapId) => {
    if (failedBasemap === 'custom-weather') {
      console.warn('[Basemap Fallback Triggered] Switching to Satellite Streets');
      setBasemap('satellite-streets');
      setBasemapStatus('Satellite Streets (Fallback)');
      try {
        localStorage.setItem(BASEMAP_STORAGE_KEY, 'satellite-streets');
      } catch {
        // localStorage unavailable fallback
      }
    }
  };

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

          {/* Basemap Selector Pill */}
          <div className="flex items-center rounded-full border border-slate-700 bg-slate-950/90 p-0.5 shadow-xl backdrop-blur-md">
            <button
              onClick={() => handleSelectBasemap('custom-weather')}
              className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                basemap === 'custom-weather'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Custom Weather
            </button>
            <button
              onClick={() => handleSelectBasemap('satellite-streets')}
              className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                basemap === 'satellite-streets'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Satellite Streets
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

            <button className="text-slate-400 hover:text-slate-600 px-1 text-xs cursor-pointer">
              🔍
            </button>

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

      {/* 3. FULL MAP CANVAS (Applies to all radar, satellite, warnings, SPC, and spotter layers) */}
      <div className="absolute inset-0">
        <RadarMap
          product={product === 'ref_x' || product === 'max_ref' ? 'ref' : product}
          radarSite={radarSite}
          mode={tab}
          basemap={basemap}
          tilt={tilt}
          spcDay={spcDay}
          onSelectSite={(id) => setRadarSite(id)}
          onStyleLoadFailed={handleStyleLoadFailed}
        />
      </div>

      {/* 4. BOTTOM-LEFT FLOATING RADAR CARD */}
      <WeatherWiseRadarCard
        siteId={radarSite === 'US' ? 'US CONUS' : currentSite.id}
        siteName={radarSite === 'US' ? 'United States Overview' : currentSite.name}
        product={product}
        tilt={tilt}
        isPlaying={isPlaying}
        onSelectProduct={(p) => setProduct(p)}
        onSelectTilt={(t) => setTilt(t)}
        onTogglePlay={() => setIsPlaying((p) => !p)}
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

      {/* Slide-out Layer Menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-80 bg-white p-5 shadow-2xl space-y-5 text-slate-800">
            <div className="flex items-center justify-between border-b pb-3 font-extrabold text-base">
              <div className="flex items-center gap-2">
                <Image src="/logo.png" alt="MesoVortex" width={24} height={24} className="rounded-full" />
                <span>MesoVortex Layers</span>
              </div>
              <button onClick={() => setMenuOpen(false)}>✕</button>
            </div>

            {/* Basemap Selection Section */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Basemap Selector
              </span>
              <div className="space-y-1.5">
                <button
                  onClick={() => {
                    handleSelectBasemap('custom-weather');
                    setMenuOpen(false);
                  }}
                  className={`w-full text-left rounded-xl p-2.5 text-xs font-bold transition flex items-center justify-between ${
                    basemap === 'custom-weather'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>🎨 Custom Weather (Default)</span>
                  {basemap === 'custom-weather' && <span>✓</span>}
                </button>

                <button
                  onClick={() => {
                    handleSelectBasemap('satellite-streets');
                    setMenuOpen(false);
                  }}
                  className={`w-full text-left rounded-xl p-2.5 text-xs font-bold transition flex items-center justify-between ${
                    basemap === 'satellite-streets'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>🛰️ Satellite Streets</span>
                  {basemap === 'satellite-streets' && <span>✓</span>}
                </button>
              </div>
              <div className="text-[10px] text-slate-500 pt-1">
                Active: <b>{basemapStatus}</b>
              </div>
            </div>

            {/* View Reset */}
            <div className="border-t pt-3 space-y-2 text-xs font-bold">
              <button
                onClick={() => {
                  setRadarSite('US');
                  setMenuOpen(false);
                }}
                className="w-full text-left rounded-xl p-2.5 hover:bg-slate-100 text-slate-700"
              >
                🗺️ Reset View to Entire United States
              </button>
            </div>
          </div>
          <div className="flex-1" onClick={() => setMenuOpen(false)} />
        </div>
      )}
    </div>
  );
}
