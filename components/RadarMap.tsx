'use client';

import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { RADAR_SITES } from '../lib/radar-config';

type MapType = 'street' | 'terrain' | 'satellite' | 'globe';
type RadarFrame = { path: string; time: number };

type RadarMapProps = {
  product: string;
  isLooping: boolean;
  radarSite?: string;
  mapType: MapType;
};

const RADAR_SOURCE_ID = 'mesovortex-radar';
const RADAR_LAYER_ID = 'mesovortex-radar-layer';
const TERRAIN_SOURCE_ID = 'terrainSource';
const RAINVIEWER_HOST = 'https://tilecache.rainviewer.com';

function makeStyle(mapType: MapType): StyleSpecification {
  const satellite = mapType === 'satellite' || mapType === 'globe';
  return {
    version: 8,
    sources: {
      basemap: satellite
        ? {
            type: 'raster',
            tiles: ['https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg'],
            tileSize: 256,
            attribution: 'Sentinel-2 cloudless © EOX'
          }
        : {
            type: 'raster',
            tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            maxzoom: 19,
            attribution: '© OpenStreetMap contributors'
          },
      [TERRAIN_SOURCE_ID]: {
        type: 'raster-dem',
        url: 'https://tiles.mapterhorn.com/tilejson.json',
        tileSize: 256,
        attribution: 'Terrain data © MapTiler/Mapterhorn'
      },
      'hillshade-source': {
        type: 'raster-dem',
        url: 'https://tiles.mapterhorn.com/tilejson.json',
        tileSize: 256
      }
    },
    layers: [
      { id: 'basemap-layer', type: 'raster', source: 'basemap' },
      ...(mapType === 'terrain'
        ? [{
            id: 'terrain-hillshade',
            type: 'hillshade' as const,
            source: 'hillshade-source',
            paint: { 'hillshade-shadow-color': '#473b24', 'hillshade-exaggeration': 0.35 }
          }]
        : [])
    ],
    ...(mapType === 'globe'
      ? { projection: { type: 'globe' as const }, sky: { 'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7, 0] } }
      : {}),
    ...(mapType === 'terrain' ? { terrain: { source: TERRAIN_SOURCE_ID, exaggeration: 1 } } : {})
  };
}

function radarTileUrl(frame: RadarFrame) {
  return `${RAINVIEWER_HOST}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`;
}

export function RadarMap({ product, isLooping, radarSite = 'KOUN', mapType }: RadarMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const framesRef = useRef<RadarFrame[]>([]);
  const [radarFrames, setRadarFrames] = useState<RadarFrame[]>([]);
  const [frameIndex, setFrameIndex] = useState(0);
  const [radarStatus, setRadarStatus] = useState('Loading live radar…');
  const site = RADAR_SITES.find((item) => item.id === radarSite) ?? RADAR_SITES[0];

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: makeStyle(mapType),
      center: [site.lon, site.lat],
      zoom: 6,
      maxZoom: 18,
      maxPitch: 85,
      ...(mapType === 'terrain' ? { pitch: 45 } : {})
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true, showZoom: true, showCompass: true }), 'top-right');
    map.addControl(new maplibregl.TerrainControl({ source: TERRAIN_SOURCE_ID, exaggeration: 1 }), 'top-right');

    const installRadarLayer = () => {
      const frames = framesRef.current;
      if (!map.isStyleLoaded()) return;
      if (map.getLayer(RADAR_LAYER_ID)) map.removeLayer(RADAR_LAYER_ID);
      if (map.getSource(RADAR_SOURCE_ID)) map.removeSource(RADAR_SOURCE_ID);
      if (frames.length === 0) return;
      const latestFrame = frames[frames.length - 1];
      map.addSource(RADAR_SOURCE_ID, {
        type: 'raster',
        tiles: [radarTileUrl(latestFrame)],
        tileSize: 256,
        attribution: 'Radar imagery © RainViewer'
      });
      map.addLayer({
        id: RADAR_LAYER_ID,
        type: 'raster',
        source: RADAR_SOURCE_ID,
        paint: { 'raster-opacity': 0.72, 'raster-fade-duration': 250 }
      });
    };

    const refreshRadar = async () => {
      try {
        const response = await fetch('/api/nexrad/frames?limit=8', { cache: 'no-store' });
        if (!response.ok) throw new Error('Radar service returned an error');
        const data = await response.json();
        const frames = Array.isArray(data.frames) ? data.frames as RadarFrame[] : [];
        if (frames.length === 0) throw new Error('No recent radar scans are available');
        framesRef.current = frames;
        setRadarFrames(frames);
        setFrameIndex(frames.length - 1);
        setRadarStatus('Live global radar composite');
        if (map.isStyleLoaded()) installRadarLayer();
      } catch (error) {
        console.error('Live radar refresh failed:', error);
        setRadarStatus('Live radar temporarily unavailable');
      }
    };

    map.on('load', () => {
      if (mapType === 'terrain') map.setTerrain({ source: TERRAIN_SOURCE_ID, exaggeration: 1 });
      installRadarLayer();
      void refreshRadar();
    });
    map.on('style.load', () => {
      if (mapType === 'terrain') map.setTerrain({ source: TERRAIN_SOURCE_ID, exaggeration: 1 });
      installRadarLayer();
    });

    const handleZoom = (event: Event) => {
      const delta = (event as CustomEvent<number>).detail;
      map.zoomTo(map.getZoom() + delta, { duration: 250 });
    };
    const handleReset = () => map.flyTo({ center: [site.lon, site.lat], zoom: 6, pitch: mapType === 'terrain' ? 45 : 0 });
    window.addEventListener('mesovortex:zoom', handleZoom);
    window.addEventListener('mesovortex:reset', handleReset);
    const radarRefreshTimer = window.setInterval(() => void refreshRadar(), 5 * 60 * 1000);

    return () => {
      window.removeEventListener('mesovortex:zoom', handleZoom);
      window.removeEventListener('mesovortex:reset', handleReset);
      window.clearInterval(radarRefreshTimer);
      map.remove();
      mapRef.current = null;
    };
    // Map is recreated when the base style or selected radar location changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapType, radarSite]);

  useEffect(() => {
    if (!isLooping || radarFrames.length < 2) return;
    const timer = window.setInterval(() => {
      setFrameIndex((current) => (current + 1) % radarFrames.length);
    }, 800);
    return () => window.clearInterval(timer);
  }, [isLooping, radarFrames.length]);

  useEffect(() => {
    const frame = radarFrames[frameIndex];
    const source = mapRef.current?.getSource(RADAR_SOURCE_ID);
    if (frame && source && 'setTiles' in source && typeof source.setTiles === 'function') {
      source.setTiles([radarTileUrl(frame)]);
    }
  }, [frameIndex, radarFrames]);

  const displayedFrame = radarFrames[frameIndex];
  const scanTime = displayedFrame ? new Date(displayedFrame.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short' }) : '';

  return (
    <div className="radar-map-root">
      <div ref={containerRef} className="radar-map-container" aria-label={`${mapType} map with live global radar composite`} />
      <div className="radar-map-status"><i className={radarFrames.length > 0 ? 'status-live' : ''} />{radarStatus}{scanTime && ` · ${scanTime}`}</div>
      {isLooping && radarFrames.length > 0 && <div className="radar-loop-indicator">Live radar scans · {frameIndex + 1}/{radarFrames.length} · {product.toUpperCase()}</div>}
    </div>
  );
}
