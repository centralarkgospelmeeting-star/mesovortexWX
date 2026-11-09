'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { RADAR_SITES } from '../lib/radar-config';
import { ParsedPalCurve } from './PalColorTableModal';
import { ActivePlacefile } from './PlacefileManagerModal';
import { calculatePolarCoordinates, calculateBeamHeight, classifyStormGate, RadarSampling } from '../lib/radar-physics';
import { generateThermodynamicSounding, SoundingProfile } from '../lib/skewt-engine';
import { generateStormCellTracks, StormCellTrack } from '../lib/scit-engine';

export type MapType = 'street' | 'terrain' | 'satellite' | 'globe';
export type PaletteType = 'nws' | 'radarscope' | 'cod' | 'smooth' | 'couplet' | 'palFile';
export type ModeTab = 'Radar' | 'Composite' | 'Satellite' | 'Models' | 'Outlooks';

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

type RadarMapProps = {
  product: string;
  radarSite?: string;
  mode?: ModeTab;
  tilt?: string;
  mapType?: MapType;
  palette?: PaletteType;
  palCurve?: ParsedPalCurve | null;
  activePlacefiles?: ActivePlacefile[];
  frameUrl?: string | null;
  frameLabel?: string;
  fastScan?: boolean;
  measureMode?: boolean;
  crossSectionMode?: boolean;
  showStormTracks?: boolean;
  showLightning?: boolean;
  showMetars?: boolean;
  showLSR?: boolean;
  showWatches?: boolean;
  showRadarPills?: boolean;
  spotterReports?: SpotterPin[];
  onSelectSite?: (siteId: string) => void;
  onOpenSounding?: (profile: SoundingProfile) => void;
  onMeasureComplete?: (distNm: number, distMi: number) => void;
  onCrossSectionCut?: (pointA: [number, number], pointB: [number, number]) => void;
  onMapClickCoordinates?: (coords: [number, number]) => void;
};

const MAPTILER_KEY = '4JiuLmexmU5wIex7AETD';

const RADAR_SOURCE_ID = 'mesovortex-nexrad';
const RADAR_LAYER_ID = 'mesovortex-nexrad-layer';

const COMPOSITE_SOURCE_ID = 'mesovortex-composite';
const COMPOSITE_LAYER_ID = 'mesovortex-composite-layer';

const SATELLITE_FEED_SOURCE_ID = 'goes-east-satellite';
const SATELLITE_FEED_LAYER_ID = 'goes-east-satellite-layer';

const MODEL_HRRR_SOURCE_ID = 'hrrr-model';
const MODEL_HRRR_LAYER_ID = 'hrrr-model-layer';

const LIGHTNING_SOURCE_ID = 'goes-glm-lightning';
const LIGHTNING_LAYER_ID = 'goes-glm-lightning-layer';

const METAR_SOURCE_ID = 'metar-stations';
const METAR_CIRCLE_LAYER_ID = 'metar-stations-circle';
const METAR_LABEL_LAYER_ID = 'metar-stations-label';

const LSR_SOURCE_ID = 'nws-lsr-reports';
const LSR_CIRCLE_LAYER_ID = 'nws-lsr-circle';
const LSR_LABEL_LAYER_ID = 'nws-lsr-label';

const WATCHES_SOURCE_ID = 'nws-watches';
const WATCHES_FILL_LAYER_ID = 'nws-watches-fill';
const WATCHES_LINE_LAYER_ID = 'nws-watches-line';

const NWS_WARNINGS_SOURCE_ID = 'nws-warnings';
const NWS_WARNINGS_FILL_ID = 'nws-warnings-fill';
const NWS_WARNINGS_LINE_ID = 'nws-warnings-line';

const SPC_OUTLOOK_SOURCE_ID = 'spc-outlooks';
const SPC_OUTLOOK_FILL_ID = 'spc-outlooks-fill';
const SPC_OUTLOOK_LINE_ID = 'spc-outlooks-line';

const SCIT_SOURCE_ID = 'scit-storm-tracks-source';
const SCIT_LINE_LAYER_ID = 'scit-storm-tracks-line';
const SCIT_POINTS_LAYER_ID = 'scit-storm-tracks-points';
const SCIT_LABEL_LAYER_ID = 'scit-storm-tracks-label';

const SPOTTER_SOURCE_ID = 'spotter-pins';
const SPOTTER_LAYER_ID = 'spotter-pins-circle';

function makeSatelliteStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      satelliteBase: {
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
        id: 'satellite-base-layer',
        type: 'raster',
        source: 'satelliteBase',
      },
    ],
  };
}

export function RadarMap({
  product,
  radarSite = 'KLZK',
  mode = 'Radar',
  tilt = '0.5',
  palette = 'nws',
  palCurve = null,
  activePlacefiles = [],
  frameUrl = null,
  frameLabel,
  fastScan = true,
  measureMode = false,
  crossSectionMode = false,
  showStormTracks = true,
  showLightning = true,
  showMetars = false,
  showLSR = true,
  showWatches = true,
  showRadarPills = true,
  spotterReports = [],
  onSelectSite,
  onOpenSounding,
  onMeasureComplete,
  onCrossSectionCut,
  onMapClickCoordinates,
}: RadarMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const currentTileUrlRef = useRef<string | null>(null);
  const siteMarkersRef = useRef<maplibregl.Marker[]>([]);

  const [mapReady, setMapReady] = useState(false);
  const [localSpotters, setLocalSpotters] = useState<SpotterPin[]>([]);
  const [telemetry, setTelemetry] = useState<RadarSampling | null>(null);

  const measurePointsRef = useRef<[number, number][]>([]);
  const rhiPointsRef = useRef<[number, number][]>([]);

  const site =
    RADAR_SITES.find((s) => s.id === radarSite || s.radarId === radarSite) ||
    RADAR_SITES[0];

  const allSpotters = [...spotterReports, ...localSpotters];

  const safeAddLayer = (map: MapLibreMap, layer: any, beforeId?: string) => {
    try {
      if (!map.getLayer(layer.id)) {
        const validBefore = beforeId && map.getLayer(beforeId) ? beforeId : undefined;
        map.addLayer(layer, validBefore);
      }
    } catch (e) {
      console.warn(`Layer notice (${layer.id}):`, e);
    }
  };

  // 1. SPC Convective Outlooks
  const installSPCOutlooks = useCallback((map: MapLibreMap) => {
    fetch('/api/spc/outlooks')
      .then((res) => res.json())
      .then((data) => {
        if (!map.getSource(SPC_OUTLOOK_SOURCE_ID)) {
          map.addSource(SPC_OUTLOOK_SOURCE_ID, { type: 'geojson', data });

          safeAddLayer(map, {
            id: SPC_OUTLOOK_FILL_ID,
            type: 'fill',
            source: SPC_OUTLOOK_SOURCE_ID,
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
              'fill-opacity': mode === 'Outlooks' ? 0.45 : 0.22,
            },
          });

          safeAddLayer(map, {
            id: SPC_OUTLOOK_LINE_ID,
            type: 'line',
            source: SPC_OUTLOOK_SOURCE_ID,
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
                'rgba(255,255,255,0.6)',
              ],
              'line-width': mode === 'Outlooks' ? 2.5 : 1.5,
              'line-dasharray': [3, 2],
            },
          });
        }
      })
      .catch((err) => console.warn('SPC notice:', err));
  }, [mode]);

  // 2. CONUS Composite
  const installCompositeLayer = useCallback((map: MapLibreMap) => {
    if (!map.getSource(COMPOSITE_SOURCE_ID)) {
      map.addSource(COMPOSITE_SOURCE_ID, {
        type: 'raster',
        tiles: ['https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: 'IEM CONUS Mosaic',
      });

      safeAddLayer(map, {
        id: COMPOSITE_LAYER_ID,
        type: 'raster',
        source: COMPOSITE_SOURCE_ID,
        paint: { 'raster-opacity': 0.88 },
        layout: { visibility: mode === 'Composite' ? 'visible' : 'none' },
      });
    }
  }, [mode]);

  // 3. GOES Satellite Imagery
  const installSatelliteFeedLayer = useCallback((map: MapLibreMap) => {
    if (!map.getSource(SATELLITE_FEED_SOURCE_ID)) {
      map.addSource(SATELLITE_FEED_SOURCE_ID, {
        type: 'raster',
        tiles: ['https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/goes-east-vis-1km-900913/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: 'NOAA GOES Satellite',
      });

      safeAddLayer(map, {
        id: SATELLITE_FEED_LAYER_ID,
        type: 'raster',
        source: SATELLITE_FEED_SOURCE_ID,
        paint: { 'raster-opacity': 0.75 },
        layout: { visibility: mode === 'Satellite' ? 'visible' : 'none' },
      });
    }
  }, [mode]);

  // 4. HRRR Numerical Model
  const installModelLayer = useCallback((map: MapLibreMap) => {
    if (!map.getSource(MODEL_HRRR_SOURCE_ID)) {
      map.addSource(MODEL_HRRR_SOURCE_ID, {
        type: 'raster',
        tiles: ['https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/mrms::ReflectivityAtLowestAltitude/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: 'NOAA HRRR Model',
      });

      safeAddLayer(map, {
        id: MODEL_HRRR_LAYER_ID,
        type: 'raster',
        source: MODEL_HRRR_SOURCE_ID,
        paint: { 'raster-opacity': 0.85 },
        layout: { visibility: mode === 'Models' ? 'visible' : 'none' },
      });
    }
  }, [mode]);

  // 5. Watch Boxes
  const installWatchesLayer = useCallback((map: MapLibreMap) => {
    fetch('/api/watches')
      .then((res) => res.json())
      .then((data) => {
        if (!map.getSource(WATCHES_SOURCE_ID)) {
          map.addSource(WATCHES_SOURCE_ID, { type: 'geojson', data: data as any });

          safeAddLayer(map, {
            id: WATCHES_FILL_LAYER_ID,
            type: 'fill',
            source: WATCHES_SOURCE_ID,
            paint: {
              'fill-color': [
                'match',
                ['get', 'event'],
                'Tornado Watch', '#dc2626',
                'Severe Thunderstorm Watch', '#eab308',
                '#3b82f6',
              ],
              'fill-opacity': 0.12,
            },
            layout: { visibility: showWatches ? 'visible' : 'none' },
          });

          safeAddLayer(map, {
            id: WATCHES_LINE_LAYER_ID,
            type: 'line',
            source: WATCHES_SOURCE_ID,
            paint: {
              'line-color': [
                'match',
                ['get', 'event'],
                'Tornado Watch', '#ef4444',
                'Severe Thunderstorm Watch', '#facc15',
                '#60a5fa',
              ],
              'line-width': 2.5,
              'line-dasharray': [4, 3],
            },
            layout: { visibility: showWatches ? 'visible' : 'none' },
          });
        }
      })
      .catch((err) => console.warn('Watches notice:', err));
  }, [showWatches]);

  // 6. Local Storm Reports (LSR)
  const installLSRLayer = useCallback((map: MapLibreMap) => {
    fetch('/api/lsr')
      .then((res) => res.json())
      .then((data) => {
        const features = (data.features || []).map((f: any) => {
          const type = (f.properties?.type || '').toUpperCase();
          let badge = 'Storm Report';
          if (type.includes('TORNADO')) badge = '🌪️ Tornado';
          else if (type.includes('HAIL')) badge = '🧊 Hail';
          else if (type.includes('WIND') || type.includes('WND')) badge = '💨 Wind';
          else if (type.includes('FLOOD')) badge = '🌊 Flood';

          return {
            ...f,
            properties: {
              ...f.properties,
              badge,
              magnitudeLabel: f.properties?.magnitude ? `${f.properties.magnitude}` : '',
            },
          };
        });

        if (!map.getSource(LSR_SOURCE_ID)) {
          map.addSource(LSR_SOURCE_ID, {
            type: 'geojson',
            data: { type: 'FeatureCollection', features } as any,
          });

          safeAddLayer(map, {
            id: LSR_CIRCLE_LAYER_ID,
            type: 'circle',
            source: LSR_SOURCE_ID,
            paint: {
              'circle-radius': 6.5,
              'circle-color': [
                'match',
                ['get', 'badge'],
                '🌪️ Tornado', '#dc2626',
                '🧊 Hail', '#0284c7',
                '💨 Wind', '#eab308',
                '🌊 Flood', '#10b981',
                '#64748b',
              ],
              'circle-stroke-width': 1.5,
              'circle-stroke-color': '#ffffff',
            },
            layout: { visibility: showLSR ? 'visible' : 'none' },
          });

          safeAddLayer(map, {
            id: LSR_LABEL_LAYER_ID,
            type: 'symbol',
            source: LSR_SOURCE_ID,
            layout: {
              'text-field': ['get', 'magnitudeLabel'],
              'text-size': 10,
              'text-offset': [0, 1.3],
              'text-anchor': 'top',
              visibility: showLSR ? 'visible' : 'none',
            },
            paint: {
              'text-color': '#f8fafc',
              'text-halo-color': '#0f172a',
              'text-halo-width': 1.5,
            },
          });
        }
      })
      .catch((err) => console.warn('LSR notice:', err));
  }, [showLSR]);

  // 7. Warnings Polygons
  const installOrUpdateNWSWarnings = useCallback((map: MapLibreMap) => {
    fetch('/api/warnings')
      .then((res) => res.json())
      .then((data) => {
        const source = map.getSource(NWS_WARNINGS_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;

        if (source) {
          source.setData(data);
        } else {
          map.addSource(NWS_WARNINGS_SOURCE_ID, { type: 'geojson', data });

          safeAddLayer(map, {
            id: NWS_WARNINGS_FILL_ID,
            type: 'fill',
            source: NWS_WARNINGS_SOURCE_ID,
            paint: {
              'fill-color': [
                'match',
                ['get', 'event'],
                'Tornado Warning', '#dc2626',
                'Severe Thunderstorm Warning', '#f59e0b',
                'Flash Flood Warning', '#10b981',
                'Special Marine Warning', '#06b6d4',
                '#3b82f6',
              ],
              'fill-opacity': 0.35,
            },
          });

          safeAddLayer(map, {
            id: NWS_WARNINGS_LINE_ID,
            type: 'line',
            source: NWS_WARNINGS_SOURCE_ID,
            paint: {
              'line-color': [
                'match',
                ['get', 'event'],
                'Tornado Warning', '#ef4444',
                'Severe Thunderstorm Warning', '#fbbf24',
                'Flash Flood Warning', '#34d399',
                'Special Marine Warning', '#22d3ee',
                '#60a5fa',
              ],
              'line-width': 2.8,
            },
          });
        }
      })
      .catch((err) => console.warn('Warnings notice:', err));
  }, []);

  // 8. SCIT Storm Cell Identification & Tracking Vectors
  const installSCITTracksLayer = useCallback((map: MapLibreMap, radarLat: number, radarLon: number) => {
    const tracks = generateStormCellTracks(radarLat, radarLon);
    const lineFeatures: any[] = [];
    const pointFeatures: any[] = [];

    tracks.forEach((track) => {
      const lineCoords: [number, number][] = [[track.lon, track.lat]];
      track.projections.forEach((p) => lineCoords.push([p.lon, p.lat]));

      lineFeatures.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: lineCoords },
        properties: { id: track.id, maxDbz: track.maxDbz, mesh: track.meshInches },
      });

      // Cell initial core point
      pointFeatures.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [track.lon, track.lat] },
        properties: {
          id: track.id,
          label: `${track.id} (${track.maxDbz} dBZ)`,
          type: 'core',
          hoverText: `${track.id}\nMax Z: ${track.maxDbz} dBZ\nMotion: ${track.motionDeg}° @ ${track.speedKt} kt\nHail: ${track.meshInches}"`,
        },
      });

      // Forward 15m, 30m, 45m, 60m projection rings
      track.projections.forEach((p) => {
        pointFeatures.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
          properties: {
            id: `${track.id}-${p.minutesAhead}`,
            label: p.label,
            type: 'projection',
            hoverText: `${track.id} Projected Arrival (${p.label})\nETA: ${p.minutesAhead} mins downwind`,
          },
        });
      });
    });

    const geojson = {
      type: 'FeatureCollection',
      features: [...lineFeatures, ...pointFeatures],
    };

    if (map.getSource(SCIT_SOURCE_ID)) {
      (map.getSource(SCIT_SOURCE_ID) as maplibregl.GeoJSONSource).setData(geojson as any);
    } else {
      map.addSource(SCIT_SOURCE_ID, { type: 'geojson', data: geojson as any });

      // Track Arrow Line
      safeAddLayer(map, {
        id: SCIT_LINE_LAYER_ID,
        type: 'line',
        source: SCIT_SOURCE_ID,
        filter: ['==', '$type', 'LineString'],
        paint: {
          'line-color': '#f59e0b',
          'line-width': 2.5,
          'line-dasharray': [3, 2],
        },
        layout: { visibility: showStormTracks ? 'visible' : 'none' },
      });

      // Cell Core and Projection Ring Points
      safeAddLayer(map, {
        id: SCIT_POINTS_LAYER_ID,
        type: 'circle',
        source: SCIT_SOURCE_ID,
        filter: ['==', '$type', 'Point'],
        paint: {
          'circle-radius': ['case', ['==', ['get', 'type'], 'core'], 7, 4.5],
          'circle-color': ['case', ['==', ['get', 'type'], 'core'], '#ef4444', '#f59e0b'],
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff',
        },
        layout: { visibility: showStormTracks ? 'visible' : 'none' },
      });

      // Projection Labels (+15m, +30m, etc.)
      safeAddLayer(map, {
        id: SCIT_LABEL_LAYER_ID,
        type: 'symbol',
        source: SCIT_SOURCE_ID,
        filter: ['==', '$type', 'Point'],
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 10,
          'text-offset': [0, 1.2],
          'text-anchor': 'top',
          visibility: showStormTracks ? 'visible' : 'none',
        },
        paint: {
          'text-color': '#fef08a',
          'text-halo-color': '#020617',
          'text-halo-width': 1.5,
        },
      });

      map.on('click', SCIT_POINTS_LAYER_ID, (e) => {
        const props = e.features?.[0]?.properties;
        if (!props) return;
        new maplibregl.Popup({ closeButton: true, offset: 10 })
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-family:system-ui;padding:4px 6px;max-width:230px;">
              <b style="color:#f59e0b;font-size:12px;">SCIT Storm Cell Track</b>
              <div style="font-size:11px;color:#0f172a;margin-top:2px;white-space:pre-wrap;">${props.hoverText || props.label}</div>
            </div>`
          )
          .addTo(map);
      });
    }
  }, [showStormTracks]);

  // 9. Placefiles Renderer
  const installPlacefiles = useCallback((map: MapLibreMap, placefiles: ActivePlacefile[]) => {
    placefiles.forEach((pf) => {
      const sourceId = `pf-src-${pf.id}`;
      const fillId = `pf-fill-${pf.id}`;
      const lineId = `pf-line-${pf.id}`;
      const pointId = `pf-pt-${pf.id}`;
      const textId = `pf-txt-${pf.id}`;

      if (!pf.enabled) {
        if (map.getLayer(fillId)) map.removeLayer(fillId);
        if (map.getLayer(lineId)) map.removeLayer(lineId);
        if (map.getLayer(pointId)) map.removeLayer(pointId);
        if (map.getLayer(textId)) map.removeLayer(textId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
        return;
      }

      fetch(`/api/placefile?url=${encodeURIComponent(pf.url)}`)
        .then((res) => res.json())
        .then((geojson) => {
          if (map.getSource(sourceId)) {
            (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojson);
          } else {
            map.addSource(sourceId, { type: 'geojson', data: geojson });

            safeAddLayer(map, {
              id: fillId,
              type: 'fill',
              source: sourceId,
              filter: ['==', '$type', 'Polygon'],
              paint: {
                'fill-color': ['get', 'color'],
                'fill-opacity': 0.28,
              },
            });

            safeAddLayer(map, {
              id: lineId,
              type: 'line',
              source: sourceId,
              filter: ['==', '$type', 'LineString'],
              paint: {
                'line-color': ['get', 'color'],
                'line-width': 2,
              },
            });

            safeAddLayer(map, {
              id: pointId,
              type: 'circle',
              source: sourceId,
              filter: ['==', '$type', 'Point'],
              paint: {
                'circle-radius': 5,
                'circle-color': ['get', 'color'],
                'circle-stroke-width': 1.5,
                'circle-stroke-color': '#ffffff',
              },
            });

            safeAddLayer(map, {
              id: textId,
              type: 'symbol',
              source: sourceId,
              filter: ['has', 'text'],
              layout: {
                'text-field': ['get', 'text'],
                'text-size': 11,
                'text-offset': [0, 1.2],
                'text-anchor': 'top',
              },
              paint: {
                'text-color': ['get', 'color'],
                'text-halo-color': '#020617',
                'text-halo-width': 1.5,
              },
            });
          }
        })
        .catch((err) => console.warn(`Placefile ${pf.name} notice:`, err));
    });
  }, []);

  // 10. Single-Site Radar Layer
  const installOrUpdateRadarLayer = useCallback(
    (map: MapLibreMap, tileUrl: string) => {
      if (!tileUrl) return;

      try {
        if (map.getLayer(RADAR_LAYER_ID)) map.removeLayer(RADAR_LAYER_ID);
        if (map.getSource(RADAR_SOURCE_ID)) map.removeSource(RADAR_SOURCE_ID);

        map.addSource(RADAR_SOURCE_ID, {
          type: 'raster',
          tiles: [tileUrl],
          tileSize: 256,
          scheme: 'xyz',
          attribution: 'NEXRAD Level III & NOAA MRMS Severe',
        });

        let contrast = 0.15;
        let saturation = 0.3;
        let brightnessMin = 0.0;
        let hueRotate = 0;

        if (product === 'mesh') {
          contrast = 0.65;
          saturation = 0.9;
          hueRotate = -30;
        } else if (product === 'azshear') {
          contrast = 0.8;
          saturation = 1.0;
          hueRotate = 110;
        } else if (product === 'cc') {
          contrast = 0.65;
          saturation = 0.85;
          hueRotate = -45;
        } else if (product === 'zdr') {
          contrast = 0.45;
          saturation = 0.7;
          hueRotate = 90;
        } else if (product === 'kdp') {
          contrast = 0.5;
          saturation = 0.75;
          hueRotate = 180;
        } else if (palette === 'radarscope') {
          contrast = 0.55;
          saturation = 0.75;
          brightnessMin = 0.05;
          hueRotate = 15;
        } else if (palette === 'cod') {
          contrast = 0.35;
          saturation = 0.6;
          brightnessMin = 0.1;
          hueRotate = -20;
        } else if (palette === 'smooth') {
          contrast = 0.25;
          saturation = 0.45;
          brightnessMin = 0.0;
          hueRotate = 35;
        } else if (palette === 'couplet') {
          contrast = 0.7;
          saturation = 0.9;
          brightnessMin = 0.1;
          hueRotate = 140;
        } else if (palette === 'palFile' && palCurve) {
          contrast = 0.45;
          saturation = 0.65;
          brightnessMin = 0.05;
        }

        safeAddLayer(map, {
          id: RADAR_LAYER_ID,
          type: 'raster',
          source: RADAR_SOURCE_ID,
          paint: {
            'raster-opacity': 0.88,
            'raster-contrast': contrast,
            'raster-saturation': saturation,
            'raster-brightness-min': brightnessMin,
            'raster-hue-rotate': hueRotate,
            'raster-fade-duration': 0,
          },
          layout: {
            visibility: mode === 'Radar' ? 'visible' : 'none',
          },
        });

        currentTileUrlRef.current = tileUrl;
      } catch (err) {
        console.warn('Radar layer notice:', err);
      }
    },
    [palette, palCurve, product, mode]
  );

  // 11. On-Map Radar Tower Pills
  const renderWeatherWiseRadarPills = useCallback(
    (map: MapLibreMap) => {
      siteMarkersRef.current.forEach((m) => m.remove());
      siteMarkersRef.current = [];

      if (!showRadarPills) return;

      RADAR_SITES.forEach((s) => {
        const isActive = s.id === radarSite || s.radarId === radarSite;

        const pill = document.createElement('div');
        pill.className = `ww-radar-pill ${isActive ? 'active' : ''}`;
        pill.title = `${s.name} (${s.id})`;
        pill.innerHTML = `<span class="ww-dot"></span><span>${s.radarId}</span>`;

        pill.addEventListener('click', (e) => {
          e.stopPropagation();
          if (onSelectSite) {
            onSelectSite(s.id);
          }
        });

        const marker = new maplibregl.Marker({ element: pill })
          .setLngLat([s.lon, s.lat])
          .addTo(map);

        siteMarkersRef.current.push(marker);
      });
    },
    [radarSite, showRadarPills, onSelectSite]
  );

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current) return;

    setMapReady(false);
    currentTileUrlRef.current = null;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: makeSatelliteStyle(),
      center: [site.lon, site.lat],
      zoom: 7.4,
      attributionControl: { compact: true },
    });

    mapRef.current = map;

    setTimeout(() => map.resize(), 100);
    setTimeout(() => map.resize(), 300);
    setTimeout(() => map.resize(), 600);

    map.on('load', () => {
      setMapReady(true);
      map.resize();

      installSPCOutlooks(map);
      installCompositeLayer(map);
      installSatelliteFeedLayer(map);
      installModelLayer(map);
      installWatchesLayer(map);
      installOrUpdateNWSWarnings(map);
      renderWeatherWiseRadarPills(map);
      installPlacefiles(map, activePlacefiles);
      installSCITTracksLayer(map, site.lat, site.lon);
    });

    map.on('mousemove', (e) => {
      const { distanceKm, distanceNm, azimuthDeg } = calculatePolarCoordinates(
        site.lat,
        site.lon,
        e.lngLat.lat,
        e.lngLat.lng
      );

      const tiltAngle = parseFloat(tilt) || 0.5;
      const beamHeightFt = calculateBeamHeight(distanceKm, tiltAngle, site.elevation || 200);

      let simulatedVal = 0;
      let unit = 'dBZ';

      if (product === 'mesh') {
        simulatedVal = Math.max(0.5, Math.min(3.75, Math.round((4.0 - distanceNm * 0.05) * 100) / 100));
        unit = 'in (Hail)';
      } else if (product === 'azshear') {
        simulatedVal = Math.round(Math.abs(Math.sin((azimuthDeg * Math.PI) / 180)) * 25) / 1000;
        unit = 's⁻¹';
      } else if (product === 'ref') {
        simulatedVal = Math.max(5, Math.min(75, Math.round(75 - distanceNm * 0.4)));
      } else if (product === 'vel' || product === 'srvel') {
        simulatedVal = Math.round(Math.sin((azimuthDeg * Math.PI) / 180) * 55);
        unit = 'kt';
      } else if (product === 'cc') {
        simulatedVal = 98;
        unit = 'CC';
      }

      const classification = classifyStormGate(product, simulatedVal);

      let badge = classification.badge;
      let hazardLevel = classification.hazardLevel;

      if (product === 'mesh') {
        if (simulatedVal >= 2.5) { badge = '⚠️ Giant Hail Swath (>2.50")'; hazardLevel = 'severe'; }
        else if (simulatedVal >= 1.75) { badge = 'Golf Ball Hail Swath (1.75")'; hazardLevel = 'severe'; }
        else { badge = 'Sub-Severe Hail Swath (<1.00")'; hazardLevel = 'normal'; }
      } else if (product === 'azshear') {
        if (simulatedVal >= 0.015) { badge = '🌪️ Intense Rotation Track'; hazardLevel = 'tornadic'; }
        else if (simulatedVal >= 0.008) { badge = 'Mesocyclone Rotation Track'; hazardLevel = 'elevated'; }
        else { badge = 'Background Azimuthal Shear'; hazardLevel = 'normal'; }
      }

      setTelemetry({
        distanceNm: Math.round(distanceNm * 10) / 10,
        distanceKm: Math.round(distanceKm * 10) / 10,
        azimuthDeg: Math.round(azimuthDeg),
        beamHeightFt,
        estimatedValue: simulatedVal,
        unit,
        signatureBadge: badge,
        hazardLevel,
      });
    });

    map.on('mouseout', () => {
      setTelemetry(null);
    });

    map.on('contextmenu', (e) => {
      e.preventDefault();
      if (onOpenSounding) {
        const profile = generateThermodynamicSounding(e.lngLat.lat, e.lngLat.lng);
        onOpenSounding(profile);
      }
    });

    map.on('click', (e) => {
      if (crossSectionMode) {
        const coords: [number, number] = [e.lngLat.lng, e.lngLat.lat];
        rhiPointsRef.current.push(coords);

        if (rhiPointsRef.current.length === 2) {
          const [pA, pB] = rhiPointsRef.current;
          if (onCrossSectionCut) {
            onCrossSectionCut(pA, pB);
          }
          rhiPointsRef.current = [];
        }
        return;
      }

      if (measureMode) {
        const coords: [number, number] = [e.lngLat.lng, e.lngLat.lat];
        measurePointsRef.current.push(coords);

        if (measurePointsRef.current.length === 2) {
          const [p1, p2] = measurePointsRef.current;
          const { distanceNm, distanceKm } = calculatePolarCoordinates(p1[1], p1[0], p2[1], p2[0]);
          if (onMeasureComplete) {
            onMeasureComplete(Math.round(distanceNm * 10) / 10, Math.round(distanceKm * 0.621371 * 10) / 10);
          }
          measurePointsRef.current = [];
        }
        return;
      }

      const coords: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      if (onMapClickCoordinates) {
        onMapClickCoordinates(coords);
      } else {
        const newPin: SpotterPin = {
          id: `pin-${Date.now()}`,
          hazardType: 'Spotter Observation',
          description: `Tagged at ${coords[1].toFixed(3)}°N, ${coords[0].toFixed(3)}°W`,
          lat: coords[1],
          lon: coords[0],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          callsign: 'Spotter #Field',
        };
        setLocalSpotters((prev) => [...prev, newPin]);
      }
    });

    return () => {
      siteMarkersRef.current.forEach((m) => m.remove());
      siteMarkersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tilt, measureMode, crossSectionMode]);

  // Update SCIT Tracks when site changes
  useEffect(() => {
    if (mapRef.current && mapReady) {
      installSCITTracksLayer(mapRef.current, site.lat, site.lon);
    }
  }, [site.lat, site.lon, mapReady, installSCITTracksLayer]);

  // Mode Switcher Handler
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (map.getLayer(RADAR_LAYER_ID)) {
      map.setLayoutProperty(RADAR_LAYER_ID, 'visibility', mode === 'Radar' ? 'visible' : 'none');
    }
    if (map.getLayer(COMPOSITE_LAYER_ID)) {
      map.setLayoutProperty(COMPOSITE_LAYER_ID, 'visibility', mode === 'Composite' ? 'visible' : 'none');
    }
    if (map.getLayer(SATELLITE_FEED_LAYER_ID)) {
      map.setLayoutProperty(SATELLITE_FEED_LAYER_ID, 'visibility', mode === 'Satellite' ? 'visible' : 'none');
    }
    if (map.getLayer(MODEL_HRRR_LAYER_ID)) {
      map.setLayoutProperty(MODEL_HRRR_LAYER_ID, 'visibility', mode === 'Models' ? 'visible' : 'none');
    }
    if (map.getLayer(SPC_OUTLOOK_FILL_ID)) {
      map.setPaintProperty(SPC_OUTLOOK_FILL_ID, 'fill-opacity', mode === 'Outlooks' ? 0.45 : 0.22);
    }
    if (map.getLayer(SPC_OUTLOOK_LINE_ID)) {
      map.setPaintProperty(SPC_OUTLOOK_LINE_ID, 'line-width', mode === 'Outlooks' ? 3 : 1.5);
    }

    if (mode === 'Composite' || mode === 'Outlooks' || mode === 'Models' || mode === 'Satellite') {
      map.flyTo({
        center: [-98.5, 39.5],
        zoom: 4.3,
        duration: 1200,
        essential: true,
      });
    } else if (mode === 'Radar') {
      map.flyTo({
        center: [site.lon, site.lat],
        zoom: 7.4,
        duration: 1100,
        essential: true,
      });
    }
  }, [mode, mapReady, site.lon, site.lat]);

  // Toggle SCIT tracks visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const vis = showStormTracks ? 'visible' : 'none';
    if (map.getLayer(SCIT_LINE_LAYER_ID)) map.setLayoutProperty(SCIT_LINE_LAYER_ID, 'visibility', vis);
    if (map.getLayer(SCIT_POINTS_LAYER_ID)) map.setLayoutProperty(SCIT_POINTS_LAYER_ID, 'visibility', vis);
    if (map.getLayer(SCIT_LABEL_LAYER_ID)) map.setLayoutProperty(SCIT_LABEL_LAYER_ID, 'visibility', vis);
  }, [showStormTracks, mapReady]);

  // Update Placefiles
  useEffect(() => {
    if (mapRef.current && mapReady) {
      installPlacefiles(mapRef.current, activePlacefiles);
    }
  }, [activePlacefiles, mapReady, installPlacefiles]);

  // Update Radar Pills
  useEffect(() => {
    if (mapRef.current && mapReady) {
      renderWeatherWiseRadarPills(mapRef.current);
    }
  }, [radarSite, showRadarPills, mapReady, renderWeatherWiseRadarPills]);

  // Visibility Toggles
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (map.getLayer(LIGHTNING_LAYER_ID)) {
      map.setLayoutProperty(LIGHTNING_LAYER_ID, 'visibility', showLightning ? 'visible' : 'none');
    }
  }, [showLightning, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (map.getLayer(METAR_CIRCLE_LAYER_ID) && map.getLayer(METAR_LABEL_LAYER_ID)) {
      const visibility = showMetars ? 'visible' : 'none';
      map.setLayoutProperty(METAR_CIRCLE_LAYER_ID, 'visibility', visibility);
      map.setLayoutProperty(METAR_LABEL_LAYER_ID, 'visibility', visibility);
    }
  }, [showMetars, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (map.getLayer(LSR_CIRCLE_LAYER_ID) && map.getLayer(LSR_LABEL_LAYER_ID)) {
      const visibility = showLSR ? 'visible' : 'none';
      map.setLayoutProperty(LSR_CIRCLE_LAYER_ID, 'visibility', visibility);
      map.setLayoutProperty(LSR_LABEL_LAYER_ID, 'visibility', visibility);
    }
  }, [showLSR, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (map.getLayer(WATCHES_FILL_LAYER_ID) && map.getLayer(WATCHES_LINE_LAYER_ID)) {
      const visibility = showWatches ? 'visible' : 'none';
      map.setLayoutProperty(WATCHES_FILL_LAYER_ID, 'visibility', visibility);
      map.setLayoutProperty(WATCHES_LINE_LAYER_ID, 'visibility', visibility);
    }
  }, [showWatches, mapReady]);

  // Radar Frame update
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !frameUrl) return;
    if (frameUrl === currentTileUrlRef.current) return;

    installOrUpdateRadarLayer(map, frameUrl);
  }, [frameUrl, frameLabel, mapReady, installOrUpdateRadarLayer]);

  // FastScan Polling
  useEffect(() => {
    if (!mapReady || frameUrl) return;

    let cancelled = false;
    const pollInterval = fastScan ? 8000 : 60000;

    const fetchLatestScan = () => {
      const cacheBuster = `&_cb=${Date.now()}`;
      fetch(
        `/api/nexrad/frames?site=${encodeURIComponent(site.radarId)}&product=${encodeURIComponent(product)}&tilt=${encodeURIComponent(tilt)}${cacheBuster}`,
        { cache: 'no-store' }
      )
        .then((res) => res.json())
        .then((data) => {
          if (cancelled) return;
          const url = data.frames && data.frames.length > 0 ? data.frames[data.frames.length - 1].tileUrl : data.tileUrl;
          if (url && mapRef.current) {
            installOrUpdateRadarLayer(mapRef.current, url);
          }
        })
        .catch((err) => console.warn('FastScan notice:', err));
    };

    fetchLatestScan();
    const timer = setInterval(fetchLatestScan, pollInterval);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [mapReady, site.radarId, product, tilt, frameUrl, fastScan, installOrUpdateRadarLayer]);

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', overflow: 'hidden', cursor: (measureMode || crossSectionMode) ? 'crosshair' : 'default' }}>
      <div
        ref={containerRef}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
      />

      {/* FLOATING GIBSON RIDGE / RADARSCOPE TELEMETRY HUD */}
      {telemetry && (
        <div className="pointer-events-none absolute bottom-16 left-4 z-30 flex flex-col gap-1 rounded-2xl border border-white/15 bg-slate-950/90 p-3 shadow-2xl backdrop-blur-xl font-mono text-xs animate-fade-in">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              GATE TELEMETRY · {site.radarId} ({tilt}°)
            </span>
            <span className={`rounded px-1.5 py-0.2 text-[9px] font-black uppercase ${
              telemetry.hazardLevel === 'tornadic' ? 'bg-purple-600 text-white animate-pulse' :
              telemetry.hazardLevel === 'severe' ? 'bg-red-600 text-white' :
              telemetry.hazardLevel === 'elevated' ? 'bg-amber-500 text-slate-950' :
              'bg-slate-800 text-slate-300'
            }`}>
              {telemetry.signatureBadge}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1 text-[11px]">
            <div>
              <span className="text-slate-500">Azimuth:</span>{' '}
              <b className="text-white">{telemetry.azimuthDeg}°</b>
            </div>
            <div>
              <span className="text-slate-500">Range:</span>{' '}
              <b className="text-white">{telemetry.distanceNm} nm</b>
            </div>
            <div>
              <span className="text-slate-500">Beam Altitude:</span>{' '}
              <b className="text-cyan-400">{telemetry.beamHeightFt.toLocaleString()} ft AGL</b>
            </div>
            <div>
              <span className="text-slate-500">{product.toUpperCase()}:</span>{' '}
              <b className="text-emerald-400">{telemetry.estimatedValue} {telemetry.unit}</b>
            </div>
          </div>
          <div className="text-[9px] text-slate-500 italic mt-0.5 border-t border-white/5 pt-1">
            Right-click anywhere to generate Skew-T Sounding &amp; Hodograph
          </div>
        </div>
      )}
    </div>
  );
}
