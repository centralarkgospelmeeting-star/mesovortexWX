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
  frameUrl?: string | null;
  frameLabel?: string;
};

const RADAR_SOURCE_ID = 'mesovortex-nexrad';
const RADAR_LAYER_ID = 'mesovortex-nexrad-layer';
const SITES_SOURCE_ID = 'nexrad-sites';
const SITES_LAYER_ID = 'nexrad-sites-pills';
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
        attribution: 'Terrain © MapTiler/Mapterhorn',
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

  // ---------- Pill-shaped site markers ----------
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
        isActive: s.id === radarSite || s.radarId === radarSite,
      },
    }));

    map.addSource(SITES_SOURCE_ID, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features,
      },
    });

    // Pill background (rounded rectangle look using circle + stretch)
    map.addLayer({
      id: SITES_LAYER_ID,
      type: 'circle',
      source: SITES_SOURCE_ID,
      paint: {
        'circle-radius': [
          'case',
          ['get', 'isActive'],
          18,
          14,
        ],
        'circle-color': [
          'case',
          ['get', 'isActive'],
          '#0891b2', // cyan-600 for active
          '#1e293b', // slate-800
        ],
        'circle-stroke-width': 2,
        'circle-stroke-color': [
          'case',
          ['get', 'isActive'],
          '#22d3ee',
          '#475569',
        ],
        'circle-opacity': 0.95,
        'circle-pitch-alignment': 'map',
      },
    });

    // Radar ID text inside the pill
    map.addLayer({
      id: SITES_LABEL_LAYER_ID,
      type: 'symbol',
      source: SITES_SOURCE_ID,
      layout: {
        'text-field': ['get', 'radarId'],
        'text-size': [
          'case',
          ['get', 'isActive'],
          11,
          10,
        ],
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-anchor': 'center',
        'text-allow-overlap': true,
        'text-ignore-placement': true,
      },
      paint: {
        'text-color': '#f1f5f9',
        'text-halo-color': 'rgba(0,0,0,0.6)',
        'text-halo-width': 1,
      },
    });
  }, [radarSite]);

  const installOrUpdateRadarLayer = useCallback((map: MapLibreMap, tileUrl: string) => {
    if (!tileUrl) return;

    if (map.getLayer(RADAR_LAYER_ID)) {
      map.removeLayer(RADAR_LAYER_ID);
    }
    if (map.getSource(RADAR_SOURCE_ID)) {
      map.removeSource(RADAR_SOURCE_ID);
    }

    map.addSource(RADAR_SOURCE_ID, {
      type: 'raster',
      tiles: [tileUrl],
      tileSize: 256,
      scheme: 'tms',
      attribution: 'NEXRAD Level III via Iowa Environmental Mesonet',
    });

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
  }, []);

  // ---------- Create map ----------
  useEffect(() => {
    if (!containerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      setMapReady(false);
    }

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

    map.on('click', SITES_LAYER_ID, (e) => {
      const feature = e.features?.[0];
      if (!feature || feature.geometry.type !== 'Point') return;

      const coords = (feature.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
      const props = feature.properties as { radarId: string; name: string } | null;
      if (!props) return;

      new maplibregl.Popup({ closeButton: true, offset: 14 })
        .setLngLat(coords)
        .setHTML(
          `<div style="font-family:system-ui;padding:2px 4px">
            <strong style="color:#22d3ee">NEXRAD ${props.radarId}</strong><br/>
            <span style="color:#94a3b8;font-size:12px">${props.name}</span>
          </div>`
        )
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapType]);

  // ---------- Fly to site ----------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    map.flyTo({
      center: [site.lon, site.lat],
      zoom: 7.2,
      essential: true,
      duration: 1100,
    });

    // Update active pill styling
    if (map.getSource(SITES_SOURCE_ID)) {
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
          isActive: s.id === site.id || s.radarId === site.radarId,
        },
      }));

      (map.getSource(SITES_SOURCE_ID) as maplibregl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features,
      });
    }
  }, [site.id, mapReady]);

  // ---------- Parent-driven frames ----------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !frameUrl) return;
    if (frameUrl === currentTileUrlRef.current) return;

    installOrUpdateRadarLayer(map, frameUrl);
    setRadarStatus(`NEXRAD ${site.radarId} · ${productLabel} · ${frameLabel || 'frame'}`);
  }, [frameUrl, frameLabel, mapReady, site.radarId, productLabel, installOrUpdateRadarLayer]);

  // ---------- Fallback latest ----------
  useEffect(() => {
    if (!mapReady || frameUrl) return;

    let cancelled = false;

    async function loadLatest() {
      const map = mapRef.current;
      if (!map || cancelled) return;

      try {
        setRadarStatus(`Loading ${site.radarId} ${productLabel}…`);

        const response = await fetch(
          `/api/nexrad/frames?site=${encodeURIComponent(site.radarId)}&product=${encodeURIComponent(product)}`,
          { cache: 'no-store' }
        );

        const data = await response.json();
        if (cancelled) return;

        if (!response.ok) throw new Error(data.error || 'NEXRAD unavailable');

        const url =
          data.frames && data.frames.length > 0
            ? data.frames[data.frames.length - 1].tileUrl
            : data.tileUrl;

        const liveMap = mapRef.current;
        if (url && liveMap) {
          installOrUpdateRadarLayer(liveMap, url);
          setRadarStatus(
            `NEXRAD ${site.radarId} · ${productLabel} · latest available Level III scan`
          );
        }
      } catch (err) {
        console.error('NEXRAD load failed:', err);
        if (!cancelled) {
          setRadarStatus(`NEXRAD ${site.radarId} radar unavailable`);
        }
      }
    }

    void loadLatest();
    const timer = window.setInterval(() => void loadLatest(), 5 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [mapReady, site.radarId, product, frameUrl, installOrUpdateRadarLayer, productLabel]);

  return (
    <div className="radar-map-root relative h-full w-full">
      <div
        ref={containerRef}
        className="radar-map-container absolute inset-0"
        aria-label={`${mapType} map with NEXRAD ${productLabel} from ${site.radarId}`}
      />
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-md bg-slate-950/80 px-2.5 py-1 text-[11px] text-slate-200 backdrop-blur">
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
