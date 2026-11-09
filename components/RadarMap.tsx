'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { RADAR_SITES } from '../lib/radar-config';
import { WorkstationMode, PaletteType } from '../lib/adapters/types';

export type ModeTab = 'Radar' | 'Composite' | 'Satellite' | 'Outlooks';

export interface RadarMapProps {
  product?: string;
  radarSite?: string;
  mode?: ModeTab | WorkstationMode;
  tilt?: string;
  palette?: PaletteType;
  radarOpacity?: number;
  spcDay?: 'Day 1' | 'Day 2' | 'Day 3';
  showWarnings?: boolean;
  showWatches?: boolean;
  showLightning?: boolean;
  showLSR?: boolean;
  showRadarPills?: boolean;
  onSelectSite?: (siteId: string) => void;
  onHoverTelemetry?: (data: { az: number; distNm: number; altFt: number; val: number }) => void;
}

const RADAR_SOURCE_ID = 'mv-radar-source';
const RADAR_LAYER_ID = 'mv-radar-layer';
const WARNINGS_SOURCE_ID = 'mv-warnings-source';
const WARNINGS_FILL_ID = 'mv-warnings-fill';
const WARNINGS_LINE_OUTER_ID = 'mv-warnings-line-outer';
const WARNINGS_LINE_INNER_ID = 'mv-warnings-line-inner';
const SPC_SOURCE_ID = 'mv-spc-source';
const SPC_FILL_ID = 'mv-spc-fill';
const SPC_LINE_ID = 'mv-spc-line';

function resolveWorkstationStyle(mode: ModeTab | WorkstationMode): string | StyleSpecification {
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
  product = 'ref',
  radarSite = 'KLZK',
  mode = 'Radar',
  tilt = '0.5',
  palette = 'radarscope',
  radarOpacity = 0.88,
  spcDay = 'Day 1',
  showWarnings = true,
  showWatches = true,
  showLightning = true,
  showLSR = true,
  showRadarPills = true,
  onSelectSite,
  onHoverTelemetry,
}: RadarMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const site = RADAR_SITES.find((s) => s.id === radarSite || s.radarId === radarSite) || RADAR_SITES[0];

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
      .catch((err) => console.warn('[Warnings Notice]:', err));
  }, []);

  const updateSpcOutlooks = useCallback(
    (map: MapLibreMap) => {
      const dayNum = spcDay.replace('Day ', '');
      fetch(`/api/spc/outlooks?day=${dayNum}`)
        .then((res) => res.json())
        .then((data) => {
          const source = map.getSource(SPC_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
          if (source) {
            source.setData(data);
          } else {
            map.addSource(SPC_SOURCE_ID, { type: 'geojson', data });

            map.addLayer({
              id: SPC_FILL_ID,
              type: 'fill',
              source: SPC_SOURCE_ID,
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
                'fill-opacity': mode === 'Outlooks' ? 0.45 : 0.18,
              },
            });

            map.addLayer({
              id: SPC_LINE_ID,
              type: 'line',
              source: SPC_SOURCE_ID,
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
                'line-width': mode === 'Outlooks' ? 2.5 : 1.5,
              },
            });
          }
        })
        .catch((err) => console.warn('[SPC Notice]:', err));
    },
    [mode, spcDay]
  );

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
      updateSpcOutlooks(map);
      updateRadar(map);

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

    map.on('mousemove', (e) => {
      if (!onHoverTelemetry) return;
      const dLat = ((e.lngLat.lat - site.lat) * Math.PI) / 180;
      const dLon = ((e.lngLat.lng - site.lon) * Math.PI) / 180;
      const dKm = 6371 * 2 * Math.asin(Math.sqrt(Math.sin(dLat / 2) ** 2 + Math.cos(site.lat * Math.PI / 180) * Math.cos(e.lngLat.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2));
      const distNm = Math.round(dKm * 0.539957 * 10) / 10;
      const az = Math.round((Math.atan2(Math.sin(dLon) * Math.cos(e.lngLat.lat * Math.PI / 180), Math.cos(site.lat * Math.PI / 180) * Math.sin(e.lngLat.lat * Math.PI / 180) - Math.sin(site.lat * Math.PI / 180) * Math.cos(e.lngLat.lat * Math.PI / 180) * Math.cos(dLon)) * 180 / Math.PI + 360) % 360);
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
      updateSpcOutlooks(mapRef.current);
    }
  }, [product, tilt, spcDay, radarOpacity, mapReady, updateRadar, updateSpcOutlooks]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (mode === 'Composite' || mode === 'Outlooks') {
      map.flyTo({ center: [-98.5, 39.5], zoom: 4.5, duration: 1200 });
    } else {
      map.flyTo({ center: [site.lon, site.lat], zoom: 7.5, duration: 900 });
    }
  }, [site.lon, site.lat, mode, mapReady]);

  return (
    <div style={{ position: 'absolute', inset: 0, width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
    </div>
  );
}
