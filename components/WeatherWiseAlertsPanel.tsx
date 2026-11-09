'use client';

import { useState } from 'react';

export type WeatherAlertItem = {
  id: string;
  event: string;
  headline: string;
  severity: string;
  areaDesc: string;
  population?: string;
  state?: string;
  wfo?: string;
  expiresMin?: number;
};

type Props = {
  alerts: WeatherAlertItem[];
  onClose: () => void;
  onSelectAlert: (alert: WeatherAlertItem) => void;
};

export function WeatherWiseAlertsPanel({ alerts, onClose, onSelectAlert }: Props) {
  const [filter, setFilter] = useState<'All' | 'Warnings' | 'Watches'>('All');

  const warnings = alerts.filter((a) => a.event.includes('Warning'));
  const count = alerts.length;

  return (
    <div className="absolute right-0 top-0 bottom-0 z-40 w-[360px] bg-white text-slate-800 shadow-2xl border-l border-slate-200 flex flex-col font-sans select-none animate-slide-left">
      {/* Top Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-base text-slate-900">Current Alerts</span>
          <span className="rounded-full bg-slate-950 px-2.5 py-0.5 text-xs font-black text-white">
            {count}
          </span>
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
        >
          ✕
        </button>
      </div>

      {/* Filter Buttons */}
      <div className="p-3 border-b border-slate-100 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-bold">
          <button
            onClick={() => setFilter('All')}
            className={`rounded-full px-3 py-1 transition ${
              filter === 'All' ? 'bg-amber-400 text-slate-950' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('Warnings')}
            className={`rounded-full px-3 py-1 transition ${
              filter === 'Warnings' ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Warnings
          </button>
          <button
            onClick={() => setFilter('Watches')}
            className={`rounded-full px-3 py-1 transition ${
              filter === 'Watches' ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Watches
          </button>
          <button className="rounded-full bg-slate-100 px-2 py-1 text-slate-600 hover:bg-slate-200">
            ➕
          </button>
        </div>

        <button className="w-full rounded-xl bg-slate-950 py-1.5 text-center text-xs font-bold text-amber-300 hover:bg-slate-900 transition flex items-center justify-center gap-1.5">
          <span>⚙</span> Settings
        </button>
      </div>

      {/* Alerts Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Category Header */}
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
          <div className="flex items-center gap-1.5">
            <span>Warnings</span>
            <span className="rounded-full bg-slate-950 px-2 py-0.2 text-[10px] text-white font-mono">
              {warnings.length}
            </span>
          </div>
          <span className="text-slate-400 text-[11px] cursor-pointer">👁</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 px-1">
          <span>🌩️ Severe Thunderstorm</span>
          <span className="rounded-full bg-slate-950 px-1.5 text-[10px] text-white">
            {warnings.length}
          </span>
          <span className="text-slate-400 text-[11px] ml-auto">ⓘ</span>
        </div>

        {/* Warning Cards (Pink/Red Background) */}
        {warnings.map((a, i) => (
          <div
            key={a.id || i}
            onClick={() => onSelectAlert(a)}
            className="rounded-2xl border border-red-200 bg-red-50/80 hover:bg-red-100/90 p-3.5 space-y-2 cursor-pointer transition shadow-sm"
          >
            <div className="text-xs font-bold text-red-950 leading-snug">
              {a.headline || '60 mph wind gusts and quarter size hail.'}
            </div>

            {/* Threat Badges Row */}
            <div className="flex items-center gap-1.5 text-[10px] font-black text-white font-mono">
              <span className="rounded-md bg-slate-950 px-2 py-0.5">
                👥 {a.population || '5.8K'}
              </span>
              <span className="rounded-md bg-slate-950 px-2 py-0.5">
                {a.state || 'AR'}
              </span>
              <span className="rounded-md bg-slate-950 px-2 py-0.5">
                {a.wfo || 'KLZK'}
              </span>
            </div>

            <div className="text-[10px] text-slate-500 font-medium">
              Expires in {a.expiresMin || 27} minutes
            </div>
          </div>
        ))}

        {warnings.length === 0 && (
          <div className="p-8 text-center text-xs text-slate-400">
            No active severe warnings currently reported.
          </div>
        )}
      </div>
    </div>
  );
}

export default WeatherWiseAlertsPanel;
