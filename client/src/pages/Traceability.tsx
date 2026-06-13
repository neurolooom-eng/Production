import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as L from 'lucide-react';
import { api } from '../lib/api';

// End-to-end device traceability (ISO 13485 §7.5.9). Enter a serial and walk
// the chain: product → work order → materials → inspections → NCRs → complaints.

export default function Traceability() {
  const [serial, setSerial] = useState('X900-260001');
  const [active, setActive] = useState('X900-260001');
  const { data, isLoading, error } = useQuery({
    queryKey: ['trace', active],
    queryFn: () => api.get<any>(`/trace/device/${encodeURIComponent(active)}`),
    enabled: !!active,
    retry: false,
  });

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <span className="p-2 rounded-lg bg-brand-100 text-brand-600"><L.GitBranch size={20} /></span>
        <div>
          <h1 className="text-xl font-bold">Device Traceability</h1>
          <p className="text-xs text-ink-soft">ISO 13485 §7.5.9 — forward & backward traceability per serial number</p>
        </div>
      </div>

      <div className="flex gap-2">
        <input className="input max-w-xs" value={serial} onChange={(e) => setSerial(e.target.value)} placeholder="Serial number e.g. X900-260001" />
        <button className="btn-primary" onClick={() => setActive(serial)}><L.Search size={15} /> Trace</button>
        <span className="text-xs text-ink-soft self-center">Try: X900-260001, X900-260002, X900-260003</span>
      </div>

      {isLoading && <div className="text-ink-soft">Tracing…</div>}
      {error && <div className="text-rose-500">{(error as Error).message}</div>}

      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <TraceCard icon="ScanLine" title="Device (DHR)" lines={[data.device.serial_number, `Status: ${data.device.build_status}`, `Lot: ${data.device.lot_number || '—'}`, `Released: ${data.device.released_on || '—'}`]} />
            <TraceCard icon="Cpu" title="Product Model" lines={[data.product?.name, data.product?.code, data.product?.class].filter(Boolean)} />
            <TraceCard icon="ClipboardList" title="Work Order" lines={data.workOrder ? [data.workOrder.wo_number, `Qty: ${data.workOrder.qty}`, `Line: ${data.workOrder.line}`, `Status: ${data.workOrder.status}`] : ['—']} />
            <TraceCard icon="QrCode" title="UDI" lines={data.udi ? [data.udi.udi_di, data.udi.issuing_agency, `GMDN: ${data.udi.gmdn}`] : ['—']} />
          </div>

          <Section title={`Material Genealogy (${data.materials.length})`} icon="Package">
            {data.materials.length ? data.materials.map((m: any) => (
              <Pill key={m.id} text={`${m.name} · Lot ${m.lot_number} · ${m.status}`} tone={m.status === 'Available' ? 'g' : 'a'} />
            )) : <Empty />}
            {data.device.genealogy && <p className="text-sm text-ink-soft mt-2">{data.device.genealogy}</p>}
          </Section>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Section title={`Inspections (${data.inspections.length})`} icon="SearchCheck">
              {data.inspections.length ? data.inspections.map((i: any) => (
                <Pill key={i.id} text={`${i.ref} · ${i.stage} · ${i.result}`} tone={i.result === 'Pass' ? 'g' : i.result === 'Fail' ? 'r' : 'a'} />
              )) : <Empty />}
            </Section>
            <Section title={`NCRs (${data.ncrs.length})`} icon="AlertTriangle">
              {data.ncrs.length ? data.ncrs.map((n: any) => (
                <Pill key={n.id} text={`${n.ncr_number} · ${n.severity} · ${n.status}`} tone={n.severity === 'Critical' ? 'r' : 'a'} />
              )) : <Empty />}
            </Section>
            <Section title={`Complaints (${data.complaints.length})`} icon="MessageSquareWarning">
              {data.complaints.length ? data.complaints.map((c: any) => (
                <Pill key={c.id} text={`${c.complaint_number} · ${c.status}`} tone="a" />
              )) : <Empty />}
            </Section>
          </div>
        </div>
      )}
    </div>
  );
}

function TraceCard({ icon, title, lines }: { icon: string; title: string; lines: any[] }) {
  const Cmp = (L as any)[icon] || L.Circle;
  return (
    <div className="card p-3">
      <div className="flex items-center gap-2 text-brand-600 mb-2"><Cmp size={16} /><span className="text-xs font-semibold uppercase tracking-wide">{title}</span></div>
      {lines.map((l, i) => <div key={i} className={i === 0 ? 'font-medium text-sm' : 'text-xs text-ink-soft'}>{l}</div>)}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  const Cmp = (L as any)[icon] || L.Circle;
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 font-semibold text-sm mb-3"><Cmp size={16} className="text-brand-600" /> {title}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Pill({ text, tone }: { text: string; tone: 'g' | 'a' | 'r' }) {
  const cls = { g: 'bg-emerald-100 text-emerald-700', a: 'bg-amber-100 text-amber-700', r: 'bg-rose-100 text-rose-700' }[tone];
  return <span className={`chip ${cls}`}>{text}</span>;
}
function Empty() { return <span className="text-sm text-ink-soft">None linked</span>; }
