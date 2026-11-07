'use client';

import { useState } from 'react';
import { PLACEFILE_NATION_CATALOG, PlacefileCategory, PlacefileMeta } from '../lib/placefile-catalog';

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

const CATEGORIES: ('All' | PlacefileCategory)[] = [
  'All',
  'Surface & Mesonets',
  'Lightning & mPING',
  'Severe & Warnings',
  'SPC Outlooks & Fire',
  'Marine, Tropical & Hydro',
  'Infrastructure & Geohazards',
];

export function PlacefileManagerModal({
  placefiles,
  onClose,
  onToggle,
  onAdd,
  onDelete,
}: Props) {
  const [selectedCategory, setSelectedCategory] = useState<'All' | PlacefileCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customUrl, setCustomUrl] = useState('');

  const activeIds = new Set(placefiles.filter((p) => p.enabled).map((p) => p.id));

  const filteredCatalog = PLACEFILE_NATION_CATALOG.filter((item) => {
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.url.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleToggleCatalogItem = (item: PlacefileMeta) => {
    const exists = placefiles.some((p) => p.id === item.id);
    if (!exists) {
      onAdd(item.name, item.url);
    } else {
      onToggle(item.id);
    }
  };

  const handleCustomAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;
    onAdd(customTitle.trim() || 'Custom Placefile', customUrl.trim());
    setCustomTitle('');
    setCustomUrl('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-5 backdrop-blur-xl animate-fade-in select-none">
      <div className="flex h-[88vh] w-full max-w-4xl flex-col rounded-3xl border border-cyan-500/30 bg-slate-950 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-cyan-500/20 text-xl text-cyan-400 border border-cyan-500/30">
              📡
            </span>
            <div>
              <h2 className="text-base font-extrabold text-white">PlacefileNation Suite</h2>
              <p className="text-xs text-slate-400">
                54 live Gibson Ridge placefile feeds · Real-time weather, lightning &amp; hazards
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

        {/* Search & Category Filter */}
        <div className="border-b border-white/10 bg-slate-950 p-4 space-y-3">
          <input
            type="text"
            placeholder="Search placefiles (e.g. METAR, OK Mesonet, Tornado, Buoys, FreeLightning)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
          />

          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap rounded-lg px-2.5 py-1 font-semibold transition ${
                  selectedCategory === cat
                    ? 'bg-cyan-600 text-white shadow'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Directory List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {filteredCatalog.map((item) => {
              const isEnabled = activeIds.has(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => handleToggleCatalogItem(item)}
                  className={`flex cursor-pointer items-start justify-between rounded-2xl border p-3.5 transition ${
                    isEnabled
                      ? 'border-cyan-500/50 bg-cyan-950/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                      : 'border-white/5 bg-slate-900/40 hover:border-white/15 hover:bg-slate-900/70'
                  }`}
                >
                  <div className="flex items-start gap-3 overflow-hidden pr-2">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={() => handleToggleCatalogItem(item)}
                      className="mt-0.5 h-4 w-4 rounded accent-cyan-500 cursor-pointer"
                    />
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{item.name}</span>
                        <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-medium text-slate-400">
                          {item.category.split(' ')[0]}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-400 line-clamp-1">{item.description}</p>
                      <span className="mt-1 block font-mono text-[9px] text-slate-500 truncate">{item.url}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer: Custom Placefile URL Adder */}
        <div className="border-t border-white/10 bg-slate-900/60 p-4">
          <form onSubmit={handleCustomAdd} className="flex flex-col sm:flex-row items-center gap-2">
            <input
              type="text"
              placeholder="Custom Name (e.g. My Spotter Feed)"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="w-full sm:w-1/3 rounded-xl border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-white placeholder-slate-500"
            />
            <input
              type="text"
              placeholder="https://... custom placefile URL"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              className="w-full sm:flex-1 rounded-xl border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-white font-mono placeholder-slate-500"
            />
            <button
              type="submit"
              disabled={!customUrl.trim()}
              className="w-full sm:w-auto rounded-xl bg-cyan-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-cyan-500 disabled:opacity-40 transition whitespace-nowrap"
            >
              + Add URL
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
