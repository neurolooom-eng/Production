// Builds the SQLite schema from the resource registry. Metadata-driven:
// add a field to a registry resource and it becomes a column here.
import { resources } from '../registry/index.js';

const SQL_TYPE = {
  text: 'TEXT', textarea: 'TEXT', select: 'TEXT', multiselect: 'TEXT',
  ref: 'TEXT', signature: 'TEXT', password: 'TEXT', json: 'TEXT',
  date: 'TEXT', datetime: 'TEXT',
  number: 'REAL', boolean: 'INTEGER',
};

export function columnsFor(resource) {
  // Stored columns = non-writeOnly, non-computed fields.
  return resource.fields.filter((f) => !f.writeOnly && !f.computed);
}

export function buildSchema(db) {
  for (const r of resources) {
    const cols = columnsFor(r).map((f) => `  "${f.name}" ${SQL_TYPE[f.type] || 'TEXT'}`);
    // Users get a dedicated password_hash column managed by the auth layer.
    if (r.key === 'users') cols.push('  "password_hash" TEXT');
    const ddl = [
      `CREATE TABLE IF NOT EXISTS "${r.key}" (`,
      '  "id" TEXT PRIMARY KEY,',
      ...cols.map((c) => c + ','),
      '  "created_at" TEXT,',
      '  "updated_at" TEXT,',
      '  "created_by" TEXT,',
      '  "updated_by" TEXT',
      ');',
    ].join('\n');
    db.exec(ddl);
  }
}
