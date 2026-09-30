'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, Rectangle, TileLayer } from 'react-leaflet';
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
};

export function RadarMap({ product, isLooping }: RadarMapProps) {
  const [frameIndex, setFrameIndex] = useState(0);
  const loopIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const totalFrames = 6; // Simulate 6 frames for loop

  useEffect(() => {
    if (isLooping) {
      loopIntervalRef.current = setInterval(() => {
        setFrameIndex((prev) => (prev + 1) % totalFrames);
      }, 500); // Change frame every 500ms
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
  }, [isLooping, totalFrames]);

  return (
    <div className="h-full w-full">
      <MapContainer center={[39.8283, -98.5795]} zoom={5} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Radar overlay with opacity based on loop */}
        <Rectangle
          bounds={[[25, -125], [50, -65]]}
          pathOptions={{
            color: productColors[product] || '#38bdf8',
            weight: 2,
            opacity: isLooping ? 0.3 + (frameIndex / totalFrames) * 0.7 : 0.9,
            fillColor: productColors[product] || '#38bdf8',
            fillOpacity: isLooping ? 0.05 + (frameIndex / totalFrames) * 0.15 : 0.18
          }}
        />
      </MapContainer>

      {/* Loop indicator */}
      {isLooping && (
        <div className="absolute top-4 right-4 z-[500] rounded-full bg-emerald-600 px-3 py-2 text-[10px] font-semibold text-white uppercase tracking-[0.2em]">
          Frame {frameIndex + 1}/{totalFrames}
        </div>
      )}
    </div>
  );
}
