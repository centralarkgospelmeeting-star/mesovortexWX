'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { RADAR_SITES } from '../lib/radar-config';

type MapType = 'street' | 'terrain' | 'satellite' | 'globe';

type RadarMapProps = {
  product: string;
  radarSite?: string;
  mapType: MapType;
  /** Full tile URL template with {z}/{x}/{y}. When this changes the radar layer updates. */
  frameUrl?: string | null;
  /** Optional label shown in status bar */
  frameLabel?: string;
};

type RadarTileConfig = {
  tileUrl: string;
  station: string;
  product: string;
  source: string;
  scheme: 'tms' | 'xyz';
};

const RADAR_SOURCE_ID = 'mesovortex-nexrad';
const RADAR_LAYER_ID = 'mesovortex-nexrad-layer';
const SITES_SOURCE_ID = 'nexrad-sites';
const SITES_LAYER_ID = 'nexrad-sites-circles';
const SITES_LABEL_LAYER_ID = 'nexrad-sites-labels';
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
        attribution: 'Terrain data © MapTiler/Mapterhorn',
      },
      'hillshade-source': {
        type: 'raster-dem',
        url: 'https://tiles.mapterhorn.com/tilejson.json',
        tileSize: 256,
      },
    },
    layers: [
      { id: 'basemap-layer', type: 'raster', source: 'basemap' },
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
            'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7, 0],
          },
        }
      : {}),
    ...(mapType === 'terrain'
      ? { terrain: { source: TERRAIN_SOURCE_ID, exaggeration: 1 } }
      : {}),
  };
}

export function RadarMap({
  product,
  radarSite = 'KLZK',
  mapType,
  frameUrl = null,
  frameLabel,
}: RadarMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const currentTileUrlRef = useRef<string | null>(null);
  const [radarStatus, setRadarStatus] = useState('Initializing map…');
  const [mapReady, setMapReady] = useState(false);

  const site =
    RADAR_SITES.find((s) => s.id === radarSite || s.radarId === radarSite) ||
    RADAR_SITES[0];

  const productLabel = product.toUpperCase();

  // ---------- helpers ----------
  const installSiteMarkers = useCallback((map: MapLibreMap) => {
    if (map.getSource(SITES_SOURCE_ID)) return;

    const features = RADAR_SITES.map((s) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [s.lon, s.lat],
      },
      properties: {
        radarId: s.radarId,
        name: s.name,
        id: s.id,
      },
    }));

    map.addSource(SITES_SOURCE_ID, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features,
      },
    });

    map.addLayer({
      id: SITES_LAYER_ID,
      type: 'circle',
      source: SITES_SOURCE_ID,
      paint: {
        'circle-radius': 5,
        'circle-color': '#22d3ee',
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#0f172a',
        'circle-opacity': 0.9,
      },
    });

    map.addLayer({
      id: SITES_LABEL_LAYER_ID,
      type: 'symbol',
      source: SITES_SOURCE_ID,
      layout: {
        'text-field': ['get', 'radarId'],
        'text-size': 10,
        'text-offset': [0, 1.2],
        'text-anchor': 'top',
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
      },
      paint: {
        'text-color': '#e2e8f0',
        'text-halo-color': '#0f172a',
        'text-halo-width': 1.2,
      },
    });
  }, []);

  const installOrUpdateRadarLayer = useCallback(
    (map: MapLibreMap, tileUrl: string) => {
      if (!tileUrl) return;

      // If source already exists just swap the tiles
      if (map.getSource(RADAR_SOURCE_ID)) {
        const source = map.getSource(RADAR_SOURCE_ID) as maplibregl.RasterTileSource;
        // MapLibre doesn't have a clean setTiles, so we remove + re-add
        if (map.getLayer(RADAR_LAYER_ID)) {
          map.removeLayer(RADAR_LAYER_ID);
        }
        map.removeSource(RADAR_SOURCE_ID);
      }

      map.addSource(RADAR_SOURCE_ID, {
        type: 'raster',
        tiles: [tileUrl],
        tileSize: 256,
        scheme: 'tms', // IEM uses TMS
        attribution: 'NEXRAD Level III via Iowa Environmental Mesonet',
      });

      // Insert radar just above the basemap
      const beforeId = map.getLayer(SITES_LAYER_ID) ? SITES_LAYER_ID : undefined;

      map.addLayer(
        {
          id: RADAR_LAYER_ID,
          type: 'raster',
          source: RADAR_SOURCE_ID,
          paint: {
            'raster-opacity': 0.85,
            'raster-fade-duration': 0,
          },
        },
        beforeId
      );

      currentTileUrlRef.current = tileUrl;
    },
    []
  );

  // ---------- map creation ----------
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: makeStyle(mapType),
      center: [site.lon, site.lat],
      zoom: 7.2,
      attributionControl: { compact: true },
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 120 }), 'bottom-left');

    mapRef.current = map;

    map.on('load', () => {
      if (mapType === 'terrain') {
        map.setTerrain({ source: TERRAIN_SOURCE_ID, exaggeration: 1 });
      }
      installSiteMarkers(map);
      setMapReady(true);
      setRadarStatus(`Map ready · ${site.radarId}`);
    });

    // Site click popup
    map.on('click', SITES_LAYER_ID, (e) => {
      const feature = e.features?.[0];
      if (!feature || feature.geometry.type !== 'Point') return;
      const coords = (feature.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
      const props = feature.properties as { radarId: string; name: string } | null;
      if (!props) return;

      new maplibregl.Popup({ closeButton: true, offset: 12 })
        .setLngLat(coords)
        .setHTML(`<strong>NEXRAD ${props.radarId}</strong><br/>${props.name}`)
        .addTo(map);
    });

    map.on('mouseenter', SITES_LAYER_ID, () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', SITES_LAYER_ID, () => {
      map.getCanvas().style.cursor = '';
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
    // Only recreate map when basemap type changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapType]);

  // ---------- fly to new radar site ----------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    map.flyTo({
      center: [site.lon, site.lat],
      zoom: 7.2,
      essential: true,
      duration: 1200,
    });
  }, [site.id, mapReady]);

  // ---------- load initial / fallback frame when no frameUrl is provided ----------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // If parent is already driving frames, skip the internal fetch
    if (frameUrl) return;

    let cancelled = false;

    async function loadLatest() {
      try {
        setRadarStatus(`Loading ${site.radarId} ${productLabel}…`);
        const response = await fetch(
          `/api/nexrad/frames?site=${encodeURIComponent(site.radarId)}&product=${encodeURIComponent(product)}`,
          { cache: 'no-store' }
        );
        const data = (await response.json()) as RadarTileConfig & {
          error?: string;
          frames?: { tileUrl: string; label: string }[];
        };

        if (cancelled) return;

        if (!response.ok || (!data.tileUrl && !data.frames?.length)) {
          throw new Error(data.error || 'NEXRAD tile service unavailable');
        }

        // Prefer the last frame (LIVE) if the new API returns frames
        const url =
          data.frames && data.frames.length > 0
            ? data.frames[data.frames.length - 1].tileUrl
            : data.tileUrl;

        if (url) {
          installOrUpdateRadarLayer(map, url);
          setRadarStatus(
            `NEXRAD ${site.radarId} · ${productLabel} · latest available Level III scan`
          );
        }
      } catch (error) {
        console.error('NEXRAD tile setup failed:', error);
        if (!cancelled) {
          setRadarStatus(`NEXRAD ${site.radarId} radar unavailable`);
        }
      }
    }

    void loadLatest();

    // Auto-refresh latest every 5 minutes when not in loop mode
    const timer = window.setInterval(() => void loadLatest(), 5 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [mapReady, site.radarId, product, frameUrl, installOrUpdateRadarLayer, productLabel]);

  // ---------- parent-driven frame changes (the real loop) ----------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !frameUrl) return;

    if (frameUrl === currentTileUrlRef.current) return;

    installOrUpdateRadarLayer(map, frameUrl);

    const label = frameLabel || 'frame';
    setRadarStatus(`NEXRAD ${site.radarId} · ${productLabel} · ${label}`);
  }, [frameUrl, frameLabel, mapReady, site.radarId, productLabel, installOrUpdateRadarLayer]);

  return (
    <div className="radar-map-root relative h-full w-full">
      <div
        ref={containerRef}
        className="radar-map-container absolute inset-0"
        aria-label={`${mapType} map with NEXRAD ${productLabel} from ${site.radarId}`}
      />
      <div className="radar-map-status pointer-events-none absolute bottom-3 left-3 z-10 rounded-md bg-slate-950/80 px-2.5 py-1 text-[11px] text-slate-200 backdrop-blur">
        <span
          className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${
            radarStatus.includes('latest') || radarStatus.includes('LIVE')
              ? 'bg-emerald-400'
              : 'bg-amber-400'
          }`}
        />
        {radarStatus}
      </div>
    </div>
  );
}
