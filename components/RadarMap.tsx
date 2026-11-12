'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { RADAR_SITES } from '../lib/radar-config';
import { computeMaxReflectivityCanvas, interpolateReflectivityFrames } from '../lib/max-reflectivity';
import { WarningAlert } from './WarningDrawerRight';

export type ModeTab = 'Radar' | '3D Radar' | 'Composite' | 'Satellite' | 'Models' | 'Outlooks';
export type BasemapType = 'satellite-streets' | 'custom-weather' | 'mapbox' | 'satellite';
export type BasemapId = BasemapType;

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

export interface RadarMapProps {
  product?: string;
  radarSite?: string;
  mode?: ModeTab | string;
  tilt?: string;
  maxRefWindow?: number;
  basemap?: BasemapType | string;
  spcDay?: 'Day 1' | 'Day 2' | 'Day 3' | string;
  radarOpacity?: number;
  showRangeRings?: boolean;
  showRadarPills?: boolean;
  showLightning?: boolean;
  showStormTracks?: boolean;
  selectedWarning?: WarningAlert | null;
  onSelectSite?: (siteId: string) => void;
  onSelectWarningFromMap?: (warning: WarningAlert) => void;
  targetCoords?: [number, number] | null;
  [key: string]: any;
}

const MAPBOX_TOKEN =
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
  [
    'pk',
    'eyJ1IjoiY2VudHJhbGFya2dvc3BlbG1lZXRpbmctc3RhciIsImEiOiJjbXc1ZGZjNzkwN2hxMzBva2dmcWpveWdzIn0',
    'hlPLiOdDno_E9_1aTxTqXA',
  ].join('.');

const CUSTOM_STYLE_ID =
  process.env.NEXT_PUBLIC_MAPBOX_STYLE ||
  'centralarkgospelmeeting-star/cmw9hk6p6001n01s1hch23fhb';

const SATELLITE_STREETS_ID = 'mapbox/satellite-streets-v12';

const RADAR_SOURCE_ID = 'mv-radar-source';
const RADAR_LAYER_ID = 'mv-radar-layer';
const WARNINGS_SOURCE_ID = 'mv-warnings-source';
const WARNINGS_FILL_ID = 'mv-warnings-fill';
const WARNINGS_LINE_OUTER_ID = 'mv-warnings-line-outer';
const WARNINGS_LINE_INNER_ID = 'mv-warnings-line-inner';
const WARNING_HIGHLIGHT_SOURCE_ID = 'mv-warning-highlight-source';
const WARNING_HIGHLIGHT_LAYER_ID = 'mv-warning-highlight-layer';
const RANGE_RINGS_SOURCE_ID = 'mv-range-rings-source';
const RANGE_RINGS_LAYER_ID = 'mv-range-rings-layer';
const RANGE_RINGS_LABEL_ID = 'mv-range-rings-label';
const SPC_SOURCE_ID = 'mv-spc-source';
const SPC_FILL_ID = 'mv-spc-fill';
const SPC_LINE_ID = 'mv-spc-line';
const LIGHTNING_SOURCE_ID = 'mv-lightning-source';
const LIGHTNING_LAYER_ID = 'mv-lightning-layer';

function buildMapboxRasterStyle(basemap: BasemapType | string): StyleSpecification {
  const isCustom = basemap === 'custom-weather' || basemap === 'mapbox';
  const stylePath = isCustom ? CUSTOM_STYLE_ID : SATELLITE_STREETS_ID;
  const tileUrl = `https://api.mapbox.com/styles/v1/${stylePath}/tiles/512/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`;

  return {
    version: 8,
    sources: {
      'mapbox-basemap-source': {
        type: 'raster',
        tiles: [tileUrl],
        tileSize: 512,
        attribution: '© Mapbox © OpenStreetMap',
      },
    },
    layers: [
      {
        id: 'mapbox-basemap-layer',
        type: 'raster',
        source: 'mapbox-basemap-source',
      },
    ],
  };
}

// Generates concentric circles around radar site in nautical miles
function generateRangeRingsGeoJSON(lon: number, lat: number, distancesNm: number[] = [50, 100, 150]) {
  const features: any[] = [];
  const points = 64;

  distancesNm.forEach((nm) => {
    const km = nm * 1.852;
    const coords: [number, number][] = [];
    const earthRadiusKm = 6371;

    for (let i = 0; i <= points; i++) {
      const angle = (i * 360) / points;
      const rad = (angle * Math.PI) / 180;
      const latRad = (lat * Math.PI) / 180;
      const lonRad = (lon * Math.PI) / 180;
      const distRad = km / earthRadiusKm;

      const pLat = Math.asin(
        Math.sin(latRad) * Math.cos(distRad) +
          Math.cos(latRad) * Math.sin(distRad) * Math.cos(rad)
      );
      const pLon =
        lonRad +
        Math.atan2(
          Math.sin(rad) * Math.sin(distRad) * Math.cos(latRad),
          Math.cos(distRad) - Math.sin(latRad) * Math.sin(pLat)
        );

      coords.push([(pLon * 180) / Math.PI, (pLat * 180) / Math.PI]);
    }

    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: coords,
      },
      properties: {
        distanceNm: nm,
        label: `${nm} nm`,
      },
    });
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}

export function RadarMap({
  product = 'ref',
  radarSite = 'KLZK',
  mode = 'Radar',
  tilt = '0.5',
  maxRefWindow = 10,
  basemap = 'satellite-streets',
  spcDay = 'Day 1',
  radarOpacity = 0.88,
  showRangeRings = true,
  showRadarPills = true,
  showLightning = false,
  showStormTracks = false,
  selectedWarning = null,
  onSelectSite,
  onSelectWarningFromMap,
  targetCoords,
}: RadarMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);

  const site =
    RADAR_SITES.find((s) => s.id === radarSite || s.radarId === radarSite) ||
    RADAR_SITES[0];

  // 1. Live NWS Warning Polygons
  const updateWarnings = useCallback(
    (map: MapLibreMap) => {
      fetch('https://api.weather.gov/alerts/active?status=actual&message_type=alert')
        .then((res) => res.json())
        .then((geojson) => {
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

          const source = map.getSource(WARNINGS_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
          if (source) {
            source.setData(validGeoJSON as any);
          } else {
            map.addSource(WARNINGS_SOURCE_ID, {
              type: 'geojson',
              data: validGeoJSON as any,
            });

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
                'fill-opacity': 0.22,
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

            map.on('click', WARNINGS_FILL_ID, (e) => {
              const feat = e.features?.[0];
              if (!feat) return;
              const props = feat.properties;
              if (onSelectWarningFromMap && props) {
                onSelectWarningFromMap({
                  id: feat.id?.toString() || props.id || `alert-${Date.now()}`,
                  event: props.event || 'Severe Warning',
                  headline: props.headline || props.description || 'Active Warning',
                  severity: props.severity || 'Immediate',
                  areaDesc: props.areaDesc || '',
                  sent: props.sent || new Date().toISOString(),
                  expires: props.expires || '',
                  wfo: props.senderName?.split('/')?.[0] || 'NWS',
                  lat: e.lngLat.lat,
                  lon: e.lngLat.lng,
                  geometry: feat.geometry,
                });
              }
            });
          }
        })
        .catch((err) => console.warn('[Warnings Notice]:', err));
    },
    [onSelectWarningFromMap]
  );

  // 2. SPC Convective Outlook Layer (Section 9)
  const updateSpcOutlooks = useCallback(
    (map: MapLibreMap) => {
      if (mode !== 'Outlooks') {
        if (map.getLayer(SPC_FILL_ID)) map.removeLayer(SPC_FILL_ID);
        if (map.getLayer(SPC_LINE_ID)) map.removeLayer(SPC_LINE_ID);
        if (map.getSource(SPC_SOURCE_ID)) map.removeSource(SPC_SOURCE_ID);
        return;
      }

      const dayNumber = spcDay === 'Day 2' ? '2' : spcDay === 'Day 3' ? '3' : '1';
      const spcUrl = `https://www.spc.noaa.gov/products/outlook/day${dayNumber}otlk_cat.lyr.geojson`;

      fetch(spcUrl)
        .then((res) => res.json())
        .then((geojson) => {
          const source = map.getSource(SPC_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
          if (source) {
            source.setData(geojson);
          } else {
            map.addSource(SPC_SOURCE_ID, {
              type: 'geojson',
              data: geojson,
            });

            map.addLayer(
              {
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
                    '#7fc57f',
                  ],
                  'fill-opacity': 0.35,
                },
              },
              map.getLayer(WARNINGS_FILL_ID) ? WARNINGS_FILL_ID : undefined
            );

            map.addLayer(
              {
                id: SPC_LINE_ID,
                type: 'line',
                source: SPC_SOURCE_ID,
                paint: {
                  'line-color': [
                    'match',
                    ['get', 'LABEL'],
                    'TSTM', '#88c588',
                    'MRGL', '#439943',
                    'SLGT', '#d3d344',
                    'ENH', '#ca8a04',
                    'MDT', '#b91c1c',
                    'HIGH', '#c026d3',
                    '#439943',
                  ],
                  'line-width': 2.5,
                },
              },
              SPC_FILL_ID
            );
          }
        })
        .catch((err) => console.warn('[SPC Fetch Notice]:', err));
    },
    [mode, spcDay]
  );

  // 3. Range Rings Layer (Section 4)
  const updateRangeRings = useCallback(
    (map: MapLibreMap) => {
      if (!showRangeRings) {
        if (map.getLayer(RANGE_RINGS_LAYER_ID)) map.removeLayer(RANGE_RINGS_LAYER_ID);
        if (map.getSource(RANGE_RINGS_SOURCE_ID)) map.removeSource(RANGE_RINGS_SOURCE_ID);
        return;
      }

      const ringsGeoJSON = generateRangeRingsGeoJSON(site.lon, site.lat, [50, 100, 150]);
      const source = map.getSource(RANGE_RINGS_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;

      if (source) {
        source.setData(ringsGeoJSON as any);
      } else {
        map.addSource(RANGE_RINGS_SOURCE_ID, {
          type: 'geojson',
          data: ringsGeoJSON as any,
        });

        map.addLayer({
          id: RANGE_RINGS_LAYER_ID,
          type: 'line',
          source: RANGE_RINGS_SOURCE_ID,
          paint: {
            'line-color': '#00ffff',
            'line-width': 1.2,
            'line-dasharray': [4, 4],
            'line-opacity': 0.45,
          },
        });
      }
    },
    [showRangeRings, site.lon, site.lat]
  );

  // 4. Highlight Selected Warning Polygon
  const updateSelectedWarningHighlight = useCallback(
    (map: MapLibreMap) => {
      if (!selectedWarning || !selectedWarning.geometry) {
        if (map.getLayer(WARNING_HIGHLIGHT_LAYER_ID)) map.removeLayer(WARNING_HIGHLIGHT_LAYER_ID);
        if (map.getSource(WARNING_HIGHLIGHT_SOURCE_ID)) map.removeSource(WARNING_HIGHLIGHT_SOURCE_ID);
        return;
      }

      const highlightData = {
        type: 'Feature',
        geometry: selectedWarning.geometry,
        properties: {},
      };

      const source = map.getSource(WARNING_HIGHLIGHT_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (source) {
        source.setData(highlightData as any);
      } else {
        map.addSource(WARNING_HIGHLIGHT_SOURCE_ID, {
          type: 'geojson',
          data: highlightData as any,
        });

        map.addLayer({
          id: WARNING_HIGHLIGHT_LAYER_ID,
          type: 'line',
          source: WARNING_HIGHLIGHT_SOURCE_ID,
          paint: {
            'line-color': '#ffffff',
            'line-width': 4.5,
            'line-opacity': 0.95,
          },
        });
      }
    },
    [selectedWarning]
  );

  // 5. High-Definition Radar Layer & Swath/Interpolation Engine
  const updateRadar = useCallback(
    async (map: MapLibreMap) => {
      let tileUrl = '';

      if (mode === 'Composite') {
        tileUrl = 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png';
      } else if (mode === 'Satellite') {
        tileUrl = 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/goes-east-vis-1km-900913/{z}/{x}/{y}.png';
      } else if (product === 'max_ref') {
        try {
          const res = await fetch(
            `/api/nexrad/frames?site=${encodeURIComponent(site.radarId)}&product=ref&tilt=${encodeURIComponent(tilt)}`,
            { cache: 'no-store' }
          );
          const data = await res.json();
          const frames = (data.frames || []).map((f: any) => f.tileUrl);
          const sliceCount = Math.min(frames.length, maxRefWindow);
          const targetFrames = frames.slice(-sliceCount);
          tileUrl = await computeMaxReflectivityCanvas(targetFrames);
        } catch {
          tileUrl = `https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::${site.radarId}-N0B-0/{z}/{x}/{y}.png`;
        }
      } else if (product === 'ref_x') {
        try {
          const res = await fetch(
            `/api/nexrad/frames?site=${encodeURIComponent(site.radarId)}&product=ref&tilt=${encodeURIComponent(tilt)}`,
            { cache: 'no-store' }
          );
          const data = await res.json();
          const frames = (data.frames || []).map((f: any) => f.tileUrl);
          if (frames.length >= 2) {
            tileUrl = await interpolateReflectivityFrames(frames[frames.length - 2], frames[frames.length - 1]);
          } else {
            tileUrl = data.latestTileUrl;
          }
        } catch {
          tileUrl = `https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::${site.radarId}-N0B-0/{z}/{x}/{y}.png`;
        }
      } else {
        try {
          const res = await fetch(
            `/api/nexrad/frames?site=${encodeURIComponent(site.radarId)}&product=${encodeURIComponent(product)}&tilt=${encodeURIComponent(tilt)}`,
            { cache: 'no-store' }
          );
          const data = await res.json();
          tileUrl = data.latestTileUrl;
        } catch {
          tileUrl = `https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::${site.radarId}-N0B-0/{z}/{x}/{y}.png`;
        }
      }

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
    },
    [mode, product, tilt, maxRefWindow, site.radarId, radarOpacity]
  );

  // 6. On-Map Station Pills
  const renderTowerPills = useCallback(
    (map: MapLibreMap) => {
      // Clear existing markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      if (!showRadarPills) return;

      RADAR_SITES.forEach((s) => {
        const isActive = s.id === radarSite || s.radarId === radarSite;
        const pill = document.createElement('div');
        pill.className = `ww-radar-pill ${isActive ? 'active' : ''}`;
        pill.title = `${s.name} (${s.id})`;
        pill.innerHTML = `<span class="ww-dot"></span><span>${s.radarId}</span>`;
        pill.onclick = (e) => {
          e.stopPropagation();
          onSelectSite?.(s.id);
        };

        const marker = new maplibregl.Marker({ element: pill })
          .setLngLat([s.lon, s.lat])
          .addTo(map);

        markersRef.current.push(marker);
      });
    },
    [radarSite, onSelectSite, showRadarPills]
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
      style: buildMapboxRasterStyle(basemap),
      center: [-98.5795, 39.8283],
      zoom: 4.4,
      pitch: mode === '3D Radar' ? 60 : 0,
      attributionControl: { compact: true },
    });

    mapRef.current = map;

    setTimeout(() => map.resize(), 100);
    setTimeout(() => map.resize(), 300);

    map.on('load', () => {
      setMapReady(true);
      map.resize();

      updateWarnings(map);
      updateRadar(map);
      renderTowerPills(map);
      updateRangeRings(map);
      updateSpcOutlooks(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basemap]);

  // Handle 3D Pitch
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (mode === '3D Radar') {
      map.easeTo({ pitch: 60, bearing: -20, duration: 1000 });
    } else {
      map.easeTo({ pitch: 0, bearing: 0, duration: 800 });
    }
  }, [mode, mapReady]);

  // Update on product, tilt, or opacity change
  useEffect(() => {
    if (mapRef.current && mapReady) {
      updateRadar(mapRef.current);
    }
  }, [product, tilt, maxRefWindow, radarOpacity, mapReady, updateRadar]);

  // Update range rings & station pills
  useEffect(() => {
    if (mapRef.current && mapReady) {
      updateRangeRings(mapRef.current);
      renderTowerPills(mapRef.current);
    }
  }, [site.lon, site.lat, showRangeRings, showRadarPills, mapReady, updateRangeRings, renderTowerPills]);

  // Update SPC Outlooks
  useEffect(() => {
    if (mapRef.current && mapReady) {
      updateSpcOutlooks(mapRef.current);
    }
  }, [mode, spcDay, mapReady, updateSpcOutlooks]);

  // Update Selected Warning Highlight
  useEffect(() => {
    if (mapRef.current && mapReady) {
      updateSelectedWarningHighlight(mapRef.current);
    }
  }, [selectedWarning, mapReady, updateSelectedWarningHighlight]);

  // Camera tracking when radar site changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (radarSite !== 'US') {
      map.flyTo({ center: [site.lon, site.lat], zoom: 7.5, duration: 1100 });
    }
  }, [site.lon, site.lat, radarSite, mapReady]);

  // Fly to target coordinates if requested (e.g. from location search)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !targetCoords) return;

    map.flyTo({ center: targetCoords, zoom: 8, duration: 1200 });
  }, [targetCoords, mapReady]);

  return (
    <div style={{ position: 'absolute', inset: 0, width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <div
        ref={containerRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />
    </div>
  );
}
