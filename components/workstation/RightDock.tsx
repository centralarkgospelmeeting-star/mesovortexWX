'use client';

import type { SpotterPin } from '../RadarMap';

type RightDockProps = {
  alerts: Array<{ id?: string; headline: string; severity: string; area: string }>;
  spotterReports: SpotterPin[];
  onOpenThreatMatrix: () => void;
  onOpenSounding: () => void;
  onOpenAssistant: () => void;
  onOpenQuad: () => void;
  onOpenSpotterReport: () => void;
  dualPane: boolean;
  onToggleDualPane: () => void;
  fastScan: boolean;
};

function severityClass(sev: string) {
  switch (sev) {
    case 'Extreme': return 'border-red-500/60 bg-red-950/50 text-red-100';
    case 'Severe': return 'border-orange-500/60 bg-orange-950/40 text-orange-100';
    case 'Moderate': return 'border-amber-500/60 bg-amber-950/30 text-amber-100';
    default: return 'border-slate-600 bg-slate-900/60 text-slate-200';
  }
}

export function RightDock({
  alerts,
  spotterReports,
  onOpenThreatMatrix,
  onOpenSounding,
  onOpenAssistant,
  onOpenQuad,
  onOpenSpotterReport,
  dualPane,
  onToggleDualPane,
  fastScan,
}: RightDockProps) {
  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col border-l border-slate-800 bg-[#0b1220] text-slate-100">
      <div className="border-b border-slate-800 px-2 py-1.5">
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">Alerts</div>
      </div>
      <div className="max-h-[28%] overflow-y-auto border-b border-slate-800 p-1.5">
        {alerts.length === 0 ? (
          <div className="rounded border border-slate-800 bg-slate-950/60 px-2 py-1.5 text-[11px] text-slate-400">No active alerts loaded</div>
        ) : (
          <div className="space-y-1">
            {alerts.slice(0, 12).map((a, i) => (
              <div key={a.id || i} className={`rounded border px-1.5 py-1 text-[10px] leading-tight ${severityClass(a.severity)}`}>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold uppercase tracking-wide">{a.severity}</span>
                  {i === 0 && <span className="rounded bg-white/10 px-1 text-[9px]">NEWEST</span>}
                </div>
                <div className="mt-0.5 font-semibold line-clamp-2">{a.headline}</div>
                <div className="mt-0.5 text-[9px] opacity-80 line-clamp-1">{a.area}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-b border-slate-800 px-2 py-1.5 flex items-center justify-between">
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">Storm / Environment</div>
        <div className={`text-[9px] font-bold ${fastScan ? 'text-emerald-400' : 'text-slate-500'}`}>{fastScan ? 'FASTSCAN' : 'STD'}</div>
      </div>
      <div className="grid grid-cols-2 gap-1 border-b border-slate-800 p-1.5">
        <button onClick={onOpenThreatMatrix} className="rounded border border-red-700/60 bg-red-950/30 px-2 py-1.5 text-left text-[10px] font-bold text-red-200 hover:bg-red-900/40">Threat Matrix</button>
        <button onClick={onOpenSounding} className="rounded border border-cyan-700/60 bg-cyan-950/30 px-2 py-1.5 text-left text-[10px] font-bold text-cyan-200 hover:bg-cyan-900/40">Sounding</button>
        <button onClick={onOpenQuad} className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-left text-[10px] font-bold text-slate-200 hover:bg-slate-800">Quad View</button>
        <button onClick={onToggleDualPane} className={`rounded border px-2 py-1.5 text-left text-[10px] font-bold ${dualPane ? 'border-cyan-600 bg-cyan-900/40 text-cyan-100' : 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'}`}>Dual Pane</button>
      </div>

      <div className="border-b border-slate-800 px-2 py-1.5 flex items-center justify-between">
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">Spotter Reports</div>
        <button onClick={onOpenSpotterReport} className="rounded border border-amber-700/60 bg-amber-950/30 px-1.5 py-0.5 text-[9px] font-bold text-amber-200 hover:bg-amber-900/40">+ REPORT</button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {spotterReports.length === 0 ? (
          <div className="rounded border border-slate-800 bg-slate-950/60 px-2 py-1.5 text-[11px] text-slate-400">No local spotter reports this session. Click map to pick coords, then use + REPORT.</div>
        ) : (
          <div className="space-y-1">
            {[...spotterReports].reverse().slice(0, 20).map((r) => (
              <div key={r.id} className="rounded border border-slate-700 bg-slate-900/70 px-1.5 py-1 text-[10px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-amber-300 uppercase">{r.hazardType}</span>
                  <span className="text-[9px] text-slate-400">{new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="text-slate-200 line-clamp-2">{r.description || '—'}</div>
                <div className="text-[9px] text-slate-400">{r.callsign} • {r.lat.toFixed(3)},{r.lon.toFixed(3)}{r.hailSize ? ` • ${r.hailSize}"` : ''}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-slate-800 p-1.5">
        <button onClick={onOpenAssistant} className="w-full rounded border border-violet-700/60 bg-violet-950/40 px-2 py-2 text-left text-[11px] font-bold text-violet-100 hover:bg-violet-900/40">
          AI Meteorologist
          <div className="text-[9px] font-normal text-violet-300/80">Copilot / analysis tools</div>
        </button>
      </div>
    </aside>
  );
}
