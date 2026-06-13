import { useState } from 'react';
import * as L from 'lucide-react';
import type { Field, ResourceMeta, Row } from '../lib/types';
import { useRows } from '../lib/meta';
import { useApp } from '../store/app';

// Schema-driven form used by every module. Renders inputs per field type,
// validates required fields, supports reference pickers and e-signatures.

function RefSelect({ field, value, onChange }: { field: Field; value: any; onChange: (v: any) => void }) {
  const { data: rows } = useRows(field.ref!, true);
  return (
    <select className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">— none —</option>
      {(rows || []).map((r: Row) => {
        const val = field.refField ? r[field.refField] : r.id;
        const label = r[guessTitle(r)] ?? val;
        return <option key={r.id} value={val}>{String(label)}{field.refField ? '' : ''}</option>;
      })}
    </select>
  );
}

function guessTitle(r: Row) {
  for (const k of ['name', 'title', 'full_name', 'wo_number', 'po_number', 'doc_number', 'serial_number', 'udi_di', 'capa_number', 'ncr_number', 'ref', 'code', 'equipment', 'characteristic', 'item', 'protocol', 'grn_number', 'audit_number', 'complaint_number', 'event_number', 'part_number'])
    if (r[k] != null) return k;
  return 'id';
}

function FieldInput({ field, value, onChange }: { field: Field; value: any; onChange: (v: any) => void }) {
  switch (field.type) {
    case 'textarea':
      return <textarea className="input min-h-[80px]" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
    case 'number':
      return <input type="number" className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />;
    case 'date':
      return <input type="date" className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
    case 'datetime':
      return <input type="datetime-local" className="input" value={value ? String(value).slice(0, 16) : ''} onChange={(e) => onChange(e.target.value)} />;
    case 'boolean':
      return (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} /> {value ? 'Yes' : 'No'}
        </label>
      );
    case 'select':
      return (
        <select className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">— select —</option>
          {field.options?.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    case 'ref':
      return <RefSelect field={field} value={value} onChange={onChange} />;
    case 'password':
      return <input type="password" className="input" value={value ?? ''} placeholder="••••••" onChange={(e) => onChange(e.target.value)} />;
    case 'signature':
      return <input className="input" value={value ?? ''} placeholder="Type name to sign" onChange={(e) => onChange(e.target.value)} />;
    default:
      return <input className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
  }
}

export function RecordForm({ meta, initial, onSubmit, submitting, error }: {
  meta: ResourceMeta;
  initial: Row;
  onSubmit: (row: Row) => void;
  submitting?: boolean;
  error?: string | null;
}) {
  const user = useApp((s) => s.user);
  const [form, setForm] = useState<Row>({ ...initial });
  const [sign, setSign] = useState(false);
  const [touched, setTouched] = useState(false);
  const editable = meta.fields.filter((f) => f.type !== 'json' && !f.computed);
  const hasSignature = meta.fields.some((f) => f.type === 'signature');

  const missing = editable.filter((f) => f.required && (form[f.name] === undefined || form[f.name] === null || form[f.name] === ''));

  const submit = () => {
    setTouched(true);
    if (missing.length) return;
    const payload: Row = { ...form };
    if (sign && user) payload.__signature = `${user.full_name || user.username} / ${new Date().toISOString().slice(0, 16)}`;
    onSubmit(payload);
  };

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {editable.map((f) => (
          <div key={f.name} className={f.type === 'textarea' ? 'md:col-span-2' : ''}>
            <label className="block text-xs font-medium text-ink-soft mb-1">
              {f.label}{f.required && <span className="text-rose-500"> *</span>}
              {f.type === 'ref' && <span className="ml-1 text-ink-soft/60">↗ {f.ref}</span>}
            </label>
            <FieldInput field={f} value={form[f.name]} onChange={(v) => setForm((s) => ({ ...s, [f.name]: v }))} />
            {touched && f.required && (form[f.name] === '' || form[f.name] == null) && (
              <p className="text-xs text-rose-500 mt-0.5">Required</p>
            )}
          </div>
        ))}
      </div>

      {hasSignature && (
        <label className="flex items-center gap-2 mt-4 text-sm p-2 rounded-md bg-surface-2 border border-line">
          <input type="checkbox" checked={sign} onChange={(e) => setSign(e.target.checked)} />
          <L.PenTool size={15} /> Apply electronic signature as <b>{user?.full_name || user?.username}</b> (21 CFR Part 11)
        </label>
      )}

      {error && <p className="text-sm text-rose-500 mt-3">{error}</p>}

      <div className="flex justify-end gap-2 mt-4">
        <button className="btn-primary" onClick={submit} disabled={submitting}>
          <L.Save size={15} /> {submitting ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
