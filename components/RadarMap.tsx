'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { RADAR_SITES } from '../lib/radar-config';

export type MapType = 'street' | 'terrain' | 'satellite' | 'globe';
export type PaletteType = 'nws' | 'radarscope' | 'cod' | 'smooth' | 'couplet';

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
  mapType: MapType;
  palette?: PaletteType;
  frameUrl?: string | null;
  frameLabel?: string;
  showLightning?: boolean;
  showMetars?: boolean;
  showLSR?: boolean;
  showWatches?: boolean;
  spotterReports?: SpotterPin[];
  onMapClickCoordinates?: (coords: [number, number]) => void;
};

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

const SITES_SOURCE_ID = 'nexrad-sites';
const SITES_LAYER_ID = 'nexrad-sites-pills';
const SITES_LABEL_LAYER_ID = 'nexrad-sites-labels';

const NWS_WARNINGS_SOURCE_ID = 'nws-warnings';
const NWS_WARNINGS_FILL_ID = 'nws-warnings-fill';
const NWS_WARNINGS_LINE_ID = 'nws-warnings-line';

const SPC_OUTLOOK_SOURCE_ID = 'spc-outlooks';
const SPC_OUTLOOK_FILL_ID = 'spc-outlooks-fill';
const SPC_OUTLOOK_LINE_ID = 'spc-outlooks-line';

const SPOTTER_SOURCE_ID = 'spotter-pins';
const SPOTTER_LAYER_ID = 'spotter-pins-circle';
const SPOTTER_LABEL_LAYER_ID = 'spotter-pins-label';

const TERRAIN_SOURCE_ID = 'terrainSource';

function makeStyle(mapType: MapType): StyleSpecification {
  const satellite = mapType === 'satellite' || mapType === 'globe';

  return {
    version: 8,
    sources: {
      basemap: satellite
        ? {
            type: 'raster',
            tiles: [
              'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg',
            ],
            tileSize: 256,
            attribution: 'Sentinel-2 cloudless © EOX',
          }
        : {
            type: 'raster',
            tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            maxzoom: 19,
            attribution: '© OpenStreetMap contributors',
          },

      [TERRAIN_SOURCE_ID]: {
        type: 'raster-dem',
        url: 'https://tiles.mapterhorn.com/tilejson.json',
        tileSize: 256,
        attribution: 'Terrain © MapTiler/Mapterhorn',
      },

      'hillshade-source': {
        type: 'raster-dem',
        url: 'https://tiles.mapterhorn.com/tilejson.json',
        tileSize: 256,
      },
    },

    layers: [
      {
        id: 'basemap-layer',
        type: 'raster',
        source: 'basemap',
      },
      ...(mapType === 'terrain'
        ? [
            {
              id: 'terrain-hillshade',
              type: 'hillshade' as const,
              source: 'hillshade-source',
              paint: {
                'hillshade-shadow-color': '#473b24',
                'hillshade-exaggeration': 0.35,
              },
            },
          ]
        : []),
    ],

    ...(mapType === 'globe'
      ? {
          projection: { type: 'globe' as const },
          sky: {
            'atmosphere-blend': [
              'interpolate',
              ['linear'],
              ['zoom'],
              0,
              1,
              5,
              1,
              7,
              0,
            ],
          },
        }
      : {}),

    ...(mapType === 'terrain'
      ? {
          terrain: {
            source: TERRAIN_SOURCE_ID,
            exaggeration: 1,
          },
        }
      : {}),
  };
}

export function RadarMap({
  product,
  radarSite = 'KLZK',
  mapType,
  palette = 'nws',
  frameUrl = null,
  frameLabel,
  showLightning = true,
  showMetars = false,
  showLSR = true,
  showWatches = true,
  spotterReports = [],
  onMapClickCoordinates,
}: RadarMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const currentTileUrlRef = useRef<string | null>(null);

  const [radarStatus, setRadarStatus] = useState('Initializing map…');
  const [mapReady, setMapReady] = useState(false);
  const [localSpotters, setLocalSpotters] = useState<SpotterPin[]>([]);

  const site =
    RADAR_SITES.find((s) => s.id === radarSite || s.radarId === radarSite) ||
    RADAR_SITES[0];

  const productLabel = product.toUpperCase();
  const allSpotters = [...spotterReports, ...localSpotters];

  // 1. SPC Convective Outlooks
  const installSPCOutlooks = useCallback(async (map: MapLibreMap) => {
    try {
      const res = await fetch('/api/spc/outlooks');
      if (!res.ok) return;
      const data = await res.json();

      if (!map.getSource(SPC_OUTLOOK_SOURCE_ID)) {
        map.addSource(SPC_OUTLOOK_SOURCE_ID, {
          type: 'geojson',
          data,
        });

        map.addLayer({
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

        map.addLayer({
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
    } catch (err) {
      console.warn('Could not load SPC outlooks layer:', err);
    }
  }, []);

  // 2. Watch Boxes (Tornado & Severe T-Storm)
  const installWatchesLayer = useCallback(async (map: MapLibreMap) => {
    try {
      const res = await fetch('/api/watches');
      if (!res.ok) return;
      const data = await res.json();

      if (!map.getSource(WATCHES_SOURCE_ID)) {
        map.addSource(WATCHES_SOURCE_ID, {
          type: 'geojson',
          data: data as any,
        });

        map.addLayer({
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
          layout: {
            visibility: showWatches ? 'visible' : 'none',
          },
        });

        map.addLayer({
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
          layout: {
            visibility: showWatches ? 'visible' : 'none',
          },
        });

        map.on('click', WATCHES_FILL_LAYER_ID, (e) => {
          const props = e.features?.[0]?.properties;
          if (!props) return;

          new maplibregl.Popup({ closeButton: true, offset: 10 })
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="font-family:system-ui;padding:4px 6px;">
                <b style="color:#ef4444;font-size:13px;">${props.event}</b>
                <div style="font-size:11px;color:#334155;margin-top:2px;">${props.headline || 'Active NWS Watch'}</div>
              </div>`
            )
            .addTo(map);
        });
      }
    } catch (err) {
      console.warn('Could not load watches layer:', err);
    }
  }, [showWatches]);

  // 3. Live NWS Local Storm Reports (LSR)
  const installLSRLayer = useCallback(async (map: MapLibreMap) => {
    try {
      const res = await fetch('/api/lsr');
      if (!res.ok) return;
      const data = await res.json();

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

      const processed = { type: 'FeatureCollection', features };

      if (!map.getSource(LSR_SOURCE_ID)) {
        map.addSource(LSR_SOURCE_ID, {
          type: 'geojson',
          data: processed as any,
        });

        map.addLayer({
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
          layout: {
            visibility: showLSR ? 'visible' : 'none',
          },
        });

        map.addLayer({
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

        map.on('click', LSR_CIRCLE_LAYER_ID, (e) => {
          const props = e.features?.[0]?.properties;
          if (!props) return;

          new maplibregl.Popup({ closeButton: true, offset: 10 })
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="font-family:system-ui;padding:4px 6px;max-width:240px;">
                <b style="color:#0284c7;font-size:12px;">NWS Local Storm Report: ${props.badge}</b>
                ${props.magnitude ? `<div style="font-size:11px;font-weight:bold;color:#0f172a;margin-top:2px;">Measurement: ${props.magnitude}</div>` : ''}
                <div style="font-size:10px;color:#475569;margin-top:3px;">${props.city || ''}, ${props.county || ''} (${props.state || ''})</div>
                <div style="font-size:10px;color:#334155;margin-top:4px;line-height:1.3;">"${props.remark || 'Reported to NWS'}"</div>
              </div>`
            )
            .addTo(map);
        });
      }
    } catch (err) {
      console.warn('Could not load LSR layer:', err);
    }
  }, [showLSR]);

  // 4. NWS Warnings Polygons
  const installOrUpdateNWSWarnings = useCallback(async (map: MapLibreMap) => {
    try {
      const res = await fetch('/api/warnings');
      if (!res.ok) return;
      const data = await res.json();

      const source = map.getSource(NWS_WARNINGS_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;

      if (source) {
        source.setData(data);
      } else {
        map.addSource(NWS_WARNINGS_SOURCE_ID, {
          type: 'geojson',
          data,
        });

        map.addLayer({
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

        map.addLayer({
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
    } catch (err) {
      console.warn('Could not load NWS warnings layer:', err);
    }
  }, []);

  // 5. Lightning Layer (NOAA GOES GLM)
  const installLightningLayer = useCallback((map: MapLibreMap) => {
    if (map.getSource(LIGHTNING_SOURCE_ID)) return;

    map.addSource(LIGHTNING_SOURCE_ID, {
      type: 'raster',
      tiles: ['https://realearth.ssec.wisc.edu/tiles/GOESEastGLMFEDRadC/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: 'NOAA GOES GLM Lightning © UW-SSEC RealEarth',
    });

    map.addLayer({
      id: LIGHTNING_LAYER_ID,
      type: 'raster',
      source: LIGHTNING_SOURCE_ID,
      paint: { 'raster-opacity': 0.88 },
      layout: { visibility: showLightning ? 'visible' : 'none' },
    });
  }, [showLightning]);

  // 6. METAR Surface Observations Layer
  const installMETARLayer = useCallback(async (map: MapLibreMap) => {
    try {
      const res = await fetch('/api/metar/geojson');
      if (!res.ok) return;
      const data = await res.json();

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

      const processed = { type: 'FeatureCollection', features };

      if (!map.getSource(METAR_SOURCE_ID)) {
        map.addSource(METAR_SOURCE_ID, {
          type: 'geojson',
          data: processed as any,
        });

        map.addLayer({
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

        map.addLayer({
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
    } catch (err) {
      console.warn('Could not load METAR layer:', err);
    }
  }, [showMetars]);

  // 7. Radar Layer (with Palette Filter adjustments)
  const installOrUpdateRadarLayer = useCallback(
    (map: MapLibreMap, tileUrl: string) => {
      if (!tileUrl) return;

      if (map.getLayer(RADAR_LAYER_ID)) map.removeLayer(RADAR_LAYER_ID);
      if (map.getSource(RADAR_SOURCE_ID)) map.removeSource(RADAR_SOURCE_ID);

      map.addSource(RADAR_SOURCE_ID, {
        type: 'raster',
        tiles: [tileUrl],
        tileSize: 256,
        scheme: 'xyz',
        attribution: 'NEXRAD Level III via Iowa Environmental Mesonet',
      });

      // Palette visual adjustments
      let contrast = 0;
      let saturation = 0;
      let brightnessMin = 0;

      if (palette === 'radarscope') {
        contrast = 0.25;
        saturation = 0.35;
      } else if (palette === 'cod') {
        contrast = -0.1;
        saturation = 0.2;
      } else if (palette === 'smooth') {
        contrast = 0.1;
        saturation = 0.15;
      } else if (palette === 'couplet') {
        contrast = 0.4;
        saturation = 0.5;
      }

      map.addLayer({
        id: RADAR_LAYER_ID,
        type: 'raster',
        source: RADAR_SOURCE_ID,
        paint: {
          'raster-opacity': 0.88,
          'raster-contrast': contrast,
          'raster-saturation': saturation,
          'raster-brightness-min': brightnessMin,
          'raster-fade-duration': 0,
        },
      });

      currentTileUrlRef.current = tileUrl;
    },
    [palette]
  );

  // 8. Spotter Pins
  const installOrUpdateSpotterPins = useCallback(
    (map: MapLibreMap, pins: SpotterPin[]) => {
      const features = pins.map((p) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [p.lon, p.lat],
        },
        properties: {
          id: p.id,
          hazardType: p.hazardType,
          description: p.description,
          callsign: p.callsign,
          timestamp: p.timestamp,
        },
      }));

      const geojson = { type: 'FeatureCollection', features };
      const source = map.getSource(SPOTTER_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;

      if (source) {
        source.setData(geojson as any);
      } else {
        map.addSource(SPOTTER_SOURCE_ID, {
          type: 'geojson',
          data: geojson as any,
        });

        map.addLayer({
          id: `${SPOTTER_LAYER_ID}-glow`,
          type: 'circle',
          source: SPOTTER_SOURCE_ID,
          paint: {
            'circle-radius': 14,
            'circle-color': '#06b6d4',
            'circle-opacity': 0.3,
          },
        });

        map.addLayer({
          id: SPOTTER_LAYER_ID,
          type: 'circle',
          source: SPOTTER_SOURCE_ID,
          paint: {
            'circle-radius': 7,
            'circle-color': [
              'match',
              ['get', 'hazardType'],
              'Tornado', '#ef4444',
              'Wall Cloud', '#f97316',
              'Large Hail', '#06b6d4',
              'Damaging Wind', '#eab308',
              'Flash Flood', '#10b981',
              '#3b82f6',
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
        });
      }
    },
    []
  );

  // 9. NEXRAD Sites
  const installSiteMarkers = useCallback(
    (map: MapLibreMap) => {
      if (map.getSource(SITES_SOURCE_ID)) return;

      const features = RADAR_SITES.map((s) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [s.lon, s.lat],
        },
        properties: {
          radarId: s.radarId,
          name: s.name,
          id: s.id,
          isActive: s.id === radarSite || s.radarId === radarSite,
        },
      }));

      map.addSource(SITES_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features } as any,
      });

      map.addLayer({
        id: SITES_LAYER_ID,
        type: 'circle',
        source: SITES_SOURCE_ID,
        paint: {
          'circle-radius': ['case', ['get', 'isActive'], 18, 13],
          'circle-color': ['case', ['get', 'isActive'], '#0891b2', '#1e293b'],
          'circle-stroke-width': 2,
          'circle-stroke-color': ['case', ['get', 'isActive'], '#22d3ee', '#475569'],
          'circle-opacity': 0.95,
        },
      });

      map.addLayer({
        id: SITES_LABEL_LAYER_ID,
        type: 'symbol',
        source: SITES_SOURCE_ID,
        layout: {
          'text-field': ['get', 'radarId'],
          'text-size': ['case', ['get', 'isActive'], 11, 10],
          'text-anchor': 'center',
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#f1f5f9',
          'text-halo-color': 'rgba(0,0,0,0.7)',
          'text-halo-width': 1,
        },
      });
    },
    [radarSite]
  );

  // Map Initialization
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
      style: makeStyle(mapType),
      center: [site.lon, site.lat],
      zoom: 7.2,
      attributionControl: { compact: true },
    });

    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 120 }), 'bottom-left');

    map.on('load', async () => {
      await installSPCOutlooks(map);
      await installWatchesLayer(map);
      await installOrUpdateNWSWarnings(map);
      installLightningLayer(map);
      await installMETARLayer(map);
      await installLSRLayer(map);
      installSiteMarkers(map);
      installOrUpdateSpotterPins(map, allSpotters);

      setMapReady(true);
      setRadarStatus(`Map ready · ${site.radarId}`);
    });

    map.on('click', (e) => {
      const bbox: [maplibregl.PointLike, maplibregl.PointLike] = [
        [e.point.x - 5, e.point.y - 5],
        [e.point.x + 5, e.point.y + 5],
      ];

      const features = map.queryRenderedFeatures(bbox, {
        layers: [SITES_LAYER_ID, SPOTTER_LAYER_ID, NWS_WARNINGS_FILL_ID, METAR_CIRCLE_LAYER_ID, LSR_CIRCLE_LAYER_ID, WATCHES_FILL_LAYER_ID],
      });

      if (features.length > 0) return;

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
      map.remove();
      mapRef.current = null;
      currentTileUrlRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapType]);

  // Toggle Visibility Effects
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

  // Frame URL effect
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !frameUrl) return;
    if (frameUrl === currentTileUrlRef.current) return;

    installOrUpdateRadarLayer(map, frameUrl);
    setRadarStatus(`NEXRAD ${site.radarId} · ${productLabel} · ${frameLabel || 'frame'}`);
  }, [frameUrl, frameLabel, mapReady, site.radarId, productLabel, installOrUpdateRadarLayer]);

  // Fallback radar fetch
  useEffect(() => {
    if (!mapReady || frameUrl) return;
    let cancelled = false;

    async function loadLatest() {
      const map = mapRef.current;
      if (!map || cancelled) return;

      try {
        setRadarStatus(`Loading ${site.radarId} ${productLabel}…`);
        const response = await fetch(
          `/api/nexrad/frames?site=${encodeURIComponent(site.radarId)}&product=${encodeURIComponent(product)}`,
          { cache: 'no-store' }
        );
        const data = await response.json();
        if (cancelled) return;

        const url = data.frames && data.frames.length > 0 ? data.frames[data.frames.length - 1].tileUrl : data.tileUrl;
        const liveMap = mapRef.current;
        if (url && liveMap) {
          installOrUpdateRadarLayer(liveMap, url);
          setRadarStatus(`NEXRAD ${site.radarId} · ${productLabel} · latest scan`);
        }
      } catch (err) {
        console.error('NEXRAD load failed:', err);
      }
    }

    void loadLatest();
  }, [mapReady, site.radarId, product, frameUrl, installOrUpdateRadarLayer, productLabel]);

  return (
    <div className="radar-map-root relative h-full w-full">
      <div
        ref={containerRef}
        className="radar-map-container absolute inset-0"
        aria-label={`${mapType} map with NEXRAD ${productLabel} from ${site.radarId}`}
      />

      <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex items-center gap-2 rounded-md bg-slate-950/85 px-3 py-1.5 text-[11px] font-medium text-slate-200 shadow-lg backdrop-blur">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            radarStatus.includes('latest') || radarStatus.includes('LIVE')
              ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
              : 'bg-amber-400'
          }`}
        />
        {radarStatus}
      </div>

      <div className="pointer-events-none absolute bottom-3 right-3 z-10 hidden sm:flex items-center gap-3 rounded-md bg-slate-950/80 px-2.5 py-1 text-[10px] text-slate-400 backdrop-blur">
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-red-600" /> TOR</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-amber-500" /> SVR</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-blue-500" /> LSR</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-red-400" /> Watch</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-cyan-400" /> ⚡ GLM</span>
      </div>
    </div>
  );
}
