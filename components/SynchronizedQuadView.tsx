'use client';

import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { RADAR_SITES } from '../lib/radar-config';

type QuadProps = {
  radarSite: string;
  onClose: () => void;
};

const QUAD_PRODUCTS = [
  { key: 'N0B', label: 'Super-Res Reflectivity (0.5°)', code: 'ref' },
  { key: 'N0U', label: 'Base Velocity (0.5°)', code: 'vel' },
  { key: 'N0C', label: 'Correlation Coefficient (CC)', code: 'cc' },
  { key: 'N0S', label: 'Storm Relative Motion (SRM)', code: 'srvel' },
];

export function SynchronizedQuadView({ radarSite, onClose }: QuadProps) {
  const containerRefs = [
    useRef<HTMLDivElement | null>(null),
    useRef<HTMLDivElement | null>(null),
    useRef<HTMLDivElement | null>(null),
    useRef<HTMLDivElement | null>(null),
  ];

  const mapsRef = useRef<(maplibregl.Map | null)[]>([null, null, null, null]);
  const isSyncingRef = useRef(false);

  const site = RADAR_SITES.find((s) => s.id === radarSite || s.radarId === radarSite) || RADAR_SITES[0];

  useEffect(() => {
    QUAD_PRODUCTS.forEach((prod, index) => {
      const container = containerRefs[index].current;
      if (!container) return;

      const map = new maplibregl.Map({
        container,
        style: {
          version: 8,
          sources: {
            carto: {
              type: 'raster',
              tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],
              tileSize: 256,
            },
            radar: {
              type: 'raster',
              tiles: [
                `https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::${site.radarId}-${prod.key}-0/{z}/{x}/{y}.png`,
              ],
              tileSize: 256,
              scheme: 'xyz',
            },
          },
          layers: [
            { id: 'base-carto', type: 'raster', source: 'carto' },
            { id: 'radar-layer', type: 'raster', source: 'radar', paint: { 'raster-opacity': 0.85 } },
          ],
        },
        center: [site.lon, site.lat],
        zoom: 7.5,
      });

      mapsRef.current[index] = map;

      // Camera synchronizer
      map.on('move', () => {
        if (isSyncingRef.current) return;
        isSyncingRef.current = true;

        const center = map.getCenter();
        const zoom = map.getZoom();
        const bearing = map.getBearing();
        const pitch = map.getPitch();

        mapsRef.current.forEach((otherMap, otherIdx) => {
          if (otherMap && otherIdx !== index) {
            otherMap.jumpTo({ center, zoom, bearing, pitch });
          }
        });

        isSyncingRef.current = false;
      });
    });

    return () => {
      mapsRef.current.forEach((m) => m?.remove());
      mapsRef.current = [null, null, null, null];
    };
  }, [site.radarId, site.lat, site.lon]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#070b13]">
      {/* Top Quad Header */}
      <div className="flex h-12 items-center justify-between border-b border-slate-800 bg-slate-950 px-4">
        <div className="flex items-center gap-3">
          <span className="rounded bg-cyan-600/30 px-2 py-0.5 text-xs font-bold text-cyan-400">
            QUAD SYNCHRO VIEW
          </span>
          <span className="text-sm font-semibold text-white">
            NEXRAD {site.radarId} — {site.name}
          </span>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700"
        >
          ✕ Exit Quad
        </button>
      </div>

      {/* 2x2 Screen Grid */}
      <div className="grid flex-1 grid-cols-2 grid-rows-2 gap-1 bg-black p-1">
        {QUAD_PRODUCTS.map((prod, idx) => (
          <div key={prod.key} className="relative h-full w-full overflow-hidden rounded border border-slate-800">
            <div ref={containerRefs[idx]} className="h-full w-full" />
            <div className="pointer-events-none absolute left-2 top-2 z-10 rounded bg-slate-950/80 px-2.5 py-1 text-xs font-bold tracking-wide text-cyan-300 backdrop-blur">
              {prod.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
