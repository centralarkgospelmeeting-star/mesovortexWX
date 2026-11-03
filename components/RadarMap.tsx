'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Popup, Rectangle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const productColors: Record<string, string> = {
  ref: '#38bdf8',
  vel: '#34d399',
  srvel: '#f59e0b',
  dualpol: '#c084fc',
  et: '#f97316',
  vil: '#f43f5e'
};

type RadarMapProps = {
  product: string;
  isLooping: boolean;
  radarSite?: string;
};

export function RadarMap({ product, isLooping, radarSite = 'KOUN' }: RadarMapProps) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [radarFrames, setRadarFrames] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const loopIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const radarLayerRef = useRef<L.ImageOverlay | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Fetch real radar frames from NEXRAD
  useEffect(() => {
    const fetchRadarFrames = async () => {
      try {
        const response = await fetch(`/api/nexrad/frames?site=${radarSite}&limit=6`);
        const data = await response.json();
        if (data.frames && data.frames.length > 0) {
          setRadarFrames(data.frames);
          setIsLoaded(true);
        }
      } catch (error) {
        console.error('Failed to fetch radar frames:', error);
        // Fallback to placeholder
        setRadarFrames(['placeholder']);
      }
    };

    fetchRadarFrames();
    const interval = setInterval(fetchRadarFrames, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, [radarSite]);

  // Handle loop animation
  useEffect(() => {
    if (isLooping && radarFrames.length > 0) {
      loopIntervalRef.current = setInterval(() => {
        setFrameIndex((prev) => (prev + 1) % radarFrames.length);
      }, 500);
    } else {
      if (loopIntervalRef.current) {
        clearInterval(loopIntervalRef.current);
      }
      setFrameIndex(0);
    }

    return () => {
      if (loopIntervalRef.current) {
        clearInterval(loopIntervalRef.current);
      }
    };
  }, [isLooping, radarFrames.length]);

  const handleMapCreated = (map: L.Map) => {
    mapRef.current = map;
  };

  return (
    <div className="h-full w-full">
      <MapContainer
        center={[35.3395, -97.4867]}
        zoom={7}
        scrollWheelZoom
        className="h-full w-full"
        ref={handleMapCreated as any}
      >
        {/* Base map layer */}
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* RainViewer radar overlay */}
        <TileLayer
          url="https://tilecache.rainviewer.com/v2/radar/1695312000/tiles/{z}/{x}/{y}/2/1_1.png"
          attribution="RainViewer"
          opacity={0.7}
          zIndex={100}
        />

        {/* Fallback colored rectangle for visualization */}
        <Rectangle
          bounds={[[25, -125], [50, -65]]}
          pathOptions={{
            color: productColors[product] || '#38bdf8',
            weight: 1,
            opacity: isLooping ? 0.1 + (frameIndex / (radarFrames.length || 1)) * 0.2 : 0.2,
            fillColor: productColors[product] || '#38bdf8',
            fillOpacity: isLooping ? 0.02 + (frameIndex / (radarFrames.length || 1)) * 0.06 : 0.05
          }}
        />
      </MapContainer>

      {/* Loop indicator */}
      {isLooping && radarFrames.length > 0 && (
        <div className="absolute top-4 right-4 z-[500] rounded-full bg-emerald-600 px-3 py-2 text-[10px] font-semibold text-white uppercase tracking-[0.2em] shadow-lg">
          Frame {frameIndex + 1}/{radarFrames.length}
        </div>
      )}

      {/* Radar status */}
      {!isLoaded && (
        <div className="absolute top-4 left-4 z-[500] rounded-full bg-slate-700 px-3 py-2 text-[10px] font-semibold text-slate-200 uppercase tracking-[0.2em]">
          Loading radar data...
        </div>
      )}
    </div>
  );
}
