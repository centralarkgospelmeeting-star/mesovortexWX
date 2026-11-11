'use client';

import { useState } from 'react';
import Image from 'next/image';

export type MainNavTab = 'Radar' | '3D Radar' | 'Composite' | 'Satellite' | 'Models' | 'Outlooks';

type Props = {
  activeTab: MainNavTab;
  onSelectTab: (tab: MainNavTab) => void;
  warningCount: number;
  onToggleWarningDrawer: () => void;
  onToggleMainMenu: () => void;
  onSearchLocation: (query: string) => void;
};

export function MainNavbar({
  activeTab,
  onSelectTab,
  warningCount,
  onToggleWarningDrawer,
  onToggleMainMenu,
  onSearchLocation,
}: Props) {
  const [search, setSearch] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      onSearchLocation(search.trim());
    }
  };

  const tabs: MainNavTab[] = ['Radar', '3D Radar', 'Composite', 'Satellite', 'Models', 'Outlooks'];

  return (
    <header className="pointer-events-none absolute top-1.5 left-0 right-0 z-40 flex items-center justify-between px-3 py-1 font-sans select-none">
      {/* Left: Upper-left Menu Drawer Button */}
      <div className="pointer-events-auto flex items-center gap-2">
        <button
          onClick={onToggleMainMenu}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/90 text-slate-100 shadow-xl backdrop-blur-md hover:bg-slate-800 transition cursor-pointer"
          title="Open Main Menu"
        >
          ☰
        </button>
      </div>

      {/* Center: MesoVortex Logo, Search, and 6 Product Navigation Tabs */}
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/90 p-1 shadow-2xl backdrop-blur-xl">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2 pl-2 pr-3 border-r border-slate-800">
          <Image
            src="/logo.png"
            alt="MesoVortex Wx"
            width={24}
            height={24}
            className="rounded-full shadow-sm"
            priority
          />
          <span className="hidden sm:inline font-black text-xs uppercase tracking-wider text-white">
            MESO<span className="text-cyan-400">VORTEX</span> <span className="text-amber-400 text-[9px] font-bold">WX</span>
          </span>
        </div>

        {/* Location Search Field */}
        <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center pr-2">
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">🔍</span>
            <input
              type="text"
              placeholder="Search city, station, or zip..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-44 rounded-full border border-slate-800 bg-slate-900 py-1 pl-7 pr-3 text-[11px] text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </form>

        {/* 6 Main Product Tabs */}
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

      {/* Right: Weather Warnings/Alerts Drawer Button */}
      <div className="pointer-events-auto flex items-center gap-2">
        <button
          onClick={onToggleWarningDrawer}
          className="flex items-center gap-1.5 rounded-full border border-red-500/50 bg-red-600/90 hover:bg-red-500 px-3 py-1.5 text-xs font-black text-white shadow-xl backdrop-blur-md transition cursor-pointer"
          title="Active Severe Warnings"
        >
          <span>⚠️</span>
          <span>{warningCount}</span>
        </button>
      </div>
    </header>
  );
}
