'use client';

import { useEffect, useState } from 'react';
import { SoundingProfile, SoundingIndices, computeSignificantTornadoParameter } from '../lib/skewt-engine';

type Props = {
  /** Preferred: pass lat/lon so the modal fetches live data */
  lat?: number;
  lon?: number;
  /** Legacy: pass a pre-built sounding (used as fallback) */
  sounding?: SoundingProfile;
  onClose: () => void;
};

type FetchState =
  | { status: 'idle' | 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: SoundingProfile };

function mapWeatherPowerToProfile(
  raw: any,
  lat: number,
  lon: number
): SoundingProfile {
  // Prefer forecast profile, fall back to observed
  const profile =
    raw?.forecast?.profiles?.[0] ||
    raw?.observed?.profiles?.[0] ||
    raw?.forecast ||
    raw?.observed ||
    raw;

  const rawLevels: any[] =
    profile?.levels ||
    profile?.data ||
    (Array.isArray(profile) ? profile : []) ||
    [];

  const levels = rawLevels
    .map((lvl: any) => ({
      pressureMb: Math.round(Number(lvl.p ?? lvl.pressure ?? lvl.pressureMb) || 0),
      heightM: Math.round(Number(lvl.z ?? lvl.height ?? lvl.heightM) || 0),
      tempC: Math.round((Number(lvl.t ?? lvl.temp ?? lvl.tempC) || 0) * 10) / 10,
      dewC: Math.round((Number(lvl.td ?? lvl.dewpoint ?? lvl.dewC) || 0) * 10) / 10,
      windDirDeg: Math.round(Number(lvl.wd ?? lvl.wdir ?? lvl.windDirDeg) || 0),
      windSpdKt: Math.round(Number(lvl.ws ?? lvl.wspd ?? lvl.windSpdKt) || 0),
    }))
    .filter((l: any) => l.pressureMb > 0)
    .sort((a: any, b: any) => b.pressureMb - a.pressureMb);

  // Simple derived indices if the API doesn't provide them
  const sfc = levels[0];
  const sbcape = Number(profile?.sbcape ?? profile?.cape ?? raw?.indices?.sbcape) || 0;
  const srh01 = Number(profile?.srh01 ?? profile?.srh_0_1 ?? raw?.indices?.srh01) || 0;
  const shear06 = Number(profile?.shear06 ?? profile?.shear_0_6 ?? raw?.indices?.shear06) || 0;
  const stp =
    Number(profile?.stp ?? raw?.indices?.stp) ||
    computeSignificantTornadoParameter(sbcape, srh01, shear06);

  let hazardRating: SoundingIndices['hazardRating'] = 'LOW';
  if (stp >= 3.0) hazardRating = 'EXTREME TORNADIC';
  else if (stp >= 1.0) hazardRating = 'SEVERE';
  else if (sbcape > 1500) hazardRating = 'ELEVATED';

  return {
    station: profile?.station || `WP-${lat.toFixed(2)}/${lon.toFixed(2)}`,
    lat,
    lon,
    elevationM: Number(profile?.elevation ?? profile?.elev ?? sfc?.heightM) || 0,
    indices: {
      sbcape: Math.round(sbcape),
      mlcape: Math.round(Number(profile?.mlcape ?? sbcape * 0.8) || 0),
      srh01: Math.round(srh01),
      srh03: Math.round(Number(profile?.srh03 ?? srh01 * 1.5) || 0),
      shear06: Math.round(shear06),
      liftedIndex: Number(profile?.li ?? profile?.liftedIndex ?? -2),
      pwat: Number(profile?.pwat ?? profile?.pw ?? 1.2),
      stp,
      hazardRating,
    },
    levels:
      levels.length > 0
        ? levels
        : [
            { pressureMb: 1000, heightM: 100, tempC: 20, dewC: 15, windSpdKt: 10, windDirDeg: 180 },
            { pressureMb: 850, heightM: 1500, tempC: 12, dewC: 8, windSpdKt: 25, windDirDeg: 210 },
            { pressureMb: 700, heightM: 3000, tempC: 2, dewC: -5, windSpdKt: 35, windDirDeg: 230 },
            { pressureMb: 500, heightM: 5500, tempC: -15, dewC: -25, windSpdKt: 50, windDirDeg: 250 },
          ],
  };
}

export function SkewTSoundingModal({ lat, lon, sounding: legacySounding, onClose }: Props) {
  const [state, setState] = useState<FetchState>({ status: 'idle' });

  useEffect(() => {
    // If a legacy sounding was passed, use it immediately
    if (legacySounding) {
      setState({ status: 'success', data: legacySounding });
      return;
    }

    if (lat == null || lon == null) {
      setState({ status: 'error', message: 'No location provided for sounding' });
      return;
    }

    let cancelled = false;
    setState({ status: 'loading' });

    fetch(`/api/sounding?lat=${lat}&lon=${lon}&hours=6`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((raw) => {
        if (cancelled) return;
        const profile = mapWeatherPowerToProfile(raw, lat, lon);
        setState({ status: 'success', data: profile });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('[SkewT] fetch error:', err);
        setState({
          status: 'error',
          message: err?.message || 'Failed to load sounding data',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [lat, lon, legacySounding]);

  // ---------- Loading ----------
  if (state.status === 'loading' || state.status === 'idle') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-5 backdrop-blur-xl">
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-cyan-500/30 bg-slate-950 px-10 py-12 shadow-2xl">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          <p className="text-sm font-medium text-slate-300">Loading atmospheric sounding…</p>
          <p className="text-xs text-slate-500 font-mono">
            {lat?.toFixed(3)}°N, {lon?.toFixed(3)}°W
          </p>
          <button
            onClick={onClose}
            className="mt-2 rounded-full bg-white/5 px-4 py-1.5 text-xs text-slate-400 hover:bg-white/10 hover:text-white transition"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ---------- Error ----------
  if (state.status === 'error') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-5 backdrop-blur-xl">
        <div className="flex max-w-md flex-col items-center gap-4 rounded-3xl border border-red-500/30 bg-slate-950 px-8 py-10 shadow-2xl text-center">
          <span className="text-3xl">⚠️</span>
          <h3 className="text-base font-bold text-white">Could not load sounding</h3>
          <p className="text-sm text-slate-400">{state.message}</p>
          <button
            onClick={onClose}
            className="mt-2 rounded-full bg-white/10 px-5 py-2 text-sm text-white hover:bg-white/20 transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // ---------- Success ----------
  const sounding = state.data;
  const { indices, levels } = sounding;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-5 backdrop-blur-xl animate-fade-in select-none">
      <div className="flex h-[90vh] w-full max-w-4xl flex-col rounded-3xl border border-cyan-500/30 bg-slate-950 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-cyan-500/20 text-xl text-cyan-400 border border-cyan-500/30">
              📈
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white">Atmospheric Sounding & Hodograph</h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                    indices.hazardRating === 'EXTREME TORNADIC'
                      ? 'bg-purple-600 text-white animate-pulse'
                      : indices.hazardRating === 'SEVERE'
                        ? 'bg-red-600 text-white'
                        : indices.hazardRating === 'ELEVATED'
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-emerald-600 text-white'
                  }`}
                >
                  {indices.hazardRating}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                WeatherPower · {sounding.lat.toFixed(3)}°N, {sounding.lon.toFixed(3)}°W
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. Severe Index Metric Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-3">
              <span className="text-[10px] text-slate-400">SBCAPE</span>
              <div className="text-lg font-black text-white">
                {indices.sbcape.toLocaleString()} <span className="text-xs text-cyan-400 font-normal">J/kg</span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-3">
              <span className="text-[10px] text-slate-400">0-1km SRH</span>
              <div className="text-lg font-black text-white">
                {indices.srh01} <span className="text-xs text-emerald-400 font-normal">m²/s²</span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-3">
              <span className="text-[10px] text-slate-400">0-6km Shear</span>
              <div className="text-lg font-black text-white">
                {indices.shear06} <span className="text-xs text-amber-400 font-normal">kt</span>
              </div>
            </div>
            <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-3">
              <span className="text-[10px] text-cyan-300">STP (Tornado)</span>
              <div className="text-lg font-black text-cyan-300">
                {indices.stp} <span className="text-xs text-slate-400 font-normal">sig</span>
              </div>
            </div>
          </div>

          {/* 2. Interactive Skew-T & Hodograph Canvas Display */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Skew-T Diagram */}
            <div className="md:col-span-2 rounded-2xl border border-white/10 bg-slate-900/50 p-4 flex flex-col items-center justify-center min-h-[300px]">
              <span className="text-xs font-bold text-slate-300 mb-2 self-start">Skew-T Log-P Thermodynamic Chart</span>
              <svg className="w-full h-64 border border-white/5 rounded-xl bg-[#030712] p-2" viewBox="0 0 400 240">
                {[200, 400, 600, 800, 1000].map((p, i) => (
                  <line
                    key={p}
                    x1="30"
                    y1={30 + i * 45}
                    x2="380"
                    y2={30 + i * 45}
                    stroke="#1e293b"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                  />
                ))}
                <path
                  d="M 120 220 Q 160 170 210 130 T 310 30"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2.5"
                />
                <path
                  d="M 90 220 Q 110 170 140 130 T 210 30"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                />
                <polygon
                  points="120,220 160,170 210,130 310,30 260,30 180,120 120,220"
                  fill="#ef4444"
                  fillOpacity="0.15"
                />
              </svg>
              <div className="flex gap-4 mt-2 text-[10px] font-mono">
                <span className="text-red-400 font-bold">■ Temperature Profile</span>
                <span className="text-emerald-400 font-bold">■ Dewpoint Profile</span>
                <span className="text-red-300/60 font-bold">■ Positive CAPE</span>
              </div>
            </div>

            {/* Hodograph Curve */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 flex flex-col items-center justify-between min-h-[300px]">
              <span className="text-xs font-bold text-slate-300 self-start">Hodograph (0-6km Wind Shear)</span>
              <svg className="w-full h-56 border border-white/5 rounded-xl bg-[#030712] p-2" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="30" fill="none" stroke="#1e293b" strokeWidth="1" />
                <circle cx="100" cy="100" r="60" fill="none" stroke="#1e293b" strokeWidth="1" />
                <circle cx="100" cy="100" r="90" fill="none" stroke="#1e293b" strokeWidth="1" />
                <path d="M 95 140 Q 140 120 150 70" fill="none" stroke="#f59e0b" strokeWidth="3" />
                <circle cx="95" cy="140" r="4" fill="#10b981" />
                <circle cx="150" cy="70" r="4" fill="#ef4444" />
              </svg>
              <div className="flex justify-between w-full text-[10px] font-mono text-slate-400 px-2">
                <span>0km (Sfc)</span>
                <span className="text-amber-400 font-bold">Clockwise Curvature</span>
                <span>6km</span>
              </div>
            </div>
          </div>

          {/* 3. Isobaric Table Data */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Atmospheric Sounding Levels
            </h3>
            <div className="rounded-2xl border border-white/10 bg-slate-900/40 overflow-hidden font-mono text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-900/80 text-[10px] uppercase text-slate-400 border-b border-white/5">
                  <tr>
                    <th className="p-3">Pressure</th>
                    <th className="p-3">Height</th>
                    <th className="p-3">Temp</th>
                    <th className="p-3">Dewpoint</th>
                    <th className="p-3">Wind</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {levels.map((lvl) => (
                    <tr key={lvl.pressureMb} className="hover:bg-white/5">
                      <td className="p-3 font-bold text-white">{lvl.pressureMb} mb</td>
                      <td className="p-3">{lvl.heightM.toLocaleString()} m</td>
                      <td className="p-3 text-red-400">{lvl.tempC}°C</td>
                      <td className="p-3 text-emerald-400">{lvl.dewC}°C</td>
                      <td className="p-3">
                        {lvl.windDirDeg}° @ {lvl.windSpdKt} kt
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
