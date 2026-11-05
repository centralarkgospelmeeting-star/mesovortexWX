'use client';

type Alert = {
  id?: string;
  headline: string;
  severity: string;
  area: string;
};

type AlertBannerProps = {
  alerts: Alert[];
};

export function AlertBanner({ alerts }: AlertBannerProps) {
  if (!alerts || alerts.length === 0) return null;

  const top = alerts[0];
  const severityColor: Record<string, string> = {
    Extreme: 'bg-red-700 text-white',
    Severe: 'bg-orange-600 text-white',
    Moderate: 'bg-amber-600 text-white',
    Minor: 'bg-yellow-600 text-slate-900',
  };

  const color = severityColor[top.severity] || 'bg-slate-700 text-white';

  return (
    <div className={`${color} border-b border-black/20 px-4 py-2.5 shadow-lg`}>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
          {top.severity}
        </span>
        <span className="font-semibold">{top.headline}</span>
        <span className="text-xs opacity-90">{top.area}</span>
        {alerts.length > 1 && (
          <span className="ml-auto rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-medium">
            +{alerts.length - 1} more
          </span>
        )}
      </div>
    </div>
  );
}
