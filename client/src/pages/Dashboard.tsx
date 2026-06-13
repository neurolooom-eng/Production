import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api } from '../lib/api';
import { KpiCard } from '../components/KpiCard';
import { useApp } from '../store/app';

const PIE = ['#2563eb', '#0d9488', '#d97706', '#e11d48', '#7c3aed', '#059669', '#64748b'];

export default function Dashboard() {
  const user = useApp((s) => s.user);
  const { data: summary } = useQuery({ queryKey: ['analytics', 'summary'], queryFn: () => api.get<any>('/analytics/summary') });
  const { data: charts } = useQuery({ queryKey: ['analytics', 'charts'], queryFn: () => api.get<any>('/analytics/charts') });
  const { data: spc } = useQuery({ queryKey: ['rows', 'spc'], queryFn: () => api.get<any[]>('/spc') });

  const k = summary?.kpis;
  const map = (arr: any[] = []) => arr.map((x) => ({ name: String(x.k ?? '—'), value: x.v }));

  // SPC control chart data (PEEP accuracy)
  const spcData = (spc || []).slice().sort((a, b) => a.subgroup - b.subgroup).map((r) => ({ n: r.subgroup, value: r.value, lsl: r.lsl, usl: r.usl }));

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {user?.full_name?.split(' ')[0] || user?.username}</h1>
        <p className="text-ink-soft text-sm">Live production & quality overview — ISO 13485 / ISO 9001 KPIs.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Active Work Orders" value={k?.activeWorkOrders ?? '—'} icon="ClipboardList" tone="brand" hint="Released + In Progress" />
        <KpiCard label="Devices Released" value={k?.devicesReleased ?? '—'} icon="ScanLine" tone="good" hint="DHR released" />
        <KpiCard label="First Pass Yield" value={k?.firstPassYield ?? '—'} suffix="%" icon="Target" tone={k?.firstPassYield >= 90 ? 'good' : 'warn'} target="Goal ≥ 95%" />
        <KpiCard label="Open NCRs" value={k?.openNCR ?? '—'} icon="AlertTriangle" tone={k?.openNCR > 0 ? 'warn' : 'good'} hint="Nonconformances" />
        <KpiCard label="Open CAPAs" value={k?.openCAPA ?? '—'} icon="Wrench" tone={k?.openCAPA > 0 ? 'warn' : 'good'} />
        <KpiCard label="Overdue Calibration" value={k?.overdueCalibration ?? '—'} icon="Gauge" tone={k?.overdueCalibration > 0 ? 'bad' : 'good'} />
        <KpiCard label="Open Complaints" value={k?.openComplaints ?? '—'} icon="MessageSquareWarning" tone={k?.openComplaints > 0 ? 'warn' : 'good'} />
        <KpiCard label="Approved Suppliers" value={k?.suppliers ?? '—'} icon="Truck" tone="neutral" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Work Orders by Status">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={map(charts?.woByStatus)}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--line))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip /><Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="NCRs by Source (Pareto)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={map(charts?.ncrBySource)}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--line))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip /><Bar dataKey="value" fill="#e11d48" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Device Build Status">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={map(charts?.devByStatus)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {map(charts?.devByStatus).map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="SPC Control Chart — PEEP Accuracy (cmH₂O)">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={spcData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--line))" />
              <XAxis dataKey="n" tick={{ fontSize: 11 }} /><YAxis domain={[23, 27]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line dataKey="value" stroke="#2563eb" strokeWidth={2} dot />
              <Line dataKey="usl" stroke="#e11d48" strokeDasharray="5 5" dot={false} />
              <Line dataKey="lsl" stroke="#e11d48" strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <h3 className="font-semibold mb-3 text-sm">{title}</h3>
      {children}
    </div>
  );
}
