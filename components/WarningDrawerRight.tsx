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
  geometry?: any;
  isNew?: boolean;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  alerts: WarningAlert[];
  onSelectWarning: (alert: WarningAlert) => void;
  selectedAlertId?: string | null;
};

export function WarningDrawerRight({
  isOpen,
  onClose,
  alerts,
  onSelectWarning,
  selectedAlertId,
}: Props) {
  const [filter, setFilter] = useState<'ALL' | 'TORNADO' | 'SEVERE' | 'FLOOD' | 'WINTER'>('ALL');
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filtered = alerts.filter((a) => {
    // Category filter
    if (filter === 'TORNADO' && !a.event.includes('Tornado')) return false;
    if (filter === 'SEVERE' && !a.event.includes('Severe') && !a.event.includes('Thunderstorm')) return false;
    if (filter === 'FLOOD' && !a.event.includes('Flood')) return false;
    if (filter === 'WINTER' && !a.event.includes('Winter') && !a.event.includes('Blizzard') && !a.event.includes('Ice')) return false;

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        a.event.toLowerCase().includes(q) ||
        (a.areaDesc && a.areaDesc.toLowerCase().includes(q)) ||
        (a.headline && a.headline.toLowerCase().includes(q)) ||
        (a.wfo && a.wfo.toLowerCase().includes(q));
      if (!match) return false;
    }

    return true;
  });

  const tornadoCount = alerts.filter((a) => a.event.includes('Tornado')).length;
  const severeCount = alerts.filter((a) => a.event.includes('Severe') || a.event.includes('Thunderstorm')).length;
  const floodCount = alerts.filter((a) => a.event.includes('Flood')).length;

  return (
    <aside className="absolute right-0 top-7 bottom-0 z-40 w-80 sm:w-96 border-l border-slate-800 bg-slate-950/95 font-sans text-slate-100 shadow-2xl backdrop-blur-2xl flex flex-col select-none animate-slide-left">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-800 p-4 bg-slate-900/70">
        <div className="flex items-center gap-2">
          <span className="text-base font-extrabold text-white">ACTIVE ALERTS</span>
          <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-black text-white shadow-sm">
            {alerts.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-800 text-xs text-slate-400 hover:text-white transition cursor-pointer"
          title="Close Warning Drawer"
        >
          ✕
        </button>
      </div>

      {/* Official Warning Notice (Section 10) */}
      <div className="bg-slate-900/50 px-4 py-1.5 border-b border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between font-mono">
        <span>OFFICIAL NWS BULLETINS</span>
        <span className="text-emerald-400 flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE STREAM
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="p-3 border-b border-slate-800 space-y-2">
        <div className="flex gap-1 text-[11px] font-bold overflow-x-auto pb-1">
          {[
            { id: 'ALL', label: `All (${alerts.length})` },
            { id: 'TORNADO', label: `Tor (${tornadoCount})` },
            { id: 'SEVERE', label: `Svr (${severeCount})` },
            { id: 'FLOOD', label: `Flood (${floodCount})` },
            { id: 'WINTER', label: 'Winter' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id as any)}
              className={`rounded-xl px-2.5 py-1 transition whitespace-nowrap cursor-pointer ${
                filter === cat.id
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Location / County Search Filter */}
        <input
          type="text"
          placeholder="Filter by county, state, or WFO..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-800 bg-slate-900 py-1.5 px-3 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
        />
      </div>

      {/* Warning Cards List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs">
        {filtered.map((item) => {
          const isTor = item.event.includes('Tornado');
          const isSvr = item.event.includes('Severe') || item.event.includes('Thunderstorm');
          const isFld = item.event.includes('Flood');
          const isSelected = selectedAlertId === item.id;

          const borderClass = isSelected
            ? 'border-cyan-400 ring-2 ring-cyan-400/50 bg-slate-900'
            : isTor
            ? 'border-red-500/60 bg-red-950/20 hover:border-red-400'
            : isSvr
            ? 'border-amber-500/50 bg-amber-950/20 hover:border-amber-400'
            : isFld
            ? 'border-emerald-500/40 bg-emerald-950/20 hover:border-emerald-400'
            : 'border-blue-500/40 bg-blue-950/20 hover:border-blue-400';

          const badgeClass = isTor
            ? 'bg-red-600 text-white'
            : isSvr
            ? 'bg-amber-400 text-slate-950 font-black'
            : isFld
            ? 'bg-emerald-500 text-white font-bold'
            : 'bg-blue-600 text-white';

          return (
            <div
              key={item.id}
              onClick={() => onSelectWarning(item)}
              className={`rounded-2xl border p-3.5 cursor-pointer transition transform hover:scale-[1.01] hover:shadow-xl ${borderClass}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`rounded-lg px-2 py-0.5 text-[10px] font-black uppercase ${badgeClass}`}>
                  {item.event}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {item.expires ? `Exp: ${item.expires.slice(11, 16)}z` : 'Active'}
                </span>
              </div>

              <div className="font-bold text-white text-xs leading-snug line-clamp-2">
                {item.headline || item.event}
              </div>

              <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
                <span className="truncate max-w-[200px]">{item.areaDesc || 'Multiple Counties'}</span>
                <span className="font-mono text-cyan-400 font-bold ml-1">{item.wfo || 'NWS'}</span>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="p-8 text-center text-xs text-slate-500">
            No active alerts matching your filter criteria.
          </div>
        )}
      </div>
    </aside>
  );
}
