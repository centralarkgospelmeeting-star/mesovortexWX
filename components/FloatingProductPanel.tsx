'use client';

import { useState } from 'react';
import { MainNavTab, SpcDay } from './MainNavbar';
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
  smoothing: boolean;
  onToggleSmoothing: () => void;
  colorTable: string;
  onSelectColorTable: (tbl: string) => void;
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
  showRangeRings: boolean;
  onToggleRangeRings: () => void;
  showCountyBoundaries: boolean;
  onToggleCountyBoundaries: () => void;
  showTornadoAnalysis: boolean;
  onToggleTornadoAnalysis: () => void;
  // Advanced Modals Launcher
  onOpenQuadView?: () => void;
  onOpenCrossSection?: () => void;
  onOpenSkewT?: () => void;
  onOpenMCD?: () => void;
  // Frame Scrubber
  currentFrameIndex?: number;
  totalFrames?: number;
  onScrubFrame?: (idx: number) => void;
  // Outlooks
  spcDay?: SpcDay;
  onSelectSpcDay?: (day: SpcDay) => void;
};

const RADAR_PRODUCTS = [
  { key: 'ref', label: 'Base Reflectivity (0.5°)' },
  { key: 'super_res', label: 'Super-Res Reflectivity' },
  { key: 'max_ref', label: 'Composite Max Reflectivity Swath' },
  { key: 'ref_x', label: 'Reflectivity X (Lerp Smoothed)' },
  { key: 'vel', label: 'Base Velocity' },
  { key: 'srvel', label: 'Storm-Relative Velocity (SRV)' },
  { key: 'norm_vel', label: 'Normalized Velocity' },
  { key: 'cc', label: 'Correlation Coefficient (CC)' },
  { key: 'min_cc', label: 'Minimum CC Track' },
  { key: 'zdr', label: 'Differential Reflectivity (ZDR)' },
  { key: 'kdp', label: 'Specific Diff Phase (KDP)' },
  { key: 'sw', label: 'Spectrum Width' },
  { key: 'tops', label: 'Echo Tops (kft)' },
  { key: 'vil', label: 'Vertically Integrated Liquid (VIL)' },
  { key: 'hhc', label: 'Hydrometeor Classification' },
  { key: 'qpe', label: 'Digital Precip Rate (QPE)' },
  { key: 'mesh', label: 'MESH Hail Swath' },
  { key: 'azshear', label: 'AzShear Rotation Track' },
];

const COMPOSITE_PRODUCTS = [
  { key: 'comp_ref', label: 'Composite Reflectivity (CONUS N0Q)' },
  { key: 'max_ref', label: 'Max Composite Reflectivity Swath' },
  { key: 'qpe', label: 'Precipitation Composite' },
  { key: 'rot_comp', label: 'Rotation Composite' },
  { key: 'hail_comp', label: 'Hail Composite' },
  { key: 'tops', label: 'Echo Tops Composite' },
];

const SATELLITE_PRODUCTS = [
  { key: 'geocolor', label: 'GeoColor (Visible & Day/Night)' },
  { key: 'clean_ir', label: 'Clean Infrared (Ch 13 - 10.3µm)' },
  { key: 'water_vapor', label: 'Mid-Level Water Vapor (Ch 9 - 6.9µm)' },
  { key: 'sandwich', label: 'RGB Sandwich Convective' },
];

const FORECAST_MODELS = [
  { id: 'hrrr', name: 'HRRR (High-Res Rapid Refresh 3km)' },
  { id: 'rap', name: 'RAP (Rapid Refresh 13km)' },
  { id: 'nam_nest', name: 'NAM Nest (3km High-Res)' },
  { id: 'gfs', name: 'GFS (0.25° Global)' },
  { id: 'ecmwf', name: 'ECMWF (European Center)' },
];

const MODEL_VARIABLES = [
  { key: 'ref', label: 'Simulated Composite Reflectivity' },
  { key: 'sbcape', label: 'Surface-Based CAPE (SBCAPE)' },
  { key: 'mlcape', label: 'Mixed-Layer CAPE (MLCAPE)' },
  { key: 'srh01', label: '0-1km Storm Relative Helicity' },
  { key: 'temp', label: '2m Surface Temperature' },
  { key: 'dewpt', label: '2m Surface Dew Point' },
  { key: 'pwat', label: 'Precipitable Water (PWAT)' },
  { key: 'h500', label: '500mb Geopotential Heights & Vorticity' },
];

const PRESSURE_LEVELS = ['Surface', '1000 mb', '925 mb', '850 mb', '700 mb', '500 mb', '300 mb', '250 mb'];

const COLOR_TABLES = [
  { id: 'default', name: 'NWS Standard' },
  { id: 'radarscope', name: 'RadarScope Style' },
  { id: 'cod', name: 'College of DuPage (COD)' },
  { id: 'smooth', name: 'Smooth Gradient' },
  { id: 'couplet', name: 'Severe Couplet Enhanced' },
];

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
  smoothing,
  onToggleSmoothing,
  colorTable,
  onSelectColorTable,
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
  showRangeRings,
  onToggleRangeRings,
  showCountyBoundaries,
  onToggleCountyBoundaries,
  showTornadoAnalysis,
  onToggleTornadoAnalysis,
  onOpenQuadView,
  onOpenCrossSection,
  onOpenSkewT,
  onOpenMCD,
  currentFrameIndex = 9,
  totalFrames = 10,
  onScrubFrame,
  spcDay = 'Day 1',
  onSelectSpcDay,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState('1x');
  const [selectedModel, setSelectedModel] = useState('hrrr');
  const [selectedVariable, setSelectedVariable] = useState('ref');
  const [selectedPressure, setSelectedPressure] = useState('Surface');
  const [forecastHour, setForecastHour] = useState(0);

  return (
    <div className="absolute bottom-4 left-4 z-30 w-80 sm:w-84 max-h-[82vh] flex flex-col rounded-3xl border border-slate-800 bg-slate-950/95 font-sans text-slate-100 shadow-2xl backdrop-blur-2xl select-none overflow-hidden transition-all">
      {/* Header with Title and Minimize Button (Section 3) */}
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 bg-slate-900/80">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400">
            MESOVORTEX WX
          </span>
          <h2 className="text-xs font-black uppercase text-white">{tab.toUpperCase()} CONTROLS</h2>
        </div>
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-800 text-xs text-slate-300 hover:text-white transition cursor-pointer"
          title={collapsed ? 'Expand panel' : 'Collapse panel'}
        >
          {collapsed ? '▲' : '▼'}
        </button>
      </div>

      {!collapsed && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* PLAYBACK CONTROLS (Inside floating panel, per Section 3) */}
          <div className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
              <span>Playback</span>
              <span className="font-mono text-cyan-300">{timestampLabel || 'LIVE'}</span>
            </div>

            <div className="flex items-center justify-between gap-1.5 pt-0.5">
              <button
                onClick={() => onStepFrame(-1)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 font-bold transition cursor-pointer"
                title="Previous Frame"
              >
                ◀
              </button>
              <button
                onClick={onTogglePlay}
                className="flex h-8 flex-1 items-center justify-center rounded-xl bg-blue-600 font-bold text-white shadow-lg hover:bg-blue-500 transition cursor-pointer"
              >
                {isPlaying ? '❚❚ PAUSE' : '▶ PLAY'}
              </button>
              <button
                onClick={() => onStepFrame(1)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 font-bold transition cursor-pointer"
                title="Next Frame"
              >
                ▶
              </button>
              <button
                onClick={onGoLive}
                className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-400 hover:bg-emerald-500/20 transition cursor-pointer"
                title="Jump to Live Scan"
              >
                LIVE
              </button>
            </div>

            {/* Timeline Scrubber Slider */}
            {onScrubFrame && totalFrames > 1 && (
              <div className="pt-1">
                <input
                  type="range"
                  min={0}
                  max={totalFrames - 1}
                  value={currentFrameIndex}
                  onChange={(e) => onScrubFrame(parseInt(e.target.value, 10))}
                  className="w-full accent-cyan-400 cursor-pointer h-1 bg-slate-800 rounded-lg"
                />
              </div>
            )}

            {/* Playback Speed Selection */}
            <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
              <span>Speed:</span>
              <div className="flex gap-1">
                {['0.5x', '1x', '2x'].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setPlaybackSpeed(spd)}
                    className={`rounded-lg px-2 py-0.5 transition cursor-pointer ${
                      playbackSpeed === spd
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {spd}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* DYNAMIC PRODUCT CONTROLS: RADAR / 3D RADAR */}
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

              {/* Elevation Beam Tilt */}
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Elevation Beam Tilt
                </label>
                <div className="grid grid-cols-6 gap-1 font-mono text-[11px] font-bold">
                  {['0.5', '0.9', '1.3', '1.8', '2.4', '3.1'].map((t) => (
                    <button
                      key={t}
                      onClick={() => onSelectTilt(t)}
                      className={`rounded-lg py-1 transition cursor-pointer ${
                        tilt === t
                          ? 'bg-cyan-500 text-slate-950 font-black shadow-md'
                          : 'bg-slate-900 text-slate-400 hover:text-white'
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
              <select
                value={product}
                onChange={(e) => onSelectProduct(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2 text-xs font-semibold text-white focus:border-cyan-500 focus:outline-none"
              >
                {COMPOSITE_PRODUCTS.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
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
                <select className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2 text-xs font-semibold text-white focus:border-cyan-500 focus:outline-none">
                  <option>GOES-East (CONUS 1km)</option>
                  <option>GOES-West (Pacific / West US)</option>
                  <option>NASA GIBS TrueColor Global</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Imagery Band
                </label>
                <select
                  value={product}
                  onChange={(e) => onSelectProduct(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2 text-xs font-semibold text-white focus:border-cyan-500 focus:outline-none"
                >
                  {SATELLITE_PRODUCTS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
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
                  Numerical Weather Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2 text-xs font-semibold text-white focus:border-cyan-500 focus:outline-none"
                >
                  {FORECAST_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Atmospheric Variable
                </label>
                <select
                  value={selectedVariable}
                  onChange={(e) => setSelectedVariable(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2 text-xs font-semibold text-white focus:border-cyan-500 focus:outline-none"
                >
                  {MODEL_VARIABLES.map((v) => (
                    <option key={v.key} value={v.key}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Pressure Level
                </label>
                <select
                  value={selectedPressure}
                  onChange={(e) => setSelectedPressure(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2 text-xs font-semibold text-white focus:border-cyan-500 focus:outline-none"
                >
                  {PRESSURE_LEVELS.map((pl) => (
                    <option key={pl} value={pl}>
                      {pl}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between font-bold text-slate-300 text-[11px] mb-1">
                  <span>Forecast Hour</span>
                  <span className="font-mono text-cyan-400">F{String(forecastHour).padStart(2, '0')}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={48}
                  step={1}
                  value={forecastHour}
                  onChange={(e) => setForecastHour(parseInt(e.target.value, 10))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
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
                <select className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2 text-xs font-semibold text-white focus:border-cyan-500 focus:outline-none">
                  <option>Storm Prediction Center (SPC)</option>
                  <option>Weather Prediction Center (WPC)</option>
                  <option>National Hurricane Center (NHC)</option>
                  <option>Climate Prediction Center (CPC)</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Outlook Product
                </label>
                <select className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2 text-xs font-semibold text-white focus:border-cyan-500 focus:outline-none">
                  <option>Categorical Convective Outlook</option>
                  <option>Tornado Probability</option>
                  <option>Damaging Wind Probability</option>
                  <option>Severe Hail Probability</option>
                  <option>Fire Weather Outlook</option>
                  <option>Excessive Rainfall (WPC)</option>
                </select>
              </div>

              {onSelectSpcDay && (
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Forecast Period
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {(['Day 1', 'Day 2', 'Day 3'] as SpcDay[]).map((d) => (
                      <button
                        key={d}
                        onClick={() => onSelectSpcDay(d)}
                        className={`rounded-lg py-1 font-bold text-[11px] transition cursor-pointer ${
                          spcDay === d ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DISPLAY CONTROLS */}
          <div className="space-y-2.5 border-t border-slate-800 pt-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Display &amp; Styling
            </span>

            {/* Opacity Slider */}
            <div>
              <div className="flex justify-between font-bold text-slate-300 text-[11px] mb-1">
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

            {/* Smoothing Toggle */}
            <div className="flex items-center justify-between text-slate-300 text-[11px]">
              <span>Radar Smoothing</span>
              <button
                onClick={onToggleSmoothing}
                className={`rounded-lg px-2.5 py-0.5 font-bold transition cursor-pointer ${
                  smoothing ? 'bg-cyan-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {smoothing ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Color Table Dropdown */}
            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-400 uppercase">
                Color Palette
              </label>
              <select
                value={colorTable}
                onChange={(e) => onSelectColorTable(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 p-1.5 text-xs font-semibold text-white focus:border-cyan-500 focus:outline-none"
              >
                {COLOR_TABLES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* MAP OVERLAYS CHECKLIST */}
          <div className="space-y-2 border-t border-slate-800 pt-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Map Overlays
            </span>
            {[
              { label: '⚡ Blitzortung Live Lightning', checked: showLightning, toggle: onToggleLightning },
              { label: '🌪️ Local Storm Reports (LSR)', checked: showLSR, toggle: onToggleLSR },
              { label: '🛡️ Severe Watch Boxes', checked: showWatches, toggle: onToggleWatches },
              { label: '↗️ SCIT Storm Tracks', checked: showStormTracks, toggle: onToggleStormTracks },
              { label: '📡 Radar Station Badges', checked: showRadarPills, toggle: onToggleRadarPills },
              { label: '⭕ Radar Range Rings (50-150nm)', checked: showRangeRings, toggle: onToggleRangeRings },
              { label: '🗺️ County Boundaries', checked: showCountyBoundaries, toggle: onToggleCountyBoundaries },
              { label: '🎯 Tornado / TVS Analysis', checked: showTornadoAnalysis, toggle: onToggleTornadoAnalysis },
            ].map((item) => (
              <label
                key={item.label}
                className="flex items-center justify-between text-slate-300 hover:text-white cursor-pointer text-[11px]"
              >
                <span>{item.label}</span>
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={item.toggle}
                  className="accent-cyan-400 h-3.5 w-3.5 rounded cursor-pointer"
                />
              </label>
            ))}
          </div>

          {/* ADVANCED RADAR WORKSTATION TOOLS */}
          <div className="space-y-1.5 border-t border-slate-800 pt-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Workstation Tools
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {onOpenQuadView && (
                <button
                  onClick={onOpenQuadView}
                  className="rounded-xl border border-slate-700 bg-slate-900/80 p-2 text-center font-bold text-slate-200 hover:bg-slate-800 hover:text-white transition cursor-pointer"
                >
                  🔲 Quad Compare
                </button>
              )}
              {onOpenCrossSection && (
                <button
                  onClick={onOpenCrossSection}
                  className="rounded-xl border border-slate-700 bg-slate-900/80 p-2 text-center font-bold text-slate-200 hover:bg-slate-800 hover:text-white transition cursor-pointer"
                >
                  📐 Cross Section
                </button>
              )}
              {onOpenSkewT && (
                <button
                  onClick={onOpenSkewT}
                  className="rounded-xl border border-slate-700 bg-slate-900/80 p-2 text-center font-bold text-slate-200 hover:bg-slate-800 hover:text-white transition cursor-pointer"
                >
                  📈 Skew-T Sounding
                </button>
              )}
              {onOpenMCD && (
                <button
                  onClick={onOpenMCD}
                  className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-2 text-center font-bold text-amber-300 hover:bg-amber-500/20 transition cursor-pointer"
                >
                  📝 AI SPC MCD
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
