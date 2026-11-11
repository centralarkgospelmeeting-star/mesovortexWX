'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { RADAR_SITES } from '../lib/radar-config';

export type ModeTab = 'Radar' | '3D Radar' | 'Composite' | 'Satellite' | 'Models' | 'Outlooks';
export type BasemapType = 'satellite-streets' | 'custom-weather' | 'mapbox' | 'satellite';
export type BasemapId = BasemapType;
export type PaletteType = 'nws' | 'radarscope' | 'cod' | 'smooth' | 'couplet' | 'palFile';

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
  basemap?: BasemapType | string;
  mapType?: string;
  spcDay?: 'Day 1' | 'Day 2' | 'Day 3' | string;
  radarOpacity?: number;
  gateFilter?: number;
  smoothing?: boolean;
  colorTable?: string;
  palette?: string;
  palCurve?: any;
  activePlacefiles?: any[];
  frameUrl?: string | null;
  frameLabel?: string;
  frames?: any[];
  maxRefWindow?: number;
  fastScan?: boolean;
  showLightning?: boolean;
  showMetars?: boolean;
  showLSR?: boolean;
  showWatches?: boolean;
  showRadarPills?: boolean;
  showStormTracks?: boolean;
  showRadarSites?: boolean;
  showRangeRings?: boolean;
  showCounties?: boolean;
  showTornadoAnalysis?: boolean;
  showCoverage?: boolean;
  coverageFilter?: string;
  spotterReports?: any[];
  onSelectSite?: (siteId: string) => void;
  onOpenSounding?: (profile: any) => void;
  onMapClickCoordinates?: (coords: [number, number]) => void;
}

const IEM_TILE = 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0';

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
const SPC_SOURCE_ID = 'mv-spc-source';
const SPC_FILL_ID = 'mv-spc-fill';
const SPC_LINE_ID = 'mv-spc-line';
const RINGS_SOURCE_ID = 'mv-range-rings-source';
const RINGS_LAYER_ID = 'mv-range-rings-layer';
const RINGS_LABEL_ID = 'mv-range-rings-labels';

function buildMapboxRasterStyle(basemap: BasemapType | string): StyleSpecification {
  const isCustom = basemap === 'custom-weather' || basemap === 'mapbox';
  const stylePath = isCustom ? CUSTOM_STYLE_ID : SATELLITE_STREETS_ID;
  const tileUrl = 'https://api.mapbox.com/styles/v1/' + stylePath + '/tiles/512/{z}/{x}/{y}@2x?access_token=' + MAPBOX_TOKEN;
  return {
    version: 8,
    sources: {
      'mapbox-basemap-source': {
        type: 'raster',
        tiles: [tileUrl],
        tileSize: 512,
        attribution: 'Mapbox OpenStreetMap',
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

function createRangeRingGeoJSON(lat: number, lon: number) {
  const distancesNm = [25, 50, 100, 124];
  const features: any[] = [];
  distancesNm.forEach((nm) => {
    const coords: [number, number][] = [];
    const points = 64;
    const distanceKm = nm * 1.852;
    const radiusDeg = distanceKm / 111.32;
    for (let i = 0; i <= points; i++) {
      const angle = (i * 2 * Math.PI) / points;
      const ringLat = lat + radiusDeg * Math.sin(angle);
      const ringLon = lon + (radiusDeg * Math.cos(angle)) / Math.cos((lat * Math.PI) / 180);
      coords.push([ringLon, ringLat]);
    }
    features.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: coords },
      properties: { label: nm + ' nm', distanceNm: nm },
    });
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lon, lat + radiusDeg] },
      properties: { label: nm + ' nm' },
    });
  });
  return { type: 'FeatureCollection', features };
}

export function RadarMap({
  product = 'ref',
  radarSite = 'KLZK',
  mode = 'Radar',
  tilt = '0.5',
  basemap = 'satellite-streets',
  radarOpacity = 0.88,
  gateFilter = 5,
  smoothing = false,
  colorTable = 'nws',
  showLightning = true,
  showStormTracks = true,
  showRadarSites = true,
  showRangeRings = true,
  showCounties = true,
  showTornadoAnalysis = true,
  spcDay,
  onSelectSite,
  onMapClickCoordinates,
}: RadarMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const siteMarkersRef = useRef<maplibregl.Marker[]>([]);

  const site =
    RADAR_SITES.find((s) => s.id === radarSite || s.radarId === radarSite) ||
    RADAR_SITES[0];

  const updateWarnings = useCallback((map: MapLibreMap) => {
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
        const validGeoJSON = { type: 'FeatureCollection', features: polygonFeatures };
        const source = map.getSource(WARNINGS_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
        if (source) {
          source.setData(validGeoJSON as any);
        } else {
          map.addSource(WARNINGS_SOURCE_ID, { type: 'geojson', data: validGeoJSON as any });
          map.addLayer({ id: WARNINGS_FILL_ID, type: 'fill', source: WARNINGS_SOURCE_ID, paint: { 'fill-color': ['match', ['get', 'event'], 'Tornado Warning', '#dc2626', 'Severe Thunderstorm Warning', '#f59e0b', 'Flash Flood Warning', '#10b981', '#3b82f6'], 'fill-opacity': 0.18 } });
          map.addLayer({ id: WARNINGS_LINE_OUTER_ID, type: 'line', source: WARNINGS_SOURCE_ID, paint: { 'line-color': ['match', ['get', 'event'], 'Tornado Warning', '#dc2626', 'Severe Thunderstorm Warning', '#ffffff', 'Flash Flood Warning', '#059669', '#1d4ed8'], 'line-width': 3.5 } });
          map.addLayer({ id: WARNINGS_LINE_INNER_ID, type: 'line', source: WARNINGS_SOURCE_ID, paint: { 'line-color': ['match', ['get', 'event'], 'Tornado Warning', '#f87171', 'Severe Thunderstorm Warning', '#fbbf24', 'Flash Flood Warning', '#34d399', '#60a5fa'], 'line-width': 1.8 } });
        }
      })
      .catch((err) => console.warn('[Warnings Notice]:', err));
  }, []);

  const updateSpcOutlooks = useCallback((map: MapLibreMap) => {
    fetch('https://www.spc.noaa.gov/products/outlook/day1otlk_cat.lyr.geojson')
      .then((res) => res.json())
      .then((data) => {
        const source = map.getSource(SPC_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
        if (source) {
          source.setData(data);
        } else {
          map.addSource(SPC_SOURCE_ID, { type: 'geojson', data });
          map.addLayer({ id: SPC_FILL_ID, type: 'fill', source: SPC_SOURCE_ID, paint: { 'fill-color': ['match', ['get', 'LABEL'], 'TSTM', '#c1e9c1', 'MRGL', '#7fc57f', 'SLGT', '#f6f67d', 'ENH', '#edbf69', 'MDT', '#e56d6d', 'HIGH', '#ff66ff', 'rgba(0,0,0,0)'], 'fill-opacity': 0.22 } });
          map.addLayer({ id: SPC_LINE_ID, type: 'line', source: SPC_SOURCE_ID, paint: { 'line-color': ['match', ['get', 'LABEL'], 'TSTM', '#81c784', 'MRGL', '#4caf50', 'SLGT', '#fbc02d', 'ENH', '#f57c00', 'MDT', '#d32f2f', 'HIGH', '#aa00ff', 'rgba(255,255,255,0.4)'], 'line-width': 2 } });
        }
      })
      .catch((err) => console.warn('[SPC Notice]:', err));
  }, []);

  const updateRangeRings = useCallback((map: MapLibreMap, lat: number, lon: number) => {
    const geojson = createRangeRingGeoJSON(lat, lon);
    const source = map.getSource(RINGS_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(geojson as any);
    } else {
      map.addSource(RINGS_SOURCE_ID, { type: 'geojson', data: geojson as any });
      map.addLayer({ id: RINGS_LAYER_ID, type: 'line', source: RINGS_SOURCE_ID, filter: ['==', '$type', 'LineString'], paint: { 'line-color': '#38bdf8', 'line-width': 1.2, 'line-dasharray': [4, 4], 'line-opacity': 0.65 } });
      map.addLayer({ id: RINGS_LABEL_ID, type: 'symbol', source: RINGS_SOURCE_ID, filter: ['==', '$type', 'Point'], layout: { 'text-field': ['get', 'label'], 'text-size': 10, 'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'], 'text-offset': [0, -1], 'text-anchor': 'bottom' }, paint: { 'text-color': '#38bdf8', 'text-halo-color': '#020617', 'text-halo-width': 1.5 } });
    }
  }, []);

  const updateRadar = useCallback(
    (map: MapLibreMap) => {
      let tileUrl = '';

      if (mode === 'Composite') {
        tileUrl = IEM_TILE + '/nexrad-n0q-900913/{z}/{x}/{y}.png';
      } else if (mode === 'Satellite') {
        tileUrl = IEM_TILE + '/goes-east-vis-1km-900913/{z}/{x}/{y}.png';
      } else {
        if (product === 'vel' || product === 'norm_vel' || product === 'nrvel') {
          const pc = tilt === '0.9' ? 'N1U' : tilt === '1.3' ? 'N2U' : tilt === '1.8' ? 'N3U' : 'N0U';
          tileUrl = IEM_TILE + '/ridge::' + site.radarId + '-' + pc + '-0/{z}/{x}/{y}.png';
        } else if (product === 'srvel') {
          tileUrl = IEM_TILE + '/ridge::' + site.radarId + '-N0S-0/{z}/{x}/{y}.png';
        } else if (product === 'ref' || product === 'max_ref' || product === 'maxref' || product === 'ref_x') {
          const pc = tilt === '0.9' ? 'N1B' : tilt === '1.3' ? 'N2B' : tilt === '1.8' ? 'N3B' : 'N0B';
          tileUrl = IEM_TILE + '/ridge::' + site.radarId + '-' + pc + '-0/{z}/{x}/{y}.png';
        } else if (product === 'cc' || product === 'min_cc') {
          tileUrl = IEM_TILE + '/mrms::RhoHV/{z}/{x}/{y}.png';
        } else if (product === 'zdr') {
          tileUrl = IEM_TILE + '/mrms::ReflectivityAtLowestAltitude/{z}/{x}/{y}.png';
        } else if (product === 'kdp') {
          tileUrl = IEM_TILE + '/mrms::MultiSensorQPE01H/{z}/{x}/{y}.png';
        } else if (product === 'tops') {
          tileUrl = IEM_TILE + '/mrms::EchoTop18/{z}/{x}/{y}.png';
        } else if (product === 'vil') {
          tileUrl = IEM_TILE + '/mrms::VIL/{z}/{x}/{y}.png';
        } else if (product === 'hhc') {
          tileUrl = IEM_TILE + '/mrms::HydrometeorClassification/{z}/{x}/{y}.png';
        } else if (product === 'qpe') {
          tileUrl = IEM_TILE + '/mrms::MultiSensorQPE01H/{z}/{x}/{y}.png';
        } else if (product === 'sw') {
          tileUrl = IEM_TILE + '/mrms::SpectrumWidth/{z}/{x}/{y}.png';
        }
      }

      if (map.getLayer(RADAR_LAYER_ID)) map.removeLayer(RADAR_LAYER_ID);
      if (map.getSource(RADAR_SOURCE_ID)) map.removeSource(RADAR_SOURCE_ID);

      if (!tileUrl) {
        console.warn('[RadarMap] No tile URL for product: ' + product);
        return;
      }

      map.addSource(RADAR_SOURCE_ID, {
        type: 'raster',
        tiles: [tileUrl],
        tileSize: 256,
        scheme: 'xyz',
      });

      const beforeId = map.getLayer(WARNINGS_FILL_ID) ? WARNINGS_FILL_ID : undefined;

      let contrast = 0.2;
      let saturation = 0.35;
      let hueRotate = 0;

      if (colorTable === 'radarscope') { contrast = 0.55; saturation = 0.75; hueRotate = 15; }
      else if (colorTable === 'cod') { contrast = 0.35; saturation = 0.6; hueRotate = -20; }
      else if (colorTable === 'smooth') { contrast = 0.25; saturation = 0.45; hueRotate = 35; }
      else if (colorTable === 'couplet') { contrast = 0.7; saturation = 0.9; hueRotate = 140; }

      if (product === 'max_ref' || product === 'maxref') {
        hueRotate = 0; contrast = 0.6; saturation = 0.85;
      }

      if (['cc', 'min_cc', 'zdr', 'kdp', 'tops', 'vil', 'hhc', 'qpe', 'sw'].includes(product)) {
        contrast = 0.45; saturation = 0.7;
      }

      map.addLayer({
        id: RADAR_LAYER_ID,
        type: 'raster',
        source: RADAR_SOURCE_ID,
        paint: {
          'raster-opacity': radarOpacity,
          'raster-contrast': contrast,
          'raster-saturation': saturation,
          'raster-hue-rotate': hueRotate,
          'raster-resampling': smoothing ? 'linear' : 'nearest',
          'raster-fade-duration': 0,
        },
      }, beforeId);
    },
    [mode, product, tilt, site.radarId, radarOpacity, smoothing, colorTable]
  );

  const renderTowerPills = useCallback(
    (map: MapLibreMap) => {
      siteMarkersRef.current.forEach((m) => m.remove());
      siteMarkersRef.current = [];

      if (!showRadarSites) return;

      RADAR_SITES.forEach((s) => {
        const isActive = s.id === radarSite || s.radarId === radarSite;
        const pill = document.createElement('div');
        pill.className = 'ww-radar-pill ' + (isActive ? 'active' : '');
        pill.title = s.name + ' (' + s.id + ')';
        pill.innerHTML = '<span class="ww-dot"></span><span>' + s.radarId + '</span>';
        pill.addEventListener('click', (e) => {
          e.stopPropagation();
          if (onSelectSite) onSelectSite(s.id);
        });
        const marker = new maplibregl.Marker({ element: pill })
          .setLngLat([s.lon, s.lat])
          .addTo(map);
        siteMarkersRef.current.push(marker);
      });
    },
    [radarSite, showRadarSites, onSelectSite]
  );

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
      attributionControl: { compact: true },
    });

    mapRef.current = map;

    setTimeout(() => map.resize(), 100);
    setTimeout(() => map.resize(), 300);

    map.on('load', () => {
      setMapReady(true);
      map.resize();
      updateWarnings(map);
      updateSpcOutlooks(map);
      updateRadar(map);
      updateRangeRings(map, site.lat, site.lon);
      renderTowerPills(map);
    });

    map.on('error', (e: any) => {
      if (e && e.sourceId === RADAR_SOURCE_ID) {
        console.warn('[RadarMap] Tile load error for ' + product + ':', e.error ? e.error.message : 'unknown');
      }
    });

    return () => {
      siteMarkersRef.current.forEach((m) => m.remove());
      siteMarkersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [basemap]);

  useEffect(() => {
    if (mapRef.current && mapReady) {
      updateRadar(mapRef.current);
      updateSpcOutlooks(mapRef.current);
    }
  }, [product, tilt, spcDay, radarOpacity, smoothing, colorTable, mapReady, updateRadar, updateSpcOutlooks]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const vis = showRangeRings ? 'visible' : 'none';
    if (map.getLayer(RINGS_LAYER_ID)) map.setLayoutProperty(RINGS_LAYER_ID, 'visibility', vis);
    if (map.getLayer(RINGS_LABEL_ID)) map.setLayoutProperty(RINGS_LABEL_ID, 'visibility', vis);
  }, [showRangeRings, mapReady]);

  useEffect(() => {
    if (mapRef.current && mapReady) {
      renderTowerPills(mapRef.current);
    }
  }, [radarSite, showRadarSites, mapReady, renderTowerPills]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (radarSite !== 'US') {
      map.flyTo({ center: [site.lon, site.lat], zoom: 7.5, duration: 1100 });
      updateRangeRings(map, site.lat, site.lon);
    }
  }, [site.lon, site.lat, radarSite, mapReady, updateRangeRings]);

  return (
    <div style={{ position: 'absolute', inset: 0, width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
    </div>
  );
}
