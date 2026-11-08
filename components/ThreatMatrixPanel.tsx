'use client';

type Props = {
  onClose: () => void;
};

export function ThreatMatrixPanel({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xl animate-fade-in select-none">
      <div className="w-full max-w-lg rounded-3xl border border-red-500/30 bg-slate-950 p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <h3 className="text-base font-extrabold text-white">Severe Threat Matrix &amp; Risk Score</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        {/* Severe Risk Gauge */}
        <div className="rounded-2xl border border-red-500/20 bg-red-950/20 p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">Total Severe Risk Score</span>
            <div className="text-3xl font-black text-white font-mono">86 <span className="text-xs text-red-400">/ 100</span></div>
            <p className="text-[11px] text-slate-400 mt-0.5">High confidence supercells with active tornado parameters.</p>
          </div>
          <span className="rounded-2xl bg-red-600 px-3 py-1.5 text-xs font-black uppercase text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]">
            CRITICAL
          </span>
        </div>

        {/* Hazard Sliders */}
        <div className="space-y-3 font-mono text-xs">
          {[
            { hazard: '🌪️ Tornado Potential', val: 78, color: 'bg-red-500' },
            { hazard: '🧊 Giant Hail (>2.00")', val: 88, color: 'bg-pink-500' },
            { hazard: '💨 Damaging Wind (>65 kt)', val: 74, color: 'bg-amber-500' },
            { hazard: '🌊 Flash Flooding', val: 54, color: 'bg-cyan-500' },
          ].map((item) => (
            <div key={item.hazard} className="space-y-1">
              <div className="flex justify-between text-slate-300 text-[11px]">
                <span>{item.hazard}</span>
                <span className="font-bold text-white">{item.val}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden border border-white/5">
                <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.val}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Neighborhood Micro-Metrics */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 space-y-2">
          <div className="text-xs font-bold text-cyan-300">Neighborhood Surface Metrics</div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div>Feels-Like: <b className="text-white">92°F</b></div>
            <div>Wet-Bulb: <b className="text-cyan-400">76°F</b></div>
            <div>Pressure Tendency: <b className="text-red-400">-2.4 mb/hr</b></div>
            <div>Precip Arrival: <b className="text-amber-400">~14 mins</b></div>
          </div>
        </div>
      </div>
    </div>
  );
}
