'use client';

import type { ReactNode } from 'react';

type AlertBannerProps = {
  alert: {
    headline: string;
    severity: string;
    area: string;
  };
};

export function AlertBanner({ alert }: AlertBannerProps): ReactNode {
  const severityColor = {
    Extreme: 'bg-red-700 text-white',
    Severe: 'bg-orange-600 text-white',
    Moderate: 'bg-amber-600 text-white',
    Minor: 'bg-yellow-600 text-slate-900'
  }[alert.severity] || 'bg-slate-700 text-white';

  return (
    <div className={`${severityColor} border-b border-red-900 px-6 py-3 shadow-lg`}>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em]">
          {alert.severity}
        </span>
        <span className="font-semibold">{alert.headline}</span>
        <span className="text-xs opacity-90">{alert.area}</span>
      </div>
    </div>
  );
}
