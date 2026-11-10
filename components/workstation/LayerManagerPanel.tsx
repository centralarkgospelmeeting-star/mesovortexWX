'use client';

import { DEFAULT_LAYERS, type LayerGroup } from '../../lib/layers/registry';

type LayerState = {
  showRadarPills: boolean;
  showLightning: boolean;
  showMetars: boolean;
  showLSR: boolean;
  showWatches: boolean;
  showWarnings: boolean;
  showSatellite: boolean;
  showMping: boolean;
  showSpotterReports: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  state: LayerState;
  onChange: (patch: Partial<LayerState>) => void;
};

const GROUP_LABELS: Record<LayerGroup, string> = {
  radar: 'Radar',
  satellite: 'Satellite',
  observations: 'Observations',
  hazards: 'Hazards',
  analysis: 'Analysis',
  custom: 'Custom',
};

function idToStateKey(id: string): keyof LayerState | null {
  switch (id) {
    case 'analysis.radarPills':
      return 'showRadarPills';
    case 'obs.lightning':
      return 'showLightning';
    case 'obs.metar':
      return 'showMetars';
    case 'obs.lsr':
      return 'showLSR';
    case 'hazards.watches':
      return 'showWatches';
    case 'hazards.warnings':
      return 'showWarnings';
    case 'sat.visible':
    case 'sat.ir':
    case 'sat.waterVapor':
      return 'showSatellite';
    case 'obs.mping':
      return 'showMping';
    case 'obs.spotter':
      return 'showSpotterReports';
    default:
      return null;
  }
}

export function LayerManagerPanel({ open, onClose, state, onChange }: Props) {
  if (!open) return null;

  const groups = Array.from(new Set(DEFAULT_LAYERS.map((l) => l.group)));

  return (
    <div className="pointer-events-auto absolute right-14 top-16 z-30 w-80 rounded-2xl border border-white/15 bg-slate-950/95 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <div>
          <div className="text-sm font-bold text-slate-100">Layer Manager</div>
          <div className="text-[10px] text-slate-400">
            Sprint 1 • radar · satellite · mPING · spotter
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-slate-400 hover:bg-white/10 hover:text-white"
          aria-label="Close layer manager"
        >
          ✕
        </button>
      </div>

      <div className="max-h-[60vh] overflow-y-auto p-2">
        {groups.map((group) => {
          const items = DEFAULT_LAYERS.filter((l) => l.group === group);
          if (!items.length) return null;

          return (
            <div
              key={group}
              className="mb-2 rounded-xl border border-white/5 bg-white/[0.02] p-2"
            >
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {GROUP_LABELS[group]}
              </div>
              <div className="space-y-1">
                {items.map((layer) => {
                  const key = idToStateKey(layer.id);
                  const checked = key ? Boolean(state[key]) : false;
                  const supported = !!key;

                  return (
                    <label
                      key={layer.id}
                      className={`flex items-start gap-2 rounded-lg px-2 py-1.5 ${
                        supported ? 'cursor-pointer hover:bg-white/5' : 'opacity-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!supported}
                        onChange={(e) => {
                          if (key) {
                            onChange({ [key]: e.target.checked } as Partial<LayerState>);
                          }
                        }}
                        className="mt-0.5 accent-cyan-400"
                      />
                      <span className="min-w-0">
                        <span className="block text-xs font-medium text-slate-200">
                          {layer.label}
                        </span>
                        <span className="block text-[10px] text-slate-500">
                          {layer.description ||
                            layer.sourceAttribution ||
                            (supported ? 'Ready' : 'Planned')}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default LayerManagerPanel;
