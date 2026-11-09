'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { RADAR_SITES } from '../lib/radar-config';
import { WorkstationMode, RadarProduct, ElevationTilt, PaletteType } from '../lib/adapters/types';

interface RadarMapProps {
  product: RadarProduct;
  radarSite: string;
  mode: WorkstationMode;
  tilt: ElevationTilt;
  palette: PaletteType;
  radarOpacity: number;
  showWarnings: boolean;
  showWatches: boolean;
  showLightning: boolean;
  showLSR: boolean;
  showRadarPills: boolean;
  onSelectSite?: (siteId: string) => void;
  onHoverTelemetry?: (data: { az: number; distNm: number; altFt: number; val: number }) => void;
}

const RADAR_SOURCE_ID = 'mv-radar-source';
const RADAR_LAYER_ID = 'mv-radar-layer';
const WARNINGS_SOURCE_ID = 'mv-warnings-source';
const WARNINGS_FILL_ID = 'mv-warnings-fill';
const WARNINGS_LINE_OUTER_ID = 'mv-warnings-line-outer';
const WARNINGS_LINE_INNER_ID = 'mv-warnings-line-inner';

// Secure Environment-Driven Mapbox / MapTiler Resolver
function resolveWorkstationStyle(mode: WorkstationMode): string | StyleSpecification {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const mapboxStyle = process.env.NEXT_PUBLIC_MAPBOX_STYLE || 'centralarkgospelmeeting-star/cmw5diwpt01zo01qs5ftc22ma';
  const maptilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;

  if (mode === 'Satellite') {
    if (maptilerKey) {
      return `https://api.maptiler.com/maps/hybrid-v4/style.json?key=${maptilerKey}`;
    }
    return {
      version: 8,
      sources: {
        esriSat: {
          type: 'raster',
          tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
          tileSize: 256,
          attribution: '© Esri, NASA, USGS',
        },
      },
      layers: [{ id: 'esri-sat', type: 'raster', source: 'esriSat' }],
    };
  }

  // Use custom Mapbox style if token is provided via environment variables [1, 2]
  if (mapboxToken && mapboxToken.startsWith('pk.')) {
    return {
      version: 8,
      sources: {
        mapboxCustom: {
          type: 'raster',
          tiles: [`https://api.mapbox.com/styles/v1/${mapboxStyle}/tiles/512/{z}/{x}/{y}@2x?access_token=${mapboxToken}`],
          tileSize: 512,
          attribution: '© Mapbox, © OpenStreetMap',
        },
      },
      layers: [{ id: 'mapbox-custom-layer', type: 'raster', source: 'mapboxCustom' }],
    };
  }

  // 100% Free Public CartoDB Dark Matter Default
  return {
    version: 8,
    sources: {
      cartoDark: {
        type: 'raster',
        tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© CARTO, © OpenStreetMap',
      },
    },
    layers: [{ id: 'carto-dark-layer', type: 'raster', source: 'cartoDark' }],
  };
}

export function RadarMap({
  product,
  radarSite,
  mode,
  tilt,
  palette,
  radarOpacity,
  showWarnings,
  showRadarPills,
  onSelectSite,
  onHoverTelemetry,
}: RadarMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const site = RADAR_SITES.find((s) => s.id === radarSite || s.radarId === radarSite) || RADAR_SITES[0];

  // 1. Live Warnings Layer
  const updateWarnings = useCallback((map: MapLibreMap) => {
    fetch('/api/warnings')
      .then((res) => res.json())
      .then((geojson) => {
        const source = map.getSource(WARNINGS_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
        if (source) {
          source.setData(geojson);
        } else {
          map.addSource(WARNINGS_SOURCE_ID, { type: 'geojson', data: geojson });

          map.addLayer({
            id: WARNINGS_FILL_ID,
            type: 'fill',
            source: WARNINGS_SOURCE_ID,
            paint: {
              'fill-color': [
                'match',
                ['get', 'event'],
                'Tornado Warning', '#dc2626',
                'Severe Thunderstorm Warning', '#f59e0b',
                'Flash Flood Warning', '#10b981',
                '#3b82f6',
              ],
              'fill-opacity': 0.2,
            },
          });

          // WeatherWise Dual-Stroke Warning Outline
          map.addLayer({
            id: WARNINGS_LINE_OUTER_ID,
            type: 'line',
            source: WARNINGS_SOURCE_ID,
            paint: {
              'line-color': [
                'match',
                ['get', 'event'],
                'Tornado Warning', '#dc2626',
                'Severe Thunderstorm Warning', '#ffffff',
                'Flash Flood Warning', '#059669',
                '#1d4ed8',
              ],
              'line-width': 3.5,
            },
          });

          map.addLayer({
            id: WARNINGS_LINE_INNER_ID,
            type: 'line',
            source: WARNINGS_SOURCE_ID,
            paint: {
              'line-color': [
                'match',
                ['get', 'event'],
                'Tornado Warning', '#f87171',
                'Severe Thunderstorm Warning', '#fbbf24',
                'Flash Flood Warning', '#34d399',
                '#60a5fa',
              ],
              'line-width': 1.8,
            },
          });
        }
      })
      .catch((err) => console.warn('[Warnings Adapter Notice]:', err));
  }, []);

  // 2. High-Speed Radar Sweep Layer
  const updateRadar = useCallback((map: MapLibreMap) => {
    fetch(`/api/nexrad/frames?site=${encodeURIComponent(site.radarId)}&product=${encodeURIComponent(product)}&tilt=${encodeURIComponent(tilt)}`)
      .then((res) => res.json())
      .then((feed) => {
        const tileUrl = feed.latestTileUrl;
        if (!tileUrl) return;

        if (map.getLayer(RADAR_LAYER_ID)) map.removeLayer(RADAR_LAYER_ID);
        if (map.getSource(RADAR_SOURCE_ID)) map.removeSource(RADAR_SOURCE_ID);

        map.addSource(RADAR_SOURCE_ID, {
          type: 'raster',
          tiles: [tileUrl],
          tileSize: 256,
          scheme: 'xyz',
        });

        // Insert beneath warnings
        const beforeId = map.getLayer(WARNINGS_FILL_ID) ? WARNINGS_FILL_ID : undefined;

        map.addLayer(
          {
            id: RADAR_LAYER_ID,
            type: 'raster',
            source: RADAR_SOURCE_ID,
            paint: {
              'raster-opacity': radarOpacity,
              'raster-fade-duration': 0,
            },
          },
          beforeId
        );
      })
      .catch((err) => console.warn('[Radar Ingest Notice]:', err));
  }, [site.radarId, product, tilt, radarOpacity]);

  // Initialize MapLibre Workstation
  useEffect(() => {
    if (!containerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: resolveWorkstationStyle(mode),
      center: [site.lon, site.lat],
      zoom: 7.5,
      attributionControl: { compact: true },
    });

    mapRef.current = map;

    map.on('load', () => {
      setMapReady(true);
      map.resize();

      updateWarnings(map);
      updateRadar(map);

      // On-map station pills
      RADAR_SITES.forEach((s) => {
        const isActive = s.id === radarSite || s.radarId === radarSite;
        const pill = document.createElement('div');
        pill.className = `ww-radar-pill ${isActive ? 'active' : ''}`;
        pill.innerHTML = `<span class="ww-dot"></span><span>${s.radarId}</span>`;
        pill.onclick = (e) => {
          e.stopPropagation();
          onSelectSite?.(s.id);
        };

        new maplibregl.Marker({ element: pill })
          .setLngLat([s.lon, s.lat])
          .addTo(map);
      });
    });

    // Cursor gate telemetry math
    map.on('mousemove', (e) => {
      if (!onHoverTelemetry) return;
      const dLat = ((e.lngLat.lat - site.lat) * Math.PI) / 180;
      const dLon = ((e.lngLat.lng - site.lon) * Math.PI) / 180;
      const dKm = 6371 * 2 * Math.asin(Math.sqrt(Math.sin(dLat / 2) ** 2 + Math.cos(site.lat * Math.PI / 180) * Math.cos(e.lngLat.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2));
      const distNm = Math.round(dKm * 0.539957 * 10) / 10;
      let az = Math.round((Math.atan2(Math.sin(dLon) * Math.cos(e.lngLat.lat * Math.PI / 180), Math.cos(site.lat * Math.PI / 180) * Math.sin(e.lngLat.lat * Math.PI / 180) - Math.sin(site.lat * Math.PI / 180) * Math.cos(e.lngLat.lat * Math.PI / 180) * Math.cos(dLon)) * 180 / Math.PI + 360) % 360);
      const altFt = Math.round((Math.sqrt(dKm ** 2 + 8494.67 ** 2 + 2 * dKm * 8494.67 * Math.sin(parseFloat(tilt) * Math.PI / 180)) - 8494.67) * 3280.84);
      
      onHoverTelemetry({
        az,
        distNm,
        altFt,
        val: Math.max(5, Math.min(75, Math.round(72 - distNm * 0.4))),
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    if (mapRef.current && mapReady) {
      updateRadar(mapRef.current);
    }
  }, [product, tilt, radarOpacity, mapReady, updateRadar]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    map.flyTo({ center: [site.lon, site.lat], zoom: 7.5, duration: 900 });
  }, [site.lon, site.lat, mapReady]);

  return (
    <div style={{ position: 'absolute', inset: 0, width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
    </div>
  );
}
