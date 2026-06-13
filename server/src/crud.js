// Generic, metadata-driven CRUD router. One definition per resource yields a
// full REST API with validation, audit trail, RBAC and computed fields.
import { Router } from 'express';
import { nanoid } from 'nanoid';
import { db } from './db/connection.js';
import { columnsFor } from './db/schema.js';
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
  for (const f of resource.fields) {
    if (f.computed) {
      // Supports simple "a*b*c" style expressions over numeric fields.
      try {
        const expr = f.computed.replace(/[a-z_]+/gi, (m) => Number(row[m] ?? 0));
        // eslint-disable-next-line no-eval
        row[f.name] = eval(expr);
      } catch { row[f.name] = null; }
    }
  }
  if (resource.key === 'users') delete row.password_hash;
  return row;
}

export function makeRouter(resource) {
  const r = Router();
  const cols = columnsFor(resource);
  const isUsers = resource.key === 'users';

  // LIST
  r.get('/', requireRead(resource), (req, res) => {
    const rows = db().prepare(`SELECT * FROM "${resource.key}" ORDER BY created_at DESC`).all();
    res.json(rows.map((row) => applyComputed(resource, row)));
  });

  // GET ONE
  r.get('/:id', requireRead(resource), (req, res) => {
    const row = db().prepare(`SELECT * FROM "${resource.key}" WHERE id = ?`).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(applyComputed(resource, row));
  });

  // CREATE
  r.post('/', requireWrite(resource), (req, res) => {
    const id = nanoid(12);
    const now = new Date().toISOString();
    const actor = req.user.username;
    const data = { id };
    for (const f of cols) data[f.name] = coerce(f, req.body[f.name] ?? f.default);
    if (isUsers && req.body.password) data.password_hash = hashPassword(req.body.password);

    const fieldNames = cols.map((f) => f.name);
    if (isUsers) fieldNames.push('password_hash');
    const allCols = ['id', ...fieldNames, 'created_at', 'updated_at', 'created_by', 'updated_by'];
    const placeholders = allCols.map((c) => `@${c}`);
    db().prepare(
      `INSERT INTO "${resource.key}" (${allCols.map((c) => `"${c}"`).join(',')}) VALUES (${placeholders.join(',')})`
    ).run({ ...data, created_at: now, updated_at: now, created_by: actor, updated_by: actor });

    audit({ actor, action: 'CREATE', resource: resource.key, recordId: id,
      summary: `Created ${resource.singular}`, signature: req.body.__signature });
    const row = db().prepare(`SELECT * FROM "${resource.key}" WHERE id = ?`).get(id);
    res.status(201).json(applyComputed(resource, row));
  });

  // UPDATE
  r.put('/:id', requireWrite(resource), (req, res) => {
    const existing = db().prepare(`SELECT * FROM "${resource.key}" WHERE id = ?`).get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const now = new Date().toISOString();
    const actor = req.user.username;
    const sets = [];
    const data = { id: req.params.id, updated_at: now, updated_by: actor };
    for (const f of cols) {
      if (f.name in req.body) { data[f.name] = coerce(f, req.body[f.name]); sets.push(`"${f.name}" = @${f.name}`); }
    }
    if (isUsers && req.body.password) { data.password_hash = hashPassword(req.body.password); sets.push('"password_hash" = @password_hash'); }
    sets.push('"updated_at" = @updated_at', '"updated_by" = @updated_by');
    db().prepare(`UPDATE "${resource.key}" SET ${sets.join(', ')} WHERE id = @id`).run(data);

    audit({ actor, action: 'UPDATE', resource: resource.key, recordId: req.params.id,
      summary: `Updated ${resource.singular}`, signature: req.body.__signature });
    const row = db().prepare(`SELECT * FROM "${resource.key}" WHERE id = ?`).get(req.params.id);
    res.json(applyComputed(resource, row));
  });

  // DELETE
  r.delete('/:id', requireWrite(resource), (req, res) => {
    const existing = db().prepare(`SELECT * FROM "${resource.key}" WHERE id = ?`).get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    db().prepare(`DELETE FROM "${resource.key}" WHERE id = ?`).run(req.params.id);
    audit({ actor: req.user.username, action: 'DELETE', resource: resource.key, recordId: req.params.id,
      summary: `Deleted ${resource.singular}` });
    res.json({ ok: true });
  });

  return r;
}
