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

export type Props = {
  siteId: string;
  siteName: string;
  product: string;
  tilt: string;
  isPlaying: boolean;
  onSelectProduct: (p: any) => void;
  onSelectTilt: (t: string) => void;
  onTogglePlay: () => void;

  // Max Reflectivity Window
  maxRefWindow?: number;
  onSelectMaxRefWindow?: (w: number) => void;

  // Display Controls (All Optional)
  gateFilter?: number;
  onChangeGateFilter?: (val: number) => void;
  opacity?: number;
  onChangeOpacity?: (val: number) => void;
  smoothing?: boolean;
  onToggleSmoothing?: () => void;
  colorTable?: string;
  onChangeColorTable?: (table: string) => void;

  // Map Overlays (All Optional)
  showLightning?: boolean;
  onToggleLightning?: () => void;
  showStormTracks?: boolean;
  onToggleStormTracks?: () => void;
  showRadarSites?: boolean;
  onToggleRadarSites?: () => void;
  showRangeRings?: boolean;
  onToggleRangeRings?: () => void;
  showCounties?: boolean;
  onToggleCounties?: () => void;
  showTornadoAnalysis?: boolean;
  onToggleTornadoAnalysis?: () => void;

  // Advanced Actions (All Optional)
  onOpenComparison?: () => void;
  onOpenCrossSection?: () => void;
  onOpenBeamViz?: () => void;
  onOpen3DAnalysis?: () => void;
  [key: string]: any;
};

const PRODUCT_GROUPS: {
  category: string;
  items: { key: string; short: string; label: string; iconBg: string }[];
}[] = [
  {
    category: 'Reflectivity & Swaths',
    items: [
      { key: 'ref', short: 'REF', label: 'Base Reflectivity', iconBg: 'from-blue-600 via-green-500 to-red-600' },
      { key: 'max_ref', short: 'MAX', label: 'Max Reflectivity Swath', iconBg: 'from-amber-400 via-red-600 to-purple-700' },
      { key: 'ref_x', short: 'RFX', label: 'Reflectivity X (Lerp)', iconBg: 'from-cyan-500 via-yellow-400 to-rose-600' },
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
    category: 'Dual-Pol Moments',
    items: [
      { key: 'cc', short: 'CC', label: 'Correlation Coefficient', iconBg: 'from-rose-500 via-purple-600 to-blue-500' },
      { key: 'min_cc', short: 'MCC', label: 'Min CC (TDS Focus)', iconBg: 'from-purple-800 via-rose-600 to-blue-400' },
      { key: 'zdr', short: 'ZDR', label: 'Differential Reflectivity', iconBg: 'from-purple-500 via-amber-400 to-cyan-400' },
      { key: 'kdp', short: 'KDP', label: 'Specific Diff Phase', iconBg: 'from-cyan-500 via-blue-600 to-teal-400' },
    ],
  },
  {
    category: 'Derived & Vertical Structure',
    items: [
      { key: 'tops', short: 'TOP', label: 'Digital Echo Tops', iconBg: 'from-indigo-600 via-purple-500 to-pink-500' },
      { key: 'vil', short: 'VIL', label: 'Digital VIL (Hail Mass)', iconBg: 'from-amber-500 via-red-600 to-rose-700' },
      { key: 'hhc', short: 'HHC', label: 'Hydrometeor Class', iconBg: 'from-emerald-500 via-yellow-400 to-blue-600' },
      { key: 'qpe', short: 'QPE', label: '1-Hour Precipitation (DPR)', iconBg: 'from-blue-500 via-cyan-400 to-emerald-400' },
    ],
  },
];

const TILTS = ['0.5', '0.9', '1.3', '1.8', '2.4', '3.1'];
const MAX_REF_WINDOWS = [5, 10, 20, 30];

export function WeatherWiseRadarCard({
  siteId,
  product,
  tilt,
  isPlaying,
  onSelectProduct,
  onSelectTilt,
  onTogglePlay,
  maxRefWindow = 10,
  onSelectMaxRefWindow,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const [tiltMenuOpen, setTiltMenuOpen] = useState(false);

  let activeLabel = 'Base Reflectivity';
  for (const group of PRODUCT_GROUPS) {
    const item = group.items.find((i) => i.key === product);
    if (item) {
      activeLabel = item.label;
      break;
    }
  }

  const isMaxRef = product === 'max_ref';

  return (
    <div className="absolute bottom-5 left-5 z-30 w-[360px] max-h-[82vh] rounded-2xl bg-white/95 text-slate-800 shadow-2xl backdrop-blur-md border border-slate-200/90 font-sans select-none overflow-hidden transition-all flex flex-col">
      {/* Top Header Row */}
      <div className="flex items-center justify-between p-3 border-b border-slate-200/80 bg-slate-50/80">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">MESOVORTEX WX</span>
          <div className="flex items-center gap-1.5 font-extrabold text-xs text-slate-900 leading-tight">
            <span>{siteId}</span>
            <span className="text-slate-400">·</span>
            <span className="truncate max-w-[170px]">{activeLabel}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition cursor-pointer text-xs"
            title="Expand / Collapse"
          >
            {expanded ? '▾' : '▴'}
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

      {expanded && (
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs">
          {/* Metadata & Tilt Row */}
          <div className="flex items-center justify-between pt-0.5">
            <div className="text-[11px] text-slate-500 font-medium">
              <div>VCP: 212 Convective ⓘ</div>
              <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Feed Active
              </div>
            </div>

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

          {/* Rolling Window Selector (Only active on Max Reflectivity) */}
          {isMaxRef && onSelectMaxRefWindow && (
            <div className="rounded-xl border border-purple-200 bg-purple-50/80 p-2.5 space-y-1.5 animate-fade-in">
              <div className="flex items-center justify-between text-[11px] font-bold text-purple-900">
                <span>Maximum Composite Window:</span>
                <span className="font-mono text-purple-700">{maxRefWindow} Scans</span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {MAX_REF_WINDOWS.map((w) => (
                  <button
                    key={w}
                    onClick={() => onSelectMaxRefWindow(w)}
                    className={`rounded-lg py-1 text-[11px] font-bold transition cursor-pointer ${
                      maxRefWindow === w
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-white text-purple-800 border border-purple-200 hover:bg-purple-100'
                    }`}
                  >
                    {w} Scans
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Product Grid */}
          <div className="space-y-3">
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
                            : 'border-slate-100 bg-slate-50/60 hover:bg-slate-100'
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
        </div>
      )}
    </div>
  );
}

export default WeatherWiseRadarCard;
