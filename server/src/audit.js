// Immutable audit trail (ISO 13485 §4.2.5 / 21 CFR Part 11 style).
import { nanoid } from 'nanoid';
import { db } from './db/connection.js';

export function audit({ actor, action, resource, recordId, summary, signature }) {
  try {
    db().prepare(
      `INSERT INTO audit_log (id, ts, actor, action, resource, record_id, summary, signature, created_at, updated_at, created_by, updated_by)
       VALUES (@id, @ts, @actor, @action, @resource, @record_id, @summary, @signature, @ts, @ts, @actor, @actor)`
    ).run({
      id: nanoid(12),
      ts: new Date().toISOString(),
      actor: actor || 'system',
      action,
      resource,
      record_id: recordId || '',
      summary: summary || '',
      signature: signature || '',
    });
  } catch (e) {
    // Never let audit failure break the operation, but log it.
    console.error('audit error', e.message);
  }
}
