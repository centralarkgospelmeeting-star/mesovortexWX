'use client';

import { useState } from 'react';

export type CustomPalette = {
  name: string;
  lowDbz: string;     // 5-20 dBZ (light rain)
  medDbz: string;     // 25-40 dBZ (moderate rain)
  heavyDbz: string;   // 45-55 dBZ (heavy/hail core)
  extremeDbz: string; // 60-75+ dBZ (violent core/debris)
  hueRotate: number;
  contrast: number;
  saturate: number;
};

type Props = {
  onClose: () => void;
  onSavePalette: (palette: CustomPalette) => void;
  currentPalette?: CustomPalette;
};

export function CustomPaletteModal({ onClose, onSavePalette }: Props) {
  const [name, setName] = useState('My Custom Palette');
  const [lowDbz, setLowDbz] = useState('#00e5ff');
  const [medDbz, setMedDbz] = useState('#00ff66');
  const [heavyDbz, setHeavyDbz] = useState('#ff0033');
  const [extremeDbz, setExtremeDbz] = useState('#ff00ff');
  const [hueRotate, setHueRotate] = useState(0);
  const [contrast, setContrast] = useState(1.4);
  const [saturate, setSaturate] = useState(1.8);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSavePalette({
      name,
      lowDbz,
      medDbz,
      heavyDbz,
      extremeDbz,
      hueRotate,
      contrast,
      saturate,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-2xl border border-cyan-500/40 bg-slate-950 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎨</span>
            <h3 className="text-base font-bold text-white">Create Custom Radar Palette</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <form onSubmit={handleSave} className="mt-4 space-y-4 text-xs">
          <div>
            <label className="mb-1 block font-semibold text-slate-300">Palette Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-semibold text-slate-400">Low dBZ (5-20)</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={lowDbz}
                  onChange={(e) => setLowDbz(e.target.value)}
                  className="h-8 w-10 cursor-pointer rounded border border-slate-700 bg-transparent"
                />
                <span className="font-mono text-slate-300">{lowDbz}</span>
              </div>
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-400">Med dBZ (25-40)</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={medDbz}
                  onChange={(e) => setMedDbz(e.target.value)}
                  className="h-8 w-10 cursor-pointer rounded border border-slate-700 bg-transparent"
                />
                <span className="font-mono text-slate-300">{medDbz}</span>
              </div>
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-400">Heavy/Hail (45-55)</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={heavyDbz}
                  onChange={(e) => setHeavyDbz(e.target.value)}
                  className="h-8 w-10 cursor-pointer rounded border border-slate-700 bg-transparent"
                />
                <span className="font-mono text-slate-300">{heavyDbz}</span>
              </div>
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-400">Extreme Core (60+)</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={extremeDbz}
                  onChange={(e) => setExtremeDbz(e.target.value)}
                  className="h-8 w-10 cursor-pointer rounded border border-slate-700 bg-transparent"
                />
                <span className="font-mono text-slate-300">{extremeDbz}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="mb-1 text-[11px] font-bold text-cyan-300">Live Palette Preview Scale</div>
            <div
              className="h-4 w-full rounded border border-white/20"
              style={{
                background: `linear-gradient(to right, ${lowDbz}, ${medDbz}, ${heavyDbz}, ${extremeDbz})`,
              }}
            />
            <div className="mt-1 flex justify-between font-mono text-[9px] text-slate-400">
              <span>5 dBZ</span>
              <span>30 dBZ</span>
              <span>55 dBZ</span>
              <span>75+ dBZ</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-slate-400">
              <span>Color Shift (Hue)</span>
              <span>{hueRotate}°</span>
            </div>
            <input
              type="range"
              min={0}
              max={360}
              value={hueRotate}
              onChange={(e) => setHueRotate(Number(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-800 py-2 font-semibold text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-cyan-600 py-2 font-semibold text-white shadow-lg hover:bg-cyan-500"
            >
              Apply Custom Palette
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
