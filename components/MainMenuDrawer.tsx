'use client';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onResetConus: () => void;
};

export function MainMenuDrawer({ isOpen, onClose, onOpenSettings, onResetConus }: Props) {
  if (!isOpen) return null;

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-800 bg-slate-950/98 p-4 font-sans text-slate-100 shadow-2xl backdrop-blur-2xl flex flex-col justify-between select-none animate-slide-right">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <span className="font-black text-sm uppercase text-white">MesoVortex Menu</span>
          <button onClick={onClose} className="rounded-lg bg-slate-900 p-1.5 text-xs text-slate-400 hover:text-white">✕</button>
        </div>

        {/* Map Tools */}
        <div className="space-y-1 text-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Navigation &amp; View</span>
          <button
            onClick={() => { onResetConus(); onClose(); }}
            className="w-full text-left rounded-xl p-2 hover:bg-slate-900 font-bold text-slate-200"
          >
            🗺️ Reset View to United States
          </button>
        </div>

        {/* Observation Feeds */}
        <div className="space-y-1 text-xs border-t border-slate-800 pt-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Recon &amp; Spotters</span>
          <div className="rounded-lg p-2 hover:bg-slate-900 cursor-pointer">🌪️ Live Storm Chasers (GPS)</div>
          <div className="rounded-lg p-2 hover:bg-slate-900 cursor-pointer">📡 Spotter Network Reports</div>
          <div className="rounded-lg p-2 hover:bg-slate-900 cursor-pointer">✈️ Aviation Recon Flights (NOAA)</div>
          <div className="rounded-lg p-2 hover:bg-slate-900 cursor-pointer">🌡️ Airport METAR Observations</div>
        </div>
      </div>

      {/* Settings Launcher */}
      <div className="border-t border-slate-800 pt-3">
        <button
          onClick={() => { onOpenSettings(); onClose(); }}
          className="w-full rounded-xl bg-blue-600 py-2.5 text-center text-xs font-bold text-white shadow-lg hover:bg-blue-500 transition"
        >
          ⚙ Open Settings Workspace
        </button>
      </div>
    </aside>
  );
}
