'use client';

import { useState } from 'react';

export type WarningAlert = {
  id: string;
  event: string;
  headline: string;
  severity: string;
  areaDesc: string;
  sent: string;
  expires: string;
  wfo?: string;
  lat?: number;
  lon?: number;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  alerts: WarningAlert[];
  onSelectWarning: (alert: WarningAlert) => void;
};

export function WarningDrawerRight({
  isOpen,
  onClose,
  alerts,
  onSelectWarning,
}: Props) {
  const [filter, setFilter] = useState<'ALL' | 'TORNADO' | 'SEVERE' | 'FLOOD'>('ALL');

  if (!isOpen) return null;

  const filtered = alerts.filter((a) => {
    if (filter === 'TORNADO') return a.event.includes('Tornado');
    if (filter === 'SEVERE') return a.event.includes('Severe');
    if (filter === 'FLOOD') return a.event.includes('Flood');
    return true;
  });

  return (
    <aside className="absolute right-0 top-7 bottom-0 z-40 w-80 sm:w-96 border-l border-slate-800 bg-slate-950/95 font-sans text-slate-100 shadow-2xl backdrop-blur-2xl flex flex-col select-none animate-slide-left">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-800 p-3.5 bg-slate-900/60">
        <div className="flex items-center gap-2">
          <span className="text-base font-black text-white">Active Alerts</span>
          <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-black text-white">
            {alerts.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg bg-slate-800 p-1.5 text-xs text-slate-400 hover:text-white transition"
          title="Close Warning Drawer"
        >
          ✕
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 p-3 border-b border-slate-800 text-[11px] font-bold">
        {(['ALL', 'TORNADO', 'SEVERE', 'FLOOD'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`rounded-lg px-2.5 py-1 transition ${
              filter === cat
                ? 'bg-blue-600 text-white shadow'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Warning Cards List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs">
        {filtered.map((item) => {
          const isTor = item.event.includes('Tornado');
          const isSvr = item.event.includes('Thunderstorm');
          const borderClass = isTor ? 'border-red-500/60 bg-red-950/20' : isSvr ? 'border-amber-500/50 bg-amber-950/20' : 'border-blue-500/40 bg-blue-950/20';
          const badgeClass = isTor ? 'bg-red-600 text-white' : isSvr ? 'bg-amber-500 text-slate-950' : 'bg-blue-600 text-white';

          return (
            <div
              key={item.id}
              onClick={() => onSelectWarning(item)}
              className={`rounded-xl border p-3 cursor-pointer transition hover:scale-[1.01] hover:shadow-lg ${borderClass}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${badgeClass}`}>
                  {item.event}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {item.expires ? `Exp: ${item.expires.slice(11, 16)}z` : 'Active'}
                </span>
              </div>

              <div className="font-bold text-white text-xs leading-snug line-clamp-2">
                {item.headline || item.event}
              </div>

              <div className="mt-1 text-[11px] text-slate-400 line-clamp-1">
                {item.areaDesc || 'Multiple Counties'}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="p-8 text-center text-xs text-slate-500">
            No active alerts matching this filter.
          </div>
        )}
      </div>
    </aside>
  );
}
