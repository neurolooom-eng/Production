// Maps common status/result/severity values to RAG colors (used in tables & forms).
const MAP: Record<string, string> = {
  // green
  pass: 'g', approved: 'g', released: 'g', closed: 'g', done: 'g', competent: 'g', active: 'g', available: 'g', 'in service': 'g', accepted: 'g', acceptable: 'g',
  // amber
  pending: 'a', 'in progress': 'a', 'in review': 'a', 'under review': 'a', draft: 'a', conditional: 'a', quarantine: 'a', quarantined: 'a', 'pending qc': 'a', scheduled: 'a', open: 'a', alarp: 'a', probation: 'a', minor: 'a', planned: 'a', investigation: 'a', 'in build': 'a', 'in test': 'a', released_wo: 'a', 'in training': 'a', medium: 'a', high: 'a',
  // red
  fail: 'r', failed: 'r', rejected: 'r', overdue: 'r', critical: 'r', unacceptable: 'r', cancelled: 'r', disqualified: 'r', major: 'r', 'out of service': 'r', expired: 'r', reject: 'r',
};

const CLS: Record<string, string> = {
  g: 'bg-emerald-100 text-emerald-700',
  a: 'bg-amber-100 text-amber-700',
  r: 'bg-rose-100 text-rose-700',
  n: 'bg-surface-3 text-ink-soft',
};

export function StatusChip({ value }: { value: any }) {
  if (value === null || value === undefined || value === '') return <span className="text-ink-soft">—</span>;
  const key = String(value).toLowerCase();
  const tone = MAP[key] || 'n';
  return <span className={`chip ${CLS[tone]}`}>{String(value)}</span>;
}
