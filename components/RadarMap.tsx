'use client';

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

export function RadarMap({ product }: { product: string }) {
  return (
    <div className="h-full w-full">
      <MapContainer center={[39.8283, -98.5795]} zoom={5} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Rectangle
          bounds={[[25, -125], [50, -65]]}
          pathOptions={{
            color: productColors[product] || '#38bdf8',
            weight: 2,
            opacity: 0.9,
            fillColor: productColors[product] || '#38bdf8',
            fillOpacity: 0.18
          }}
        />
      </MapContainer>
    </div>
  );
}
