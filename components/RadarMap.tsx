'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { RADAR_SITES } from '../lib/radar-config';

export type MapType = 'street' | 'terrain' | 'satellite' | 'globe';

export type SpotterPin = {
  id: string;
  hazardType: string;
  description: string;
  hailSize?: string;
  lat: number;
  lon: number;
  timestamp: string;
  callsign: string;
};

type RadarMapProps = {
  product: string;
  radarSite?: string;
  mapType: MapType;
  frameUrl?: string | null;
  frameLabel?: string;
  spotterReports?: SpotterPin[];
  onMapClickCoordinates?: (coords: [number, number]) => void;
};

// IDs for sources and layers
const RADAR_SOURCE_ID = 'mesovortex-nexrad';
const RADAR_LAYER_ID = 'mesovortex-nexrad-layer';

const SITES_SOURCE_ID = 'nexrad-sites';
const SITES_LAYER_ID = 'nexrad-sites-pills';
const SITES_LABEL_LAYER_ID = 'nexrad-sites-labels';

const NWS_WARNINGS_SOURCE_ID = 'nws-warnings';
const NWS_WARNINGS_FILL_ID = 'nws-warnings-fill';
const NWS_WARNINGS_LINE_ID = 'nws-warnings-line';

const SPC_OUTLOOK_SOURCE_ID = 'spc-outlooks';
const SPC_OUTLOOK_FILL_ID = 'spc-outlooks-fill';
const SPC_OUTLOOK_LINE_ID = 'spc-outlooks-line';

const SPOTTER_SOURCE_ID = 'spotter-pins';
const SPOTTER_LAYER_ID = 'spotter-pins-circle';
const SPOTTER_LABEL_LAYER_ID = 'spotter-pins-label';

const TERRAIN_SOURCE_ID = 'terrainSource';

function makeStyle(mapType: MapType): StyleSpecification {
  const satellite = mapType === 'satellite' || mapType === 'globe';

  return {
    version: 8,
    sources: {
      basemap: satellite
        ? {
            type: 'raster',
            tiles: [
              'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg',
            ],
            tileSize: 256,
            attribution: 'Sentinel-2 cloudless © EOX',
          }
        : {
            type: 'raster',
            tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            maxzoom: 19,
            attribution: '© OpenStreetMap contributors',
          },

      [TERRAIN_SOURCE_ID]: {
        type: 'raster-dem',
        url: 'https://tiles.mapterhorn.com/tilejson.json',
        tileSize: 256,
        attribution: 'Terrain © MapTiler/Mapterhorn',
      },

      'hillshade-source': {
        type: 'raster-dem',
        url: 'https://tiles.mapterhorn.com/tilejson.json',
        tileSize: 256,
      },
    },

    layers: [
      {
        id: 'basemap-layer',
        type: 'raster',
        source: 'basemap',
      },
      ...(mapType === 'terrain'
        ? [
            {
              id: 'terrain-hillshade',
              type: 'hillshade' as const,
              source: 'hillshade-source',
              paint: {
                'hillshade-shadow-color': '#473b24',
                'hillshade-exaggeration': 0.35,
              },
            },
          ]
        : []),
    ],

    ...(mapType === 'globe'
      ? {
          projection: { type: 'globe' as const },
          sky: {
            'atmosphere-blend': [
              'interpolate',
              ['linear'],
              ['zoom'],
              0,
              1,
              5,
              1,
              7,
              0,
            ],
          },
        }
      : {}),

    ...(mapType === 'terrain'
      ? {
          terrain: {
            source: TERRAIN_SOURCE_ID,
            exaggeration: 1,
          },
        }
      : {}),
  };
}

export function RadarMap({
  product,
  radarSite = 'KLZK',
  mapType,
  frameUrl = null,
  frameLabel,
  spotterReports = [],
  onMapClickCoordinates,
}: RadarMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const currentTileUrlRef = useRef<string | null>(null);

  const [radarStatus, setRadarStatus] = useState('Initializing map…');
  const [mapReady, setMapReady] = useState(false);
  const [localSpotters, setLocalSpotters] = useState<SpotterPin[]>([]);

  const site =
    RADAR_SITES.find((s) => s.id === radarSite || s.radarId === radarSite) ||
    RADAR_SITES[0];

  const productLabel = product.toUpperCase();

  // Combine external spotter reports with local ad-hoc reports
  const allSpotters = [...spotterReports, ...localSpotters];

  // ----------------------------------------------------
  // 1. SPC CONVECTIVE OUTLOOKS LAYER
  // ----------------------------------------------------
  const installSPCOutlooks = useCallback(async (map: MapLibreMap) => {
    try {
      const res = await fetch('/api/spc/outlooks');
      if (!res.ok) return;
      const data = await res.json();

      if (!map.getSource(SPC_OUTLOOK_SOURCE_ID)) {
        map.addSource(SPC_OUTLOOK_SOURCE_ID, {
          type: 'geojson',
          data,
        });

        // Outlook Fill
        map.addLayer(
          {
            id: SPC_OUTLOOK_FILL_ID,
            type: 'fill',
            source: SPC_OUTLOOK_SOURCE_ID,
            paint: {
              'fill-color': [
                'match',
                ['get', 'LABEL'],
                'TSTM', '#c1e9c1',
                'MRGL', '#7fc57f',
                'SLGT', '#f6f67d',
                'ENH', '#edbf69',
                'MDT', '#e56d6d',
                'HIGH', '#ff66ff',
                'rgba(0,0,0,0)',
              ],
              'fill-opacity': 0.22,
            },
          },
          map.getLayer('terrain-hillshade') ? undefined : undefined
        );

        // Outlook Stroke
        map.addLayer({
          id: SPC_OUTLOOK_LINE_ID,
          type: 'line',
          source: SPC_OUTLOOK_SOURCE_ID,
          paint: {
            'line-color': [
              'match',
              ['get', 'LABEL'],
              'TSTM', '#81c784',
              'MRGL', '#4caf50',
              'SLGT', '#fbc02d',
              'ENH', '#f57c00',
              'MDT', '#d32f2f',
              'HIGH', '#aa00ff',
              'rgba(255,255,255,0.4)',
            ],
            'line-width': 1.5,
            'line-dasharray': [3, 2],
          },
        });

        // Click on SPC Polygon
        map.on('click', SPC_OUTLOOK_FILL_ID, (e) => {
          const props = e.features?.[0]?.properties;
          if (!props) return;

          new maplibregl.Popup({ closeButton: true, offset: 10 })
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="font-family:system-ui;padding:4px 6px;">
                <b style="color:#f59e0b;font-size:13px;">SPC Day 1 Convective Risk</b>
                <div style="font-size:1

