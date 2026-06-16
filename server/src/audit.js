// Immutable audit trail (ISO 13485 §4.2.5 / 21 CFR Part 11 style).
import { nanoid } from 'nanoid';
import { store } from './store/index.js';

export async function audit({ actor, action, resource, recordId, summary, signature }) {
  try {
    const ts = new Date().toISOString();
    await store().insert('audit_log', {
      id: nanoid(12), ts,
      actor: actor || 'system', action,
      resource, record_id: recordId || '', summary: summary || '', signature: signature || '',
      created_at: ts, updated_at: ts, created_by: actor || 'system', updated_by: actor || 'system',
    });
  } catch (e) {
    // Never let audit failure break the operation, but log it.
    console.error('audit error', e.message);
  }
}
