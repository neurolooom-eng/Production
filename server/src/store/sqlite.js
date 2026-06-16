// SQLite storage adapter (default, zero-config). Wraps better-sqlite3 (sync)
// behind the async store interface so it is interchangeable with Sheets.
import { db } from '../db/connection.js';
import { buildSchema } from '../db/schema.js';
import { columnNames } from './util.js';

export class SqliteStore {
  constructor() { this.kind = 'sqlite'; }

  async init() { buildSchema(db()); }

  async isEmpty(key) {
    try { return db().prepare(`SELECT COUNT(*) c FROM "${key}"`).get().c === 0; }
    catch { return true; }
  }

  async list(key) {
    return db().prepare(`SELECT * FROM "${key}" ORDER BY created_at DESC`).all();
  }

  async get(key, id) {
    return db().prepare(`SELECT * FROM "${key}" WHERE id = ?`).get(id) || null;
  }

  async insert(key, row) {
    const cols = columnNames(key).filter((c) => c in row);
    db().prepare(
      `INSERT INTO "${key}" (${cols.map((c) => `"${c}"`).join(',')}) VALUES (${cols.map((c) => `@${c}`).join(',')})`
    ).run(pick(row, cols));
    return this.get(key, row.id);
  }

  async bulkInsert(key, rows) {
    const insert = db().transaction((items) => { for (const r of items) {
      const cols = columnNames(key).filter((c) => c in r);
      db().prepare(`INSERT INTO "${key}" (${cols.map((c) => `"${c}"`).join(',')}) VALUES (${cols.map((c) => `@${c}`).join(',')})`).run(pick(r, cols));
    }});
    insert(rows);
  }

  async update(key, id, patch) {
    const cols = Object.keys(patch).filter((c) => c !== 'id');
    if (cols.length) {
      db().prepare(`UPDATE "${key}" SET ${cols.map((c) => `"${c}" = @${c}`).join(', ')} WHERE id = @id`)
        .run({ ...pick(patch, cols), id });
    }
    return this.get(key, id);
  }

  async remove(key, id) {
    db().prepare(`DELETE FROM "${key}" WHERE id = ?`).run(id);
  }

  async clearAll() {
    // For SQLite, reset.js deletes the DB file and re-runs init(); no-op here.
  }
}

function pick(obj, keys) {
  const o = {};
  for (const k of keys) o[k] = obj[k] === undefined ? null : obj[k];
  return o;
}
