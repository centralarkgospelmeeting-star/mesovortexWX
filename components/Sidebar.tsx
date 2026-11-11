'use client';

import type { Dispatch, SetStateAction } from 'react';
import { RADAR_PRODUCTS, type RadarProductKey } from '../lib/radar-config';
import type { ActivePlacefile } from './PlacefileManagerModal';

type SidebarProps = {
  product: RadarProductKey | string;
  setProduct: Dispatch<SetStateAction<any>>;
  // layer toggles
  showLightning: boolean; setShowLightning: (v: boolean) => void;
  showMetars: boolean; setShowMetars: (v: boolean) => void;
  showLSR: boolean; setShowLSR: (v: boolean) => void;
  showWatches: boolean; setShowWatches: (v: boolean) => void;
  showRadarPills: boolean; setShowRadarPills: (v: boolean) => void;
  // placefiles
  placefiles: ActivePlacefile[];
  onTogglePlacefile: (id: string) => void;
  onOpenPlacefileManager: () => void;
  onOpenPal: () => void;
  onOpenLayerManager: () => void;
};

function ToggleRow({ label, checked, onChange, accent }: { label: string; checked: boolean; onChange: (v: boolean) => void; accent?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded px-1.5 py-1 text-[11px] text-slate-200 hover:bg-white/5">
      <span className="font-medium">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className={accent || 'accent-cyan-500'} />
    </label>
  );
}

export function Sidebar({
  product, setProduct,
  showLightning, setShowLightning,
  showMetars, setShowMetars,
  showLSR, setShowLSR,
  showWatches, setShowWatches,
  showRadarPills, setShowRadarPills,
  placefiles, onTogglePlacefile, onOpenPlacefileManager, onOpenPal, onOpenLayerManager,
}: SidebarProps) {
  const enabledPf = placefiles.filter(p => p.enabled).length;
  return (
    <aside className="flex h-full w-[250px] shrink-0 flex-col border-r border-slate-800 bg-[#0b1220] text-slate-100">
      <div className="border-b border-slate-800 px-2 py-1.5 flex items-center justify-between">
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">Radar Products</div>
        <button onClick={onOpenPal} className="text-[9px] font-bold text-amber-300 hover:text-amber-200" title="Load .pal color table">.PAL</button>
      </div>
      <div className="grid grid-cols-2 gap-1 p-1.5 border-b border-slate-800">
        {RADAR_PRODUCTS.map((item) => {
          const active = product === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setProduct(item.key)}
              title={item.sourceNote ? `${item.description} — ${item.sourceNote}` : item.description}
              className={`rounded border px-1.5 py-1 text-left transition ${
                active
                  ? 'border-cyan-500/70 bg-cyan-900/50 text-cyan-100'
                  : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-500 hover:text-white'
              }`}
            >
              <div className="text-[11px] font-extrabold leading-none">{item.short}</div>
              <div className="mt-0.5 text-[9px] leading-tight opacity-80 line-clamp-1">{item.label}</div>
            </button>
          );
        })}
      </div>

      <div className="border-b border-slate-800 px-2 py-1.5 flex items-center justify-between">
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">Layers</div>
        <button onClick={onOpenLayerManager} className="text-[9px] font-bold text-slate-400 hover:text-white">MANAGER</button>
      </div>
      <div className="border-b border-slate-800 p-1 space-y-0.5">
        <ToggleRow label="Lightning (GLM)" checked={showLightning} onChange={setShowLightning} accent="accent-amber-400" />
        <ToggleRow label="METAR Stations" checked={showMetars} onChange={setShowMetars} accent="accent-emerald-400" />
        <ToggleRow label="Storm Reports (LSR)" checked={showLSR} onChange={setShowLSR} accent="accent-sky-400" />
        <ToggleRow label="Watch Boxes" checked={showWatches} onChange={setShowWatches} accent="accent-rose-400" />
        <ToggleRow label="Radar Site Pills" checked={showRadarPills} onChange={setShowRadarPills} accent="accent-cyan-400" />
      </div>

      <div className="border-b border-slate-800 px-2 py-1.5 flex items-center justify-between">
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">Placefiles</div>
        <button onClick={onOpenPlacefileManager} className="text-[9px] font-bold text-cyan-300 hover:text-cyan-200">EDIT ({enabledPf}/{placefiles.length})</button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-1">
        {placefiles.length === 0 ? (
          <div className="px-1.5 py-1 text-[11px] text-slate-500">No placefiles configured.</div>
        ) : (
          <div className="space-y-0.5">
            {placefiles.map((pf) => (
              <label key={pf.id} className="flex cursor-pointer items-center justify-between rounded px-1.5 py-1 text-[10px] hover:bg-white/5">
                <span className={`truncate pr-2 ${pf.enabled ? 'text-slate-200' : 'text-slate-500'}`} title={pf.name}>{pf.name}</span>
                <input type="checkbox" checked={pf.enabled} onChange={() => onTogglePlacefile(pf.id)} className="accent-cyan-500" />
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-slate-800 p-1.5 text-[9px] text-slate-500 leading-tight">
        MesoVortexWX Workstation • Map-first layout. Satellite/Models modes available from top bar.
      </div>
    </aside>
  );
}
