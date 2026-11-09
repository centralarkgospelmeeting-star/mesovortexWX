'use client';

import { useState, useEffect } from 'react';

type HyperlocalData = {
  tempF: number;
  feelsLikeF: number;
  dewPointF: number;
  wetBulbF: number;
  humidity: number;
  pressureInHg: string;
  pressureMb: number;
  windSpeedKt: number;
  windGustKt: number;
  windDirDeg: number;
  currentPrecipInches: number;
  minutelyPrecip: { minute: number; amountInches: number; hasPrecip: boolean }[];
};

type Props = {
  lat: number;
  lon: number;
  siteName: string;
  onClose: () => void;
};

export function HyperlocalDashboardModal({ lat, lon, siteName, onClose }: Props) {
  const [data, setData] = useState<HyperlocalData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/weather/hyperlocal?lat=${lat}&lon=${lon}`)
      .then((res) => res.json())
      .then((json) => {
        if (!json.error) setData(json);
      })
      .catch((err) => console.warn('Hyperlocal fetch error:', err))
      .finally(() => setLoading(false));
  }, [lat, lon]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-5 backdrop-blur-xl animate-fade-in select-none">
      <div className="flex h-[88vh] w-full max-w-3xl flex-col rounded-3xl border border-emerald-500/30 bg-slate-950 shadow-2xl overflow-hidden font-mono">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-slate-900/70">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500/20 text-xl text-emerald-400 border border-emerald-500/30">
              🏡
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold text-white">Neighborhood Weather Intelligence</h2>
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-300">
                  Sub-Mile Precision
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans">
                {siteName} · {lat.toFixed(3)}°N, {lon.toFixed(3)}°W
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#030712]">
          {loading || !data ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
              <span className="h-6 w-6 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
              <p className="text-xs font-sans">Fetching high-resolution surface telemetry…</p>
            </div>
          ) : (
            <>
              {/* Main Temperature & Severe Indices Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-3.5">
                  <span className="text-[10px] text-slate-400 uppercase">Temperature</span>
                  <div className="text-2xl font-black text-white">{data.tempF}°F</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Feels Like: <b className="text-cyan-400">{data.feelsLikeF}°F</b></div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-3.5">
                  <span className="text-[10px] text-slate-400 uppercase">Dewpoint</span>
                  <div className="text-2xl font-black text-emerald-400">{data.dewPointF}°F</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Depression: <b className="text-white">{data.tempF - data.dewPointF}°F</b></div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-3.5">
                  <span className="text-[10px] text-slate-400 uppercase">Wet Bulb</span>
                  <div className="text-2xl font-black text-cyan-300">{data.wetBulbF}°F</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Humidity: <b className="text-white">{data.humidity}%</b></div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-3.5">
                  <span className="text-[10px] text-slate-400 uppercase">Barometer</span>
                  <div className="text-2xl font-black text-amber-300">{data.pressureInHg}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{data.pressureMb} mb</div>
                </div>
              </div>

              {/* Minute-by-Minute 60-Minute Forward Rain Ticker */}
              <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    ⏱️ Minute-by-Minute Precipitation Ticker (Next 60 Mins)
                  </span>
                  <span className="text-[10px] text-cyan-400 font-sans">Updated Real-Time</span>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-1">
                  {data.minutelyPrecip.map((p) => (
                    <div
                      key={p.minute}
                      className={`rounded-xl border p-2.5 text-center ${
                        p.hasPrecip
                          ? 'border-cyan-500/50 bg-cyan-950/40 text-cyan-300'
                          : 'border-white/5 bg-slate-950/50 text-slate-400'
                      }`}
                    >
                      <div className="text-[10px] text-slate-400 font-sans">+{p.minute} mins</div>
                      <div className="text-xs font-black mt-1">
                        {p.hasPrecip ? '🌧️ Rain Onset' : '☁️ No Precip'}
                      </div>
                      <div className="text-[9px] text-slate-500 mt-0.5">{p.amountInches}&quot; / hr</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Surface Wind & Gust Telemetry */}
              <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💨</span>
                  <div>
                    <span className="text-xs font-bold text-white">Surface Wind Vector</span>
                    <p className="text-[11px] text-slate-400 font-sans">
                      Blowing from <b>{data.windDirDeg}°</b> at <b>{data.windSpeedKt} kt</b> (sustained)
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-right">
                  <span className="text-[10px] text-amber-300 uppercase font-bold">Peak Gust Potential</span>
                  <div className="text-lg font-black text-amber-300">{data.windGustKt} kt</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
