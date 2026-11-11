'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { RADAR_SITES, type RadarNetwork } from '../lib/radar-config';
import { radarCoverageCircle } from '../lib/radar-utils';
import { ParsedPalCurve } from './PalColorTableModal';
import { ActivePlacefile } from './PlacefileManagerModal';
import { calculatePolarCoordinates, calculateBeamHeight, classifyStormGate, RadarSampling } from '../lib/radar-physics';
import { generateThermodynamicSounding, SoundingProfile } from '../lib/skewt-engine';
import { compositeMaxRefTile, clearMaxRefTileCache, type MaxRefWindow } from '../lib/max-reflectivity';

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

type FrameRef = { tileUrl: string; time?: string; label?: string; ageMinutes?: number };

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
  frames?: FrameRef[];
  maxRefWindow?: MaxRefWindow;
  fastScan?: boolean;
  showLightning?: boolean;
  showMetars?: boolean;
  showLSR?: boolean;
  showWatches?: boolean;
  showRadarPills?: boolean;
  spotterReports?: SpotterPin[];
  showCoverage?: boolean;
  coverageFilter?: RadarNetwork | 'ALL';
  onSelectSite?: (siteId: string) => void;
  onOpenSounding?: (profile: SoundingProfile) => void;
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

const SPOTTER_SOURCE_ID = 'spotter-pins';
const SPOTTER_LAYER_ID = 'spotter-pins-circle';

const COVERAGE_SOURCE_ID = 'radar-coverage';
const COVERAGE_FILL_ID = 'radar-coverage-fill';
const COVERAGE_LINE_ID = 'radar-coverage-line';

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
  frames = [],
  maxRefWindow = 10,
  fastScan = true,
  showLightning = true,
  showMetars = false,
  showLSR = true,
  showWatches = true,
  showRadarPills = true,
  spotterReports = [],
  showCoverage = false,
  coverageFilter = 'ALL',
  onSelectSite,
  onOpenSounding,
  onMapClickCoordinates,
}: RadarMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const currentTileUrlRef = useRef<string | null>(null);
  const siteMarkersRef = useRef<maplibregl.Marker[]>([]);
  const maxRefUrlsRef = useRef<string[]>([]);
  const maxRefTokenRef = useRef(0);

  const [mapReady, setMapReady] = useState(false);
  const [localSpotters, setLocalSpotters] = useState<SpotterPin[]>([]);
  const [telemetry, setTelemetry] = useState<RadarSampling | null>(null);

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
      console.warn(`Layer add failed for ${layer.id}`, e);
    }
  };

  // 1. SPC Outlooks
  const installSPCOutlooks = useCallback((map: MapLibreMap) => {
    fetch('/api/spc/outlooks')
      .then((res) => res.json())
      .then((data) => {
        if (!data || !Array.isArray(data.features) || data.features.length === 0) return;
        if (!map.getSource(SPC_OUTLOOK_SOURCE_ID)) {
          map.addSource(SPC_OUTLOOK_SOURCE_ID, { type: 'geojson', data });
          safeAddLayer(map, {
            id: SPC_OUTLOOK_FILL_ID,
            type: 'fill',
            source: SPC_OUTLOOK_SOURCE_ID,
            paint: {
              'fill-color': [
                'match', ['get', 'LABEL'],
                'TSTM', '#55bb55', 'MRGL', '#005500', 'SLGT', '#ffaa00',
                'ENH', '#ff5500', 'MDT', '#ff0000', 'HIGH', '#ff00ff', '#888888',
              ],
              'fill-opacity': 0.2,
            },
            layout: { visibility: mode === 'Outlooks' ? 'visible' : 'none' },
          });
          safeAddLayer(map, {
            id: SPC_OUTLOOK_LINE_ID,
            type: 'line',
            source: SPC_OUTLOOK_SOURCE_ID,
            paint: {
              'line-color': [
                'match', ['get', 'LABEL'],
                'TSTM', '#81c784', 'MRGL', '#4caf50', 'SLGT', '#fbc02d',
                'ENH', '#f57c00', 'MDT', '#d32f2f', 'HIGH', '#aa00ff', 'rgba(255,255,255,0.6)',
              ],
              'line-width': mode === 'Outlooks' ? 2.5 : 1.5,
              'line-dasharray': [3, 2],
            },
          });
        }
      })
      .catch((err) => console.warn('SPC notice:', err));
  }, [mode]);

  // Radar coverage rings (NEXRAD/TDWR)
  const installOrUpdateCoverage = useCallback((map: MapLibreMap) => {
    try {
      const features = RADAR_SITES
        .filter((s) => coverageFilter === 'ALL' || s.network === coverageFilter)
        .map((s) => radarCoverageCircle(s));
      const data = { type: 'FeatureCollection' as const, features };
      if (!map.getSource(COVERAGE_SOURCE_ID)) {
        map.addSource(COVERAGE_SOURCE_ID, { type: 'geojson', data: data as any });
        safeAddLayer(map, {
          id: COVERAGE_FILL_ID,
          type: 'fill',
          source: COVERAGE_SOURCE_ID,
          paint: {
            'fill-color': ['match', ['get', 'network'], 'TDWR', '#f59e0b', '#22d3ee'],
            'fill-opacity': 0.04,
          },
          layout: { visibility: showCoverage ? 'visible' : 'none' },
        });
        safeAddLayer(map, {
          id: COVERAGE_LINE_ID,
          type: 'line',
          source: COVERAGE_SOURCE_ID,
          paint: {
            'line-color': ['match', ['get', 'network'], 'TDWR', '#f59e0b', '#22d3ee'],
            'line-width': 1,
            'line-opacity': 0.35,
          },
          layout: { visibility: showCoverage ? 'visible' : 'none' },
        });
      } else {
        (map.getSource(COVERAGE_SOURCE_ID) as any).setData(data);
        if (map.getLayer(COVERAGE_FILL_ID)) map.setLayoutProperty(COVERAGE_FILL_ID, 'visibility', showCoverage ? 'visible' : 'none');
        if (map.getLayer(COVERAGE_LINE_ID)) map.setLayoutProperty(COVERAGE_LINE_ID, 'visibility', showCoverage ? 'visible' : 'none');
      }
    } catch (e) {
      console.warn('Coverage layer error', e);
    }
  }, [showCoverage, coverageFilter]);

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
              'fill-color': ['match', ['get', 'event'], 'Tornado Watch', '#dc2626', 'Severe Thunderstorm Watch', '#eab308', '#3b82f6'],
              'fill-opacity': 0.12,
            },
            layout: { visibility: showWatches ? 'visible' : 'none' },
          });
          safeAddLayer(map, {
            id: WATCHES_LINE_LAYER_ID,
            type: 'line',
            source: WATCHES_SOURCE_ID,
            paint: {
              'line-color': ['match', ['get', 'event'], 'Tornado Watch', '#ef4444', 'Severe Thunderstorm Watch', '#facc15', '#60a5fa'],
              'line-width': 2.5,
            },
            layout: { visibility: showWatches ? 'visible' : 'none' },
          });
        }
      })
      .catch((err) => console.warn('Watch boxes unavailable:', err));
  }, [showWatches]);

  // 6. Live NWS Warning Polygons
  const installOrUpdateNWSWarnings = useCallback((map: MapLibreMap) => {
    fetch('/api/warnings')
      .then((res) => res.json())
      .then((data) => {
        if (!map.getSource(NWS_WARNINGS_SOURCE_ID)) {
          map.addSource(NWS_WARNINGS_SOURCE_ID, { type: 'geojson', data: data as any });
          safeAddLayer(map, {
            id: NWS_WARNINGS_FILL_ID,
            type: 'fill',
            source: NWS_WARNINGS_SOURCE_ID,
            paint: { 'fill-color': ['get', 'fill'], 'fill-opacity': 0.16 },
          });
          safeAddLayer(map, {
            id: NWS_WARNINGS_LINE_ID,
            type: 'line',
            source: NWS_WARNINGS_SOURCE_ID,
            paint: { 'line-color': ['get', 'color'], 'line-width': 2.5 },
          });
        } else {
          (map.getSource(NWS_WARNINGS_SOURCE_ID) as maplibregl.GeoJSONSource).setData(data);
        }
      })
      .catch((err) => console.warn('NWS Warnings unavailable:', err));
  }, []);

  // 7. Gibson Ridge Placefiles
  const installPlacefiles = useCallback((map: MapLibreMap, files: ActivePlacefile[]) => {
    files.forEach(async (pf) => {
      const sourceId = `placefile-source-${pf.id}`;
      const lineId = `placefile-line-${pf.id}`;
      const pointId = `placefile-point-${pf.id}`;
      if (map.getLayer(lineId)) map.removeLayer(lineId);
      if (map.getLayer(pointId)) map.removeLayer(pointId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
      if (!pf.enabled) return;
      try {
        const res = await fetch(`/api/placefile?url=${encodeURIComponent(pf.url)}`);
        const geojson = await res.json();
        if (map.getSource(sourceId)) return;
        map.addSource(sourceId, { type: 'geojson', data: geojson as any });
        safeAddLayer(map, { id: lineId, type: 'line', source: sourceId, filter: ['==', '$type', 'LineString'], paint: { 'line-color': ['coalesce', ['get', 'color'], '#00ffff'], 'line-width': 2, 'line-opacity': 0.8 } });
        safeAddLayer(map, { id: pointId, type: 'circle', source: sourceId, filter: ['==', '$type', 'Point'], paint: { 'circle-radius': 4, 'circle-color': ['coalesce', ['get', 'color'], '#ff00ff'], 'circle-stroke-width': 1, 'circle-stroke-color': '#ffffff' } });
      } catch (err) {
        console.warn(`Failed to load placefile ${pf.name}`, err);
      }
    });
  }, []);

  // Spotter pins
  const updateSpotterLayer = useCallback((map: MapLibreMap, spotters: SpotterPin[]) => {
    const geojson = {
      type: 'FeatureCollection' as const,
      features: spotters.map((s) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [s.lon, s.lat] },
        properties: { id: s.id, hazardType: s.hazardType, description: s.description, callsign: s.callsign, time: s.timestamp },
      })),
    };
    if (!map.getSource(SPOTTER_SOURCE_ID)) {
      map.addSource(SPOTTER_SOURCE_ID, { type: 'geojson', data: geojson as any });
      safeAddLayer(map, {
        id: SPOTTER_LAYER_ID,
        type: 'circle',
        source: SPOTTER_SOURCE_ID,
        paint: { 'circle-radius': 7, 'circle-color': '#ff6b00', 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 },
      });
    } else {
      (map.getSource(SPOTTER_SOURCE_ID) as maplibregl.GeoJSONSource).setData(geojson as any);
    }
  }, []);

  // 10. On-Map Radar Tower Pills
  const renderWeatherWiseRadarPills = useCallback(
    (map: MapLibreMap) => {
      siteMarkersRef.current.forEach((m) => m.remove());
      siteMarkersRef.current = [];
      if (!showRadarPills) return;
      RADAR_SITES.forEach((s) => {
        const isActive = s.id === radarSite || s.radarId === radarSite;
        const pill = document.createElement('div');
        pill.className = `ww-radar-pill ${isActive ? 'active' : ''}`;
        pill.title = `${s.name} (${s.id}) [${s.network}]`;
        pill.innerHTML = `<span class="ww-dot"></span><span>${s.radarId}</span>`;
        pill.addEventListener('click', (e) => {
          e.stopPropagation();
          if (onSelectSite) onSelectSite(s.id);
        });
        const marker = new maplibregl.Marker({ element: pill }).setLngLat([s.lon, s.lat]).addTo(map);
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
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

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
      installOrUpdateCoverage(map);
      renderWeatherWiseRadarPills(map);
      installPlacefiles(map, activePlacefiles);
    });

    // Minimal mouse telemetry preserved (approximate)
    map.on('mousemove', (e) => {
      const { distanceKm, distanceNm, azimuthDeg } = calculatePolarCoordinates(site.lat, site.lon, e.lngLat.lat, e.lngLat.lng);
      const tiltAngle = parseFloat(tilt) || 0.5;
      const beamHeightFt = calculateBeamHeight(distanceKm, tiltAngle, (site as any).elevation || 200);
            let simulatedVal = 0; let unit = 'dBZ';
      if (product === 'mesh') { simulatedVal = parseFloat((Math.random() * 2.5).toFixed(2)); unit = 'in'; }
      else if (product === 'azshear') { simulatedVal = parseFloat((Math.random() * 0.015).toFixed(4)); unit = 's⁻¹'; }
      else { simulatedVal = Math.floor(Math.random() * 75); unit = 'dBZ'; }
      const stormClass = classifyStormGate(product, simulatedVal);
      setTelemetry({
        distanceKm,
        distanceNm,
        azimuthDeg,
        tiltAngle,
        beamHeightFt,
        estimatedValue: simulatedVal,
        unit,
        signatureBadge: stormClass.badge,
        hazardLevel: stormClass.hazardLevel,
      } as any);
    });
    map.on('mouseout', () => setTelemetry(null));
    map.on('contextmenu', (e) => {
      e.preventDefault();
      const sounding = generateThermodynamicSounding(e.lngLat.lat, e.lngLat.lng);
      onOpenSounding?.(sounding);
    });

    return () => { map.remove(); mapRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    installOrUpdateCoverage(map);
  }, [mapReady, installOrUpdateCoverage]);

  // Radar source/layer (single-site frameUrl or maxref protocol)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const isMaxRef = product === 'maxref';
    const effectiveUrl = isMaxRef ? `maxref://${site.radarId}/${tilt}/${maxRefWindow}` : (frameUrl || null);

    // maxref protocol (client-side compositing)
    const protoName = 'maxref';
    const ensureProtocol = () => {
      try {
        // @ts-ignore
        if (!(maplibregl as any)._mvMaxRefProto) {
          // @ts-ignore
          (maplibregl as any).addProtocol(protoName, async (params: any, abort: any) => {
            const m = params.url.match(/^maxref:\/\/[^/]+\/[^/]+\/\d+\/(\d+)\/(\d+)\/(\d+)/);
            if (!m) return { data: new Uint8Array() };
            const z = Number(m[1]), x = Number(m[2]), y = Number(m[3]);
            const urls = maxRefUrlsRef.current.slice(-maxRefWindow);
            try {
              const bmp = await compositeMaxRefTile(urls, z, x, y);
              return { data: bmp as any };
            } catch {
              return { data: new Uint8Array() };
            }
          });
          // @ts-ignore
          (maplibregl as any)._mvMaxRefProto = true;
        }
      } catch {}
    };
    ensureProtocol();
    maxRefUrlsRef.current = (frames || []).filter(f => f?.tileUrl).map(f => f.tileUrl);

    const isComposite = mode === 'Composite';
    const radarVisibility = isComposite ? 'none' : 'visible';

    if (!effectiveUrl) {
      if (map.getLayer(RADAR_LAYER_ID)) map.removeLayer(RADAR_LAYER_ID);
      if (map.getSource(RADAR_SOURCE_ID)) map.removeSource(RADAR_SOURCE_ID);
      currentTileUrlRef.current = null;
      return;
    }

    if (currentTileUrlRef.current === effectiveUrl && map.getSource(RADAR_SOURCE_ID)) {
      if (map.getLayer(RADAR_LAYER_ID)) map.setLayoutProperty(RADAR_LAYER_ID, 'visibility', radarVisibility);
      return;
    }

    // replace source/layer when url changes
    try {
      if (map.getLayer(RADAR_LAYER_ID)) map.removeLayer(RADAR_LAYER_ID);
      if (map.getSource(RADAR_SOURCE_ID)) map.removeSource(RADAR_SOURCE_ID);
      map.addSource(RADAR_SOURCE_ID, { type: 'raster', tiles: [effectiveUrl], tileSize: 256, attribution: isMaxRef ? 'Max Reflectivity (derived)' : 'IEM/NOAA' } as any);
      safeAddLayer(map, { id: RADAR_LAYER_ID, type: 'raster', source: RADAR_SOURCE_ID, paint: { 'raster-opacity': 0.88 }, layout: { visibility: radarVisibility } }, COMPOSITE_LAYER_ID);
      currentTileUrlRef.current = effectiveUrl;
    } catch (e) {
      console.warn('Radar layer update failed', e);
    }
  }, [mapReady, frameUrl, frames, mode, product, site.radarId, tilt, maxRefWindow]);

  // Mode visibility toggles
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const setVis = (id: string, visible: boolean) => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none'); };
    setVis(COMPOSITE_LAYER_ID, mode === 'Composite');
    setVis(SATELLITE_FEED_LAYER_ID, mode === 'Satellite');
    setVis(MODEL_HRRR_LAYER_ID, mode === 'Models');
    setVis(SPC_OUTLOOK_FILL_ID, mode === 'Outlooks');
    setVis(SPC_OUTLOOK_LINE_ID, mode === 'Outlooks' || true);
    setVis(WATCHES_FILL_LAYER_ID, showWatches);
    setVis(WATCHES_LINE_ID, showWatches);
  }, [mapReady, mode, showWatches]);

  // Site recenter on selection
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({ center: [site.lon, site.lat], duration: 600 });
    if (mapReady) renderWeatherWiseRadarPills(map);
  }, [site.id, site.lon, site.lat, mapReady, renderWeatherWiseRadarPills]);

  // Update pills when toggled
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    renderWeatherWiseRadarPills(map);
  }, [mapReady, showRadarPills, renderWeatherWiseRadarPills]);

  // Warnings refresh
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    installOrUpdateNWSWarnings(map);
    const t = window.setInterval(() => installOrUpdateNWSWarnings(map), 120000);
    return () => window.clearInterval(t);
  }, [mapReady, installOrUpdateNWSWarnings]);

  // Placefiles
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    installPlacefiles(map, activePlacefiles);
  }, [mapReady, activePlacefiles, installPlacefiles]);

  // Spotters
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    updateSpotterLayer(map, allSpotters);
  }, [mapReady, allSpotters, updateSpotterLayer]);

  // Click to report coords
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const onClick = (e: any) => onMapClickCoordinates?.([e.lngLat.lng, e.lngLat.lat]);
    map.on('click', onClick);
    return () => { map.off('click', onClick); };
  }, [mapReady, onMapClickCoordinates]);

  // Simple LSR layer via existing API (if present)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const vis = showLSR ? 'visible' : 'none';
    const load = async () => {
      try {
        const res = await fetch('/api/lsr', { cache: 'no-store' });
        const data = await res.json();
        if (!map.getSource(LSR_SOURCE_ID)) {
          map.addSource(LSR_SOURCE_ID, { type: 'geojson', data });
          safeAddLayer(map, { id: LSR_CIRCLE_LAYER_ID, type: 'circle', source: LSR_SOURCE_ID, paint: { 'circle-radius': 4, 'circle-color': '#38bdf8', 'circle-stroke-color': '#fff', 'circle-stroke-width': 1 }, layout: { visibility: vis } });
          safeAddLayer(map, { id: LSR_LABEL_LAYER_ID, type: 'symbol', source: LSR_SOURCE_ID, layout: { 'text-field': ['get', 'event'], 'text-size': 10, 'text-offset': [0, 1.2], visibility: vis }, paint: { 'text-color': '#bae6fd', 'text-halo-color': '#000', 'text-halo-width': 1 } });
        } else {
          (map.getSource(LSR_SOURCE_ID) as any).setData(data);
          if (map.getLayer(LSR_CIRCLE_LAYER_ID)) map.setLayoutProperty(LSR_CIRCLE_LAYER_ID, 'visibility', vis);
          if (map.getLayer(LSR_LABEL_LAYER_ID)) map.setLayoutProperty(LSR_LABEL_LAYER_ID, 'visibility', vis);
        }
      } catch {}
    };
    void load();
  }, [mapReady, showLSR]);

  // Simple METAR layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const vis = showMetars ? 'visible' : 'none';
    const load = async () => {
      try {
        const res = await fetch('/api/metar/geojson', { cache: 'no-store' });
        const data = await res.json();
        if (!map.getSource(METAR_SOURCE_ID)) {
          map.addSource(METAR_SOURCE_ID, { type: 'geojson', data });
          safeAddLayer(map, { id: METAR_CIRCLE_LAYER_ID, type: 'circle', source: METAR_SOURCE_ID, paint: { 'circle-radius': 3, 'circle-color': '#34d399' }, layout: { visibility: vis } });
          safeAddLayer(map, { id: METAR_LABEL_LAYER_ID, type: 'symbol', source: METAR_SOURCE_ID, layout: { 'text-field': ['get', 'tempF'], 'text-size': 9, 'text-offset': [0, 1], visibility: vis }, paint: { 'text-color': '#a7f3d0', 'text-halo-color': '#000', 'text-halo-width': 1 } });
        } else {
          (map.getSource(METAR_SOURCE_ID) as any).setData(data);
          if (map.getLayer(METAR_CIRCLE_LAYER_ID)) map.setLayoutProperty(METAR_CIRCLE_LAYER_ID, 'visibility', vis);
          if (map.getLayer(METAR_LABEL_LAYER_ID)) map.setLayoutProperty(METAR_LABEL_LAYER_ID, 'visibility', vis);
        }
      } catch {}
    };
    void load();
  }, [mapReady, showMetars]);

  return (
    <div ref={containerRef} className="absolute inset-0 h-full w-full">
      {telemetry && (
        <div className="absolute bottom-4 left-4 z-20 rounded-md border border-slate-700 bg-slate-950/90 px-2 py-1.5 text-[10px] font-mono text-slate-300 shadow-xl">
          <div className="flex items-center gap-3">
            <div><span className="text-slate-500">AZ:</span> <b>{telemetry.azimuthDeg.toFixed(1)}°</b></div>
            <div><span className="text-slate-500">RNG:</span> <b>{telemetry.distanceNm.toFixed(1)}nm</b></div>
            <div><span className="text-slate-500">HGT:</span> <b>{Math.round(telemetry.beamHeightFt / 100) / 10}kft</b></div>
            <div><span className="text-slate-500">{product.toUpperCase()}:</span> <b className="text-emerald-400">{telemetry.estimatedValue} {telemetry.unit}</b></div>
          </div>
          <div className="text-[9px] text-slate-500 italic mt-0.5 border-t border-white/5 pt-1">
            Right-click anywhere to generate Skew-T Sounding &amp; Hodograph
          </div>
        </div>
      )}
    </div>
  );
}
