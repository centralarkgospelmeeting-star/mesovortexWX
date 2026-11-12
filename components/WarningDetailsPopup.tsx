'use client';

import { useState } from 'react';
import { WarningAlert } from './WarningDrawerRight';

type Props = {
  warning: WarningAlert | null;
  onClose: () => void;
  onSpeak?: (text: string) => void;
};

export function WarningDetailsPopup({ warning, onClose, onSpeak }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!warning) return null;

  const isTor = warning.event.includes('Tornado');
  const isSvr = warning.event.includes('Severe') || warning.event.includes('Thunderstorm');
  const isFld = warning.event.includes('Flood');

  const badgeClass = isTor
    ? 'bg-red-600 text-white'
    : isSvr
    ? 'bg-amber-400 text-slate-950 font-black'
    : isFld
    ? 'bg-emerald-500 text-white font-bold'
    : 'bg-blue-600 text-white';

  const defaultGuidance = isTor
    ? 'TAKE SHELTER IMMEDIATELY. Move to an interior room on the lowest floor of a sturdy building. Avoid windows. If in a mobile home or vehicle, move to the closest substantial shelter.'
    : isSvr
    ? 'Move to an interior room on the lowest floor of your home or business. Damaging winds and large hail are expected. Secure loose outdoor objects.'
    : isFld
    ? 'Turn around, don’t drown when encountering flooded roads. Most flood deaths occur in vehicles. Move to higher ground.'
    : 'Stay alert for updated weather statements and official instructions from emergency management.';

  const handleSpeak = () => {
    const textToSpeak = `The National Weather Service has issued a ${warning.event} for ${warning.areaDesc}. ${warning.headline}. Take necessary safety precautions.`;
    if (onSpeak) {
      onSpeak(textToSpeak);
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utter = new SpeechSynthesisUtterance(textToSpeak);
      utter.rate = 1.0;
      utter.pitch = 1.0;
      window.speechSynthesis.speak(utter);
    }
  };

  return (
    <div className="absolute top-20 right-4 sm:right-[400px] z-40 w-84 sm:w-96 rounded-3xl border border-slate-700 bg-slate-950/95 font-sans text-slate-100 shadow-2xl backdrop-blur-2xl p-5 animate-fade-in select-none">
      {/* Header with Title and Close Button (Section 10 & Wireframe 4) */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className={`rounded-xl px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${badgeClass}`}>
            {warning.event}
          </span>
          <span className="text-[10px] font-mono text-cyan-400 font-bold">
            {warning.wfo || 'NWS'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSpeak}
            className="flex items-center gap-1 rounded-xl bg-slate-800 hover:bg-slate-700 px-2 py-1 text-[11px] font-bold text-slate-200 transition cursor-pointer"
            title="Listen to official warning announcement"
          >
            <span>🔊</span> Listen
          </button>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-800 text-xs text-slate-400 hover:text-white transition cursor-pointer"
            title="Close Details Box"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Warning Body Information */}
      <div className="mt-3.5 space-y-3 text-xs">
        <div>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">
            Headline
          </span>
          <p className="font-bold text-white text-xs leading-snug">
            {warning.headline || warning.event}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
          <div>
            <span className="text-slate-500">Issuer:</span>{' '}
            <b className="text-cyan-400">{warning.wfo || 'NOAA / NWS'}</b>
          </div>
          <div>
            <span className="text-slate-500">Severity:</span>{' '}
            <b className="text-white">{warning.severity || 'Immediate'}</b>
          </div>
          <div>
            <span className="text-slate-500">Issued:</span>{' '}
            <span className="text-slate-300">{warning.sent ? warning.sent.slice(11, 16) + 'z' : 'Current'}</span>
          </div>
          <div>
            <span className="text-slate-500">Expires:</span>{' '}
            <b className="text-amber-400">{warning.expires ? warning.expires.slice(11, 16) + 'z' : 'Active'}</b>
          </div>
        </div>

        <div>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">
            Affected Area / Counties
          </span>
          <p className="text-[11px] text-slate-300 leading-tight">
            {warning.areaDesc || 'Multiple Regional Counties'}
          </p>
        </div>

        {/* Emergency Protective Action Guidance */}
        <div className={`p-3 rounded-2xl border text-[11px] leading-relaxed ${
          isTor ? 'border-red-500/50 bg-red-950/30 text-red-200' : 'border-amber-500/40 bg-amber-950/30 text-amber-200'
        }`}>
          <div className="font-extrabold uppercase text-[10px] tracking-wider mb-1 flex items-center gap-1.5">
            <span>🛡️</span> Protective Action Guidance
          </div>
          <p>{defaultGuidance}</p>
        </div>

        {/* Expand Details Toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white pt-1 transition cursor-pointer"
        >
          {expanded ? '▲ Collapse Details' : '▼ Expand Full NWS Text'}
        </button>

        {expanded && (
          <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-2.5 font-mono text-[10px] text-slate-300 leading-normal">
            {warning.headline}
            <br /><br />
            TARGET AREA: {warning.areaDesc}
            <br /><br />
            SOURCE: National Weather Service Bulletins. Always verify safety decisions with local sirens and emergency officials.
          </div>
        )}
      </div>
    </div>
  );
}
