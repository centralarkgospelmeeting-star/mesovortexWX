'use client';

import { useEffect, useState } from 'react';
import { RadarMap } from '../components/RadarMap';
import { Sidebar } from '../components/Sidebar';
import { AlertBanner } from '../components/AlertBanner';
import { METARPanel } from '../components/METARPanel';

const products = {
  ref: 'Base Reflectivity • 0.5° Tilt',
  vel: 'Base Velocity',
  srvel: 'Storm Relative Velocity',
  dualpol: 'Dual-Pol (ZDR / CC / KDP)',
  et: 'Echo Tops',
  vil: 'Vertically Integrated Liquid'
};

type AlertItem = {
  id: string;
  headline: string;
  severity: string;
  area: string;
  sent: string;
};

type Observation = {
  station: string;
  text: string;
  temp: string;
  dewpoint: string;
  wind: string;
};

export default function Page() {
  const [product, setProduct] = useState<'ref' | 'vel' | 'srvel' | 'dualpol' | 'et' | 'vil'>('ref');
  const [radarSite, setRadarSite] = useState('KOUN');
  const [status, setStatus] = useState('LIVE • NEXRAD + DOW');
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [isLooping, setIsLooping] = useState(false);

  useEffect(() => {
    // Fetch radar status
    fetch('/api/radar')
      .then((res) => res.json())
      .then((data) => setStatus(data.status || 'LIVE • NEXRAD + DOW'))
      .catch(() => setStatus('LIVE • NEXRAD + DOW'));

    // Fetch weather alerts
    fetch('/api/alerts')
      .then((res) => res.json())
      .then((data) => setAlerts(data.alerts || []))
      .catch(() => setAlerts([]));

    // Fetch METAR observations
    fetch('/api/metar')
      .then((res) => res.json())
      .then((data) => setObservations(data.observations || []))
      .catch(() => setObservations([]));

    // Refresh every 5 minutes
    const interval = setInterval(() => {
      fetch('/api/alerts')
        .then((res) => res.json())
        .then((data) => setAlerts(data.alerts || []))
        .catch(() => {});
    }, 300000);

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="flex h-screen flex-col bg-slate-950 text-white">
      {alerts.length > 0 && <AlertBanner alert={alerts[0]} />}

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          product={product}
          setProduct={setProduct}
          radarSite={radarSite}
          setRadarSite={setRadarSite}
        />

        <section className="flex flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950/90 px-6 py-4 backdrop-blur">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
                MesoVortexWX
              </div>
              <div className="text-sm font-medium text-cyan-300">{products[product]}</div>
              <div className="text-xs text-slate-400">Site: {radarSite}</div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" />
                {status}
              </div>
              <button
                onClick={() => setIsLooping(!isLooping)}
                className={`rounded-2xl px-5 py-2 text-sm font-medium transition ${
                  isLooping
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'border border-slate-700 bg-slate-800 hover:bg-white hover:text-slate-900'
                }`}
              >
                {isLooping ? '⏹ Stop Loop' : '▶ Loop Animation'}
              </button>
            </div>
          </header>

          <div className="relative flex-1 overflow-hidden">
            <RadarMap product={product} isLooping={isLooping} radarSite={radarSite} />

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

        <aside className="w-[320px] border-l border-slate-800 bg-slate-950 overflow-y-auto">
          <METARPanel observations={observations} />
        </aside>
      </div>
    </main>
  );
}
