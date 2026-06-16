// Shared helpers for the storage adapters.
import { resourceMap, SYSTEM_COLUMNS } from '../registry/index.js';
import { columnsFor } from '../db/schema.js';

// Full ordered column list persisted for a resource (matches the header row
// used by the Google Sheets adapter and the SQLite table layout).
export function columnNames(key) {
  const r = resourceMap[key];
  const cols = ['id', ...columnsFor(r).map((f) => f.name)];
  if (key === 'users') cols.push('password_hash');
  cols.push('created_at', 'updated_at', 'created_by', 'updated_by');
  return cols;
}

// Coerce a raw row (e.g. all-strings from Sheets) into correct JS types per
// the registry field definitions, so the API behaves identically on any store.
export function typeRow(key, raw) {
  if (!raw) return raw;
  const r = resourceMap[key];
  const out = { ...raw };
  const fieldByName = Object.fromEntries(r.fields.map((f) => [f.name, f]));
  for (const [k, v] of Object.entries(out)) {
    if (v === '' || v === null || v === undefined) { out[k] = v === '' ? null : v; continue; }
    const f = fieldByName[k];
    if (!f) continue;
    if (f.type === 'number') out[k] = v === '' ? null : Number(v);
    else if (f.type === 'boolean') out[k] = v === true || v === 1 || v === '1' || v === 'true' || v === 'TRUE' ? 1 : 0;
  }
  return out;
}

// 0-indexed column number -> A1 column letters (0->A, 26->AA).
export function colLetter(n) {
  let s = '';
  n += 1;
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

export const ALL_KEYS = Object.keys(resourceMap);
export { SYSTEM_COLUMNS };
