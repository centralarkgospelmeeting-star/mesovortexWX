'use client';

import Image from 'next/image';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onResetConus: () => void;
  onLocateMe?: () => void;
  // Modals & Panels
  onOpenWeatherAssistant?: () => void;
  onOpenMCD?: () => void;
  onOpenHyperlocal?: () => void;
  onOpenSkewT?: () => void;
  onOpenCrossSection?: () => void;
  onOpenPlacefiles?: () => void;
  onOpenPalColorTable?: () => void;
  onOpenThreatMatrix?: () => void;
  onOpenQuadView?: () => void;
  onOpenMetar?: () => void;
};

export function MainMenuDrawer({
  isOpen,
  onClose,
  onOpenSettings,
  onResetConus,
  onLocateMe,
  onOpenWeatherAssistant,
  onOpenMCD,
  onOpenHyperlocal,
  onOpenSkewT,
  onOpenCrossSection,
  onOpenPlacefiles,
  onOpenPalColorTable,
  onOpenThreatMatrix,
  onOpenQuadView,
  onOpenMetar,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex bg-black/60 backdrop-blur-sm animate-fade-in font-sans select-none">
      <aside className="w-80 sm:w-88 border-r border-slate-800 bg-slate-950/98 p-5 font-sans text-slate-100 shadow-2xl backdrop-blur-2xl flex flex-col justify-between overflow-hidden animate-slide-right">
        {/* Top Header */}
        <div className="space-y-4 flex-1 overflow-y-auto pr-1">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="MesoVortex WX"
                width={26}
                height={26}
                className="rounded-full shadow-sm"
              />
              <span className="font-black text-sm uppercase tracking-wider text-white">
                MESO<span className="text-cyan-400">VORTEX</span> <span className="text-amber-400">WX</span>
              </span>
            </div>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-900 text-xs text-slate-400 hover:text-white transition cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* SECTION 1: MAP TOOLS & RECON (Section 12) */}
          <div className="space-y-1 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Map Tools &amp; Recon
            </span>

            {onOpenMetar && (
              <button
                onClick={() => { onOpenMetar(); onClose(); }}
                className="w-full text-left rounded-xl p-2 hover:bg-slate-900 text-slate-300 font-medium transition cursor-pointer flex items-center gap-2"
              >
                <span>🌡️</span> Airport METAR Observations
              </button>
            )}

            <div className="rounded-xl p-2 hover:bg-slate-900 text-slate-300 font-medium transition cursor-pointer flex items-center gap-2">
              <span>🌪️</span> Live Storm Chasers (GPS Live)
            </div>

            <div className="rounded-xl p-2 hover:bg-slate-900 text-slate-300 font-medium transition cursor-pointer flex items-center gap-2">
              <span>📡</span> Spotter Network Real-Time
            </div>

            <div className="rounded-xl p-2 hover:bg-slate-900 text-slate-300 font-medium transition cursor-pointer flex items-center gap-2">
              <span>✈️</span> Aviation Recon Flights (NOAA)
            </div>

            <div className="rounded-xl p-2 hover:bg-slate-900 text-slate-300 font-medium transition cursor-pointer flex items-center gap-2">
              <span>📹</span> Weather &amp; Traffic Cameras
            </div>

            <div className="rounded-xl p-2 hover:bg-slate-900 text-slate-300 font-medium transition cursor-pointer flex items-center gap-2">
              <span>⚡</span> Lightning Blitzortung Grid
            </div>
          </div>

          {/* SECTION 2: AI WEATHER SUITE */}
          <div className="space-y-1 text-xs border-t border-slate-800 pt-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block mb-1">
              AI Weather Intelligence
            </span>

            {onOpenWeatherAssistant && (
              <button
                onClick={() => { onOpenWeatherAssistant(); onClose(); }}
                className="w-full text-left rounded-xl p-2 bg-cyan-950/20 hover:bg-cyan-900/40 text-cyan-200 font-bold transition cursor-pointer flex items-center gap-2 border border-cyan-500/20"
              >
                <span>🤖</span> AI Weather Assistant
              </button>
            )}

            {onOpenMCD && (
              <button
                onClick={() => { onOpenMCD(); onClose(); }}
                className="w-full text-left rounded-xl p-2 hover:bg-slate-900 text-slate-300 font-medium transition cursor-pointer flex items-center gap-2"
              >
                <span>📝</span> AI Mesoscale Discussion (MCD)
              </button>
            )}

            {onOpenHyperlocal && (
              <button
                onClick={() => { onOpenHyperlocal(); onClose(); }}
                className="w-full text-left rounded-xl p-2 hover:bg-slate-900 text-slate-300 font-medium transition cursor-pointer flex items-center gap-2"
              >
                <span>🏡</span> Street-Level Hyperlocal Forecast
              </button>
            )}

            {onOpenThreatMatrix && (
              <button
                onClick={() => { onOpenThreatMatrix(); onClose(); }}
                className="w-full text-left rounded-xl p-2 hover:bg-slate-900 text-slate-300 font-medium transition cursor-pointer flex items-center gap-2"
              >
                <span>⚠️</span> Severe Threat Matrix &amp; Risk Score
              </button>
            )}
          </div>

          {/* SECTION 3: ADVANCED METEOROLOGY */}
          <div className="space-y-1 text-xs border-t border-slate-800 pt-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Advanced Radar Analysis
            </span>

            {onOpenCrossSection && (
              <button
                onClick={() => { onOpenCrossSection(); onClose(); }}
                className="w-full text-left rounded-xl p-2 hover:bg-slate-900 text-slate-300 font-medium transition cursor-pointer flex items-center gap-2"
              >
                <span>📐</span> Cross-Section Radar Analysis
              </button>
            )}

            {onOpenSkewT && (
              <button
                onClick={() => { onOpenSkewT(); onClose(); }}
                className="w-full text-left rounded-xl p-2 hover:bg-slate-900 text-slate-300 font-medium transition cursor-pointer flex items-center gap-2"
              >
                <span>📈</span> Skew-T Sounding &amp; Hodograph
              </button>
            )}

            {onOpenQuadView && (
              <button
                onClick={() => { onOpenQuadView(); onClose(); }}
                className="w-full text-left rounded-xl p-2 hover:bg-slate-900 text-slate-300 font-medium transition cursor-pointer flex items-center gap-2"
              >
                <span>🔲</span> Synchronized Quad-Panel Radar View
              </button>
            )}

            {onOpenPlacefiles && (
              <button
                onClick={() => { onOpenPlacefiles(); onClose(); }}
                className="w-full text-left rounded-xl p-2 hover:bg-slate-900 text-slate-300 font-medium transition cursor-pointer flex items-center gap-2"
              >
                <span>📂</span> Gibson Ridge (.pal / Placefiles)
              </button>
            )}

            {onOpenPalColorTable && (
              <button
                onClick={() => { onOpenPalColorTable(); onClose(); }}
                className="w-full text-left rounded-xl p-2 hover:bg-slate-900 text-slate-300 font-medium transition cursor-pointer flex items-center gap-2"
              >
                <span>🎨</span> Custom Color Palette Editor
              </button>
            )}
          </div>

          {/* SECTION 4: NAVIGATION & VIEW */}
          <div className="space-y-1 text-xs border-t border-slate-800 pt-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Location &amp; View
            </span>

            {onLocateMe && (
              <button
                onClick={() => { onLocateMe(); onClose(); }}
                className="w-full text-left rounded-xl p-2 hover:bg-slate-900 text-slate-300 font-medium transition cursor-pointer flex items-center gap-2"
              >
                <span>📍</span> Locate Me (GPS Geolocation)
              </button>
            )}

            <button
              onClick={() => { onResetConus(); onClose(); }}
              className="w-full text-left rounded-xl p-2 hover:bg-slate-900 text-slate-300 font-medium transition cursor-pointer flex items-center gap-2"
            >
              <span>🗺️</span> Reset View to United States (CONUS)
            </button>
          </div>
        </div>

        {/* SECTION 5: SETTINGS & ABOUT WORKSPACE */}
        <div className="border-t border-slate-800 pt-4 space-y-2">
          <button
            onClick={() => { onOpenSettings(); onClose(); }}
            className="w-full rounded-2xl bg-blue-600 hover:bg-blue-500 py-2.5 text-center text-xs font-bold text-white shadow-xl transition cursor-pointer flex items-center justify-center gap-2"
          >
            <span>⚙</span> Open Settings Workspace
          </button>
          <div className="text-center text-[10px] text-slate-500 font-mono">
            MesoVortexWX v2.0 · Bloomberg Terminal of Weather
          </div>
        </div>
      </aside>
      <div className="flex-1" onClick={onClose} />
    </div>
  );
}
