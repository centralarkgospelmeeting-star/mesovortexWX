'use client';

import { useState } from 'react';

export type LegendType =
  | 'ref'
  | 'max_ref'
  | 'ref_x'
  | 'vel'
  | 'srvel'
  | 'norm_vel'
  | 'azshear'
  | 'cc'
  | 'min_cc'
  | 'zdr'
  | 'kdp'
  | 'tops'
  | 'vil'
  | 'mesh'
  | 'satellite'
  | 'spc'
  | 'cape'
  | 'temp';

type Props = {
  type: LegendType | string;
  activeAnnouncement?: {
    event: string;
    headline: string;
    area: string;
  } | null;
  onDismissAnnouncement?: () => void;
  onSpeakAnnouncement?: () => void;
};

type LegendStep = {
  color: string;
  label: string;
  value: string;
};

const LEGENDS: Record<string, LegendStep[]> = {
  ref: [
    { color: '#04e9e7', label: '5 dBZ', value: '5 dBZ · Very Light / Drizzle' },
    { color: '#019ff4', label: '15 dBZ', value: '15 dBZ · Light Rain' },
    { color: '#0300f4', label: '25 dBZ', value: '25 dBZ · Moderate Rain' },
    { color: '#02fd02', label: '35 dBZ', value: '35 dBZ · Heavy Rain' },
    { color: '#01c501', label: '40 dBZ', value: '40 dBZ · Convective Thunderstorm' },
    { color: '#fdf802', label: '45 dBZ', value: '45 dBZ · Hail Growth Zone' },
    { color: '#fd9500', label: '50 dBZ', value: '50 dBZ · Severe Core / Small Hail' },
    { color: '#fd0000', label: '55 dBZ', value: '55 dBZ · Severe Hail (≥1 inch)' },
    { color: '#d40000', label: '60 dBZ', value: '60 dBZ · Destructive Hail (≥2 inch)' },
    { color: '#f800fd', label: '65 dBZ', value: '65 dBZ · Giant Hail Core / BWER' },
    { color: '#9854c6', label: '70 dBZ', value: '70 dBZ · Violent Supercell Core' },
    { color: '#ffffff', label: '75+ dBZ', value: '75+ dBZ · Extreme Hail / Debris' },
  ],
  vel: [
    { color: '#00ffff', label: '-64 kt', value: '-64 kt · Extreme Inbound Gate' },
    { color: '#00a86b', label: '-45 kt', value: '-45 kt · Strong Inbound' },
    { color: '#10b981', label: '-25 kt', value: '-25 kt · Moderate Inbound' },
    { color: '#64748b', label: '0 kt', value: '0 kt · Zero-Velocity Line / Radial Axis' },
    { color: '#f59e0b', label: '+25 kt', value: '+25 kt · Moderate Outbound' },
    { color: '#ea580c', label: '+45 kt', value: '+45 kt · Strong Outbound' },
    { color: '#ef4444', label: '+64 kt', value: '+64 kt · Extreme Outbound Gate' },
    { color: '#f43f5e', label: '+80+ kt', value: '+80+ kt · Severe Velocity Couplet / TVS' },
  ],
  cc: [
    { color: '#a855f7', label: '< 0.70', value: '< 0.70 · Tornado Debris Signature (TDS)' },
    { color: '#ef4444', label: '0.80', value: '0.75 - 0.82 · Mixed Debris & Hail Boundary' },
    { color: '#f59e0b', label: '0.88', value: '0.85 - 0.92 · Hail / Rain Mixture' },
    { color: '#10b981', label: '0.95', value: '0.93 - 0.97 · Heavy Rain & Melting Ice' },
    { color: '#3b82f6', label: '0.98+', value: '0.98 - 1.05 · Pure Uniform Rain / Clear Air' },
  ],
  zdr: [
    { color: '#3b82f6', label: '-1 dB', value: '-1.0 dB · Vertical Hydrometeors / Conical Graupel' },
    { color: '#64748b', label: '0 dB', value: '0.0 dB · Spherical Hail Tumbling' },
    { color: '#10b981', label: '+1.5 dB', value: '+1.5 dB · Moderate Rain Drops' },
    { color: '#f59e0b', label: '+3.0 dB', value: '+3.0 dB · Large Oblate Raindrops / ZDR Arc' },
    { color: '#ef4444', label: '+5.0+ dB', value: '+5.0+ dB · Giant Drops / Inflow Jet Boundary' },
  ],
  kdp: [
    { color: '#04e9e7', label: '0 deg/km', value: '0.0 deg/km · Light Rain / Ice' },
    { color: '#02fd02', label: '1.0 deg/km', value: '1.0 deg/km · Moderate Rain' },
    { color: '#fdf802', label: '2.5 deg/km', value: '2.5 deg/km · Heavy Precipitation Core' },
    { color: '#fd0000', label: '4.0 deg/km', value: '4.0 deg/km · Torrential Rain / Flash Flood' },
    { color: '#f800fd', label: '6.0+ deg/km', value: '6.0+ deg/km · Tropical Deluge / Water Loading' },
  ],
  tops: [
    { color: '#04e9e7', label: '15 kft', value: '15 kft · Shallow Convection' },
    { color: '#02fd02', label: '25 kft', value: '25 kft · Developing Thunderstorm' },
    { color: '#fdf802', label: '35 kft', value: '35 kft · Mature Storm Cell' },
    { color: '#fd0000', label: '45 kft', value: '45 kft · Severe Convective Core' },
    { color: '#f800fd', label: '55 kft', value: '55 kft · Tropopause Penetration' },
    { color: '#ffffff', label: '65+ kft', value: '65+ kft · Intense Overshooting Top' },
  ],
  vil: [
    { color: '#04e9e7', label: '10 kg/m²', value: '10 kg/m² · Light Water Mass' },
    { color: '#02fd02', label: '25 kg/m²', value: '25 kg/m² · Moderate Moisture Core' },
    { color: '#fdf802', label: '45 kg/m²', value: '45 kg/m² · Severe Hail / Water Loading' },
    { color: '#fd0000', label: '60 kg/m²', value: '60 kg/m² · Destructive Core / Downburst Potential' },
    { color: '#f800fd', label: '75+ kg/m²', value: '75+ kg/m² · Extreme Hail Mass / Supercell Core' },
  ],
  mesh: [
    { color: '#02fd02', label: '0.50"', value: '0.50 in · Sub-Severe Pea Hail' },
    { color: '#fdf802', label: '1.00"', value: '1.00 in · Quarter Size (Severe Threshold)' },
    { color: '#fd9500', label: '1.75"', value: '1.75 in · Golf Ball Size' },
    { color: '#fd0000', label: '2.50"', value: '2.50 in · Tennis Ball Size (Significant)' },
    { color: '#f800fd', label: '3.50"+', value: '3.50+ in · Soft Ball to Grapefruit Destructive Hail' },
  ],
  satellite: [
    { color: '#0f172a', label: '-80°C', value: '-80°C · Overshooting Convective Tops' },
    { color: '#7c3aed', label: '-65°C', value: '-65°C · Intense Cold Updraft' },
    { color: '#dc2626', label: '-50°C', value: '-50°C · Deep Convective Cloud Top' },
    { color: '#f59e0b', label: '-30°C', value: '-30°C · Mid-Level Glaciated Cloud' },
    { color: '#94a3b8', label: '0°C', value: '0°C · Low Stratus / Marine Boundary' },
    { color: '#cbd5e1', label: '+15°C', value: '+15°C · Warm Ground / Ocean Surface' },
  ],
  spc: [
    { color: '#c1e9c1', label: 'TSTM', value: 'General Thunderstorms · 10% Cloud-to-Ground Lightning' },
    { color: '#7fc57f', label: 'MRGL', value: 'Marginal Risk (1/5) · Isolated Severe Weather' },
    { color: '#f6f67d', label: 'SLGT', value: 'Slight Risk (2/5) · Scattered Severe Thunderstorms' },
    { color: '#edbf69', label: 'ENH', value: 'Enhanced Risk (3/5) · Numerous Severe Storms / Tornadoes' },
    { color: '#e56d6d', label: 'MDT', value: 'Moderate Risk (4/5) · Widespread Severe Weather / Outbreak' },
    { color: '#ff66ff', label: 'HIGH', value: 'High Risk (5/5) · Major Tornado Outbreak / Violent Derecho' },
  ],
  cape: [
    { color: '#64748b', label: '250 J/kg', value: '250 J/kg · Weak Convective Energy' },
    { color: '#06b6d4', label: '1000 J/kg', value: '1,000 J/kg · Moderate Instability' },
    { color: '#10b981', label: '2000 J/kg', value: '2,000 J/kg · Strong Instability' },
    { color: '#f59e0b', label: '3500 J/kg', value: '3,500 J/kg · Extreme Instability' },
    { color: '#ef4444', label: '5000+ J/kg', value: '5,000+ J/kg · Violent Convective Potential' },
  ],
  temp: [
    { color: '#38bdf8', label: '0°F', value: '0°F · Frigid Arctic Cold' },
    { color: '#60a5fa', label: '32°F', value: '32°F · Freezing Threshold' },
    { color: '#4ade80', label: '65°F', value: '65°F · Mild & Comfortable' },
    { color: '#facc15', label: '80°F', value: '80°F · Warm Convective Boundary' },
    { color: '#f97316', label: '95°F', value: '95°F · High Heat Index' },
    { color: '#ef4444', label: '105°F+', value: '105°F+ · Dangerous Extreme Heat' },
  ],
};

function normalizeLegendType(raw: string): string {
  const lower = (raw || '').toLowerCase();
  if (lower.includes('max_ref') || lower.includes('ref_x') || lower.includes('ref')) return 'ref';
  if (lower.includes('vel') || lower.includes('srvel') || lower.includes('azshear')) return 'vel';
  if (lower.includes('cc')) return 'cc';
  if (lower.includes('zdr')) return 'zdr';
  if (lower.includes('kdp')) return 'kdp';
  if (lower.includes('tops')) return 'tops';
  if (lower.includes('vil')) return 'vil';
  if (lower.includes('mesh') || lower.includes('hail')) return 'mesh';
  if (lower.includes('sat') || lower.includes('goes') || lower.includes('ir') || lower.includes('geocolor')) return 'satellite';
  if (lower.includes('spc') || lower.includes('outlook') || lower.includes('cat')) return 'spc';
  if (lower.includes('cape')) return 'cape';
  if (lower.includes('temp')) return 'temp';
  return 'ref';
}

export function UniversalLegend({
  type,
  activeAnnouncement,
  onDismissAnnouncement,
  onSpeakAnnouncement,
}: Props) {
  const [hovered, setHovered] = useState<LegendStep | null>(null);
  const legendKey = normalizeLegendType(type);
  const steps = LEGENDS[legendKey] || LEGENDS.ref;

  return (
    <div className="relative w-full z-50 select-none">
      {/* 1. Optional Temporary Alert Announcement Banner (Section 11) */}
      {activeAnnouncement && (
        <div className="flex items-center justify-between bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 px-3 py-1 text-white shadow-xl animate-fade-in text-xs font-bold">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[11px] animate-pulse">
              ⚠️
            </span>
            <span className="font-mono uppercase tracking-wider text-[10px] bg-black/30 px-1.5 py-0.5 rounded">
              OFFICIAL NWS ALERT
            </span>
            <span className="truncate">
              <b>{activeAnnouncement.event}:</b> {activeAnnouncement.area || activeAnnouncement.headline}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            {onSpeakAnnouncement && (
              <button
                onClick={onSpeakAnnouncement}
                className="flex items-center gap-1 rounded bg-black/30 hover:bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white transition cursor-pointer"
                title="Speak Warning Announcement"
              >
                <span>🔊</span> Listen
              </button>
            )}
            {onDismissAnnouncement && (
              <button
                onClick={onDismissAnnouncement}
                className="rounded bg-black/20 hover:bg-black/40 px-1.5 py-0.5 text-[10px] text-white transition cursor-pointer"
                title="Dismiss Banner"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. Pinned Universal Data Legend Color Strip (Section 2.A) */}
      <div className="flex h-2 w-full cursor-crosshair shadow-md">
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

      {/* 3. Floating Tooltip on Hover */}
      {hovered && (
        <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full border border-white/20 bg-slate-950/95 px-3 py-1 text-[10px] font-mono font-bold text-white shadow-2xl backdrop-blur-md animate-fade-in z-50 flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full border border-white/40"
            style={{ backgroundColor: hovered.color }}
          />
          <span>{hovered.value}</span>
        </div>
      )}
    </div>
  );
}
