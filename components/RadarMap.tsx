'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl, { type Map as MapLibreMap, type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { RADAR_SITES } from '../lib/radar-config';

type MapType = 'street' | 'terrain' | 'satellite' | 'globe';

type RadarMapProps = {
  product: string;
  isLooping: boolean;
  radarSite?: string;
  mapType: MapType;
};

const RADAR_SOURCE_ID = 'mesovortex-radar';
const RADAR_LAYER_ID = 'mesovortex-radar-layer';
const TERRAIN_SOURCE_ID = 'terrainSource';

function makeStyle(mapType: MapType): StyleSpecification {
  const satellite = mapType === 'satellite' || mapType === 'globe';
  const style: StyleSpecification = {
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
    ...(mapType === 'globe' ? { projection: { type: 'globe' as const }, sky: { 'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7, 0] } } : {}),
    ...(mapType === 'terrain' ? { terrain: { source: TERRAIN_SOURCE_ID, exaggeration: 1 } } : {})
  };
  return style;
}

export function RadarMap({ product, isLooping, radarSite = 'KOUN', mapType }: RadarMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const radarTimestampRef = useRef<string | null>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [radarStatus, setRadarStatus] = useState('Loading radar…');
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

    const addRadarLayer = () => {
      const timestamp = radarTimestampRef.current;
      if (!timestamp || !map.isStyleLoaded()) return;
      if (map.getLayer(RADAR_LAYER_ID)) map.removeLayer(RADAR_LAYER_ID);
      if (map.getSource(RADAR_SOURCE_ID)) map.removeSource(RADAR_SOURCE_ID);
      map.addSource(RADAR_SOURCE_ID, {
        type: 'raster',
        tiles: [`https://tilecache.rainviewer.com${timestamp}/256/{z}/{x}/{y}/2/1_1.png`],
        tileSize: 256,
        attribution: 'Radar imagery © RainViewer'
      });
      map.addLayer({
        id: RADAR_LAYER_ID,
        type: 'raster',
        source: RADAR_SOURCE_ID,
        paint: { 'raster-opacity': 0.72, 'raster-fade-duration': 250 }
      });
      setRadarStatus('Radar updated');
    };

    const refreshRadar = async () => {
      try {
        const response = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        if (!response.ok) throw new Error('Radar feed unavailable');
        const data = await response.json();
        const latest = data?.radar?.past?.at(-1);
        if (!latest?.path) throw new Error('No current radar frame');
        radarTimestampRef.current = latest.path;
        addRadarLayer();
      } catch {
        setRadarStatus('Radar feed unavailable');
      }
    };

    map.on('load', () => {
      if (mapType === 'terrain') map.setTerrain({ source: TERRAIN_SOURCE_ID, exaggeration: 1 });
      refreshRadar();
    });
    map.on('style.load', () => {
      if (mapType === 'terrain') map.setTerrain({ source: TERRAIN_SOURCE_ID, exaggeration: 1 });
      addRadarLayer();
    });

    const handleZoom = (event: Event) => {
      const delta = (event as CustomEvent<number>).detail;
      map.zoomTo(map.getZoom() + delta, { duration: 250 });
    };
    const handleReset = () => map.flyTo({ center: [site.lon, site.lat], zoom: 6, pitch: mapType === 'terrain' ? 45 : 0 });
    window.addEventListener('mesovortex:zoom', handleZoom);
    window.addEventListener('mesovortex:reset', handleReset);
    const radarRefreshTimer = window.setInterval(refreshRadar, 5 * 60 * 1000);

    return () => {
      window.removeEventListener('mesovortex:zoom', handleZoom);
      window.removeEventListener('mesovortex:reset', handleReset);
      window.clearInterval(radarRefreshTimer);
      map.remove();
      mapRef.current = null;
    };
    // Map is recreated when the base style or radar site changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapType, radarSite]);

  useEffect(() => {
    if (!isLooping) {
      setFrameIndex(0);
      return;
    }
    const timer = window.setInterval(() => setFrameIndex((value) => (value + 1) % 6), 700);
    return () => window.clearInterval(timer);
  }, [isLooping]);

  return (
    <div className="radar-map-root">
      <div ref={containerRef} className="radar-map-container" aria-label={`${mapType} weather map with radar overlay`} />
      <div className="radar-map-status"><i className={radarStatus === 'Radar updated' ? 'status-live' : ''} />{radarStatus}</div>
      {isLooping && <div className="radar-loop-indicator">Radar loop · frame {frameIndex + 1}/6 · {product.toUpperCase()}</div>}
    </div>
  );
}
