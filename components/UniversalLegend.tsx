'use client';

import { useState } from 'react';

type LegendType = 'ref' | 'vel' | 'cc' | 'zdr' | 'satellite' | 'spc';

type Props = {
  type: LegendType;
};

type LegendStep = {
  color: string;
  label: string;
  value: string;
};

const LEGENDS: Record<LegendType, LegendStep[]> = {
  ref: [
    { color: '#04e9e7', label: '5 dBZ', value: '5 dBZ (Very Light)' },
    { color: '#019ff4', label: '15 dBZ', value: '15 dBZ (Light Rain)' },
    { color: '#0300f4', label: '25 dBZ', value: '25 dBZ (Moderate Rain)' },
    { color: '#02fd02', label: '35 dBZ', value: '35 dBZ (Heavy Rain)' },
    { color: '#01c501', label: '40 dBZ', value: '40 dBZ (Thunderstorm)' },
    { color: '#fdf802', label: '45 dBZ', value: '45 dBZ (Hail Growth)' },
    { color: '#fd9500', label: '50 dBZ', value: '50 dBZ (Severe Core)' },
    { color: '#fd0000', label: '55 dBZ', value: '55 dBZ (Large Hail)' },
    { color: '#d40000', label: '60 dBZ', value: '60 dBZ (Destructive Hail)' },
    { color: '#f800fd', label: '65 dBZ', value: '65 dBZ (Giant Hail Core)' },
    { color: '#9854c6', label: '70 dBZ', value: '70 dBZ (Violent Supercell)' },
    { color: '#ffffff', label: '75+ dBZ', value: '75+ dBZ (Extreme)' },
  ],
  vel: [
    { color: '#00ffff', label: '-64 kt', value: '-64 kt (Inbound Gate)' },
    { color: '#00a86b', label: '-45 kt', value: '-45 kt (Inbound)' },
    { color: '#10b981', label: '-25 kt', value: '-25 kt (Weak Inbound)' },
    { color: '#64748b', label: '0 kt', value: '0 kt (Neutral Axis)' },
    { color: '#f59e0b', label: '+25 kt', value: '+25 kt (Weak Outbound)' },
    { color: '#ea580c', label: '+45 kt', value: '+45 kt (Outbound)' },
    { color: '#ef4444', label: '+64 kt', value: '+64 kt (Extreme Outbound)' },
    { color: '#f43f5e', label: '+80+ kt', value: '+80+ kt (Severe Delta-V)' },
  ],
  cc: [
    { color: '#3b82f6', label: '0.98+', value: '0.98 - 1.05 (Pure Rain)' },
    { color: '#10b981', label: '0.95', value: '0.93 - 0.97 (Rain/Hail)' },
    { color: '#f59e0b', label: '0.88', value: '0.85 - 0.92 (Hail Core)' },
    { color: '#ef4444', label: '0.80', value: '0.75 - 0.82 (Debris Transition)' },
    { color: '#a855f7', label: '< 0.70', value: '< 0.70 (Tornado Debris Signature)' },
  ],
  zdr: [
    { color: '#3b82f6', label: '-1 dB', value: '-1 dB (Vertical Hydrometeors)' },
    { color: '#64748b', label: '0 dB', value: '0 dB (Spherical Hail)' },
    { color: '#10b981', label: '+1.5 dB', value: '+1.5 dB (Moderate Drops)' },
    { color: '#f59e0b', label: '+3.0 dB', value: '+3.0 dB (Large Oblate Rain)' },
    { color: '#ef4444', label: '+5.0+ dB', value: '+5.0+ dB (Heavy Rain Boundary)' },
  ],
  satellite: [
    { color: '#0f172a', label: '-80°C', value: '-80°C (Overshooting Tops)' },
    { color: '#7c3aed', label: '-65°C', value: '-65°C (Intense Updraft)' },
    { color: '#dc2626', label: '-50°C', value: '-50°C (Deep Convection)' },
    { color: '#f59e0b', label: '-30°C', value: '-30°C (Mid-Level Clouds)' },
    { color: '#94a3b8', label: '0°C', value: '0°C (Low Stratus / Land)' },
  ],
  spc: [
    { color: '#c1e9c1', label: 'TSTM', value: 'General Thunderstorms' },
    { color: '#7fc57f', label: 'MRGL', value: 'Marginal Risk (1/5)' },
    { color: '#f6f67d', label: 'SLGT', value: 'Slight Risk (2/5)' },
    { color: '#edbf69', label: 'ENH', value: 'Enhanced Risk (3/5)' },
    { color: '#e56d6d', label: 'MDT', value: 'Moderate Risk (4/5)' },
    { color: '#ff66ff', label: 'HIGH', value: 'High Risk (5/5)' },
  ],
};

export function UniversalLegend({ type }: Props) {
  const [hovered, setHovered] = useState<LegendStep | null>(null);
  const steps = LEGENDS[type] || LEGENDS.ref;

  return (
    <div className="relative w-full z-50">
      {/* Pinned Color Strip */}
      <div className="flex h-1.5 w-full cursor-crosshair">
        {steps.map((s, idx) => (
          <div
            key={idx}
            style={{ backgroundColor: s.color }}
            className="flex-1 transition-opacity hover:opacity-80"
            onMouseEnter={() => setHovered(s)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </div>

      {/* Floating Hover Readout */}
      {hovered && (
        <div className="pointer-events-none absolute left-1/2 top-2.5 -translate-x-1/2 rounded-full border border-white/20 bg-slate-950/95 px-3 py-0.5 text-[10px] font-mono font-bold text-white shadow-2xl backdrop-blur-md animate-fade-in z-50">
          <span className="inline-block h-2 w-2 rounded-full mr-1.5" style={{ backgroundColor: hovered.color }} />
          {hovered.value}
        </div>
      )}
    </div>
  );
}
