'use client';

import { useState } from 'react';

export type ParsedPalCurve = {
  name: string;
  rawText: string;
  entries: { val: number; r: number; g: number; b: number; a?: number }[];
};

type Props = {
  onClose: () => void;
  onApplyPal: (curve: ParsedPalCurve) => void;
};

// Parses Gibson Ridge .pal files (e.g. Color: 65 255 0 255)
export function parseGibsonRidgePal(raw: string, filename = 'Custom .pal'): ParsedPalCurve {
  const lines = raw.split('\n');
  const entries: ParsedPalCurve['entries'] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(';') || trimmed.startsWith('//')) continue;

    // Pattern: Color: dBZ R G B [A] or Threshold: val R G B [A]
    const match = trimmed.match(/(?:Color|Threshold):\s*([-\d.]+)\s+(\d+)\s+(\d+)\s+(\d+)(?:\s+(\d+))?/i);
    if (match) {
      const val = parseFloat(match[1]);
      const r = parseInt(match[2], 10);
      const g = parseInt(match[3], 10);
      const b = parseInt(match[4], 10);
      const a = match[5] ? parseInt(match[5], 10) : 255;
      if (!isNaN(val) && !isNaN(r) && !isNaN(g) && !isNaN(b)) {
        entries.push({ val, r, g, b, a });
      }
    }
  }

  entries.sort((a, b) => a.val - b.val);
  return { name: filename, rawText: raw, entries };
}

export function PalColorTableModal({ onClose, onApplyPal }: Props) {
  const [palText, setPalText] = useState('');
  const [fileName, setFileName] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setPalText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!palText.trim()) return;
    const parsed = parseGibsonRidgePal(palText, fileName || 'Loaded .pal Table');
    onApplyPal(parsed);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-lg rounded-2xl border border-cyan-500/40 bg-slate-950 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📁</span>
            <h3 className="text-base font-bold text-white">Load Gibson Ridge (.pal) Color Table</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <form onSubmit={handleApply} className="mt-4 space-y-4 text-xs">
          <p className="text-slate-400">
            Select or drag in any <strong>.pal</strong> color table file from <strong>DG Noah WX</strong>, <strong>WxTools</strong>, or Gibson Ridge, or paste the text below.
          </p>

          <div>
            <label className="mb-1.5 block font-semibold text-slate-300">Choose .pal File</label>
            <input
              type="file"
              accept=".pal,.txt"
              onChange={handleFileUpload}
              className="w-full text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-600 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white hover:file:bg-cyan-500 cursor-pointer"
            />
          </div>

          <div>
            <label className="mb-1 block font-semibold text-slate-300">Or Paste .pal Raw Code</label>
            <textarea
              rows={7}
              placeholder={`Product: BR\nColor: 5 4 233 231\nColor: 20 1 159 244\nColor: 35 1 197 1\nColor: 50 253 149 0\nColor: 65 248 0 253`}
              value={palText}
              onChange={(e) => setPalText(e.target.value)}
              className="w-full font-mono rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-slate-200 placeholder-slate-600 focus:outline-none"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-800 py-2 font-semibold text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!palText.trim()}
              className="flex-1 rounded-lg bg-cyan-600 py-2 font-semibold text-white shadow-lg hover:bg-cyan-500 disabled:opacity-40"
            >
              Apply Color Table
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
