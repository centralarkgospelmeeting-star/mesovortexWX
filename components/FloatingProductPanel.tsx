'use client';

import { useState } from 'react';
import { MainNavTab } from './MainNavbar';
import { RADAR_SITES } from '../lib/radar-config';

type Props = {
  tab: MainNavTab;
  currentSiteId: string;
  onSelectSite: (id: string) => void;
  product: string;
  onSelectProduct: (p: string) => void;
  tilt: string;
  onSelectTilt: (t: string) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStepFrame: (dir: -1 | 1) => void;
  onGoLive: () => void;
  timestampLabel: string;
  radarOpacity: number;
  onChangeOpacity: (op: number) => void;
  // Overlays
  showLightning: boolean;
  onToggleLightning: () => void;
  showLSR: boolean;
  onToggleLSR: () => void;
  showWatches: boolean;
  onToggleWatches: () => void;
  showStormTracks: boolean;
  onToggleStormTracks: () => void;
  showRadarPills: boolean;
  onToggleRadarPills: () => void;
};

const RADAR_PRODUCTS = [
  { key: 'ref', label: 'Base Reflectivity' },
  { key: 'vel', label: 'Base Velocity' },
  { key: 'srvel', label: 'Storm Relative Velocity' },
  { key: 'cc', label: 'Correlation Coefficient' },
  { key: 'zdr', label: 'Differential Reflectivity' },
  { key: 'kdp', label: 'Specific Diff Phase' },
  { key: 'mesh', label: 'MESH Hail Swath' },
  { key: 'azshear', label: 'AzShear Rotation Track' },
  { key: 'tops', label: 'Echo Tops' },
  { key: 'vil', label: 'Vertically Integrated Liquid' },
];

const COMPOSITE_PRODUCTS = [
  { key: 'comp_ref', label: 'Composite Reflectivity' },
  { key: 'max_ref', label: 'Max Composite Reflectivity' },
  { key: 'qpe', label: 'Precipitation Composite' },
  { key: 'rot_comp', label: 'Rotation Composite' },
  { key: 'hail_comp', label: 'Hail Composite' },
];

const SATELLITE_PRODUCTS = [
  { key: 'geocolor', label: 'GeoColor (Visible)' },
  { key: 'clean_ir', label: 'Clean Infrared (Ch 13)' },
  { key: 'water_vapor', label: 'Mid-Level Water Vapor (Ch 9)' },
  { key: 'sandwich', label: 'RGB Sandwich Convective' },
];

const MODELS = ['HRRR (High-Res Rapid Refresh)', 'NAM Nest (3km)', 'GFS (0.25° Global)', 'ECMWF'];
const MODEL_VARIABLES = ['Simulated Reflectivity', 'SBCAPE', '0-1km SRH', 'Surface Temp', 'Precipitable Water'];

export function FloatingProductPanel({
  tab,
  currentSiteId,
  onSelectSite,
  product,
  onSelectProduct,
  tilt,
  onSelectTilt,
  isPlaying,
  onTogglePlay,
  onStepFrame,
  onGoLive,
  timestampLabel,
  radarOpacity,
  onChangeOpacity,
  showLightning,
  onToggleLightning,
  showLSR,
  onToggleLSR,
  showWatches,
  onToggleWatches,
  showStormTracks,
  onToggleStormTracks,
  showRadarPills,
  onToggleRadarPills,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState('1x');

  return (
    <div className="absolute bottom-4 left-4 z-30 w-80 max-h-[82vh] flex flex-col rounded-2xl border border-slate-800 bg-slate-950/95 font-sans text-slate-100 shadow-2xl backdrop-blur-xl select-none overflow-hidden transition-all">
      {/* Header with Title and Minimize Button */}
      <div className="flex items-center justify-between border-b border-slate-800 p-3 bg-slate-900/80">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400">MesoVortex WX</span>
          <h2 className="text-xs font-black uppercase text-white">{tab.toUpperCase()} CONTROLS</h2>
        </div>
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-800 text-xs text-slate-300 hover:text-white"
          title={collapsed ? 'Expand panel' : 'Collapse panel'}
        >
          {collapsed ? '▲' : '▼'}
        </button>
      </div>

      {!collapsed && (
        <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs">
          {/* PLAYBACK CONTROLS (Inside floating panel, per Section 3) */}
          <div className="space-y-2 rounded-xl border border-slate-800/80 bg-slate-900/60 p-2.5">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
              <span>Playback</span>
              <span className="font-mono text-cyan-300">{timestampLabel || 'LIVE'}</span>
            </div>

            <div className="flex items-center justify-between gap-1.5 pt-0.5">
              <button
                onClick={() => onStepFrame(-1)}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 font-bold"
              >
                ◀
              </button>
              <button
                onClick={onTogglePlay}
                className="flex h-7 flex-1 items-center justify-center rounded-lg bg-blue-600 font-bold text-white shadow-md hover:bg-blue-500 transition"
              >
                {isPlaying ? '❚❚ PAUSE' : '▶ PLAY'}
              </button>
              <button
                onClick={() => onStepFrame(1)}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 font-bold"
              >
                ▶
              </button>
              <button
                onClick={onGoLive}
                className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[10px] font-black uppercase text-emerald-400 hover:bg-emerald-500/20"
              >
                LIVE
              </button>
            </div>

            {/* Playback Speed */}
            <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
              <span>Speed:</span>
              <div className="flex gap-1">
                {['0.5x', '1x', '2x'].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setPlaybackSpeed(spd)}
                    className={`rounded px-1.5 py-0.5 ${
                      playbackSpeed === spd ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {spd}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* DYNAMIC PRODUCT CONTROLS: RADAR */}
          {(tab === 'Radar' || tab === '3D Radar') && (
            <>
              {/* Product Selector */}
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Radar Product
                </label>
                <select
                  value={product}
                  onChange={(e) => onSelectProduct(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2 text-xs font-semibold text-white focus:border-cyan-500 focus:outline-none"
                >
                  {RADAR_PRODUCTS.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Station Selector */}
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Radar Station
                </label>
                <select
                  value={currentSiteId}
                  onChange={(e) => onSelectSite(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2 text-xs font-semibold text-white focus:border-cyan-500 focus:outline-none"
                >
                  {RADAR_SITES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.id} — {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tilt Slices */}
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Elevation Beam Tilt
                </label>
                <div className="grid grid-cols-4 gap-1 font-mono text-xs font-bold">
                  {['0.5', '0.9', '1.3', '1.8'].map((t) => (
                    <button
                      key={t}
                      onClick={() => onSelectTilt(t)}
                      className={`rounded-lg py-1 transition ${
                        tilt === t ? 'bg-cyan-500 text-slate-950 font-black' : 'bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      {t}°
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* DYNAMIC PRODUCT CONTROLS: COMPOSITE */}
          {tab === 'Composite' && (
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Composite Product
              </label>
              <select className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2 text-xs font-semibold text-white">
                {COMPOSITE_PRODUCTS.map((p) => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* DYNAMIC PRODUCT CONTROLS: SATELLITE */}
          {tab === 'Satellite' && (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Satellite Source
                </label>
                <select className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2 text-xs font-semibold text-white">
                  <option>GOES-East (CONUS 1km)</option>
                  <option>GOES-West (Pacific)</option>
                  <option>NASA GIBS TrueColor</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Imagery Band
                </label>
                <select className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2 text-xs font-semibold text-white">
                  {SATELLITE_PRODUCTS.map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* DYNAMIC PRODUCT CONTROLS: MODELS */}
          {tab === 'Models' && (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Forecast Model
                </label>
                <select className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2 text-xs font-semibold text-white">
                  {MODELS.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Atmospheric Variable
                </label>
                <select className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2 text-xs font-semibold text-white">
                  {MODEL_VARIABLES.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* DYNAMIC PRODUCT CONTROLS: OUTLOOKS */}
          {tab === 'Outlooks' && (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Issuing Agency
                </label>
                <select className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2 text-xs font-semibold text-white">
                  <option>Storm Prediction Center (SPC)</option>
                  <option>Weather Prediction Center (WPC)</option>
                  <option>National Hurricane Center (NHC)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Outlook Product
                </label>
                <select className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2 text-xs font-semibold text-white">
                  <option>Categorical Convective Outlook</option>
                  <option>Tornado Probability</option>
                  <option>Damaging Wind Probability</option>
                  <option>Severe Hail Probability</option>
                  <option>Fire Weather Outlook</option>
                </select>
              </div>
            </div>
          )}

          {/* DISPLAY CONTROLS */}
          <div className="space-y-2 border-t border-slate-800 pt-3">
            <div className="flex justify-between font-bold text-slate-300 text-[11px]">
              <span>Opacity</span>
              <span className="font-mono text-cyan-400">{Math.round(radarOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.2}
              max={1.0}
              step={0.05}
              value={radarOpacity}
              onChange={(e) => onChangeOpacity(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* MAP OVERLAYS CHECKLIST */}
          <div className="space-y-1.5 border-t border-slate-800 pt-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Map Overlays
            </span>
            {[
              { label: '⚡ Lightning Network', checked: showLightning, toggle: onToggleLightning },
              { label: '🌪️ Local Storm Reports (LSR)', checked: showLSR, toggle: onToggleLSR },
              { label: '🛡️ Severe Watch Boxes', checked: showWatches, toggle: onToggleWatches },
              { label: '↗️ Storm Cell Tracks (SCIT)', checked: showStormTracks, toggle: onToggleStormTracks },
              { label: '📡 Radar Station Badges', checked: showRadarPills, toggle: onToggleRadarPills },
            ].map((item) => (
              <label key={item.label} className="flex items-center justify-between text-slate-300 cursor-pointer text-[11px]">
                <span>{item.label}</span>
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={item.toggle}
                  className="accent-cyan-400 h-3.5 w-3.5 rounded"
                />
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
