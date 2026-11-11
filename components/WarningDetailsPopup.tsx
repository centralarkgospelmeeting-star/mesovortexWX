'use client';

import { WarningAlert } from './WarningDrawerRight';

type Props = {
  warning: WarningAlert | null;
  onClose: () => void;
};

export function WarningDetailsPopup({ warning, onClose }: Props) {
  if (!warning) return null;

  const isTor = warning.event.includes('Tornado');
  const isSvr = warning.event.includes('Thunderstorm');

  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 sm:left-auto sm:right-96 z-40 w-80 rounded-2xl border border-slate-700 bg-slate-950/95 font-sans text-slate-100 shadow-2xl backdrop-blur-2xl p-4 animate-fade-in select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <span className={`rounded-lg px-2 py-0.5 text-[10px] font-black uppercase ${
            isTor ? 'bg-red-600 text-white' : isSvr ? 'bg-amber-400 text-slate-950' : 'bg-blue-600 text-white'
          }`}>
            {warning.event}
          </span>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg bg-slate-800 p-1 text-xs text-slate-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      {/* Details Body */}
      <div className="mt-3 space-y-2 text-xs">
        <div>
          <span className="text-[10px] text-slate-500 font-bold uppercase">Headline</span>
          <p className="font-bold text-white text-xs leading-snug">{warning.headline}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
          <div>
            <span className="text-slate-500">Issuer:</span> <b className="text-cyan-400">{warning.wfo || 'NWS'}</b>
          </div>
          <div>
            <span className="text-slate-500">Severity:</span> <b className="text-white">{warning.severity}</b>
          </div>
        </div>

        <div>
          <span className="text-[10px] text-slate-500 font-bold uppercase">Affected Area</span>
          <p className="text-[11px] text-slate-300 leading-tight">{warning.areaDesc}</p>
        </div>
      </div>
    </div>
  );
}
