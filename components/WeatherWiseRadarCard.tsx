'use client';

import { useState } from 'react';

export type ProductKey =
  | 'ref'
  | 'max_ref'
  | 'ref_x'
  | 'vel'
  | 'srvel'
  | 'norm_vel'
  | 'sw'
  | 'cc'
  | 'min_cc'
  | 'zdr'
  | 'kdp'
  | 'tops'
  | 'vil'
  | 'hhc'
  | 'qpe';

type Props = {
  siteId: string;
  siteName: string;
  product: string;
  tilt: string;
  isPlaying: boolean;
  maxRefWindow?: number;
  onSelectProduct: (p: ProductKey) => void;
  onSelectTilt: (t: string) => void;
  onSelectMaxRefWindow?: (w: number) => void;
  onTogglePlay: () => void;

  // Display Controls
  gateFilter: number;
  onChangeGateFilter: (val: number) => void;
  opacity: number;
  onChangeOpacity: (val: number) => void;
  smoothing: boolean;
  onToggleSmoothing: () => void;
  colorTable: string;
  onChangeColorTable: (table: string) => void;

  // Map Overlays
  showLightning: boolean;
  onToggleLightning: () => void;
  showStormTracks: boolean;
  onToggleStormTracks: () => void;
  showRadarSites: boolean;
  onToggleRadarSites: () => void;
  showRangeRings: boolean;
  onToggleRangeRings: () => void;
  showCounties: boolean;
  onToggleCounties: () => void;
  showTornadoAnalysis: boolean;
  onToggleTornadoAnalysis: () => void;

  // Advanced Radar Actions
  onOpenComparison: () => void;
  onOpenCrossSection: () => void;
  onOpenBeamViz: () => void;
  onOpen3DAnalysis: () => void;
};

const PRODUCT_GROUPS: {
  category: string;
  items: { key: ProductKey; short: string; label: string; iconBg: string }[];
}[] = [
  {
    category: 'Reflectivity',
    items: [
      { key: 'ref', short: 'REF', label: 'Base Reflectivity', iconBg: 'from-blue-600 via-green-500 to-red-600' },
      { key: 'max_ref', short: 'MAX', label: 'Max Reflectivity', iconBg: 'from-amber-400 via-red-600 to-purple-700' },
      { key: 'ref_x', short: 'RFX', label: 'Reflectivity X', iconBg: 'from-cyan-500 via-yellow-400 to-rose-600' },
    ],
  },
  {
    category: 'Velocity & Moments',
    items: [
      { key: 'vel', short: 'VEL', label: 'Base Velocity', iconBg: 'from-emerald-500 via-slate-800 to-red-600' },
      { key: 'srvel', short: 'SRV', label: 'Storm-Relative Velocity', iconBg: 'from-teal-500 via-slate-900 to-rose-600' },
      { key: 'norm_vel', short: 'NRV', label: 'Normalized Velocity', iconBg: 'from-cyan-600 via-slate-900 to-amber-500' },
      { key: 'sw', short: 'SW', label: 'Spectrum Width', iconBg: 'from-slate-600 via-blue-500 to-emerald-400' },
    ],
  },
  {
    category: 'Dual-Pol Products',
    items: [
      { key: 'cc', short: 'CC', label: 'Correlation Coefficient', iconBg: 'from-rose-500 via-purple-600 to-blue-500' },
      { key: 'min_cc', short: 'MCC', label: 'Minimum CC (TDS Focus)', iconBg: 'from-purple-800 via-rose-600 to-blue-400' },
      { key: 'zdr', short: 'ZDR', label: 'Differential Reflectivity', iconBg: 'from-purple-500 via-amber-400 to-cyan-400' },
      { key: 'kdp', short: 'KDP', label: 'Specific Diff Phase', iconBg: 'from-cyan-500 via-blue-600 to-teal-400' },
    ],
  },
  {
    category: 'Derived & Precipitation',
    items: [
      { key: 'tops', short: 'TOP', label: 'Echo Tops', iconBg: 'from-indigo-600 via-purple-500 to-pink-500' },
      { key: 'vil', short: 'VIL', label: 'Vert. Integrated Liquid', iconBg: 'from-amber-500 via-red-600 to-rose-700' },
      { key: 'hhc', short: 'HHC', label: 'Hydrometeor Class', iconBg: 'from-emerald-500 via-yellow-400 to-blue-600' },
      { key: 'qpe', short: 'QPE', label: 'Precipitation Analysis', iconBg: 'from-blue-500 via-cyan-400 to-emerald-400' },
    ],
  },
];

const TILTS = ['0.5', '0.9', '1.3', '1.8', '2.4', '3.1'];

export function WeatherWiseRadarCard({
  siteId,
  product,
  tilt,
  isPlaying,
  maxRefWindow = 10,
  onSelectProduct,
  onSelectTilt,
  onSelectMaxRefWindow,
  onTogglePlay,
  gateFilter,
  onChangeGateFilter,
  opacity,
  onChangeOpacity,
  smoothing,
  onToggleSmoothing,
  colorTable,
  onChangeColorTable,
  showLightning,
  onToggleLightning,
  showStormTracks,
  onToggleStormTracks,
  showRadarSites,
  onToggleRadarSites,
  showRangeRings,
  onToggleRangeRings,
  showCounties,
  onToggleCounties,
  showTornadoAnalysis,
  onToggleTornadoAnalysis,
  onOpenComparison,
  onOpenCrossSection,
  onOpenBeamViz,
  onOpen3DAnalysis,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [tiltMenuOpen, setTiltMenuOpen] = useState(false);

  // Find active product display label
  let activeLabel = 'Base Reflectivity';
  for (const group of PRODUCT_GROUPS) {
    const item = group.items.find((i) => i.key === product);
    if (item) {
      activeLabel = item.label;
      break;
    }
  }

  return (
    <div className="absolute bottom-4 left-4 z-30 w-[360px] max-h-[82vh] rounded-2xl bg-white/95 text-slate-800 shadow-2xl backdrop-blur-md border border-slate-200/90 font-sans select-none overflow-hidden transition-all flex flex-col">
      {/* 1. TOP HEADER & PLAYBACK (Wireframe Section 2) */}
      <div className="flex items-center justify-between p-3 border-b border-slate-200/80 bg-slate-50/80">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">MESOVORTEX WX</span>
          <div className="flex items-center gap-1.5 font-extrabold text-xs text-slate-900 leading-tight">
            <span>{siteId}</span>
            <span className="text-slate-400">·</span>
            <span className="truncate max-w-[170px]">{activeLabel}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition cursor-pointer text-xs"
            title="Expand / Collapse"
          >
            {collapsed ? '▲' : '▼'}
          </button>
          <button
            onClick={() => setTiltMenuOpen((v) => !v)}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition cursor-pointer text-xs"
            title="Elevation Tilts"
          >
            🔲
          </button>
          <button
            onClick={onTogglePlay}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition font-bold cursor-pointer text-xs"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '❚❚' : '▶'}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs divide-y divide-slate-100">
          {/* Metadata & Tilt Row */}
          <div className="flex items-center justify-between pt-1">
            <div className="text-[11px] text-slate-500 font-medium">
              <div>VCP: 212 Convective ⓘ</div>
              <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Sweep Active
              </div>
            </div>

            {/* Tilt Selector */}
            <div className="relative">
              <button
                onClick={() => setTiltMenuOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 px-3 py-1 font-bold text-slate-700 border border-slate-300 transition cursor-pointer"
              >
                <span>Tilt: {tilt}°</span>
                <span className="text-[10px]">▾</span>
              </button>

              {tiltMenuOpen && (
                <div className="absolute right-0 bottom-full mb-1 w-24 rounded-xl bg-white shadow-2xl border border-slate-200 p-1 space-y-1 z-40">
                  {TILTS.map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        onSelectTilt(t);
                        setTiltMenuOpen(false);
                      }}
                      className={`w-full rounded-lg py-1 text-center text-xs font-bold transition cursor-pointer ${
                        tilt === t ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {t}°
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Max Reflectivity Window Selector (shown only when MAX product active) */}
          {product === 'max_ref' && (
            <div className="pt-2 space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                Max Reflectivity Window
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500">Last</span>
                {[5, 10, 20, 30].map((w) => (
                  <button
                    key={w}
                    onClick={() => onSelectMaxRefWindow?.(w)}
                    className={`rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer ${
                      maxRefWindow === w
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {w}
                  </button>
                ))}
                <span className="text-[10px] text-slate-500">scans</span>
              </div>
              <div className="text-[9px] text-slate-400 font-mono">
                MAX REF ({maxRefWindow} scans) — per-pixel max over rolling window
              </div>
            </div>
          )}

          {/* 2. EXPANDED RADAR PRODUCT TABS */}
          <div className="pt-3 space-y-2.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
              Radar Moments &amp; Products
            </span>

            {PRODUCT_GROUPS.map((group) => (
              <div key={group.category} className="space-y-1">
                <span className="text-[9px] font-bold uppercase text-slate-400">{group.category}</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {group.items.map((item) => {
                    const active = product === item.key;
                    return (
                      <button
                        key={item.key}
                        onClick={() => onSelectProduct(item.key)}
                        title={item.label}
                        className={`flex flex-col items-center p-1.5 rounded-xl border transition cursor-pointer ${
                          active
                            ? 'border-blue-600 bg-blue-50/80 shadow-sm ring-1 ring-blue-500'
                            : 'border-slate-100 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-200'
                        }`}
                      >
                        <div
                          className={`h-7 w-7 rounded-lg bg-gradient-to-br ${item.iconBg} shadow-inner border border-white/60 mb-0.5 flex items-center justify-center text-[9px] font-black text-white`}
                        >
                          {item.short}
                        </div>
                        <span className={`text-[8.5px] font-bold leading-none truncate w-full text-center ${active ? 'text-blue-700' : 'text-slate-600'}`}>
                          {item.short}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* 3. DISPLAY SECTION (Matching Master Specification Wireframe 2) */}
          <div className="pt-3 space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
              Display
            </span>

            {/* Reflectivity Gate Filter Slider */}
            <div>
              <div className="flex justify-between font-bold text-slate-600 text-[11px] mb-1">
                <span>Reflectivity Gate Filter</span>
                <span className="font-mono text-blue-600">{gateFilter} dBZ</span>
              </div>
              <input
                type="range"
                min={0}
                max={35}
                step={5}
                value={gateFilter}
                onChange={(e) => onChangeGateFilter(parseInt(e.target.value, 10))}
                className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
              />
              <div className="flex justify-between text-[8px] text-slate-400 font-mono mt-0.5">
                <span>0 dBZ (All Gates)</span>
                <span>15 dBZ (Rain Only)</span>
                <span>35 dBZ (Heavy)</span>
              </div>
            </div>

            {/* Opacity Slider */}
            <div>
              <div className="flex justify-between font-bold text-slate-600 text-[11px] mb-1">
                <span>Opacity</span>
                <span className="font-mono text-blue-600">{Math.round(opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.2}
                max={1.0}
                step={0.05}
                value={opacity}
                onChange={(e) => onChangeOpacity(parseFloat(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
              />
            </div>

            {/* Smoothing Toggle & Color Table Dropdown */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-[10px] font-bold text-slate-500 block mb-1">Smoothing</span>
                <button
                  onClick={onToggleSmoothing}
                  className={`w-full py-1.5 rounded-xl font-bold text-xs border transition cursor-pointer ${
                    smoothing
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {smoothing ? 'ON (Smooth)' : 'OFF (Raw Gates)'}
                </button>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-500 block mb-1">Color Table</span>
                <select
                  value={colorTable}
                  onChange={(e) => onChangeColorTable(e.target.value)}
                  className="w-full py-1.5 px-2 rounded-xl border border-slate-300 bg-slate-100 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="nws">Default (NWS 8-bit)</option>
                  <option value="radarscope">RadarScope / Baron</option>
                  <option value="cod">COD Pastels</option>
                  <option value="smooth">DG Noah Smooth</option>
                  <option value="couplet">Couplet Hunter</option>
                </select>
              </div>
            </div>
          </div>

          {/* 4. MAP OVERLAYS SECTION (Matching Master Specification Wireframe 2) */}
          <div className="pt-3 space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
              Map Overlays
            </span>

            <div className="space-y-1.5 text-[11px] font-semibold text-slate-700">
              {[
                { label: 'Lightning', checked: showLightning, toggle: onToggleLightning },
                { label: 'Storm Tracks', checked: showStormTracks, toggle: onToggleStormTracks },
                { label: 'Radar Sites', checked: showRadarSites, toggle: onToggleRadarSites },
                { label: 'Range Rings', checked: showRangeRings, toggle: onToggleRangeRings },
                { label: 'County Boundaries', checked: showCounties, toggle: onToggleCounties },
                { label: 'Tornado Analysis', checked: showTornadoAnalysis, toggle: onToggleTornadoAnalysis },
              ].map((item) => (
                <label key={item.label} className="flex items-center justify-between cursor-pointer p-1 rounded-lg hover:bg-slate-50">
                  <span>[ ] {item.label}</span>
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={item.toggle}
                    className="accent-blue-600 h-4 w-4 rounded cursor-pointer"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* 5. ADVANCED RADAR SECTION (Matching Master Specification Wireframe 2) */}
          <div className="pt-3 space-y-2 pb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
              Advanced Radar
            </span>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={onOpenComparison}
                className="rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 p-2 font-bold text-slate-800 text-[11px] transition text-center cursor-pointer shadow-sm"
              >
                Radar Comparison
              </button>
              <button
                onClick={onOpenCrossSection}
                className="rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 p-2 font-bold text-slate-800 text-[11px] transition text-center cursor-pointer shadow-sm"
              >
                Cross Sections
              </button>
              <button
                onClick={onOpenBeamViz}
                className="rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 p-2 font-bold text-slate-800 text-[11px] transition text-center cursor-pointer shadow-sm"
              >
                Beam Visualization
              </button>
              <button
                onClick={onOpen3DAnalysis}
                className="rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 p-2 font-bold text-slate-800 text-[11px] transition text-center cursor-pointer shadow-sm"
              >
                3D Analysis
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
