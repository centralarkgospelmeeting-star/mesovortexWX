'use client';

import type { Dispatch, SetStateAction } from 'react';
import { RADAR_PRODUCTS, RADAR_SITES } from '../lib/radar-config';

type SidebarProps = {
  product: keyof typeof RADAR_PRODUCTS;
  setProduct: Dispatch<SetStateAction<'ref' | 'vel' | 'srvel' | 'dualpol' | 'et' | 'vil'>>;
  radarSite?: string;
  setRadarSite?: (site: string) => void;
};

export function Sidebar({
  product,
  setProduct,
  radarSite = 'KOUN',
  setRadarSite
}: SidebarProps) {
  return (
    <aside className="weather-sidebar w-[320px] overflow-y-auto border-r border-slate-800 bg-slate-950">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-800 bg-slate-950/90 p-4 backdrop-blur-xl">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-500 text-2xl shadow-lg shadow-cyan-500/20">
          🌪️
        </div>
        <div>
          <div className="text-2xl font-black tracking-tight text-cyan-300">MESOVORTEX</div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-400">WX • PRO RADAR • MODELS</div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div>
          <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">
            Radar Site
          </label>
          <select
            value={radarSite}
            onChange={(e) => setRadarSite?.(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none"
          >
            {RADAR_SITES.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name} ({site.id})
              </option>
            ))}
          </select>
        </div>

        <input
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none"
          placeholder="Search city, radar site, or storm..."
        />
      </div>

      <div className="px-4 pb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">NEXRAD Products</div>
      <div className="grid grid-cols-2 gap-2 p-4">
        {RADAR_PRODUCTS.map((item) => {
          const active = product === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setProduct(item.key as any)}
              title={item.description}
              className={`rounded-2xl p-3 text-left text-sm transition ${
                active
                  ? 'bg-gradient-to-br from-cyan-900 to-blue-900 text-cyan-100 ring-1 ring-cyan-500 shadow-lg shadow-cyan-500/10'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">Advanced Tools</div>
      <div className="space-y-2 p-4">
        <button className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 font-medium text-white transition hover:from-cyan-400 hover:to-blue-500">
          3D Volumetric Radar + Globe
        </button>
        <button className="w-full rounded-2xl bg-emerald-900/90 px-4 py-3 font-medium text-emerald-100 transition hover:bg-emerald-800">
          ⚡ FastScan (Ultra Low Latency)
        </button>
        <button className="w-full rounded-2xl bg-violet-900/90 px-4 py-3 font-medium text-violet-100 transition hover:bg-violet-800">
          Quad View (4 Products)
        </button>
      </div>

      <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">Threat matrix</div>
      <div className="space-y-3 px-4 pb-5">
        {[
          { name: 'Tornado', value: 'Moderate', color: 'bg-red-500' },
          { name: 'Wind', value: 'High', color: 'bg-amber-500' },
          { name: 'Hail', value: 'Elevated', color: 'bg-orange-500' },
          { name: 'Flash Flood', value: 'Watch', color: 'bg-cyan-500' }
        ].map((threat) => (
          <div key={threat.name} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-slate-200">{threat.name}</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{threat.value}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800">
              <div className={`h-full rounded-full ${threat.color}`} style={{ width: threat.name === 'Wind' ? '72%' : threat.name === 'Tornado' ? '48%' : threat.name === 'Hail' ? '61%' : '54%' }} />
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">Models (200+)</div>
      <div className="px-4 pb-5">
        <select className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none">
          <option>HRRR 18z (3km)</option>
          <option>NAM Nest 3km</option>
          <option>RAP 13km</option>
          <option>GFS 0.25°</option>
          <option>ECMWF Hi-Res</option>
        </select>
      </div>
    </aside>
  );
}









































































































































































































































































