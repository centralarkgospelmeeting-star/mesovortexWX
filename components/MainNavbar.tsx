'use client';

import { useState } from 'react';
import Image from 'next/image';
import { RADAR_SITES, RadarSite } from '../lib/radar-config';

export type MainNavTab = 'Radar' | '3D Radar' | 'Composite' | 'Satellite' | 'Models' | 'Outlooks';
export type SpcDay = 'Day 1' | 'Day 2' | 'Day 3';

type Props = {
  activeTab: MainNavTab;
  onSelectTab: (tab: MainNavTab) => void;
  warningCount: number;
  onToggleWarningDrawer: () => void;
  onToggleMainMenu: () => void;
  onSearchLocation: (query: string, matchedSite?: RadarSite) => void;
  spcDay?: SpcDay;
  onSelectSpcDay?: (day: SpcDay) => void;
};

export function MainNavbar({
  activeTab,
  onSelectTab,
  warningCount,
  onToggleWarningDrawer,
  onToggleMainMenu,
  onSearchLocation,
  spcDay = 'Day 1',
  onSelectSpcDay,
}: Props) {
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<RadarSite[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const tabs: MainNavTab[] = ['Radar', '3D Radar', 'Composite', 'Satellite', 'Models', 'Outlooks'];

  const handleSearchChange = (val: string) => {
    setSearch(val);
    const trimmed = val.trim().toLowerCase();
    if (trimmed.length >= 2) {
      const matches = RADAR_SITES.filter(
        (s) =>
          s.id.toLowerCase().includes(trimmed) ||
          s.radarId.toLowerCase().includes(trimmed) ||
          s.name.toLowerCase().includes(trimmed)
      ).slice(0, 5);
      setSuggestions(matches);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSite = (site: RadarSite) => {
    setSearch(`${site.id} - ${site.name}`);
    setShowSuggestions(false);
    onSearchLocation(site.id, site);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = search.trim();
    if (!query) return;

    setShowSuggestions(false);

    // Try matching station identifier directly
    const siteMatch = RADAR_SITES.find(
      (s) =>
        s.id.toLowerCase() === query.toLowerCase() ||
        s.radarId.toLowerCase() === query.toLowerCase() ||
        s.name.toLowerCase().includes(query.toLowerCase())
    );

    onSearchLocation(query, siteMatch);
  };

  return (
    <header className="pointer-events-none absolute top-2 left-0 right-0 z-40 flex flex-col items-center px-3 font-sans select-none">
      <div className="flex w-full items-center justify-between">
        {/* Left: Upper-left Menu Drawer Button (Section 2.B & 12) */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={onToggleMainMenu}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900/90 text-amber-400 shadow-2xl backdrop-blur-md hover:bg-slate-800 hover:text-amber-300 transition cursor-pointer text-lg font-black"
            title="Open Main Menu"
          >
            ☰
          </button>
        </div>

        {/* Center: MesoVortex Logo, Location Search, and 6 Product Navigation Tabs */}
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/90 p-1 shadow-2xl backdrop-blur-xl">
          {/* Brand Logo & Name */}
          <div
            onClick={onToggleMainMenu}
            className="flex items-center gap-2 pl-2 pr-3 border-r border-slate-800 cursor-pointer hover:opacity-90 transition"
          >
            <Image
              src="/logo.png"
              alt="MesoVortex WX"
              width={26}
              height={26}
              className="rounded-full shadow-sm"
              priority
            />
            <span className="hidden sm:inline font-black text-xs uppercase tracking-wider text-white">
              MESO<span className="text-cyan-400">VORTEX</span>{' '}
              <span className="text-amber-400 text-[10px] font-black">WX</span>
            </span>
          </div>

          {/* Location Search Field (supports City, ZIP, Radar ID, Lat/Lon) */}
          <div className="relative hidden md:block">
            <form onSubmit={handleSearchSubmit} className="flex items-center pr-2">
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">🔍</span>
                <input
                  type="text"
                  placeholder="Search city, station, or zip..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => {
                    if (suggestions.length > 0) setShowSuggestions(true);
                  }}
                  className="w-48 rounded-full border border-slate-800 bg-slate-900 py-1 pl-7 pr-3 text-[11px] text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </form>

            {/* Autocomplete Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-64 rounded-xl border border-slate-800 bg-slate-950/95 py-1.5 shadow-2xl backdrop-blur-xl z-50 text-xs">
                {suggestions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => handleSelectSite(s)}
                    className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-900 cursor-pointer text-slate-200"
                  >
                    <div>
                      <b className="text-cyan-400 font-mono">{s.id}</b>
                      <span className="ml-1.5 text-slate-300">{s.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">{s.network}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 6 Main Product Tabs (Section 2.B) */}
          <nav className="flex items-center gap-0.5 text-xs font-bold">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => onSelectTab(t)}
                className={`rounded-full px-3 py-1 transition cursor-pointer whitespace-nowrap ${
                  activeTab === t
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {t}
              </button>
            ))}
          </nav>
        </div>

        {/* Right: Weather Warnings/Alerts Drawer Button (Section 2.B & 10) */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={onToggleWarningDrawer}
            className="flex items-center gap-1.5 rounded-full border border-red-500/50 bg-red-600/90 hover:bg-red-500 px-3.5 py-1.5 text-xs font-black text-white shadow-xl backdrop-blur-md transition cursor-pointer"
            title="Open Active Warning Drawer"
          >
            <span>⚠️</span>
            <span>{warningCount || 0}</span>
          </button>
        </div>
      </div>

      {/* Sub-bar for SPC Day Selection when in Outlooks Mode */}
      {activeTab === 'Outlooks' && onSelectSpcDay && (
        <div className="pointer-events-auto mt-2 flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/90 px-3 py-1 shadow-2xl backdrop-blur-xl text-xs font-bold text-slate-300 animate-fade-in">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 px-1 font-mono">
            SPC Convective
          </span>
          <span className="text-slate-700">|</span>
          {(['Day 1', 'Day 2', 'Day 3'] as SpcDay[]).map((d) => (
            <button
              key={d}
              onClick={() => onSelectSpcDay(d)}
              className={`rounded-full px-2.5 py-0.5 text-[11px] transition cursor-pointer ${
                spcDay === d ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
