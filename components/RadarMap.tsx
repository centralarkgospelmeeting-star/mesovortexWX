'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { RADAR_SITES } from '../lib/radar-config';
import { ParsedPalCurve } from './PalColorTableModal';
import { ActivePlacefile } from './PlacefileManagerModal';

export type MapType = 'street' | 'terrain' | 'satellite' | 'globe';
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

type RadarMapProps = {
  product: string;
  radarSite?: string;
  mapType?: MapType;
  palette?: PaletteType;
  palCurve?: ParsedPalCurve | null;
  activePlacefiles?: ActivePlacefile[];
  frameUrl?: string | null;
  frameLabel?: string;
  fastScan?: boolean;
  showLightning?: boolean;
  showMetars?: boolean;
  showLSR?: boolean;
  showWatches?: boolean;
  showRadarPills?: boolean;
  spotterReports?: SpotterPin[];
  onSelectSite?: (siteId: string) => void;
  onMapClickCoordinates?: (coords: [number, number]) => void;
};

const MAPTILER_KEY = '4JiuLmexmU5wIex7AETD';

const RADAR_SOURCE_ID = 'mesovortex-nexrad';
const RADAR_LAYER_ID = 'mesovortex-nexrad-layer';

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
  palette = 'nws',
  palCurve = null,
  activePlacefiles = [],
  frameUrl = null,
  frameLabel,
  fastScan = true,
  showLightning = true,
  showMetars = false,
  showLSR = true,
  showWatches = true,
  showRadarPills = true,
  spotterReports = [],
  onSelectSite,
  onMapClickCoordinates,
}: RadarMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const currentTileUrlRef = useRef<string | null>(null);
  const siteMarkersRef = useRef<maplibregl.Marker[]>([]);

  const [mapReady, setMapReady] = useState(false);
  const [localSpotters, setLocalSpotters] = useState<SpotterPin[]>([]);

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

  // 1. SPC Outlooks
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
              'fill-opacity': 0.22,
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
                'rgba(255,255,255,0.4)',
              ],
              'line-width': 1.5,
              'line-dasharray': [3, 2],
            },
          });
        }
      })
      .catch((err) => console.warn('SPC notice:', err));
  }, []);

  // 2. Watch Boxes
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

  // 3. Local Storm Reports (LSR)
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

  // 4. Warnings Polygons
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

  // 5. Lightning Layer
  const installLightningLayer = useCallback((map: MapLibreMap) => {
    if (map.getSource(LIGHTNING_SOURCE_ID)) return;

    map.addSource(LIGHTNING_SOURCE_ID, {
      type: 'raster',
      tiles: ['https://realearth.ssec.wisc.edu/tiles/GOESEastGLMFEDRadC/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: 'NOAA GOES GLM Lightning © UW-SSEC RealEarth',
    });

    safeAddLayer(map, {
      id: LIGHTNING_LAYER_ID,
      type: 'raster',
      source: LIGHTNING_SOURCE_ID,
      paint: { 'raster-opacity': 0.88 },
      layout: { visibility: showLightning ? 'visible' : 'none' },
    });
  }, [showLightning]);

  // 6. METAR Layer
  const installMETARLayer = useCallback((map: MapLibreMap) => {
    fetch('/api/metar/geojson')
      .then((res) => res.json())
      .then((data) => {
        const features = (data.features || []).map((f: any) => {
          const c = f.properties?.temp;
          const fahrenheit = c != null ? Math.round((c * 9) / 5 + 32) : null;
          return {
            ...f,
            properties: {
              ...f.properties,
              tempF: fahrenheit != null ? `${fahrenheit}°` : '',
            },
          };
        });

        if (!map.getSource(METAR_SOURCE_ID)) {
          map.addSource(METAR_SOURCE_ID, {
            type: 'geojson',
            data: { type: 'FeatureCollection', features } as any,
          });

          safeAddLayer(map, {
            id: METAR_CIRCLE_LAYER_ID,
            type: 'circle',
            source: METAR_SOURCE_ID,
            paint: {
              'circle-radius': 4.5,
              'circle-color': [
                'match',
                ['get', 'fltcat'],
                'VFR', '#22c55e',
                'MVFR', '#3b82f6',
                'IFR', '#ef4444',
                'LIFR', '#d946ef',
                '#94a3b8',
              ],
              'circle-stroke-width': 1.5,
              'circle-stroke-color': '#0f172a',
            },
            layout: { visibility: showMetars ? 'visible' : 'none' },
          });

          safeAddLayer(map, {
            id: METAR_LABEL_LAYER_ID,
            type: 'symbol',
            source: METAR_SOURCE_ID,
            layout: {
              'text-field': ['get', 'tempF'],
              'text-size': 11,
              'text-offset': [1.2, 0],
              'text-anchor': 'left',
              visibility: showMetars ? 'visible' : 'none',
            },
            paint: {
              'text-color': '#f8fafc',
              'text-halo-color': '#020617',
              'text-halo-width': 1.5,
            },
          });
        }
      })
      .catch((err) => console.warn('METAR notice:', err));
  }, [showMetars]);

  // 7. Placefiles Renderer
  const installPlacefiles = useCallback((map: MapLibreMap, placefiles: ActivePlacefile[]) => {
    placefiles.forEach((pf) => {
      const sourceId = `pf-src-${pf.id}`;
      const layerId = `pf-layer-${pf.id}`;
      const labelLayerId = `pf-label-${pf.id}`;

      if (!pf.enabled) {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getLayer(labelLayerId)) map.removeLayer(labelLayerId);
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
              id: layerId,
              type: 'circle',
              source: sourceId,
              paint: {
                'circle-radius': 5,
                'circle-color': ['get', 'color'],
                'circle-stroke-width': 1.5,
                'circle-stroke-color': '#ffffff',
              },
            });

            safeAddLayer(map, {
              id: labelLayerId,
              type: 'symbol',
              source: sourceId,
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

  // 8. RADAR LAYER (Full Dual-Pol CC, ZDR, KDP & Palettes)
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
          attribution: 'NEXRAD Level III & MRMS Dual-Pol',
        });

        // Dynamic Dual-Pol & Reflectivity Shader curves
        let contrast = 0.15;
        let saturation = 0.3;
        let brightnessMin = 0.0;
        let hueRotate = 0;

        if (product === 'cc') {
          // Correlation Coefficient (Debris Signature Emphasis)
          contrast = 0.65;
          saturation = 0.85;
          hueRotate = -45;
        } else if (product === 'zdr') {
          // Differential Reflectivity (Hail Size)
          contrast = 0.45;
          saturation = 0.7;
          hueRotate = 90;
        } else if (product === 'kdp') {
          // Specific Differential Phase (Heavy Rain)
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

        const beforeId = map.getLayer(LIGHTNING_LAYER_ID)
          ? LIGHTNING_LAYER_ID
          : map.getLayer(NWS_WARNINGS_FILL_ID)
          ? NWS_WARNINGS_FILL_ID
          : undefined;

        safeAddLayer(
          map,
          {
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
          },
          beforeId
        );

        currentTileUrlRef.current = tileUrl;
      } catch (err) {
        console.warn('Radar layer update notice:', err);
      }
    },
    [palette, palCurve, product]
  );

  // 9. On-Map WeatherWise Radar Tower Pills
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
      installWatchesLayer(map);
      installOrUpdateNWSWarnings(map);
      installLightningLayer(map);
      installMETARLayer(map);
      installLSRLayer(map);
      renderWeatherWiseRadarPills(map);
      installPlacefiles(map, activePlacefiles);
    });

    map.on('click', (e) => {
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
  }, []);

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

  // Fly to site on selection
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    map.flyTo({
      center: [site.lon, site.lat],
      zoom: 7.4,
      essential: true,
      duration: 1100,
    });
  }, [site.lon, site.lat, mapReady]);

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
        `/api/nexrad/frames?site=${encodeURIComponent(site.radarId)}&product=${encodeURIComponent(product)}${cacheBuster}`,
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
  }, [mapReady, site.radarId, product, frameUrl, fastScan, installOrUpdateRadarLayer]);

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <div
        ref={containerRef}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
      />
    </div>
  );
}
