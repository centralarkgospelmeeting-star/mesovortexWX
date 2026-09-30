'use client';

import { useEffect, useState } from 'react';
import { RadarMap } from '../components/RadarMap';
import { Sidebar } from '../components/Sidebar';

const products = {
  ref: 'Base Reflectivity • 0.5° Tilt',
  vel: 'Base Velocity',
  srvel: 'Storm Relative Velocity',
  dualpol: 'Dual-Pol (ZDR / CC / KDP)',
  et: 'Echo Tops',
  vil: 'Vertically Integrated Liquid'
};

export default function Page() {
  const [product, setProduct] = useState<'ref' | 'vel' | 'srvel' | 'dualpol' | 'et' | 'vil'>('ref');
  const [status, setStatus] = useState('LIVE • NEXRAD + DOW');

  useEffect(() => {
    fetch('/api/radar')
      .then((res) => res.json())
      .then((data) => setStatus(data.status || 'LIVE • NEXRAD + DOW'))
      .catch(() => setStatus('LIVE • NEXRAD + DOW'));
  }, []);

  return (
    <main className="flex h-screen bg-slate-950 text-white">
      <Sidebar product={product} setProduct={setProduct} />

      <section className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950/90 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
              MesoVortexWX
            </div>
            <div className="text-sm font-medium text-cyan-300">{products[product]}</div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-emerald-400">
              <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" />
              {status}
            </div>
            <button className="rounded-2xl border border-slate-700 bg-slate-800 px-5 py-2 text-sm font-medium transition hover:bg-white hover:text-slate-900">
              ▶ Loop Animation
            </button>
          </div>
        </header>

        <div className="relative flex-1 overflow-hidden">
          <RadarMap product={product} />

          <div className="absolute bottom-6 left-6 z-[500] w-72 rounded-3xl border border-slate-700 bg-slate-950/85 p-4 shadow-2xl backdrop-blur-xl">
            <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-300">
              Reflectivity (dBZ)
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-200">
              <div className="h-5 rounded bg-cyan-400/70" />
              <div className="flex items-center justify-end">-10</div>
              <div className="h-5 rounded bg-blue-500/70" />
              <div className="flex items-center justify-end">15</div>
              <div className="h-5 rounded bg-emerald-500/70" />
              <div className="flex items-center justify-end">25</div>
              <div className="h-5 rounded bg-yellow-400/80" />
              <div className="flex items-center justify-end">35</div>
              <div className="h-5 rounded bg-orange-500/80" />
              <div className="flex items-center justify-end">45</div>
              <div className="h-5 rounded bg-red-500/80" />
              <div className="flex items-center justify-end">60+</div>
            </div>
          </div>

          <div className="absolute bottom-6 right-6 z-[500] rounded-3xl border border-slate-700 bg-slate-950/85 p-4 shadow-2xl backdrop-blur-xl">
            <input type="range" min="0" max="120" defaultValue="60" className="w-72 accent-cyan-400" />
            <div className="mt-2 text-center text-[10px] uppercase tracking-[0.2em] text-slate-400">00:00 — 02:00 UTC</div>
          </div>
        </div>
      </section>

      <aside className="w-[320px] border-l border-slate-800 bg-slate-950">
        <div className="border-b border-slate-800 p-5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">METARs & Surface Obs</div>
          <div className="mt-2 text-sm text-cyan-300">Real-time • DOW Access</div>
        </div>

        <div className="space-y-4 p-5 font-mono text-xs leading-relaxed text-slate-200">
          <div>KAMA 062053Z 18018G26KT 10SM FEW080 29/12 A2985 RMK AO2 PK WND 18026/2045</div>
          <div>KOUN 062053Z 21012KT 10SM SCT050 31/18 A2989 RMK AO2</div>
          <div>KLBB 062053Z 20015G24KT 10SM CLR 33/08 A2992 RMK AO2</div>
          <div className="pt-2 text-[10px] uppercase tracking-[0.2em] text-emerald-400">DOW-7 mobile radar available</div>
        </div>

        <div className="border-t border-slate-800 p-5">
          <div className="mb-4 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">Live Storm Chasers</div>
          <div className="space-y-3">
            <div className="rounded-2xl bg-slate-900 p-3">
              <div className="flex items-center justify-between text-sm text-red-400">
                <span>@ChaseTexas</span>
                <span className="text-[10px] text-slate-500">2m ago</span>
              </div>
              <div className="mt-2 text-sm">Large hail reported near Childress, TX</div>
            </div>
            <div className="rounded-2xl bg-slate-900 p-3">
              <div className="flex items-center justify-between text-sm text-orange-400">
                <span>@VortexHunt</span>
                <span className="text-[10px] text-slate-500">7m ago</span>
              </div>
              <div className="mt-2 text-sm">Rotation increasing — possible TVS</div>
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
}
