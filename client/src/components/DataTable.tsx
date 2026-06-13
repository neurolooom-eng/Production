import { useEffect, useMemo, useRef, useState } from 'react';
import * as L from 'lucide-react';

// ---------------------------------------------------------------------------
// DataTable — the shared, configurable table used by every module.
// Features: text-wrap per cell, per-column resize, drag-to-reorder columns,
// show/hide columns, column pinning, sticky header, configurable rows-before-
// scroll, adjustable table width, sort, global + per-column search/filter,
// density toggle, CSV export, and per-resource persisted "saved views".
// ---------------------------------------------------------------------------

export interface Column {
  key: string;
  label: string;
  width: number;
  type?: string;
  wrap?: boolean;
  render?: (row: any) => React.ReactNode;
  raw?: (row: any) => any; // value used for sort/filter/export
}

interface ViewState {
  order: string[];
  widths: Record<string, number>;
  hidden: string[];
  pinned: string[];
  wrap: boolean;
  density: 'comfortable' | 'compact';
  rowsBeforeScroll: number;
  widthMode: 'fit' | 'full';
}

const ROW_H = { comfortable: 44, compact: 32 };

function defaultView(cols: Column[]): ViewState {
  return {
    order: cols.map((c) => c.key),
    widths: Object.fromEntries(cols.map((c) => [c.key, c.width])),
    hidden: [],
    pinned: [],
    wrap: true, // text-wrap every cell by default (per requirement)
    density: 'comfortable',
    rowsBeforeScroll: 12,
    widthMode: 'fit',
  };
}

export function DataTable({
  storageKey, columns, rows, onRowClick, toolbarExtra,
}: {
  storageKey: string;
  columns: Column[];
  rows: any[];
  onRowClick?: (row: any) => void;
  toolbarExtra?: React.ReactNode;
}) {
  const lsKey = `vpms-view:${storageKey}`;
  const [view, setView] = useState<ViewState>(() => {
    try {
      const saved = localStorage.getItem(lsKey);
      if (saved) return { ...defaultView(columns), ...JSON.parse(saved) };
    } catch {}
    return defaultView(columns);
  });
  const [globalQ, setGlobalQ] = useState('');
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [menu, setMenu] = useState(false);

  useEffect(() => { localStorage.setItem(lsKey, JSON.stringify(view)); }, [view, lsKey]);

  const colMap = useMemo(() => Object.fromEntries(columns.map((c) => [c.key, c])), [columns]);
  const visible = view.order.filter((k) => !view.hidden.includes(k) && colMap[k]);
  // Pinned columns render first (sticky-left).
  const ordered = [...visible].sort((a, b) => {
    const pa = view.pinned.includes(a) ? 0 : 1;
    const pb = view.pinned.includes(b) ? 0 : 1;
    return pa - pb;
  });

  const rawVal = (row: any, key: string) => {
    const c = colMap[key];
    return c?.raw ? c.raw(row) : row[key];
  };

  // Filtering
  const filtered = useMemo(() => {
    let r = rows;
    if (globalQ.trim()) {
      const q = globalQ.toLowerCase();
      r = r.filter((row) => visible.some((k) => String(rawVal(row, k) ?? '').toLowerCase().includes(q)));
    }
    for (const [k, q] of Object.entries(colFilters)) {
      if (!q.trim()) continue;
      const ql = q.toLowerCase();
      r = r.filter((row) => String(rawVal(row, k) ?? '').toLowerCase().includes(ql));
    }
    if (sort) {
      r = [...r].sort((a, b) => {
        const av = rawVal(a, sort.key), bv = rawVal(b, sort.key);
        if (av == null) return 1; if (bv == null) return -1;
        const na = Number(av), nb = Number(bv);
        const cmp = !isNaN(na) && !isNaN(nb) && av !== '' && bv !== ''
          ? na - nb : String(av).localeCompare(String(bv));
        return cmp * sort.dir;
      });
    }
    return r;
  }, [rows, globalQ, colFilters, sort, visible.join()]);

  // ---- column resize ----
  const resizing = useRef<{ key: string; startX: number; startW: number } | null>(null);
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!resizing.current) return;
      const { key, startX, startW } = resizing.current;
      const w = Math.max(60, startW + (e.clientX - startX));
      setView((v) => ({ ...v, widths: { ...v.widths, [key]: w } }));
    };
    const up = () => { resizing.current = null; document.body.style.cursor = ''; };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, []);

  // ---- column drag reorder ----
  const dragKey = useRef<string | null>(null);
  const onDrop = (target: string) => {
    const from = dragKey.current;
    dragKey.current = null;
    if (!from || from === target) return;
    setView((v) => {
      const order = [...v.order];
      const fi = order.indexOf(from), ti = order.indexOf(target);
      order.splice(fi, 1);
      order.splice(ti, 0, from);
      return { ...v, order };
    });
  };

  const exportCSV = () => {
    const head = ordered.map((k) => `"${colMap[k].label}"`).join(',');
    const body = filtered.map((row) =>
      ordered.map((k) => `"${String(rawVal(row, k) ?? '').replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    const blob = new Blob([head + '\n' + body], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${storageKey}.csv`;
    a.click();
  };

  const rowH = ROW_H[view.density];
  const maxH = rowH + view.rowsBeforeScroll * rowH + 8;
  const pinnedLeft: Record<string, number> = {};
  let acc = 0;
  for (const k of ordered) { if (view.pinned.includes(k)) { pinnedLeft[k] = acc; acc += view.widths[k] || 120; } }

  return (
    <div className="card overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-2 border-b border-line bg-surface-2">
        <div className="relative">
          <L.Search size={15} className="absolute left-2 top-2 text-ink-soft" />
          <input className="input pl-7 w-56" placeholder="Search all columns…" value={globalQ} onChange={(e) => setGlobalQ(e.target.value)} />
        </div>
        <button className="btn-ghost" onClick={() => setShowFilters((s) => !s)} title="Per-column filters">
          <L.Filter size={15} /> Filters
        </button>
        <button className="btn-ghost" onClick={() => setView((v) => ({ ...v, wrap: !v.wrap }))} title="Toggle text wrap">
          <L.WrapText size={15} /> {view.wrap ? 'Wrap: On' : 'Wrap: Off'}
        </button>
        <button className="btn-ghost" onClick={() => setView((v) => ({ ...v, density: v.density === 'comfortable' ? 'compact' : 'comfortable' }))}>
          <L.Rows3 size={15} /> {view.density === 'comfortable' ? 'Comfortable' : 'Compact'}
        </button>
        <div className="flex items-center gap-1 text-xs text-ink-soft">
          <L.ArrowDownUp size={14} /> Rows before scroll
          <input type="number" min={3} max={50} className="input w-16 py-0.5" value={view.rowsBeforeScroll}
            onChange={(e) => setView((v) => ({ ...v, rowsBeforeScroll: Math.max(3, Number(e.target.value) || 12) }))} />
        </div>
        <button className="btn-ghost" onClick={() => setView((v) => ({ ...v, widthMode: v.widthMode === 'fit' ? 'full' : 'fit' }))} title="Table width">
          <L.MoveHorizontal size={15} /> {view.widthMode === 'fit' ? 'Width: Fit' : 'Width: Full'}
        </button>
        <div className="relative">
          <button className="btn-ghost" onClick={() => setMenu((m) => !m)}><L.Columns3 size={15} /> Columns</button>
          {menu && (
            <div className="absolute z-30 mt-1 w-56 max-h-72 overflow-auto card p-2 shadow-lg">
              {view.order.map((k) => colMap[k] && (
                <div key={k} className="flex items-center justify-between gap-2 px-1 py-1 text-sm">
                  <label className="flex items-center gap-2 truncate">
                    <input type="checkbox" checked={!view.hidden.includes(k)}
                      onChange={(e) => setView((v) => ({ ...v, hidden: e.target.checked ? v.hidden.filter((x) => x !== k) : [...v.hidden, k] }))} />
                    <span className="truncate">{colMap[k].label}</span>
                  </label>
                  <button className="text-ink-soft hover:text-brand-600" title="Pin column"
                    onClick={() => setView((v) => ({ ...v, pinned: v.pinned.includes(k) ? v.pinned.filter((x) => x !== k) : [...v.pinned, k] }))}>
                    <L.Pin size={13} className={view.pinned.includes(k) ? 'fill-brand-500 text-brand-600' : ''} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <button className="btn-ghost" onClick={exportCSV}><L.Download size={15} /> CSV</button>
        <button className="btn-ghost" onClick={() => { localStorage.removeItem(lsKey); setView(defaultView(columns)); }} title="Reset view">
          <L.RotateCcw size={15} /> Reset
        </button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-ink-soft">{filtered.length} of {rows.length}</span>
          {toolbarExtra}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto" style={{ maxHeight: maxH }}>
        <table className="text-sm border-collapse" style={{ width: view.widthMode === 'full' ? '100%' : 'max-content', minWidth: '100%' }}>
          <thead className="sticky top-0 z-20">
            <tr className="bg-surface-3">
              {ordered.map((k) => {
                const c = colMap[k];
                const isPinned = view.pinned.includes(k);
                return (
                  <th key={k}
                    draggable
                    onDragStart={() => (dragKey.current = k)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => onDrop(k)}
                    className={`relative text-left font-semibold text-ink-soft px-2 py-2 border-b border-line select-none ${isPinned ? 'sticky z-10 bg-surface-3' : ''}`}
                    style={{ width: view.widths[k], minWidth: view.widths[k], maxWidth: view.widths[k], left: isPinned ? pinnedLeft[k] : undefined }}
                  >
                    <div className="flex items-center gap-1 cursor-pointer" onClick={() => setSort((s) => s?.key === k ? { key: k, dir: s.dir === 1 ? -1 : 1 } : { key: k, dir: 1 })}>
                      <L.GripVertical size={12} className="text-ink-soft/50 cursor-grab" />
                      <span className={view.wrap ? 'whitespace-normal' : 'truncate'}>{c.label}</span>
                      {sort?.key === k && (sort.dir === 1 ? <L.ChevronUp size={13} /> : <L.ChevronDown size={13} />)}
                    </div>
                    <span
                      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-brand-500"
                      onMouseDown={(e) => { e.stopPropagation(); resizing.current = { key: k, startX: e.clientX, startW: view.widths[k] || 120 }; document.body.style.cursor = 'col-resize'; }}
                    />
                  </th>
                );
              })}
            </tr>
            {showFilters && (
              <tr className="bg-surface-2">
                {ordered.map((k) => (
                  <th key={k} className="px-1 py-1 border-b border-line" style={{ width: view.widths[k] }}>
                    <input className="input py-0.5 text-xs" placeholder="filter…" value={colFilters[k] || ''}
                      onChange={(e) => setColFilters((f) => ({ ...f, [k]: e.target.value }))} />
                  </th>
                ))}
              </tr>
            )}
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={ordered.length} className="text-center text-ink-soft py-8">No records</td></tr>
            )}
            {filtered.map((row, i) => (
              <tr key={row.id || i}
                className="hover:bg-brand-50/60 cursor-pointer border-b border-line/60"
                onClick={() => onRowClick?.(row)}>
                {ordered.map((k) => {
                  const c = colMap[k];
                  const isPinned = view.pinned.includes(k);
                  return (
                    <td key={k}
                      className={`px-2 ${view.density === 'compact' ? 'py-1' : 'py-2'} align-top ${isPinned ? 'sticky z-[1] bg-surface' : ''}`}
                      style={{ width: view.widths[k], minWidth: view.widths[k], maxWidth: view.widths[k], left: isPinned ? pinnedLeft[k] : undefined }}>
                      <div className={view.wrap ? 'whitespace-normal break-words' : 'truncate'}>
                        {c.render ? c.render(row) : (row[k] ?? <span className="text-ink-soft">—</span>)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
