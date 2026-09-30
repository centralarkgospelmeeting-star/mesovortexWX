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
    <aside className="w-[320px] border-r border-slate-800 bg-slate-950 overflow-y-auto">
      <div className="flex items-center gap-3 border-b border-slate-800 p-4 sticky top-0 bg-slate-950 z-10">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 text-2xl">
          🌪️
        </div>
        <div>
          <div className="text-2xl font-black tracking-tight text-cyan-300">MESOVORTEX</div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-400">WX • PRO RADAR • MODELS</div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400 block mb-2">
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
                active ? 'bg-cyan-900 text-cyan-100 ring-1 ring-cyan-500' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">Advanced Tools</div>
      <div className="space-y-2 p-4">
        <button className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 font-medium text-white hover:from-cyan-600 hover:to-blue-700 transition">
          3D Volumetric Radar + Globe
        </button>
        <button className="w-full rounded-2xl bg-emerald-900/90 px-4 py-3 font-medium text-emerald-100 hover:bg-emerald-800 transition">
          ⚡ FastScan (Ultra Low Latency)
        </button>
        <button className="w-full rounded-2xl bg-violet-900/90 px-4 py-3 font-medium text-violet-100 hover:bg-violet-800 transition">
          Quad View (4 Products)
        </button>
      </div>

      <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">Models (200+)</div>
      <div className="px-4 pb-4">
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
