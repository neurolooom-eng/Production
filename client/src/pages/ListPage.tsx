import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import * as L from 'lucide-react';
import { api } from '../lib/api';
import { useMeta, useResourceMeta, useRows, useSaveRow, useDeleteRow } from '../lib/meta';
import { DataTable, type Column } from '../components/DataTable';
import { StatusChip } from '../components/StatusChip';
import { Modal } from '../components/Modal';
import { RecordForm } from '../components/RecordForm';
import { Icon } from '../lib/icon';
import type { Field, ResourceMeta, Row } from '../lib/types';

const STATUSY = /(status|result|severity|disposition|residual|priority|build_status|category)/i;

function titleKeyFor(meta?: ResourceMeta) { return meta?.titleField || 'id'; }

export default function ListPage() {
  const { key } = useParams();
  const meta = useResourceMeta(key);
  const { data: allMeta } = useMeta();
  const { data: rows, isLoading } = useRows(key!, !!meta);
  const save = useSaveRow(key!);
  const del = useDeleteRow(key!);
  const [editing, setEditing] = useState<Row | null>(null);

  // Resolve reference fields -> human labels. useQueries keeps the hook count
  // stable even as the set of referenced resources changes between modules.
  const refResources = useMemo(() => Array.from(new Set((meta?.fields || []).filter((f) => f.type === 'ref').map((f) => f.ref!))), [meta]);
  const refResults = useQueries({
    queries: refResources.map((rk) => ({ queryKey: ['rows', rk], queryFn: () => api.get<Row[]>(`/${rk}`), enabled: !!meta })),
  });
  const refMaps = useMemo(() => {
    const maps: Record<string, Record<string, string>> = {};
    refResources.forEach((rk, idx) => {
      const rmeta = allMeta?.resources.find((r) => r.key === rk);
      const tkey = rmeta?.titleField || 'name';
      const m: Record<string, string> = {};
      for (const r of (refResults[idx]?.data as Row[]) || []) {
        const label = String(r[tkey] ?? r.id);
        m[r.id] = label;
        // also index by common business keys so refField-based values resolve
        for (const bk of ['wo_number', 'po_number', 'doc_number', 'serial_number', 'udi_di', 'ref', 'capa_number', 'part_number']) {
          if (r[bk] != null) m[r[bk]] = label === String(r[bk]) ? label : `${r[bk]} · ${label}`;
        }
      }
      maps[rk] = m;
    });
    return maps;
  }, [refResults.map((r) => r.dataUpdatedAt).join(), allMeta, refResources.join()]);

  if (!meta) return <div className="p-6 text-ink-soft">Loading module…</div>;
  if (!meta.canRead) return <div className="p-6 text-rose-500">Your role cannot view {meta.plural}.</div>;

  const columns: Column[] = (meta.fields || [])
    .filter((f) => !f.hideInTable)
    .map((f) => makeColumn(f, meta, refMaps));

  const onSubmit = (row: Row) => {
    save.mutate(row, { onSuccess: () => setEditing(null) });
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <span className="p-2 rounded-lg bg-brand-100 text-brand-600"><Icon name={meta.icon} size={20} /></span>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{meta.plural}</h1>
          <p className="text-xs text-ink-soft">{meta.isoClause}</p>
        </div>
        {meta.canWrite && (
          <button className="btn-primary" onClick={() => setEditing({})}>
            <L.Plus size={16} /> New {meta.singular}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="text-ink-soft">Loading records…</div>
      ) : (
        <DataTable
          storageKey={meta.key}
          columns={columns}
          rows={rows || []}
          onRowClick={(r) => setEditing(r)}
        />
      )}

      {editing && (
        <Modal
          wide
          title={editing.id ? `Edit ${meta.singular}` : `New ${meta.singular}`}
          subtitle={`${meta.plural} · ${meta.isoClause}`}
          onClose={() => setEditing(null)}
          footer={editing.id && meta.canWrite ? (
            <button className="btn-outline text-rose-600 border-rose-200 hover:bg-rose-50"
              onClick={() => { if (confirm('Delete this record?')) del.mutate(editing.id, { onSuccess: () => setEditing(null) }); }}>
              <L.Trash2 size={15} /> Delete
            </button>
          ) : null}
        >
          {meta.canWrite ? (
            <RecordForm meta={meta} initial={editing} onSubmit={onSubmit} submitting={save.isPending} error={save.error?.message || null} />
          ) : (
            <ReadOnlyView meta={meta} row={editing} refMaps={refMaps} />
          )}
        </Modal>
      )}
    </div>
  );
}

function makeColumn(f: Field, meta: ResourceMeta, refMaps: Record<string, Record<string, string>>): Column {
  const display = (row: Row) => {
    const v = row[f.name];
    if (f.type === 'ref' && f.ref) return refMaps[f.ref]?.[v] ?? v;
    return v;
  };
  return {
    key: f.name,
    label: f.label,
    width: f.width || 140,
    type: f.type,
    wrap: f.wrap,
    raw: (row) => display(row),
    render: (row) => {
      const v = row[f.name];
      if (v === null || v === undefined || v === '') return <span className="text-ink-soft">—</span>;
      if (f.type === 'boolean') return v ? <span className="chip bg-emerald-100 text-emerald-700">Yes</span> : <span className="chip bg-surface-3 text-ink-soft">No</span>;
      if (f.type === 'ref' && f.ref) {
        const label = refMaps[f.ref]?.[v] ?? v;
        return <span className="text-brand-600">{String(label)}</span>;
      }
      if (f.type === 'select' && STATUSY.test(f.name)) return <StatusChip value={v} />;
      if (f.type === 'signature') return <span className="chip bg-brand-100 text-brand-700"><L.PenTool size={11} className="mr-1" />{String(v)}</span>;
      if (f.name === titleKeyFor(meta)) return <span className="font-medium">{String(v)}</span>;
      return String(v);
    },
  };
}

function ReadOnlyView({ meta, row, refMaps }: { meta: ResourceMeta; row: Row; refMaps: Record<string, Record<string, string>> }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {meta.fields.map((f) => (
        <div key={f.name} className={f.type === 'textarea' ? 'md:col-span-2' : ''}>
          <div className="text-xs text-ink-soft">{f.label}</div>
          <div className="text-sm">{f.type === 'ref' && f.ref ? (refMaps[f.ref]?.[row[f.name]] ?? row[f.name] ?? '—') : (String(row[f.name] ?? '—'))}</div>
        </div>
      ))}
    </div>
  );
}
