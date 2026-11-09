'use client';

import { useState } from 'react';

type RadarProduct = 'ref' | 'ref_x' | 'max_ref' | 'vel' | 'cc' | 'zdr';

type Props = {
  siteId: string;
  siteName: string;
  product: RadarProduct;
  tilt: string;
  isPlaying: boolean;
  onSelectProduct: (p: RadarProduct) => void;
  onSelectTilt: (t: string) => void;
  onTogglePlay: () => void;
};

const PRODUCTS: { key: RadarProduct; label: string; iconBg: string }[] = [
  { key: 'ref', label: 'Reflectivity', iconBg: 'from-blue-600 via-green-500 to-red-600' },
  { key: 'ref_x', label: 'Reflectivity X', iconBg: 'from-cyan-500 via-yellow-400 to-rose-600' },
  { key: 'max_ref', label: 'Max Reflectivity', iconBg: 'from-amber-400 via-red-600 to-purple-700' },
  { key: 'vel', label: 'Velocity', iconBg: 'from-emerald-500 via-slate-800 to-red-600' },
  { key: 'cc', label: 'Correlation Coefficient', iconBg: 'from-rose-500 via-purple-600 to-blue-500' },
  { key: 'zdr', label: 'Differential Reflectivity', iconBg: 'from-purple-500 via-amber-400 to-cyan-400' },
];

const TILTS = ['0.5', '0.9', '1.3', '1.8', '2.4', '3.1'];

export function WeatherWiseRadarCard({
  siteId,
  product,
  tilt,
  isPlaying,
  onSelectProduct,
  onSelectTilt,
  onTogglePlay,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const [tiltMenuOpen, setTiltMenuOpen] = useState(false);

  const activeProdInfo = PRODUCTS.find((p) => p.key === product) || PRODUCTS[0];

  return (
    <div className="absolute bottom-5 left-5 z-30 w-[340px] rounded-2xl bg-white/95 text-slate-800 shadow-2xl backdrop-blur-md border border-slate-200/80 font-sans select-none overflow-hidden transition-all">
      {/* Top Header Row */}
      <div className="flex items-center justify-between p-3 border-b border-slate-100">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 font-extrabold text-sm text-slate-900">
            <span>{siteId}</span>
            <span className="text-slate-400">·</span>
            <span>{activeProdInfo.label}</span>
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
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
            title="Expand / Collapse"
          >
            {expanded ? '▾' : '▴'}
          </button>
          <button
            onClick={() => setTiltMenuOpen((v) => !v)}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
            title="Elevation Tilts"
          >
            🔲
          </button>
          <button
            onClick={onTogglePlay}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition font-bold"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '❚❚' : '▶'}
          </button>
        </div>
      </div>

      {/* Expanded Controls Body */}
      {expanded && (
        <div className="p-3 space-y-3">
          {/* Metadata Row */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <div>
              <div>Scan At: 04/08/2026 21:18:32 ⓘ</div>
              <div>VCP: 215 (Precipitation Mode) ⓘ</div>
            </div>

            {/* Tilt Pill Dropdown */}
            <div className="relative">
              <button
                onClick={() => setTiltMenuOpen((v) => !v)}
                className="flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 px-3 py-1 font-bold text-slate-700 border border-slate-300 transition"
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
                      className={`w-full rounded-lg py-1 text-center text-xs font-bold transition ${
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

          {/* Product Thumbnail Grid */}
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100">
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
                  {/* Thumbnail Image Box */}
                  <div
                    className={`h-11 w-11 rounded-xl bg-gradient-to-br ${p.iconBg} shadow-inner border border-white/60 mb-1 flex items-center justify-center text-[10px] font-bold text-white drop-shadow`}
                  >
                    {p.key.toUpperCase()}
                  </div>
                  <span className={`text-[10px] font-semibold leading-tight line-clamp-2 ${active ? 'text-blue-700' : 'text-slate-600'}`}>
                    {p.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
