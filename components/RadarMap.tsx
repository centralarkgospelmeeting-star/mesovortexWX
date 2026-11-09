'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { RADAR_SITES } from '../lib/radar-config';

export type ModeTab = 'Radar' | 'Composite' | 'Satellite' | 'Outlooks';

interface RadarMapProps {
  product?: string;
  radarSite?: string;
  mode?: ModeTab;
  tilt?: string;
  spcDay?: 'Day 1' | 'Day 2' | 'Day 3';
  onSelectSite?: (siteId: string) => void;
}

const RADAR_SOURCE_ID = 'mesovortex-radar-source';
const RADAR_LAYER_ID = 'mesovortex-radar-layer';
const WARNINGS_SOURCE_ID = 'nws-warnings-source';
const WARNINGS_FILL_ID = 'nws-warnings-fill';
const WARNINGS_LINE_OUTER_ID = 'nws-warnings-line-outer';
const WARNINGS_LINE_INNER_ID = 'nws-warnings-line-inner';
const SPC_SOURCE_ID = 'spc-outlooks-source';
const SPC_FILL_ID = 'spc-outlooks-fill';
const SPC_LINE_ID = 'spc-outlooks-line';

/**
 * 100% Free Public Basemap Style (CartoDB Dark / NASA GIBS Satellite)
 * Zero API keys required.
 */
function createPublicBasemapStyle(mode: ModeTab): StyleSpecification {
  const isSatellite = mode === 'Satellite';

  // Free, high-speed public raster tile services
  const tileUrl = isSatellite
    ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    : 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';

  return {
    version: 8,
    sources: {
      publicBase: {
        type: 'raster',
        tiles: [tileUrl],
        tileSize: 256,
        attribution: isSatellite
          ? '© Esri, NASA, USGS'
          : '© CARTO, © OpenStreetMap contributors',
      },
    },
    layers: [
      {
        id: 'public-base-layer',
        type: 'raster',
        source: 'publicBase',
      },
    ],
  };
}

export function RadarMap({
  product = 'ref',
  radarSite = 'KLZK',
  mode = 'Radar',
  tilt = '0.5',
  spcDay = 'Day 1',
  onSelectSite,
}: RadarMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const site =
    RADAR_SITES.find((s) => s.id === radarSite || s.radarId === radarSite) ||
    RADAR_SITES[0];

  // 1. Fetch & Install Live NWS Warning Polygons
  const updateWarningPolygons = useCallback((map: MapLibreMap) => {
    fetch('/api/warnings')
      .then((res) => res.json())
      .then((geojson) => {
        const source = map.getSource(WARNINGS_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;

        if (source) {
          source.setData(geojson);
        } else {
          map.addSource(WARNINGS_SOURCE_ID, { type: 'geojson', data: geojson });

          // Semi-transparent fill
          map.addLayer({
            id: WARNINGS_FILL_ID,
            type: 'fill',
            source: WARNINGS_SOURCE_ID,
            paint: {
              'fill-color': [
                'match',
                ['get', 'event'],
                'Tornado Warning', '#ef4444',
                'Severe Thunderstorm Warning', '#f59e0b',
                'Flash Flood Warning', '#10b981',
                '#3b82f6',
              ],
              'fill-opacity': 0.18,
            },
          });

          // Outer high-contrast stroke
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

          // Inner vibrant core
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

          // Interactive click inspection on any warning
          map.on('click', WARNINGS_FILL_ID, (e) => {
            const props = e.features?.[0]?.properties;
            if (!props) return;

            const isTor = props.event === 'Tornado Warning';
            new maplibregl.Popup({ closeButton: true, offset: 12 })
              .setLngLat(e.lngLat)
              .setHTML(
                `<div style="font-family:system-ui;padding:6px;max-width:260px;color:#0f172a;">
                  <span style="background:${isTor ? '#dc2626' : '#d97706'};color:#fff;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:bold;text-transform:uppercase;">
                    ${props.event}
                  </span>
                  <div style="font-size:12px;font-weight:bold;margin-top:6px;line-height:1.3;">
                    ${props.headline || props.event}
                  </div>
                  <div style="font-size:10px;color:#64748b;margin-top:4px;">
                    ${props.areaDesc || ''}
                  </div>
                </div>`
              )
              .addTo(map);
          });
        }
      })
      .catch((err) => console.warn('[Warnings Load Warning]:', err));
  }, []);

  // 2. Fetch & Install NOAA SPC Outlooks
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
                'fill-opacity': mode === 'Outlooks' ? 0.4 : 0.15,
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
        .catch((err) => console.warn('[SPC Load Warning]:', err));
    },
    [mode, spcDay]
  );

  // 3. Update Free Live Radar Layer
  const updateRadarLayer = useCallback(
    (map: MapLibreMap) => {
      let tileUrl = '';

      if (mode === 'Composite') {
        tileUrl = 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png';
      } else if (mode === 'Satellite') {
        tileUrl = 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/goes-east-vis-1km-900913/{z}/{x}/{y}.png';
      } else {
        // Single-site Level III product mapping
        let productCode = 'N0B';
        if (product === 'vel') {
          productCode = tilt === '0.9' ? 'N1U' : tilt === '1.3' ? 'N2U' : 'N0U';
        } else if (product === 'cc') {
          productCode = 'N0C';
        } else if (product === 'zdr') {
          productCode = 'N0X';
        } else {
          productCode = tilt === '0.9' ? 'N1B' : tilt === '1.3' ? 'N2B' : 'N0B';
        }

        tileUrl = `https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::${site.radarId}-${productCode}-0/{z}/{x}/{y}.png`;
      }

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
            'raster-opacity': mode === 'Satellite' ? 0.75 : 0.88,
            'raster-fade-duration': 0,
          },
        },
        beforeId
      );
    },
    [mode, product, tilt, site.radarId]
  );

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: createPublicBasemapStyle(mode),
      center: [site.lon, site.lat],
      zoom: 7.5,
      attributionControl: { compact: true },
    });

    mapRef.current = map;

    map.on('load', () => {
      setMapReady(true);
      map.resize();

      updateSpcOutlooks(map);
      updateWarningPolygons(map);
      updateRadarLayer(map);

      // Render on-map station badges
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

    // Fast warning polygon polling (30s)
    const timer = setInterval(() => {
      if (mapRef.current) updateWarningPolygons(mapRef.current);
    }, 30000);

    return () => {
      clearInterval(timer);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Update on product / tilt / site / SPC changes
  useEffect(() => {
    if (mapRef.current && mapReady) {
      updateRadarLayer(mapRef.current);
      updateSpcOutlooks(mapRef.current);
    }
  }, [product, tilt, spcDay, mapReady, updateRadarLayer, updateSpcOutlooks]);

  // Fly camera on site or national mode change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (mode === 'Composite' || mode === 'Outlooks') {
      map.flyTo({ center: [-98.5, 39.5], zoom: 4.5, duration: 1200 });
    } else {
      map.flyTo({ center: [site.lon, site.lat], zoom: 7.5, duration: 1100 });
    }
  }, [site.lon, site.lat, mode, mapReady]);

  return (
    <div style={{ position: 'absolute', inset: 0, width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
    </div>
  );
}
