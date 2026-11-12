'use client';

import { useState, useEffect } from 'react';
import { RADAR_SITES } from '../lib/radar-config';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  basemap: string;
  onSelectBasemap: (b: string) => void;
  units: 'imperial' | 'metric';
  onSelectUnits: (u: 'imperial' | 'metric') => void;
  audioSirenEnabled: boolean;
  onToggleAudioSiren: () => void;
  ttsEnabled: boolean;
  onToggleTts: () => void;
  ttsVolume: number;
  onChangeTtsVolume: (vol: number) => void;
};

const CATEGORIES = [
  { id: 'General', icon: '⚙️' },
  { id: 'Map', icon: '🗺️' },
  { id: 'Time', icon: '⏱️' },
  { id: 'Radar', icon: '📡' },
  { id: 'Composite', icon: '🌀' },
  { id: 'Satellite', icon: '🛰️' },
  { id: 'Models', icon: '📊' },
  { id: 'Outlooks', icon: '🎯' },
  { id: 'Warnings', icon: '⚠️' },
  { id: 'Notifications', icon: '🔔' },
  { id: 'Appearance', icon: '🎨' },
  { id: 'Data & Performance', icon: '⚡' },
];

export function SettingsWorkspace({
  isOpen,
  onClose,
  basemap,
  onSelectBasemap,
  units,
  onSelectUnits,
  audioSirenEnabled,
  onToggleAudioSiren,
  ttsEnabled,
  onToggleTts,
  ttsVolume,
  onChangeTtsVolume,
}: Props) {
  const [selectedCat, setSelectedCat] = useState('Map');
  const [defaultProduct, setDefaultProduct] = useState('Radar');
  const [defaultSite, setDefaultSite] = useState('KLZK');
  const [timeFormat, setTimeFormat] = useState<'utc' | 'local'>('utc');
  const [showStateBorders, setShowStateBorders] = useState(true);
  const [showCountyBorders, setShowCountyBorders] = useState(true);
  const [showRoadLabels, setShowRoadLabels] = useState(true);
  const [maxFrames, setMaxFrames] = useState(10);

  // Load saved preferences from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('mesovortex_user_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.defaultProduct) setDefaultProduct(parsed.defaultProduct);
          if (parsed.defaultSite) setDefaultSite(parsed.defaultSite);
          if (parsed.timeFormat) setTimeFormat(parsed.timeFormat);
          if (parsed.showStateBorders !== undefined) setShowStateBorders(parsed.showStateBorders);
          if (parsed.showCountyBorders !== undefined) setShowCountyBorders(parsed.showCountyBorders);
          if (parsed.showRoadLabels !== undefined) setShowRoadLabels(parsed.showRoadLabels);
          if (parsed.maxFrames) setMaxFrames(parsed.maxFrames);
        }
      } catch {}
    }
  }, []);

  // Save changes
  const saveSetting = (key: string, value: any) => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('mesovortex_user_settings') || '{}';
        const parsed = JSON.parse(saved);
        parsed[key] = value;
        localStorage.setItem('mesovortex_user_settings', JSON.stringify(parsed));
      } catch {}
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-2xl animate-fade-in select-none font-sans">
      <div className="flex h-[84vh] w-full max-w-4xl rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden">
        {/* Left Category Sidebar (Section 13 & Wireframe 6) */}
        <div className="w-60 border-r border-slate-800 bg-slate-900/60 p-4 space-y-1 text-xs overflow-y-auto">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-2">
            <span className="font-black uppercase text-xs tracking-wider text-cyan-400">
              SETTINGS WORKSPACE
            </span>
          </div>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(cat.id)}
              className={`w-full text-left rounded-xl p-2.5 font-bold transition flex items-center gap-2 cursor-pointer ${
                selectedCat === cat.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.id}</span>
            </button>
          ))}
        </div>

        {/* Right Settings Controls Detail Panel */}
        <div className="flex-1 p-6 space-y-5 overflow-y-auto text-xs bg-slate-950">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 font-mono">CONFIGURATION</span>
              <h2 className="text-base font-extrabold text-white">{selectedCat} Settings</h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl bg-slate-800 hover:bg-slate-700 px-3.5 py-1.5 text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer"
            >
              ✕ Close
            </button>
          </div>

          {/* 1. GENERAL SETTINGS */}
          {selectedCat === 'General' && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block font-bold text-slate-300">Default Startup Product</label>
                <select
                  value={defaultProduct}
                  onChange={(e) => {
                    setDefaultProduct(e.target.value);
                    saveSetting('defaultProduct', e.target.value);
                  }}
                  className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 p-2 font-bold text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="Radar">Radar (High-Resolution NEXRAD)</option>
                  <option value="3D Radar">3D Radar Volumetric</option>
                  <option value="Composite">Composite Reflectivity</option>
                  <option value="Satellite">Satellite (GOES-East GeoColor)</option>
                  <option value="Models">Numerical Weather Models (HRRR)</option>
                  <option value="Outlooks">SPC Convective Outlooks</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-300">Default Home Radar Station</label>
                <select
                  value={defaultSite}
                  onChange={(e) => {
                    setDefaultSite(e.target.value);
                    saveSetting('defaultSite', e.target.value);
                  }}
                  className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 p-2 font-bold text-white focus:border-cyan-500 focus:outline-none"
                >
                  {RADAR_SITES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.id} — {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block font-bold text-slate-300">Unit System</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => onSelectUnits('imperial')}
                    className={`rounded-xl border px-4 py-2 font-bold transition cursor-pointer ${
                      units === 'imperial'
                        ? 'border-blue-500 bg-blue-950/40 text-blue-200 shadow'
                        : 'border-slate-800 bg-slate-900 text-slate-400'
                    }`}
                  >
                    Imperial (°F, mph, inHg, kt)
                  </button>
                  <button
                    onClick={() => onSelectUnits('metric')}
                    className={`rounded-xl border px-4 py-2 font-bold transition cursor-pointer ${
                      units === 'metric'
                        ? 'border-blue-500 bg-blue-950/40 text-blue-200 shadow'
                        : 'border-slate-800 bg-slate-900 text-slate-400'
                    }`}
                  >
                    Metric (°C, km/h, hPa, m/s)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. MAP SETTINGS */}
          {selectedCat === 'Map' && (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block font-bold text-slate-300">Map Style</label>
                <div className="grid grid-cols-2 gap-2 max-w-lg">
                  <button
                    onClick={() => onSelectBasemap('custom-weather')}
                    className={`rounded-2xl border p-3.5 text-left font-bold transition cursor-pointer ${
                      basemap === 'custom-weather'
                        ? 'border-blue-500 bg-blue-950/40 text-blue-200 ring-2 ring-blue-500/40'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="text-sm">🎨 Custom Weather Dark</div>
                    <div className="text-[11px] text-slate-500 font-normal mt-0.5">High-contrast radar backdrop</div>
                  </button>

                  <button
                    onClick={() => onSelectBasemap('satellite-streets')}
                    className={`rounded-2xl border p-3.5 text-left font-bold transition cursor-pointer ${
                      basemap === 'satellite-streets'
                        ? 'border-blue-500 bg-blue-950/40 text-blue-200 ring-2 ring-blue-500/40'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="text-sm">🛰️ Satellite Streets</div>
                    <div className="text-[11px] text-slate-500 font-normal mt-0.5">High-res aerial imagery + roads</div>
                  </button>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-2.5">
                <span className="font-bold text-slate-300 block mb-1">Geographic Boundaries &amp; Labels</span>
                {[
                  {
                    label: 'State Boundaries',
                    val: showStateBorders,
                    toggle: () => {
                      setShowStateBorders(!showStateBorders);
                      saveSetting('showStateBorders', !showStateBorders);
                    },
                  },
                  {
                    label: 'County Boundaries',
                    val: showCountyBorders,
                    toggle: () => {
                      setShowCountyBorders(!showCountyBorders);
                      saveSetting('showCountyBorders', !showCountyBorders);
                    },
                  },
                  {
                    label: 'City and Highway Labels',
                    val: showRoadLabels,
                    toggle: () => {
                      setShowRoadLabels(!showRoadLabels);
                      saveSetting('showRoadLabels', !showRoadLabels);
                    },
                  },
                ].map((item) => (
                  <label key={item.label} className="flex items-center justify-between text-slate-300 cursor-pointer max-w-sm">
                    <span>{item.label}</span>
                    <input
                      type="checkbox"
                      checked={item.val}
                      onChange={item.toggle}
                      className="accent-cyan-400 h-4 w-4 rounded cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* 3. TIME SETTINGS */}
          {selectedCat === 'Time' && (
            <div className="space-y-4">
              <label className="mb-2 block font-bold text-slate-300">Time Display Standard</label>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setTimeFormat('utc');
                    saveSetting('timeFormat', 'utc');
                  }}
                  className={`rounded-xl border px-4 py-2 font-bold transition cursor-pointer ${
                    timeFormat === 'utc'
                      ? 'border-blue-500 bg-blue-950/40 text-blue-200'
                      : 'border-slate-800 bg-slate-900 text-slate-400'
                  }`}
                >
                  Coordinated Universal Time (UTC / Zulu)
                </button>
                <button
                  onClick={() => {
                    setTimeFormat('local');
                    saveSetting('timeFormat', 'local');
                  }}
                  className={`rounded-xl border px-4 py-2 font-bold transition cursor-pointer ${
                    timeFormat === 'local'
                      ? 'border-blue-500 bg-blue-950/40 text-blue-200'
                      : 'border-slate-800 bg-slate-900 text-slate-400'
                  }`}
                >
                  Local Device Time (12-Hour AM/PM)
                </button>
              </div>
            </div>
          )}

          {/* 4. WARNINGS & NOTIFICATIONS (Section 11) */}
          {(selectedCat === 'Warnings' || selectedCat === 'Notifications') && (
            <div className="space-y-4 max-w-lg">
              <div className="p-3.5 rounded-2xl border border-red-500/30 bg-red-950/20 space-y-3">
                <div className="font-bold text-white text-sm flex items-center gap-2">
                  <span>🚨</span> Emergency Audio Siren (1050 Hz NOAA Alert Tone)
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Generates the official 1050 Hz weather radio tone when your GPS location falls inside an active Tornado or Severe Thunderstorm Warning polygon.
                </p>
                <label className="flex items-center justify-between text-slate-200 cursor-pointer pt-1">
                  <span>Enable 1050 Hz Alert Tone</span>
                  <input
                    type="checkbox"
                    checked={audioSirenEnabled}
                    onChange={onToggleAudioSiren}
                    className="accent-red-500 h-4 w-4 rounded cursor-pointer"
                  />
                </label>
              </div>

              <div className="p-3.5 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 space-y-3">
                <div className="font-bold text-white text-sm flex items-center gap-2">
                  <span>🗣️</span> Spoken Warning Announcements (Text-to-Speech)
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Reads official National Weather Service bulletins aloud: &quot;The National Weather Service has issued a Tornado Warning for southeastern White County in central Arkansas.&quot;
                </p>
                <label className="flex items-center justify-between text-slate-200 cursor-pointer pt-1">
                  <span>Enable Spoken TTS Announcements</span>
                  <input
                    type="checkbox"
                    checked={ttsEnabled}
                    onChange={onToggleTts}
                    className="accent-cyan-400 h-4 w-4 rounded cursor-pointer"
                  />
                </label>

                {ttsEnabled && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-800">
                    <div className="flex justify-between font-bold text-slate-300 text-[11px]">
                      <span>Speech Volume</span>
                      <span className="font-mono text-cyan-400">{Math.round(ttsVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={1.0}
                      step={0.05}
                      value={ttsVolume}
                      onChange={(e) => onChangeTtsVolume(parseFloat(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5. DATA & PERFORMANCE */}
          {selectedCat === 'Data & Performance' && (
            <div className="space-y-4 max-w-lg">
              <div>
                <label className="mb-1 block font-bold text-slate-300">
                  Radar Frame Playback Cache
                </label>
                <div className="flex gap-2">
                  {[5, 10, 15, 20].map((f) => (
                    <button
                      key={f}
                      onClick={() => {
                        setMaxFrames(f);
                        saveSetting('maxFrames', f);
                      }}
                      className={`rounded-xl border px-3.5 py-1.5 font-bold transition cursor-pointer ${
                        maxFrames === f
                          ? 'border-blue-500 bg-blue-950/40 text-blue-200'
                          : 'border-slate-800 bg-slate-900 text-slate-400'
                      }`}
                    >
                      {f} Frames
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3">
                <span className="font-bold text-slate-300 block mb-1">Hardware Acceleration</span>
                <p className="text-slate-400 text-[11px]">
                  WebGL tile pipeline is currently active for maximum 60fps frame rate and instantaneous pan/zoom.
                </p>
              </div>
            </div>
          )}

          {/* Other Categories */}
          {!['General', 'Map', 'Time', 'Warnings', 'Notifications', 'Data & Performance'].includes(selectedCat) && (
            <div className="p-8 text-center text-xs text-slate-500">
              {selectedCat} preferences are configured and saved.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
