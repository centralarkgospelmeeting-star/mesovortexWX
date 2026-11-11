'use client';

import { useState } from 'react';

type RadarProduct = 'ref' | 'ref_x' | 'max_ref' | 'vel' | 'cc' | 'zdr';

type Props = {
  siteId: string;
  siteName: string;
  product: RadarProduct;
  tilt: string;
  maxRefWindow?: number;
  isPlaying: boolean;
  onSelectProduct: (p: RadarProduct) => void;
  onSelectTilt: (t: string) => void;
  onSelectMaxRefWindow?: (w: number) => void;
  onTogglePlay: () => void;
  // Display Controls
  radarOpacity?: number;
  onChangeOpacity?: (op: number) => void;
  smoothing?: boolean;
  onToggleSmoothing?: () => void;
  colorTable?: string;
  onChangeColorTable?: (table: string) => void;
  // Map Overlays
  showLightning?: boolean;
  onToggleLightning?: () => void;
  showStormTracks?: boolean;
  onToggleStormTracks?: () => void;
  showRadarSites?: boolean;
  onToggleRadarSites?: () => void;
  showRangeRings?: boolean;
  onToggleRangeRings?: () => void;
  showCountyBoundaries?: boolean;
  onToggleCountyBoundaries?: () => void;
  showTornadoAnalysis?: boolean;
  onToggleTornadoAnalysis?: () => void;
  // Advanced Radar Tools
  onOpenRadarComparison?: () => void;
  onOpenCrossSections?: () => void;
  onOpenBeamVisualization?: () => void;
  onOpen3DAnalysis?: () => void;
};

const PRODUCTS: { key: RadarProduct; label: string; iconBg: string }[] = [
  { key: 'ref', label: 'Reflectivity', iconBg: 'from-blue-600 via-green-500 to-red-600' },
  { key: 'max_ref', label: 'Max Reflectivity', iconBg: 'from-amber-400 via-red-600 to-purple-700' },
  { key: 'ref_x', label: 'Reflectivity X', iconBg: 'from-cyan-500 via-yellow-400 to-rose-600' },
  { key: 'vel', label: 'Velocity', iconBg: 'from-emerald-500 via-slate-800 to-red-600' },
  { key: 'cc', label: 'Correlation Coefficient', iconBg: 'from-rose-500 via-purple-600 to-blue-500' },
  { key: 'zdr', label: 'Differential Reflectivity', iconBg: 'from-purple-500 via-amber-400 to-cyan-400' },
];

const TILTS = ['0.5', '0.9', '1.3', '1.8', '2.4', '3.1'];
const MAX_REF_WINDOWS = [5, 10, 20, 30];

export function WeatherWiseRadarCard({
  siteId,
  product,
  tilt,
  maxRefWindow = 10,
  isPlaying,
  onSelectProduct,
  onSelectTilt,
  onSelectMaxRefWindow,
  onTogglePlay,
  radarOpacity = 0.88,
  onChangeOpacity,
  smoothing = false,
  onToggleSmoothing,
  colorTable = 'Default',
  onChangeColorTable,
  showLightning = true,
  onToggleLightning,
  showStormTracks = true,
  onToggleStormTracks,
  showRadarSites = true,
  onToggleRadarSites,
  showRangeRings = false,
  onToggleRangeRings,
  showCountyBoundaries = true,
  onToggleCountyBoundaries,
  showTornadoAnalysis = false,
  onToggleTornadoAnalysis,
  onOpenRadarComparison,
  onOpenCrossSections,
  onOpenBeamVisualization,
  onOpen3DAnalysis,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const [tiltMenuOpen, setTiltMenuOpen] = useState(false);

  // Fallback internal state for overlay checkboxes if not connected to parent
  const [localOpacity, setLocalOpacity] = useState(radarOpacity);
  const [localSmoothing, setLocalSmoothing] = useState(smoothing);
  const [localColorTable, setLocalColorTable] = useState(colorTable);
  const [localLightning, setLocalLightning] = useState(showLightning);
  const [localStormTracks, setLocalStormTracks] = useState(showStormTracks);
  const [localRadarSites, setLocalRadarSites] = useState(showRadarSites);
  const [localRangeRings, setLocalRangeRings] = useState(showRangeRings);
  const [localCountyBoundaries, setLocalCountyBoundaries] = useState(showCountyBoundaries);
  const [localTornadoAnalysis, setLocalTornadoAnalysis] = useState(showTornadoAnalysis);

  const activeProdInfo = PRODUCTS.find((p) => p.key === product) || PRODUCTS[0];
  const isMaxRef = product === 'max_ref' || product === 'ref_x';

  return (
    <div className="absolute bottom-5 left-5 z-30 w-[340px] max-h-[72vh] flex flex-col rounded-2xl bg-white/95 text-slate-800 shadow-2xl backdrop-blur-md border border-slate-200/80 font-sans select-none overflow-hidden transition-all">
      {/* 1. FIXED TOP HEADER ROW */}
      <div className="flex items-center justify-between p-3 border-b border-slate-100 bg-white/60 shrink-0">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 font-extrabold text-sm text-slate-900">
            <span>{siteId}</span>
            <span className="text-slate-400">·</span>
            <span>{activeProdInfo.label}</span>
            {isMaxRef && (
              <span className="rounded bg-purple-600 text-white text-[9px] px-1.5 py-0.5 font-black uppercase tracking-wider">
                SWATH
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
            <span>Scan At: 21:18:32</span>
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse ml-1" />
            <span className="text-emerald-600 font-bold">Live</span>
          </div>
        </div>

        {/* Action Icon Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition cursor-pointer"
            title="Expand / Collapse"
          >
            {expanded ? '▾' : '▴'}
          </button>
          <button
            onClick={() => setTiltMenuOpen((v) => !v)}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition cursor-pointer"
            title="Elevation Tilts"
          >
            🔲
          </button>
          <button
            onClick={onTogglePlay}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition font-bold cursor-pointer"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '❚❚' : '▶'}
          </button>
        </div>
      </div>

      {/* 2. SCROLLABLE BODY (Sections per Wireframe 2) */}
      {expanded && (
        <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs divide-y divide-slate-100">
          {/* Metadata & Tilt Dropdown */}
          <div className="space-y-2 pt-0.5">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <div>
                <div>Scan At: 04/08/2026 21:18:32 ⓘ</div>
                <div>VCP: 215 (Precipitation Mode) ⓘ</div>
              </div>

              {/* Tilt Pill Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setTiltMenuOpen((v) => !v)}
                  className="flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 px-3 py-1 font-bold text-slate-700 border border-slate-300 transition cursor-pointer"
                >
                  <span>{tilt}°</span>
                  <span className="text-[10px]">▾</span>
                </button>

                {tiltMenuOpen && (
                  <div className="absolute right-0 bottom-full mb-1 w-24 rounded-xl bg-white shadow-xl border border-slate-200 p-1 space-y-1 z-40">
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

            {/* Rolling Window Selector (When in Max Reflectivity mode) */}
            {isMaxRef && (
              <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-2.5 space-y-1.5 animate-fade-in">
                <div className="flex items-center justify-between text-[11px] font-bold text-purple-900">
                  <span>Max Reflectivity Rolling Window:</span>
                  <span className="font-mono text-purple-700">{maxRefWindow} Scans</span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {MAX_REF_WINDOWS.map((w) => (
                    <button
                      key={w}
                      onClick={() => onSelectMaxRefWindow?.(w)}
                      className={`rounded-lg py-1 text-[11px] font-bold transition cursor-pointer ${
                        maxRefWindow === w
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'bg-white text-purple-800 border border-purple-200 hover:bg-purple-100'
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Product Thumbnail Grid */}
          <div className="pt-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Radar Product
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {PRODUCTS.map((p) => {
                const active = product === p.key;
                return (
                  <div
                    key={p.key}
                    onClick={() => onSelectProduct(p.key)}
                    className={`flex flex-col items-center p-1.5 rounded-xl cursor-pointer transition border text-center ${
                      active
                        ? 'border-blue-600 bg-blue-50/70 shadow-sm'
                        : 'border-transparent hover:bg-slate-100'
                    }`}
                  >
                    <div
                      className={`h-9 w-9 rounded-xl bg-gradient-to-br ${p.iconBg} shadow-inner border border-white/60 mb-1 flex items-center justify-center text-[9px] font-black text-white drop-shadow`}
                    >
                      {p.key === 'max_ref' ? 'MAX' : p.key.toUpperCase()}
                    </div>
                    <span className={`text-[10px] font-semibold leading-tight line-clamp-1 ${active ? 'text-blue-700' : 'text-slate-600'}`}>
                      {p.label.split(' ')[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION: DISPLAY (Per Master Wireframe) */}
          <div className="pt-3 space-y-2.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
              DISPLAY
            </span>

            {/* Opacity Slider */}
            <div>
              <div className="flex justify-between font-bold text-slate-700 text-[11px] mb-1">
                <span>Opacity</span>
                <span className="font-mono text-blue-600">{Math.round((onChangeOpacity ? radarOpacity : localOpacity) * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.2}
                max={1.0}
                step={0.05}
                value={onChangeOpacity ? radarOpacity : localOpacity}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setLocalOpacity(val);
                  onChangeOpacity?.(val);
                }}
                className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
              />
            </div>

            {/* Smoothing Toggle */}
            <div className="flex items-center justify-between text-slate-700 font-bold text-[11px]">
              <span>Smoothing</span>
              <button
                onClick={() => {
                  setLocalSmoothing(!localSmoothing);
                  onToggleSmoothing?.();
                }}
                className={`px-3 py-0.5 rounded-lg text-xs font-black transition cursor-pointer ${
                  (onToggleSmoothing ? smoothing : localSmoothing)
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                }`}
              >
                {(onToggleSmoothing ? smoothing : localSmoothing) ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Color Table Dropdown */}
            <div>
              <div className="flex items-center justify-between font-bold text-slate-700 text-[11px] mb-1">
                <span>Color Table</span>
              </div>
              <select
                value={onChangeColorTable ? colorTable : localColorTable}
                onChange={(e) => {
                  const val = e.target.value;
                  setLocalColorTable(val);
                  onChangeColorTable?.(val);
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-blue-600 focus:outline-none cursor-pointer"
              >
                <option value="Default">Default (NWS 8-bit)</option>
                <option value="RadarScope">RadarScope / Baron</option>
