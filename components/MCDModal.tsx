'use client';

type Props = {
  mcdText: string;
  loading: boolean;
  onClose: () => void;
  onRegenerate: () => void;
};

export function MCDModal({ mcdText, loading, onClose, onRegenerate }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-5 backdrop-blur-xl animate-fade-in select-none">
      <div className="flex h-[88vh] w-full max-w-3xl flex-col rounded-3xl border border-amber-500/40 bg-slate-950 shadow-2xl overflow-hidden font-mono">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-slate-900/70">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-500/20 text-xl text-amber-400 border border-amber-500/30">
              📝
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold text-white">SPC Mesoscale Discussion (MCD)</h2>
                <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[9px] font-black uppercase text-amber-300">
                  AI Operational Brief
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans">
                Real-Time Kinematic Analysis &amp; Watch Probability
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-white/5 p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* MCD Text Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs font-mono leading-relaxed bg-[#030611] text-slate-200 selection:bg-cyan-500/30">
          {loading ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
              <span className="h-6 w-6 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
              <p className="text-xs font-sans">Evaluating boundary layer kinematics, hodographs &amp; storm modes…</p>
            </div>
          ) : (
            <div className="whitespace-pre-wrap rounded-2xl border border-white/10 bg-slate-950/80 p-5 shadow-inner">
              {mcdText}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-white/10 bg-slate-900/60 p-4">
          <span className="text-[10px] text-slate-500 font-sans">
            Generated with MesoVortexWX AI Meteorological Reasoning Engine
          </span>
          <button
            onClick={onRegenerate}
            disabled={loading}
            className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-lg hover:bg-amber-500 disabled:opacity-40 transition"
          >
            ↻ Regenerate Briefing
          </button>
        </div>
      </div>
    </div>
  );
}
