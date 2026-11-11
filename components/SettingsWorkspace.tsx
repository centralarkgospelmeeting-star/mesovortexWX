'use client';

import { useState } from 'react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  basemap: string;
  onSelectBasemap: (b: any) => void;
};

const CATEGORIES = ['General', 'Map', 'Radar', 'Satellite', 'Models', 'Outlooks', 'Warnings', 'Notifications', 'Appearance'];

export function SettingsWorkspace({ isOpen, onClose, basemap, onSelectBasemap }: Props) {
  const [selectedCat, setSelectedCat] = useState('Map');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xl animate-fade-in select-none font-sans">
      <div className="flex h-[80vh] w-full max-w-4xl rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden">
        {/* Left Category Sidebar */}
        <div className="w-56 border-r border-slate-800 bg-slate-900/50 p-4 space-y-1 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-2">
            <span className="font-black uppercase text-xs text-white">Settings</span>
          </div>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className={`w-full text-left rounded-xl p-2 font-bold transition ${
                selectedCat === cat ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Right Controls Panel */}
        <div className="flex-1 p-6 space-y-5 overflow-y-auto text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-extrabold text-white">{selectedCat} Settings</h2>
            <button onClick={onClose} className="rounded-lg bg-slate-800 px-3 py-1 text-xs text-slate-300 hover:text-white">
              ✕ Close
            </button>
          </div>

          {selectedCat === 'Map' && (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block font-bold text-slate-300">Default Mapbox Basemap Style</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onSelectBasemap('custom-weather')}
                    className={`rounded-xl border p-3 text-left font-bold transition ${
                      basemap === 'custom-weather' ? 'border-blue-500 bg-blue-950/40 text-blue-200' : 'border-slate-800 bg-slate-900 text-slate-400'
                    }`}
                  >
                    🎨 Custom Weather Style
                  </button>
                  <button
                    onClick={() => onSelectBasemap('satellite-streets')}
                    className={`rounded-xl border p-3 text-left font-bold transition ${
                      basemap === 'satellite-streets' ? 'border-blue-500 bg-blue-950/40 text-blue-200' : 'border-slate-800 bg-slate-900 text-slate-400'
                    }`}
                  >
                    🛰️ Mapbox Satellite Streets
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedCat !== 'Map' && (
            <div className="p-8 text-center text-xs text-slate-500">
              {selectedCat} configuration preferences are active.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
