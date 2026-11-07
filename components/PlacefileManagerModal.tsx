'use client';

import { useState } from 'react';

export type ActivePlacefile = {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
};

type Props = {
  placefiles: ActivePlacefile[];
  onClose: () => void;
  onToggle: (id: string) => void;
  onAdd: (name: string, url: string) => void;
  onDelete: (id: string) => void;
};

export function PlacefileManagerModal({
  placefiles,
  onClose,
  onToggle,
  onAdd,
  onDelete,
}: Props) {
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;
    onAdd(newTitle.trim() || 'Custom Placefile', newUrl.trim());
    setNewTitle('');
    setNewUrl('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-xl rounded-2xl border border-cyan-500/40 bg-slate-950 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📡</span>
            <h3 className="text-base font-bold text-white">Gibson Ridge Placefile Manager</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <div className="mt-4 space-y-3 text-xs">
          <p className="text-slate-400">
            Toggle or add live placefiles from <strong>PlacefileNation</strong> and <strong>FreeLightning</strong>:
          </p>

          <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
            {placefiles.map((pf) => (
              <div
                key={pf.id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-3"
              >
                <div className="flex items-center gap-3 overflow-hidden pr-2">
                  <input
                    type="checkbox"
                    checked={pf.enabled}
                    onChange={() => onToggle(pf.id)}
                    className="h-4 w-4 rounded accent-cyan-500 cursor-pointer"
                  />
                  <div className="truncate">
                    <div className="font-bold text-white text-[12px]">{pf.name}</div>
                    <div className="truncate font-mono text-[10px] text-slate-500">{pf.url}</div>
                  </div>
                </div>
                <button
                  onClick={() => onDelete(pf.id)}
                  className="rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-red-400"
                  title="Remove placefile"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddSubmit} className="rounded-xl border border-slate-800 bg-slate-900/90 p-3 space-y-2">
            <div className="font-bold text-cyan-300 text-[11px]">+ Add Custom Placefile URL</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Title (e.g. SPC Meso)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="rounded border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-white placeholder-slate-500"
              />
              <input
                type="text"
                placeholder="http://... placefile URL"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                className="rounded border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-white placeholder-slate-500 font-mono text-[11px]"
              />
            </div>
            <button
              type="submit"
              disabled={!newUrl.trim()}
              className="w-full rounded bg-cyan-600 py-1.5 font-bold text-white hover:bg-cyan-500 disabled:opacity-40"
            >
              Add Placefile to Map
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
