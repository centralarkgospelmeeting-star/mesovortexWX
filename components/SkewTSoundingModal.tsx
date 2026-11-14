'use client';

import { useEffect, useState, useMemo } from 'react';
import { SoundingProfile, SoundingIndices, computeSignificantTornadoParameter } from '../lib/skewt-engine';

type Props = {
  lat?: number;
  lon?: number;
  sounding?: SoundingProfile;
  onClose: () => void;
};

type FetchState =
  | { status: 'idle' | 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: SoundingProfile };

type Level = SoundingProfile['levels'][number];

function mapWeatherPowerToProfile(raw: any, lat: number, lon: number): SoundingProfile {
  const profile =
    raw?.forecast?.profiles?.[0] ||
    raw?.observed?.profiles?.[0] ||
    raw?.forecast ||
    raw?.observed ||
    raw;

  const rawLevels: any[] =
    profile?.levels || profile?.data || (Array.isArray(profile) ? profile : []) || [];

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
      liftedIndex: Number(profile?.li ?? profile?.liftedIndex ?? 0),
      pwat: Number(profile?.pwat ?? profile?.pw ?? 0),
      stp,
      hazardRating,
    },
    levels,
  };
}

/** Simple log-P Skew-T style projection (not a full thermodynamic diagram, but data-driven) */
function buildSkewTPaths(levels: Level[]) {
  if (!levels.length) return { tempPath: '', dewPath: '', yTicks: [] as number[] };

  const W = 400;
  const H = 280;
  const padL = 44;
  const padR = 16;
  const padT = 12;
  const padB = 28;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const pMin = 100;
  const pMax = 1050;
  const tMin = -60;
  const tMax = 40;

  const yOf = (p: number) => {
    const logP = Math.log(Math.max(p, pMin));
    const logMin = Math.log(pMin);
    const logMax = Math.log(pMax);
    return padT + ((logMax - logP) / (logMax - logMin)) * plotH;
  };

  const xOf = (t: number, p: number) => {
    // mild skew: shift warmer air to the right with height
    const skew = ((Math.log(pMax) - Math.log(Math.max(p, pMin))) / (Math.log(pMax) - Math.log(pMin))) * 40;
    const tNorm = (t - tMin) / (tMax - tMin);
    return padL + tNorm * plotW + skew * 0.15;
  };

  const sorted = [...levels].sort((a, b) => b.pressureMb - a.pressureMb);

  const tempPts = sorted
    .filter((l) => Number.isFinite(l.tempC))
    .map((l) => `${xOf(l.tempC, l.pressureMb).toFixed(1)},${yOf(l.pressureMb).toFixed(1)}`);
  const dewPts = sorted
    .filter((l) => Number.isFinite(l.dewC))
    .map((l) => `${xOf(l.dewC, l.pressureMb).toFixed(1)},${yOf(l.pressureMb).toFixed(1)}`);

  const yTicks = [1000, 850, 700, 500, 300, 200].map((p) => ({
    p,
    y: yOf(p),
  }));

  return {
    tempPath: tempPts.length ? `M ${tempPts.join(' L ')}` : '',
    dewPath: dewPts.length ? `M ${dewPts.join(' L ')}` : '',
    yTicks,
    W,
    H,
    padL,
  };
}

function buildHodographPath(levels: Level[]) {
  if (!levels.length) return { path: '', points: [] as { x: number; y: number; label: string }[] };

  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const maxKt = 80; // ring scale

  // use levels from surface up to ~6 km
  const useful = levels
    .filter((l) => l.heightM <= 6500 && Number.isFinite(l.windSpdKt))
    .sort((a, b) => a.heightM - b.heightM);

  const toXY = (spd: number, dir: number) => {
    // meteorological: 0° = from north, so wind vector points opposite
    const rad = ((dir + 180) * Math.PI) / 180;
    const r = (spd / maxKt) * (size / 2 - 12);
    return {
      x: cx + r * Math.sin(rad),
      y: cy - r * Math.cos(rad),
    };
  };

  const points = useful.map((l) => {
    const { x, y } = toXY(l.windSpdKt, l.windDirDeg);
    return { x, y, label: l.heightM < 500 ? 'Sfc' : `${Math.round(l.heightM / 1000)}km` };
  });

  const path = points.length
    ? `M ${points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')}`
    : '';

  return { path, points, size, cx, cy, maxKt };
}

export function SkewTSoundingModal({ lat, lon, sounding: legacySounding, onClose }: Props) {
  const [state, setState] = useState<FetchState>({ status: 'idle' });

  useEffect(() => {
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
        if (!profile.levels.length) {
          setState({ status: 'error', message: 'No sounding levels returned for this point' });
          return;
        }
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

  if (state.status === 'loading' || state.status === 'idle') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-xl">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-slate-950 px-8 py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          <p className="text-sm text-slate-300">Loading sounding…</p>
          <p className="text-xs font-mono text-slate-500">
            {lat?.toFixed(3)}, {lon?.toFixed(3)}
          </p>
          <button onClick={onClose} className="mt-2 text-xs text-slate-400 hover:text-white">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-xl">
        <div className="max-w-sm rounded-2xl border border-red-500/30 bg-slate-950 px-6 py-8 text-center">
          <p className="text-sm font-semibold text-white">Sounding failed</p>
          <p className="mt-2 text-xs text-slate-400">{state.message}</p>
          <button
            onClick={onClose}
            className="mt-4 rounded-lg bg-white/10 px-4 py-1.5 text-xs text-white hover:bg-white/20"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (state.status !== 'success') return null;

  const sounding = state.data;
  const { indices, levels } = sounding;
  const skew = buildSkewTPaths(levels);
  const hodo = buildHodographPath(levels);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-xl">
      <div className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">Sounding</h2>
              <span
                className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                  indices.hazardRating === 'EXTREME TORNADIC'
                    ? 'bg-purple-600 text-white'
                    : indices.hazardRating === 'SEVERE'
                      ? 'bg-red-600 text-white'
                      : indices.hazardRating === 'ELEVATED'
                        ? 'bg-amber-500 text-black'
                        : 'bg-emerald-700 text-white'
                }`}
              >
                {indices.hazardRating}
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400">
              {sounding.lat.toFixed(3)}°N {sounding.lon.toFixed(3)}°W · {levels.length} levels · WeatherPower
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-white/5 px-2.5 py-1 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Indices — only show if non-zero so it doesn't look fake */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
            <div className="rounded-xl border border-white/10 bg-slate-900/80 p-2.5">
              <div className="text-[10px] text-slate-500">SBCAPE</div>
              <div className="text-base font-bold text-white">
                {indices.sbcape ? indices.sbcape.toLocaleString() : '—'}
                <span className="ml-1 text-[10px] font-normal text-slate-500">J/kg</span>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900/80 p-2.5">
              <div className="text-[10px] text-slate-500">0–1 km SRH</div>
              <div className="text-base font-bold text-white">
                {indices.srh01 || '—'}
                <span className="ml-1 text-[10px] font-normal text-slate-500">m²/s²</span>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900/80 p-2.5">
              <div className="text-[10px] text-slate-500">0–6 km Shear</div>
              <div className="text-base font-bold text-white">
                {indices.shear06 || '—'}
                <span className="ml-1 text-[10px] font-normal text-slate-500">kt</span>
              </div>
            </div>
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/30 p-2.5">
              <div className="text-[10px] text-cyan-400/80">STP</div>
              <div className="text-base font-bold text-cyan-300">{indices.stp || '—'}</div>
            </div>
          </div>

          {/* Real charts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Skew-T from real levels */}
            <div className="md:col-span-2 rounded-xl border border-white/10 bg-[#030712] p-3">
              <div className="mb-1 flex items-center justify-between text-[10px] text-slate-400">
                <span>Skew-T (log-P) · T red · Td green</span>
                <span className="font-mono">{levels.length} pts</span>
              </div>
              <svg viewBox={`0 0 ${skew.W || 400} ${skew.H || 280}`} className="w-full h-64">
                {/* Pressure lines */}
                {(skew.yTicks || []).map((t: any) => (
                  <g key={t.p}>
                    <line
                      x1={skew.padL || 44}
                      y1={t.y}
                      x2={(skew.W || 400) - 16}
                      y2={t.y}
                      stroke="#1e293b"
                      strokeWidth="1"
                    />
                    <text x={8} y={t.y + 3} fill="#64748b" fontSize="9" fontFamily="monospace">
                      {t.p}
                    </text>
                  </g>
                ))}
                {skew.dewPath && (
                  <path d={skew.dewPath} fill="none" stroke="#10b981" strokeWidth="2" />
                )}
                {skew.tempPath && (
                  <path d={skew.tempPath} fill="none" stroke="#ef4444" strokeWidth="2.5" />
                )}
                {!skew.tempPath && (
                  <text x="50%" y="50%" textAnchor="middle" fill="#475569" fontSize="12">
                    No temperature levels
                  </text>
                )}
              </svg>
            </div>

            {/* Hodograph from real winds */}
            <div className="rounded-xl border border-white/10 bg-[#030712] p-3">
              <div className="mb-1 text-[10px] text-slate-400">Hodograph 0–6 km</div>
              <svg viewBox={`0 0 ${hodo.size || 200} ${hodo.size || 200}`} className="w-full h-56 mx-auto">
                {[20, 40, 60, 80].map((kt) => {
                  const r = (kt / (hodo.maxKt || 80)) * ((hodo.size || 200) / 2 - 12);
                  return (
                    <circle
                      key={kt}
                      cx={hodo.cx}
                      cy={hodo.cy}
                      r={r}
                      fill="none"
                      stroke="#1e293b"
                      strokeWidth="1"
                    />
                  );
                })}
                <line
                  x1={12}
                  y1={hodo.cy}
                  x2={(hodo.size || 200) - 12}
                  y2={hodo.cy}
                  stroke="#1e293b"
                  strokeWidth="1"
                />
                <line
                  x1={hodo.cx}
                  y1={12}
                  x2={hodo.cx}
                  y2={(hodo.size || 200) - 12}
                  stroke="#1e293b"
                  strokeWidth="1"
                />
                {hodo.path && (
                  <path d={hodo.path} fill="none" stroke="#f59e0b" strokeWidth="2.5" />
                )}
                {(hodo.points || []).map((pt: any, i: number) => (
                  <circle
                    key={i}
                    cx={pt.x}
                    cy={pt.y}
                    r={i === 0 ? 4 : 2.5}
                    fill={i === 0 ? '#10b981' : '#f59e0b'}
                  />
                ))}
                {!hodo.path && (
                  <text x="50%" y="50%" textAnchor="middle" fill="#475569" fontSize="11">
                    No wind data
                  </text>
                )}
              </svg>
            </div>
          </div>

          {/* Real levels table */}
          <div>
            <h3 className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Levels ({levels.length})
            </h3>
            <div className="max-h-56 overflow-auto rounded-xl border border-white/10">
              <table className="w-full text-left font-mono text-[11px]">
                <thead className="sticky top-0 bg-slate-900 text-[9px] uppercase text-slate-500">
                  <tr>
                    <th className="p-2">P (mb)</th>
                    <th className="p-2">Z (m)</th>
                    <th className="p-2">T (°C)</th>
                    <th className="p-2">Td (°C)</th>
                    <th className="p-2">Wind</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {levels.map((lvl) => (
                    <tr key={`${lvl.pressureMb}-${lvl.heightM}`} className="hover:bg-white/5">
                      <td className="p-2 font-semibold text-white">{lvl.pressureMb}</td>
                      <td className="p-2">{lvl.heightM.toLocaleString()}</td>
                      <td className="p-2 text-red-400">{lvl.tempC}</td>
                      <td className="p-2 text-emerald-400">{lvl.dewC}</td>
                      <td className="p-2">
                        {lvl.windDirDeg}°/{lvl.windSpdKt}kt
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
