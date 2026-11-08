'use client';

import { useState } from 'react';
import { CrossSectionResult } from '../lib/cross-section';

type Props = {
  data: CrossSectionResult;
  onClose: () => void;
};

function getDbzColor(dbz: number): string {
  if (dbz >= 70) return '#ffffff';
  if (dbz >= 65) return '#9854c6';
  if (dbz >= 60) return '#f800fd';
  if (dbz >= 55) return '#d40000';
  if (dbz >= 50) return '#fd0000';
  if (dbz >= 45) return '#fd9500';
  if (dbz >= 40) return '#e5bc00';
  if (dbz >= 35) return '#fdf802';
  if (dbz >= 30) return '#008e00';
  if (dbz >= 25) return '#01c501';
  if (dbz >= 20) return '#02fd02';
  if (dbz >= 15) return '#0300f4';
  if (dbz >= 10) return '#019ff4';
  if (dbz >= 5) return '#04e9e7';
  return 'transparent';
}

export function CrossSectionModal({ data, onClose }: Props) {
  const [hoverData, setHoverData] = useState<{
    altFt: number;
    distNm: number;
    dbz: number;
  } | null>(null);

  const numAltRows = data.grid.length;
  const numDistCols = data.grid[0]?.length || 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-5 backdrop-blur-xl animate-fade-in select-none">
      <div className="flex h-[88vh] w-full max-w-4xl flex-col rounded-3xl border border-cyan-500/40 bg-slate-950 shadow-2xl overflow-hidden font-mono">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-slate-900/70">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-cyan-500/20 text-xl text-cyan-400 border border-cyan-500/30">
              ✂️
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold text-white">Vertical Cross-Section (RHI Cut)</h2>
                {data.bwerDetected && (
                  <span className="rounded-full bg-purple-600 px-2 py-0.5 text-[9px] font-black uppercase text-white animate-pulse">
                    BWER Detected
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-sans">
                Baseline Length: <b className="text-white">{data.lengthNm} nm</b> ({data.lengthMi} miles) · 0 to 60,000 ft AGL
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-white/5 p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* Telemetry Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-white/10 p-4 bg-slate-950 text-xs">
          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-2.5">
            <span className="text-[10px] text-slate-400">Peak Core dBZ Aloft</span>
            <div className="text-base font-black text-rose-400">{data.maxDbzAloft} dBZ</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-2.5">
            <span className="text-[10px] text-slate-400">Peak Core Altitude</span>
            <div className="text-base font-black text-cyan-400">{data.maxAltitudeFt.toLocaleString()} ft</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-2.5">
            <span className="text-[10px] text-slate-400">Echo Top (18 dBZ)</span>
            <div className="text-base font-black text-purple-400">{data.echoTopFt.toLocaleString()} ft</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-2.5">
            <span className="text-[10px] text-slate-400">Hail Growth (-20°C)</span>
            <div className="text-base font-black text-amber-400">{data.hailGrowthLevelFt.toLocaleString()} ft</div>
          </div>
        </div>

        {/* Main Vertical RHI Canvas */}
        <div className="relative flex-1 p-6 flex flex-col justify-between bg-[#040812]">
          {/* Isotherm lines */}
          <div className="pointer-events-none absolute left-16 right-6 top-[63%] border-b border-dashed border-cyan-400/50 flex justify-between text-[9px] text-cyan-300">
            <span>0°C Freezing Level (~12,500 ft)</span>
          </div>
          <div className="pointer-events-none absolute left-16 right-6 top-[47%] border-b border-dashed border-amber-400/50 flex justify-between text-[9px] text-amber-300">
            <span>-20°C Hail Growth Zone (~22,000 ft)</span>
          </div>

          {/* Grid display */}
          <div className="flex flex-1">
            {/* Y-Axis Labels */}
            <div className="flex flex-col justify-between pr-3 text-[10px] text-slate-500 font-bold select-none text-right w-12">
              <span>60k ft</span>
              <span>45k ft</span>
              <span>30k ft</span>
              <span>15k ft</span>
              <span>0 ft</span>
            </div>

            {/* Sliced Storm Grid Canvas */}
            <div
              className="relative flex-1 border border-white/15 rounded-xl overflow-hidden flex flex-col cursor-crosshair bg-[#02050c]"
              onMouseLeave={() => setHoverData(null)}
            >
              {data.grid.map((row, rIdx) => {
                const altFt = Math.round(((numAltRows - 1 - rIdx) / (numAltRows - 1)) * 60000);
                return (
                  <div key={rIdx} className="flex flex-1">
                    {row.map((val, cIdx) => {
                      const distNm = Math.round((cIdx / (numDistCols - 1)) * data.lengthNm * 10) / 10;
                      return (
                        <div
                          key={cIdx}
                          style={{ backgroundColor: getDbzColor(val) }}
                          className="flex-1 hover:opacity-80 transition"
                          onMouseEnter={() =>
                            setHoverData({
                              altFt,
                              distNm,
                              dbz: val,
                            })
                          }
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* X-Axis Baseline Labels */}
          <div className="flex justify-between pl-14 pr-2 pt-2 text-[10px] text-slate-400">
            <span>Point A (0.0 nm)</span>
            <span className="text-slate-500">Distance Along Cross-Section Cut</span>
            <span>Point B ({data.lengthNm} nm)</span>
          </div>

          {/* Hover Telemetry Footer */}
          {hoverData && (
            <div className="mt-3 flex items-center justify-between rounded-xl border border-cyan-500/40 bg-slate-900/90 px-4 py-2 text-xs">
              <div>
                <span className="text-slate-400">Altitude:</span> <b className="text-cyan-400">{hoverData.altFt.toLocaleString()} ft AGL</b>
              </div>
              <div>
                <span className="text-slate-400">Distance from A:</span> <b className="text-white">{hoverData.distNm} nm</b>
              </div>
              <div>
                <span className="text-slate-400">Reflectivity:</span> <b className="text-emerald-400">{hoverData.dbz} dBZ</b>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
