'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { RADAR_SITES } from '../lib/radar-config';

export type MapType = 'street' | 'terrain' | 'satellite' | 'globe';

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
  frameUrl?: string | null;
  frameLabel?: string;
  showLightning?: boolean;
  showMetars?: boolean;
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
  frameUrl = null,
  frameLabel,
  showLightning = true,
  showMetars = false,
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

        map.on('click', SPC_OUTLOOK_FILL_ID, (e) => {
          const props = e.features?.[0]?.properties;
          if (!props) return;

          new maplibregl.Popup({ closeButton: true, offset: 10 })
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="font-family:system-ui;padding:4px 6px;">
                <b style="color:#f59e0b;font-size:13px;">SPC Day 1 Convective Risk</b>
                <div style="font-size:12px;margin-top:2px;">Risk Level: <strong>${props.LABEL || 'Active'}</strong></div>
              </div>`
            )
            .addTo(map);
        });
      }
    } catch (err) {
      console.warn('Could not load SPC outlooks layer:', err);
    }
  }, []);

  // 2. NWS Warnings Polygons
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

        map.on('click', NWS_WARNINGS_FILL_ID, (e) => {
          const props = e.features?.[0]?.properties;
          if (!props) return;

          const headline = props.headline || props.event || 'Severe Weather Warning';
          const severity = props.severity || 'Immediate';
          const isTor = props.event === 'Tornado Warning';
          const badgeBg = isTor ? '#dc2626' : '#d97706';

          new maplibregl.Popup({ closeButton: true, offset: 12 })
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="font-family:system-ui;padding:4px;max-width:260px;">
                <span style="background:${badgeBg};color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:bold;text-transform:uppercase;">${props.event}</span>
                <div style="font-size:12px;font-weight:bold;margin-top:6px;color:#0f172a;">${headline}</div>
                <div style="font-size:11px;color:#475569;margin-top:4px;">Severity: <b>${severity}</b></div>
              </div>`
            )
            .addTo(map);
        });
      }
    } catch (err) {
      console.warn('Could not load NWS warnings layer:', err);
    }
  }, []);

  // 3. Lightning Layer (NOAA GOES GLM)
  const installLightningLayer = useCallback((map: MapLibreMap) => {
    if (map.getSource(LIGHTNING_SOURCE_ID)) return;

    map.addSource(LIGHTNING_SOURCE_ID, {
      type: 'raster',
      tiles: ['https://realearth.ssec.wisc.edu/tiles/GOESEastGLMFEDRadC/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: 'NOAA GOES GLM Lightning © UW-SSEC RealEarth',
    });

    const beforeId = map.getLayer(NWS_WARNINGS_FILL_ID)
      ? NWS_WARNINGS_FILL_ID
      : map.getLayer(SITES_LAYER_ID)
      ? SITES_LAYER_ID
      : undefined;

    map.addLayer(
      {
        id: LIGHTNING_LAYER_ID,
        type: 'raster',
        source: LIGHTNING_SOURCE_ID,
        paint: {
          'raster-opacity': 0.88,
        },
        layout: {
          visibility: showLightning ? 'visible' : 'none',
        },
      },
      beforeId
    );
  }, [showLightning]);

  // 4. METAR Surface Observations Layer
  const installMETARLayer = useCallback(async (map: MapLibreMap) => {
    try {
      const res = await fetch('/api/metar/geojson');
      if (!res.ok) return;
      const data = await res.json();

      // Transform properties so temperature is rounded and formatted in °F
      const features = (data.features || []).map((f: any) => {
        const c = f.properties?.temp;
        const fahrenheit = c != null ? Math.round((c * 9) / 5 + 32) : null;
        return {
          ...f,
          properties: {
            ...f.properties,
            tempF: fahrenheit != null ? `${fahrenheit}°` : '',
            tempNumber: fahrenheit,
          },
        };
      });

      const processedGeoJSON = { type: 'FeatureCollection', features };

      if (!map.getSource(METAR_SOURCE_ID)) {
        map.addSource(METAR_SOURCE_ID, {
          type: 'geojson',
          data: processedGeoJSON,
        });

        // Small dot colored by flight rules (VFR: green, MVFR: blue, IFR: red, LIFR: magenta)
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
          layout: {
            visibility: showMetars ? 'visible' : 'none',
          },
        });

        // Temperature label right beside the dot
        map.addLayer({
          id: METAR_LABEL_LAYER_ID,
          type: 'symbol',
          source: METAR_SOURCE_ID,
          layout: {
            'text-field': ['get', 'tempF'],
            'text-size': 11,
            'text-offset': [1.2, 0],
            'text-anchor': 'left',
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            visibility: showMetars ? 'visible' : 'none',
          },
          paint: {
            'text-color': '#f8fafc',
            'text-halo-color': '#020617',
            'text-halo-width': 1.5,
          },
        });

        // METAR Click Popup
        map.on('click', METAR_CIRCLE_LAYER_ID, (e) => {
          const props = e.features?.[0]?.properties;
          if (!props) return;

          const dewpF = props.dewp != null ? `${Math.round((props.dewp * 9) / 5 + 32)}°F` : 'N/A';
          const wind = props.wspd != null ? `${props.wdir || 'VRB'}° @ ${props.wspd} kt` : 'Calm';
          const gust = props.wgst ? ` G ${props.wgst} kt` : '';

          new maplibregl.Popup({ closeButton: true, offset: 8 })
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="font-family:system-ui;padding:4px 6px;min-width:170px;">
                <b style="color:#38bdf8;font-size:13px;">${props.id || 'METAR Station'}</b>
                <span style="font-size:10px;background:#334155;color:#f8fafc;padding:1px 5px;border-radius:4px;margin-left:6px;">${props.fltcat || 'VFR'}</span>
                <div style="font-size:12px;margin-top:5px;color:#0f172a;font-weight:bold;">
                  Temp: <span style="color:#0284c7;">${props.tempF}</span> | Dew: <span style="color:#0d9488;">${dewpF}</span>
                </div>
                <div style="font-size:11px;color:#475569;margin-top:3px;">Wind: <b>${wind}${gust}</b></div>
                <div style="font-size:10px;color:#64748b;margin-top:2px;">Altimeter: ${props.altim ? (props.altim / 100).toFixed(2) + ' inHg' : 'N/A'}</div>
              </div>`
            )
            .addTo(map);
        });

        map.on('mouseenter', METAR_CIRCLE_LAYER_ID, () => {
          map.getCanvas().style.cursor = 'pointer';
        });

        map.on('mouseleave', METAR_CIRCLE_LAYER_ID, () => {
          map.getCanvas().style.cursor = '';
        });
      }
    } catch (err) {
      console.warn('Could not load METAR layer:', err);
    }
  }, [showMetars]);

  // 5. Radar Layer
  const installOrUpdateRadarLayer = useCallback(
    (map: MapLibreMap, tileUrl: string) => {
      if (!tileUrl) return;

      if (map.getLayer(RADAR_LAYER_ID)) {
        map.removeLayer(RADAR_LAYER_ID);
      }

      if (map.getSource(RADAR_SOURCE_ID)) {
        map.removeSource(RADAR_SOURCE_ID);
      }

      map.addSource(RADAR_SOURCE_ID, {
        type: 'raster',
        tiles: [tileUrl],
        tileSize: 256,
        scheme: 'xyz',
        attribution: 'NEXRAD Level III via Iowa Environmental Mesonet',
      });

      const beforeId = map.getLayer(LIGHTNING_LAYER_ID)
        ? LIGHTNING_LAYER_ID
        : map.getLayer(NWS_WARNINGS_FILL_ID)
        ? NWS_WARNINGS_FILL_ID
        : undefined;

      map.addLayer(
        {
          id: RADAR_LAYER_ID,
          type: 'raster',
          source: RADAR_SOURCE_ID,
          paint: {
            'raster-opacity': 0.88,
            'raster-fade-duration': 0,
          },
        },
        beforeId
      );

      currentTileUrlRef.current = tileUrl;
    },
    []
  );

  // 6. Spotter Pins
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

      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features,
      };

      const source = map.getSource(SPOTTER_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;

      if (source) {
        source.setData(geojson);
      } else {
        map.addSource(SPOTTER_SOURCE_ID, {
          type: 'geojson',
          data: geojson,
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

        map.addLayer({
          id: SPOTTER_LABEL_LAYER_ID,
          type: 'symbol',
          source: SPOTTER_SOURCE_ID,
          layout: {
            'text-field': ['get', 'hazardType'],
            'text-size': 10,
            'text-offset': [0, 1.4],
            'text-anchor': 'top',
          },
          paint: {
            'text-color': '#f8fafc',
            'text-halo-color': '#000000',
            'text-halo-width': 1.5,
          },
        });

        map.on('click', SPOTTER_LAYER_ID, (e) => {
          const props = e.features?.[0]?.properties;
          if (!props) return;

          new maplibregl.Popup({ closeButton: true, offset: 10 })
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="font-family:system-ui;padding:4px;min-width:180px;">
                <b style="color:#06b6d4;font-size:12px;">Spotter: ${props.hazardType}</b>
                <div style="font-size:11px;color:#1e293b;margin-top:2px;">${props.description || 'Verified report'}</div>
                <div style="font-size:9px;color:#64748b;margin-top:4px;">By: ${props.callsign} • ${props.timestamp}</div>
              </div>`
            )
            .addTo(map);
        });
      }
    },
    []
  );

  // 7. NEXRAD Sites
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
        data: {
          type: 'FeatureCollection',
          features,
        },
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
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-anchor': 'center',
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: {
          'text-color': '#f1f5f9',
          'text-halo-color': 'rgba(0,0,0,0.7)',
          'text-halo-width': 1,
        },
      });

      map.on('click', SITES_LAYER_ID, (e) => {
        const feature = e.features?.[0];
        if (!feature || feature.geometry.type !== 'Point') return;

        const coords = (feature.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
        const props = feature.properties as { radarId: string; name: string } | null;
        if (!props) return;

        new maplibregl.Popup({ closeButton: true, offset: 14 })
          .setLngLat(coords)
          .setHTML(
            `<div style="font-family:system-ui;padding:2px 4px;">
              <strong style="color:#0891b2;">NEXRAD ${props.radarId}</strong>
              <div style="color:#64748b;font-size:12px;">${props.name}</div>
            </div>`
          )
          .addTo(map);
      });
    },
    [radarSite]
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
      style: makeStyle(mapType),
      center: [site.lon, site.lat],
      zoom: 7.2,
      attributionControl: { compact: true },
    });

    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 120 }), 'bottom-left');

    map.on('load', async () => {
      if (mapType === 'terrain') {
        map.setTerrain({
          source: TERRAIN_SOURCE_ID,
          exaggeration: 1,
        });
      }

      await installSPCOutlooks(map);
      await installOrUpdateNWSWarnings(map);
      installLightningLayer(map);
      await installMETARLayer(map);
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
        layers: [SITES_LAYER_ID, SPOTTER_LAYER_ID, NWS_WARNINGS_FILL_ID, METAR_CIRCLE_LAYER_ID],
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

    const warningsTimer = setInterval(() => {
      if (mapRef.current && mapReady) {
        void installOrUpdateNWSWarnings(mapRef.current);
      }
    }, 60000);

    return () => {
      clearInterval(warningsTimer);
      map.remove();
      mapRef.current = null;
      currentTileUrlRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapType]);

  // Toggle Lightning Layer Visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (map.getLayer(LIGHTNING_LAYER_ID)) {
      map.setLayoutProperty(
        LIGHTNING_LAYER_ID,
        'visibility',
        showLightning ? 'visible' : 'none'
      );
    }
  }, [showLightning, mapReady]);

  // Toggle METAR Layer Visibility
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
    if (mapRef.current && mapReady) {
      installOrUpdateSpotterPins(mapRef.current, allSpotters);
    }
  }, [allSpotters, mapReady, installOrUpdateSpotterPins]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    map.flyTo({
      center: [site.lon, site.lat],
      zoom: 7.2,
      essential: true,
      duration: 1100,
    });

    const source = map.getSource(SITES_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (source) {
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
          isActive: s.id === site.id || s.radarId === site.radarId,
        },
      }));

      source.setData({
        type: 'FeatureCollection',
        features,
      });
    }
  }, [site.id, site.lon, site.lat, site.radarId, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !frameUrl) return;
    if (frameUrl === currentTileUrlRef.current) return;

    installOrUpdateRadarLayer(map, frameUrl);
    setRadarStatus(`NEXRAD ${site.radarId} · ${productLabel} · ${frameLabel || 'frame'}`);
  }, [frameUrl, frameLabel, mapReady, site.radarId, productLabel, installOrUpdateRadarLayer]);

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

        if (!response.ok) {
          throw new Error(data.error || 'NEXRAD unavailable');
        }

        const url =
          data.frames && data.frames.length > 0
            ? data.frames[data.frames.length - 1].tileUrl
            : data.tileUrl;

        const liveMap = mapRef.current;
        if (url && liveMap) {
          installOrUpdateRadarLayer(liveMap, url);
          setRadarStatus(`NEXRAD ${site.radarId} · ${productLabel} · latest scan`);
        } else {
          setRadarStatus(`No radar frames available for ${site.radarId}`);
        }
      } catch (err) {
        console.error('NEXRAD load failed:', err);
        if (!cancelled) {
          setRadarStatus(`NEXRAD ${site.radarId} radar unavailable`);
        }
      }
    }

    void loadLatest();
    const timer = setInterval(() => void loadLatest(), 5 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
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
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-red-600" /> TOR
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-500" /> SVR
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> FFW
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-cyan-400" /> ⚡ GLM
        </span>
      </div>
    </div>
  );
}
