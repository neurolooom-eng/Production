// Central registry — the single source of truth that drives the database
// schema, the REST API, and (via /api/meta) the entire frontend UI.
import { foundationResources } from './foundation.js';
import { productionResources } from './production.js';
import { qualityResources } from './quality.js';
import { supplyResources } from './supply.js';

export const resources = [
  ...foundationResources,
  ...productionResources,
  ...qualityResources,
  ...supplyResources,
];

export const resourceMap = Object.fromEntries(resources.map((r) => [r.key, r]));

export function getResource(key) {
  return resourceMap[key];
}

// System columns present on every table (audit + identity).
export const SYSTEM_COLUMNS = [
  { name: 'id', label: 'ID', type: 'text', system: true, hideInTable: true },
  { name: 'created_at', label: 'Created', type: 'datetime', system: true, hideInTable: true },
  { name: 'updated_at', label: 'Updated', type: 'datetime', system: true, hideInTable: true },
  { name: 'created_by', label: 'Created By', type: 'text', system: true, hideInTable: true },
  { name: 'updated_by', label: 'Updated By', type: 'text', system: true, hideInTable: true },
];

// Public-facing metadata (strips writeOnly fields like passwords).
export function publicMeta() {
  return resources.map((r) => ({
    key: r.key,
    singular: r.singular,
    plural: r.plural,
    group: r.group,
    icon: r.icon,
    isoClause: r.isoClause,
    titleField: r.titleField,
    readOnly: !!r.readOnly,
    permissions: r.permissions || { read: null, write: null },
    fields: r.fields
      .filter((f) => !f.writeOnly)
      .map((f) => ({ ...f })),
  }));
}
