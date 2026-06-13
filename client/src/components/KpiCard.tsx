import * as L from 'lucide-react';

export function KpiCard({ label, value, suffix, tone = 'neutral', icon, hint, target }: {
  label: string; value: number | string; suffix?: string;
  tone?: 'good' | 'warn' | 'bad' | 'neutral' | 'brand';
  icon?: string; hint?: string; target?: string;
}) {
  const tones: Record<string, string> = {
    good: 'text-emerald-600 bg-emerald-100',
    warn: 'text-amber-600 bg-amber-100',
    bad: 'text-rose-600 bg-rose-100',
    brand: 'text-brand-600 bg-brand-100',
    neutral: 'text-ink-soft bg-surface-3',
  };
  const Cmp = (icon && (L as any)[icon]) || L.Activity;
  return (
    <div className="card p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-ink-soft uppercase tracking-wide">{label}</span>
        <span className={`p-1.5 rounded-lg ${tones[tone]}`}><Cmp size={16} /></span>
      </div>
      <div className="flex items-end gap-1">
        <span className="text-3xl font-bold tabular-nums">{value}</span>
        {suffix && <span className="text-ink-soft mb-1">{suffix}</span>}
      </div>
      {(hint || target) && (
        <div className="flex items-center justify-between text-xs text-ink-soft">
          {hint && <span>{hint}</span>}
          {target && <span className="chip bg-surface-3">{target}</span>}
        </div>
      )}
    </div>
  );
}
