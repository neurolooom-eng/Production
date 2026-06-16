// Generic, metadata-driven CRUD router. One definition per resource yields a
// full REST API with validation, audit trail, RBAC and computed fields.
// Backend-agnostic: persists through the active store (SQLite or Google Sheets).
import { Router } from 'express';
import { nanoid } from 'nanoid';
import { columnsFor } from './db/schema.js';
import { store } from './store/index.js';
import { audit } from './audit.js';
import { hashPassword, requireRead, requireWrite } from './auth.js';

function coerce(field, value) {
  if (value === undefined || value === null || value === '') {
    return field.type === 'boolean' ? (field.default ? 1 : 0) : null;
  }
  if (field.type === 'number') return Number(value);
  if (field.type === 'boolean') return value ? 1 : 0;
  return String(value);
}

function applyComputed(resource, row) {
  if (!row) return row;
  const out = { ...row };
  for (const f of resource.fields) {
    if (f.computed) {
      try {
        const expr = f.computed.replace(/[a-z_]+/gi, (m) => Number(out[m] ?? 0));
        // eslint-disable-next-line no-eval
        out[f.name] = eval(expr);
      } catch { out[f.name] = null; }
    }
  }
  if (resource.key === 'users') delete out.password_hash;
  return out;
}

// Async wrapper so thrown errors reach Express' error handler.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function makeRouter(resource) {
  const r = Router();
  const cols = columnsFor(resource);
  const isUsers = resource.key === 'users';

  r.get('/', requireRead(resource), wrap(async (req, res) => {
    const rows = await store().list(resource.key);
    res.json(rows.map((row) => applyComputed(resource, row)));
  }));

  r.get('/:id', requireRead(resource), wrap(async (req, res) => {
    const row = await store().get(resource.key, req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(applyComputed(resource, row));
  }));

  r.post('/', requireWrite(resource), wrap(async (req, res) => {
    const id = nanoid(12);
    const now = new Date().toISOString();
    const actor = req.user.username;
    const row = { id };
    for (const f of cols) row[f.name] = coerce(f, req.body[f.name] ?? f.default);
    if (isUsers && req.body.password) row.password_hash = hashPassword(req.body.password);
    Object.assign(row, { created_at: now, updated_at: now, created_by: actor, updated_by: actor });

    const saved = await store().insert(resource.key, row);
    await audit({ actor, action: 'CREATE', resource: resource.key, recordId: id,
      summary: `Created ${resource.singular}`, signature: req.body.__signature });
    res.status(201).json(applyComputed(resource, saved));
  }));

  r.put('/:id', requireWrite(resource), wrap(async (req, res) => {
    const existing = await store().get(resource.key, req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const now = new Date().toISOString();
    const actor = req.user.username;
    const patch = { updated_at: now, updated_by: actor };
    for (const f of cols) if (f.name in req.body) patch[f.name] = coerce(f, req.body[f.name]);
    if (isUsers && req.body.password) patch.password_hash = hashPassword(req.body.password);

    const saved = await store().update(resource.key, req.params.id, patch);
    await audit({ actor, action: 'UPDATE', resource: resource.key, recordId: req.params.id,
      summary: `Updated ${resource.singular}`, signature: req.body.__signature });
    res.json(applyComputed(resource, saved));
  }));

  r.delete('/:id', requireWrite(resource), wrap(async (req, res) => {
    const existing = await store().get(resource.key, req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    await store().remove(resource.key, req.params.id);
    await audit({ actor: req.user.username, action: 'DELETE', resource: resource.key, recordId: req.params.id,
      summary: `Deleted ${resource.singular}` });
    res.json({ ok: true });
  }));

  return r;
}
