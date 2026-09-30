'use client';

import type { Dispatch, SetStateAction } from 'react';

const products = [
  { key: 'ref', label: 'Base Reflectivity' },
  { key: 'vel', label: 'Base Velocity' },
  { key: 'srvel', label: 'SR Velocity' },
  { key: 'dualpol', label: 'Dual-Pol' },
  { key: 'et', label: 'Echo Tops' },
  { key: 'vil', label: 'VIL / POSH' }
] as const;

export function Sidebar({
  product,
  setProduct
}: {
  product: keyof typeof products;
  setProduct: Dispatch<SetStateAction<'ref' | 'vel' | 'srvel' | 'dualpol' | 'et' | 'vil'>>;
}) {
  return (
    <aside className="w-[320px] border-r border-slate-800 bg-slate-950">
      <div className="flex items-center gap-3 border-b border-slate-800 p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 text-2xl">🌪️</div>
        <div>
          <div className="text-2xl font-black tracking-tight text-cyan-300">MESOVORTEX</div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-400">WX • PRO RADAR • MODELS</div>
        </div>
      </div>

      <div className="p-4">
        <input
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none"
          placeholder="Search city, radar site, or storm..."
        />
      </div>

      <div className="px-4 pb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">NEXRAD Products</div>
      <div className="grid grid-cols-2 gap-2 p-4">
        {products.map((item) => {
          const active = product === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setProduct(item.key as any)}
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
        <button className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 font-medium text-white">
          3D Volumetric Radar + Globe
        </button>
        <button className="w-full rounded-2xl bg-emerald-900/90 px-4 py-3 font-medium text-emerald-100">
          ⚡ FastScan (Ultra Low Latency)
        </button>
        <button className="w-full rounded-2xl bg-violet-900/90 px-4 py-3 font-medium text-violet-100">
          Quad View (4 Products)
        </button>
      </div>

      <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">Models</div>
      <div className="px-4 pb-4">
        <select className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none">
          <option>HRRR 18z (3km)</option>
          <option>NAM Nest 3km</option>
          <option>RAP 13km</option>
          <option>GFS 0.25°</option>
        </select>
      </div>
    </aside>
  );
}
