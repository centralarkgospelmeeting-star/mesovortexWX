'use client';

import { useState } from 'react';

export type SpotterReport = {
  id: string;
  hazardType: 'Tornado' | 'Wall Cloud' | 'Large Hail' | 'Damaging Wind' | 'Flash Flood';
  description: string;
  hailSize?: string;
  lat: number;
  lon: number;
  timestamp: string;
  callsign: string;
};

type Props = {
  currentCoords: [number, number];
  onClose: () => void;
  onSubmit: (report: SpotterReport) => void;
};

export function SpotterReportModal({ currentCoords, onClose, onSubmit }: Props) {
  const [hazard, setHazard] = useState<SpotterReport['hazardType']>('Tornado');
  const [hailSize, setHailSize] = useState('1.75" (Golf Ball)');
  const [description, setDescription] = useState('');
  const [callsign, setCallsign] = useState('');

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      id: `spotter-${Date.now()}`,
      hazardType: hazard,
      description,
      hailSize: hazard === 'Large Hail' ? hailSize : undefined,
      lat: currentCoords[1],
      lon: currentCoords[0],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      callsign: callsign || 'Spotter #WX' + Math.floor(1000 + Math.random() * 9000),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-white">Submit Spotter Network Observation</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <form onSubmit={handlePost} className="mt-4 space-y-4 text-xs">
          <div>
            <label className="mb-1 block font-semibold text-slate-300">Hazard Detected</label>
            <select
              value={hazard}
              onChange={(e) => setHazard(e.target.value as any)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            >
              <option value="Tornado">🌪️ Tornado on Ground</option>
              <option value="Wall Cloud">☁️ Rotating Wall Cloud / Funnel</option>
              <option value="Large Hail">🧊 Severe Hail</option>
              <option value="Damaging Wind">💨 Damaging Wind (>60 mph)</option>
              <option value="Flash Flood">🌊 Flash Flooding</option>
            </select>
          </div>

          {hazard === 'Large Hail' && (
            <div>
              <label className="mb-1 block font-semibold text-slate-300">Estimated Diameter</label>
              <select
                value={hailSize}
                onChange={(e) => setHailSize(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
              >
                <option value='1.00" (Quarter)'>1.00&quot; (Quarter — Severe threshold)</option>
                <option value='1.75" (Golf Ball)'>1.75&quot; (Golf Ball)</option>
                <option value='2.75" (Baseball)'>2.75&quot; (Baseball)</option>
                <option value='4.00" (Softball)'>4.00&quot; (Softball / Giant Hail)</option>
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block font-semibold text-slate-300">Spotter Call Sign / Chaser Handle</label>
            <input
              type="text"
              placeholder="e.g. SKYWARN-AR12 or @StormTrack"
              value={callsign}
              onChange={(e) => setCallsign(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white placeholder-slate-500"
            />
          </div>

          <div>
            <label className="mb-1 block font-semibold text-slate-300">Field Notes & Damage Details</label>
            <textarea
              rows={3}
              placeholder="Visible condensation funnel, power flashes, tree limb damage..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white placeholder-slate-500"
            />
          </div>

          <div className="rounded-lg bg-slate-900 p-2.5 font-mono text-[11px] text-cyan-400">
            Coordinates: {currentCoords[1].toFixed(4)}°N, {currentCoords[0].toFixed(4)}°W
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
              Broadcast Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
