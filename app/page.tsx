'use client';

import { useEffect, useState } from 'react';
import { RadarMap, BasemapType, ModeTab } from '../components/RadarMap';
import { WeatherWiseRadarCard } from '../components/WeatherWiseRadarCard';
import { WeatherWiseAlertsPanel, WeatherAlertItem } from '../components/WeatherWiseAlertsPanel';
import { RadarSiteRegistry, RadarStation } from '../lib/radar/radar-provider';

type RadarProduct = 'ref' | 'ref_x' | 'max_ref' | 'vel' | 'cc' | 'zdr';
type SpcDay = 'Day 1' | 'Day 2' | 'Day 3';

const BASEMAP_STORAGE_KEY = 'mesovortex_basemap_preference';

export default function MesoVortexWorkstation() {
  const [tab, setTab] = useState<ModeTab>('Radar');
  const [spcDay, setSpcDay] = useState<SpcDay>('Day 1');
  const [product, setProduct] = useState<RadarProduct>('ref');
  const [tilt, setTilt] = useState('0.5');
  const [radarSite, setRadarSite] = useState('US');
  const [isPlaying, setIsPlaying] = useState(false);

  const [basemap, setBasemap] = useState<BasemapType>('satellite-streets');
  const [basemapStatus, setBasemapStatus] = useState('Satellite Streets (Default)');

  const [alertsOpen, setAlertsOpen] = useState(false);
  const [liveAlerts, setLiveAlerts] = useState<WeatherAlertItem[]>([]);

  const currentStation: RadarStation = RadarSiteRegistry.getStation(radarSite);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(BASEMAP_STORAGE_KEY) as BasemapType | null;
      if (saved === 'satellite-streets' || saved === 'custom-weather') {
        setBasemap(saved);
        setBasemapStatus(saved === 'satellite-streets' ? 'Satellite Streets (Default)' : 'Custom Weather');
      }
    } catch {
      // ignore storage
    }
  }, []);

  const handleSelectBasemap = (selected: BasemapType) => {
    setBasemap(selected);
    setBasemapStatus(selected === 'satellite-streets' ? 'Satellite Streets (Default)' : 'Custom Weather');
    try {
      localStorage.setItem(BASEMAP_STORAGE_KEY, selected);
    } catch {
      // ignore storage
    }
  };

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
          wfo: currentStation.callsign,
          expiresMin: Math.round(15 + Math.random() * 45),
        }));
        setLiveAlerts(items);
      })
      .catch((err) => console.warn('[Alerts Fetch Error]:', err));
  }, [currentStation.callsign]);

  const siteLabel =
    radarSite === 'US'
      ? 'United States Overview'
      : `${currentStation.name} (${currentStation.network.toUpperCase()})`;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#070c14] select-none font-sans">
      <div className="absolute top-0 left-0 right-0 z-40 flex h-5 text-[9px] font-black text-slate-900 shadow-md">
        <div className="flex flex-1 items-center justify-center bg-[#c1e9c1]">General Risk</div>
        <div className="flex flex-1 items-center justify-center bg-[#7fc57f]">Marginal Risk</div>
        <div className="flex flex-1 items-center justify-center bg-[#f6f67d]">Slight Risk</div>
        <div className="flex flex-1 items-center justify-center bg-[#edbf69]">Enhanced Risk</div>
        <div className="flex flex-1 items-center justify-center bg-[#e56d6d] text-white">Moderate Risk</div>
        <div className="flex flex-1 items-center justify-center bg-[#ff66ff] text-white">High Risk</div>
      </div>

      <div className="pointer-events-none absolute left-0 right-0 top-7 z-40 flex items-center justify-between px-4">
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="flex items-center rounded-full border border-slate-700 bg-slate-950/90 p-0.5 shadow-xl backdrop-blur-md">
            <button
              onClick={() => handleSelectBasemap('satellite-streets')}
              className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold transition ${
                basemap === 'satellite-streets' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Satellite
            </button>
            <button
              onClick={() => handleSelectBasemap('custom-weather')}
              className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold transition ${
                basemap === 'custom-weather' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Custom
            </button>
          </div>
          <div className="hidden text-[10px] text-slate-400 sm:block">{basemapStatus}</div>
        </div>

        <div className="pointer-events-auto flex flex-col items-center">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 shadow-2xl">
            <button
              onClick={() => setRadarSite('US')}
              className="cursor-pointer border-r border-slate-200 pr-2 text-xs font-black text-slate-900"
              title="Reset to national view"
            >
              MesoVortex
            </button>
            <div className="flex items-center gap-1 text-xs font-bold">
              {(['Radar', 'Composite', 'Satellite', 'Outlooks'] as ModeTab[]).map((modeTab) => (
                <button
                  key={modeTab}
                  onClick={() => setTab(modeTab)}
                  className={`cursor-pointer rounded-full px-3 py-1 transition ${
                    tab === modeTab ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {modeTab}
                </button>
              ))}
            </div>
          </div>

          {tab === 'Outlooks' && (
            <div className="mt-1.5 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-xl">
              <span className="px-1">Categorical</span>
              <span className="text-slate-300">|</span>
              {(['Day 1', 'Day 2', 'Day 3'] as SpcDay[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setSpcDay(d)}
                  className={`cursor-pointer rounded-full px-2.5 py-0.5 text-[11px] transition ${
                    spcDay === d ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => setAlertsOpen((v) => !v)}
          className="pointer-events-auto cursor-pointer rounded-full border border-amber-300 bg-amber-400 px-3 py-1.5 text-xs font-black text-slate-950 shadow-xl transition hover:bg-amber-300"
        >
          {liveAlerts.length || 0} alerts
        </button>
      </div>

      <div className="absolute inset-0">
        <RadarMap
          product={product === 'ref_x' || product === 'max_ref' ? 'ref' : product}
          radarSite={radarSite}
          mode={tab}
          basemap={basemap}
          tilt={tilt}
          spcDay={spcDay}
          filterNetwork={undefined}
          onSelectSite={(id) => setRadarSite(id)}
        />
      </div>

      <WeatherWiseRadarCard
        siteId={radarSite === 'US' ? 'US CONUS' : currentStation.id}
        siteName={siteLabel}
        product={product}
        tilt={tilt}
        isPlaying={isPlaying}
        onSelectProduct={(p) => setProduct(p)}
        onSelectTilt={(t) => setTilt(t)}
        onTogglePlay={() => setIsPlaying((p) => !p)}
      />

      {alertsOpen && (
        <WeatherWiseAlertsPanel
          alerts={liveAlerts}
          onClose={() => setAlertsOpen(false)}
          onSelectAlert={() => {}}
        />
      )}
    </div>
  );
}
