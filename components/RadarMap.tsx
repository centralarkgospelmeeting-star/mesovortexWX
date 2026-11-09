'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { RADAR_SITES } from '../lib/radar-config';

export type MapType = 'street' | 'terrain' | 'satellite' | 'globe';
export type ModeTab = 'Radar' | 'Composite' | 'Satellite' | 'Outlooks';

type RadarMapProps = {
  product: string;
  radarSite?: string;
  mode?: ModeTab;
  tilt?: string;
  onSelectSite?: (siteId: string) => void;
};

const MAPTILER_KEY = '4JiuLmexmU5wIex7AETD';

const RADAR_SOURCE_ID = 'mesovortex-radar-source';
const RADAR_LAYER_ID = 'mesovortex-radar-layer';

const WARNINGS_SOURCE_ID = 'nws-live-warnings-source';
const WARNINGS_FILL_ID = 'nws-live-warnings-fill';
const WARNINGS_LINE_OUTER_ID = 'nws-live-warnings-line-outer';
const WARNINGS_LINE_INNER_ID = 'nws-live-warnings-line-inner';

const SPC_SOURCE_ID = 'spc-outlooks-source';
const SPC_FILL_ID = 'spc-outlooks-fill';
const SPC_LINE_ID = 'spc-outlooks-line';

// Dark basemap matching WeatherWise Pro
function makeBaseStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      baseTiles: {
        type: 'raster',
        tiles: [
          `https://api.maptiler.com/maps/hybrid-v4/{z}/{x}/{y}.jpg?key=${MAPTILER_KEY}`,
        ],
        tileSize: 512,
        attribution: '© MapTiler © OpenStreetMap',
      },
    },
    layers: [
      {
        id: 'base-tiles-layer',
        type: 'raster',
        source: 'baseTiles',
      },
    ],
  };
}

export function RadarMap({
  product = 'ref',
  radarSite = 'KLZK',
  mode = 'Radar',
  tilt = '0.5',
  onSelectSite,
}: RadarMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const site =
    RADAR_SITES.find((s) => s.id === radarSite || s.radarId === radarSite) ||
    RADAR_SITES[0];

  // 1. Install Live NWS Warning Polygons (WeatherWise Dual-Stroke Style)
  const installWarningsLayer = useCallback((map: MapLibreMap) => {
    fetch('https://api.weather.gov/alerts/active?status=actual&message_type=alert')
      .then((res) => res.json())
      .then((geojson) => {
        // Filter to actual polygon warnings
        const polygonFeatures = (geojson.features || []).filter((f: any) => {
          const event = f.properties?.event || '';
          return (
            f.geometry &&
            (event.includes('Warning') || event.includes('Tornado') || event.includes('Thunderstorm'))
          );
        });

        const validGeoJSON = {
          type: 'FeatureCollection',
          features: polygonFeatures,
        };

        if (map.getSource(WARNINGS_SOURCE_ID)) {
          (map.getSource(WARNINGS_SOURCE_ID) as maplibregl.GeoJSONSource).setData(validGeoJSON as any);
        } else {
          map.addSource(WARNINGS_SOURCE_ID, {
            type: 'geojson',
            data: validGeoJSON as any,
          });

          // Translucent fill
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

          // WeatherWise Dual-Stroke: Outer Thick Border
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
              'line-width': 4,
            },
          });

          // WeatherWise Dual-Stroke: Inner Vivid Core Line
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
              'line-width': 2,
            },
          });

          // Click polygon to view warning details
          map.on('click', WARNINGS_FILL_ID, (e) => {
            const props = e.features?.[0]?.properties;
            if (!props) return;

            const isTor = props.event === 'Tornado Warning';
            const badgeColor = isTor ? '#ef4444' : '#f59e0b';

            new maplibregl.Popup({ closeButton: true, offset: 12 })
              .setLngLat(e.lngLat)
              .setHTML(
                `<div style="font-family:system-ui;padding:6px;max-width:260px;color:#0f172a;">
                  <span style="background:${badgeColor};color:#fff;padding:2px 7px;border-radius:6px;font-size:10px;font-weight:900;text-transform:uppercase;">
                    ${props.event}
                  </span>
                  <div style="font-size:12px;font-weight:800;margin-top:6px;line-height:1.3;">
                    ${props.headline || props.description || 'Active Warning'}
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
      .catch((err) => console.warn('Warnings load error:', err));
  }, []);

  // 2. SPC Convective Outlooks
  const installSPCOutlooks = useCallback((map: MapLibreMap) => {
    fetch('https://www.spc.noaa.gov/products/outlook/day1otlk_cat.lyr.geojson')
      .then((res) => res.json())
      .then((data) => {
        if (!map.getSource(SPC_SOURCE_ID)) {
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
              'fill-opacity': mode === 'Outlooks' ? 0.45 : 0.2,
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
      .catch((err) => console.warn('SPC load error:', err));
  }, [mode]);

  // 3. Live High-Definition Radar Layer (Single-Site & Composite)
  const installRadarLayer = useCallback(
    (map: MapLibreMap) => {
      let tileUrl = '';

      if (mode === 'Composite') {
        tileUrl = 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png';
      } else if (mode === 'Satellite') {
        tileUrl = 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/goes-east-vis-1km-900913/{z}/{x}/{y}.png';
      } else {
        // High-Resolution Single-Site NEXRAD Tilt Mapping
        let productCode = 'N0B';
        if (product === 'vel') {
          productCode = tilt === '0.9' ? 'N1U' : tilt === '1.3' ? 'N2U' : 'N0U';
        } else if (product === 'cc') {
          // Live MRMS Precipitaiton / Dual-Pol Correlation Coefficient
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

      // Insert radar beneath warnings so warning borders always stay on top
      const beforeId = map.getLayer(WARNINGS_FILL_ID) ? WARNINGS_FILL_ID : undefined;

      map.addLayer(
        {
          id: RADAR_LAYER_ID,
          type: 'raster',
          source: RADAR_SOURCE_ID,
          paint: {
            'raster-opacity': mode === 'Satellite' ? 0.75 : 0.88,
            'raster-contrast': 0.25,
            'raster-saturation': 0.45,
            'raster-fade-duration': 0,
          },
        },
        beforeId
      );
    },
    [mode, product, tilt, site.radarId]
  );

  // 4. On-Map Radar Tower Pills
  const renderTowerPills = useCallback(
    (map: MapLibreMap) => {
      RADAR_SITES.forEach((s) => {
        const isActive = s.id === radarSite || s.radarId === radarSite;

        const pill = document.createElement('div');
        pill.className = `ww-radar-pill ${isActive ? 'active' : ''}`;
        pill.title = `${s.name} (${s.id})`;
        pill.innerHTML = `<span class="ww-dot"></span><span>${s.radarId}</span>`;

        pill.addEventListener('click', (e) => {
          e.stopPropagation();
          if (onSelectSite) onSelectSite(s.id);
        });

        new maplibregl.Marker({ element: pill })
          .setLngLat([s.lon, s.lat])
          .addTo(map);
      });
    },
    [radarSite, onSelectSite]
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
      style: makeBaseStyle(),
      center: [site.lon, site.lat],
      zoom: 7.5,
      attributionControl: { compact: true },
    });

    mapRef.current = map;

    map.on('load', () => {
      setMapReady(true);
      map.resize();

      installSPCOutlooks(map);
      installWarningsLayer(map);
      installRadarLayer(map);
      renderTowerPills(map);
    });

    // Auto-refresh warnings every 60 seconds
    const interval = setInterval(() => {
      if (mapRef.current) installWarningsLayer(mapRef.current);
    }, 60000);

    return () => {
      clearInterval(interval);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update Radar Layer on Product / Tilt / Mode Change
  useEffect(() => {
    if (mapRef.current && mapReady) {
      installRadarLayer(mapRef.current);
    }
  }, [product, tilt, mode, mapReady, installRadarLayer]);

  // Fly to site on selection
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
      <div
        ref={containerRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />
    </div>
  );
}
