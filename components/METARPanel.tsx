'use client';

import type { ReactNode } from 'react';

type Observation = {
  station: string;
  text: string;
  temp: string;
  dewpoint: string;
  wind: string;
};

type METARPanelProps = {
  observations: Observation[];
};

export function METARPanel({ observations }: METARPanelProps): ReactNode {
  return (
    <>
      <div className="border-b border-slate-800 p-5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">METARs & Surface Obs</div>
        <div className="mt-2 text-sm text-cyan-300">Real-time • NWS Access</div>
      </div>

      <div className="space-y-4 p-5 font-mono text-xs leading-relaxed text-slate-200">
        {observations.length > 0 ? (
          observations.map((obs) => (
            <div key={obs.station} className="rounded-xl border border-slate-700 bg-slate-900/50 p-3">
              <div className="mb-2 font-bold text-cyan-300">{obs.station}</div>
              <div className="text-slate-300">{obs.text}</div>
              <div className="mt-2 text-[10px] text-slate-400">
                <div>Temp: <span className="text-cyan-300">{obs.temp}</span></div>
                <div>Dew: <span className="text-cyan-300">{obs.dewpoint}</span></div>
                <div>Wind: <span className="text-cyan-300">{obs.wind}</span></div>
              </div>
            </div>
          ))
        ) : (
          <>
            <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-3">
              <div className="mb-2 font-bold text-cyan-300">KAMA</div>
              <div className="text-slate-300">Clear skies</div>
              <div className="mt-2 text-[10px] text-slate-400">
                <div>Temp: <span className="text-cyan-300">29°F</span></div>
                <div>Dew: <span className="text-cyan-300">12°F</span></div>
                <div>Wind: <span className="text-cyan-300">18 kt</span></div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-3">
              <div className="mb-2 font-bold text-cyan-300">KOUN</div>
              <div className="text-slate-300">Partly cloudy</div>
              <div className="mt-2 text-[10px] text-slate-400">
                <div>Temp: <span className="text-cyan-300">31°F</span></div>
                <div>Dew: <span className="text-cyan-300">18°F</span></div>
                <div>Wind: <span className="text-cyan-300">21 kt</span></div>
              </div>
            </div>
          </>
        )}
        <div className="pt-2 text-[10px] uppercase tracking-[0.2em] text-emerald-400">DOW-7 mobile radar • Real-time</div>
      </div>

      <div className="border-t border-slate-800 p-5">
        <div className="mb-4 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">Live Storm Chasers</div>
        <div className="space-y-3">
          <div className="rounded-2xl bg-slate-900/50 p-3">
            <div className="flex items-center justify-between text-sm text-red-400">
              <span>@ChaseTexas</span>
              <span className="text-[10px] text-slate-500">2m ago</span>
            </div>
            <div className="mt-2 text-sm">Large hail reported near Childress, TX</div>
          </div>
          <div className="rounded-2xl bg-slate-900/50 p-3">
            <div className="flex items-center justify-between text-sm text-orange-400">
              <span>@VortexHunt</span>
              <span className="text-[10px] text-slate-500">7m ago</span>
            </div>
            <div className="mt-2 text-sm">Rotation increasing — possible TVS</div>
          </div>
        </div>
      </div>
    </>
  );
}
