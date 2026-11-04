'use client';

import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { RADAR_SITES } from '../lib/radar-config';

type MapType = 'street' | 'terrain' | 'satellite' | 'globe';
type RadarMapProps = { product: string; radarSite?: string; mapType: MapType };
type RadarTileConfig = { tileUrl: string; station: string; product: string; source: string; scheme: 'tms' | 'xyz' };

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
        ? { type: 'raster', tiles: ['https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg'], tileSize: 256, attribution: 'Sentinel-2 cloudless © EOX' }
        : { type: 'raster', tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, maxzoom: 19, attribution: '© OpenStreetMap contributors' },
      [TERRAIN_SOURCE_ID]: { type: 'raster-dem', url: 'https://tiles.mapterhorn.com/tilejson.json', tileSize: 256, attribution: 'Terrain data © MapTiler/Mapterhorn' },
      'hillshade-source': { type: 'raster-dem', url: 'https://tiles.mapterhorn.com/tilejson.json', tileSize: 256 }
    },
    layers: [
      { id: 'basemap-layer', type: 'raster', source: 'basemap' },
      ...(mapType === 'terrain' ? [{ id: 'terrain-hillshade', type: 'hillshade' as const, source: 'hillshade-source', paint: { 'hillshade-shadow-color': '#473b24', 'hillshade-exaggeration': 0.35 } }] : [])
    ],
    ...(mapType === 'globe' ? { projection: { type: 'globe' as const }, sky: { 'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7, 0] } } : {}),
    ...(mapType === 'terrain' ? { terrain: { source: TERRAIN_SOURCE_ID, exaggeration: 1 } } : {})
  };
}

export function RadarMap({ product, radarSite = 'KTLX', mapType }: RadarMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const tileUrlRef = useRef<string | null>(null);
  const [radarStatus, setRadarStatus] = useState('Loading NEXRAD radar…');
  const site = RADAR_SITES.find((item) => item.id === radarSite) ?? RADAR_SITES[0];
  const productLabel = product === 'vel' ? 'Base Velocity' : product === 'srvel' ? 'Storm Relative Velocity' : 'Base Reflectivity';

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
      if (!map.isStyleLoaded() || !tileUrlRef.current) return;
      if (map.getLayer(RADAR_LAYER_ID)) map.removeLayer(RADAR_LAYER_ID);
      if (map.getSource(RADAR_SOURCE_ID)) map.removeSource(RADAR_SOURCE_ID);
      map.addSource(RADAR_SOURCE_ID, {
        type: 'raster',
        tiles: [tileUrlRef.current],
        tileSize: 256,
        scheme: 'tms',
        attribution: 'NEXRAD Level III radar imagery © Iowa Environmental Mesonet / NOAA'
      });
      map.addLayer({ id: RADAR_LAYER_ID, type: 'raster', source: RADAR_SOURCE_ID, paint: { 'raster-opacity': 0.88, 'raster-fade-duration': 100 } });
    };

    const installSiteMarkers = () => {
      if (!map.isStyleLoaded()) return;
      if (!map.getSource(SITES_SOURCE_ID)) {
        map.addSource(SITES_SOURCE_ID, {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: RADAR_SITES.map((radar) => ({
              type: 'Feature' as const,
              properties: { id: radar.id, radarId: radar.radarId, name: radar.name },
              geometry: { type: 'Point' as const, coordinates: [radar.lon, radar.lat] }
            }))
          }
        });
      }
      if (!map.getLayer(SITES_LAYER_ID)) {
        map.addLayer({
          id: SITES_LAYER_ID,
          type: 'circle',
          source: SITES_SOURCE_ID,
          paint: {
            'circle-radius': ['case', ['==', ['get', 'id'], radarSite], 9, 6],
            'circle-color': ['case', ['==', ['get', 'id'], radarSite], '#ffcf33', '#18a8ff'],
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2,
            'circle-opacity': 0.95
          }
        });
      }
      if (!map.getLayer(SITES_LABEL_LAYER_ID)) {
        map.addLayer({
          id: SITES_LABEL_LAYER_ID,
          type: 'symbol',
          source: SITES_SOURCE_ID,
          minzoom: 5,
          layout: {
            'text-field': ['get', 'radarId'],
            'text-size': 11,
            'text-offset': [0, 1.25],
            'text-allow-overlap': true
          },
          paint: {
            'text-color': '#ffffff',
            'text-halo-color': '#14202c',
            'text-halo-width': 1.5
          }
        });
      }
    };

    const onSiteClick = (event: maplibregl.MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (!feature || !Array.isArray(feature.geometry.coordinates)) return;
      const coordinates = feature.geometry.coordinates as [number, number];
      const properties = feature.properties as { radarId: string; name: string };
      new maplibregl.Popup({ closeButton: true, offset: 12 })
        .setLngLat(coordinates)
        .setHTML(`<strong>NEXRAD ${properties.radarId}</strong><br/>${properties.name}`)
        .addTo(map);
    };
    map.on('click', SITES_LAYER_ID, onSiteClick);
    map.on('mouseenter', SITES_LAYER_ID, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', SITES_LAYER_ID, () => { map.getCanvas().style.cursor = ''; });

    const loadRadarTiles = async () => {
      try {
        setRadarStatus(`Loading ${site.radarId} ${productLabel}…`);
        const response = await fetch(`/api/nexrad/frames?site=${encodeURIComponent(site.radarId)}&product=${encodeURIComponent(product)}`, { cache: 'no-store' });
        const data = await response.json() as RadarTileConfig & { error?: string };
        if (!response.ok || !data.tileUrl) throw new Error(data.error || 'NEXRAD tile service unavailable');
        tileUrlRef.current = data.tileUrl;
        installRadarLayer();
        installSiteMarkers();
        setRadarStatus(`NEXRAD ${data.station} · ${productLabel} · latest available Level III scan`);
      } catch (error) {
        console.error('NEXRAD tile setup failed:', error);
        setRadarStatus(`NEXRAD ${site.radarId} radar unavailable`);
      }
    };

    map.on('load', () => {
      if (mapType === 'terrain') map.setTerrain({ source: TERRAIN_SOURCE_ID, exaggeration: 1 });
      installSiteMarkers();
      void loadRadarTiles();
    });
    map.on('style.load', () => {
      if (mapType === 'terrain') map.setTerrain({ source: TERRAIN_SOURCE_ID, exaggeration: 1 });
      installRadarLayer();
      installSiteMarkers();
    });

    const handleZoom = (event: Event) => map.zoomTo(map.getZoom() + (event as CustomEvent<number>).detail, { duration: 250 });
    const handleReset = () => map.flyTo({ center: [site.lon, site.lat], zoom: 7, pitch: mapType === 'terrain' ? 45 : 0 });
    const handleRefresh = () => void loadRadarTiles();
    window.addEventListener('mesovortex:zoom', handleZoom);
    window.addEventListener('mesovortex:reset', handleReset);
    window.addEventListener('mesovortex:refresh-radar', handleRefresh);

    return () => {
      window.removeEventListener('mesovortex:zoom', handleZoom);
      window.removeEventListener('mesovortex:reset', handleReset);
      window.removeEventListener('mesovortex:refresh-radar', handleRefresh);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapType, radarSite, product]);

  return (
    <div className="radar-map-root">
      <div ref={containerRef} className="radar-map-container" aria-label={`${mapType} map with NEXRAD ${productLabel} from ${site.radarId}`} />
      <div className="radar-map-status"><i className={radarStatus.includes('latest available') ? 'status-live' : ''} />{radarStatus}</div>
    </div>
  );
}
