// Selects the active storage backend. Default: SQLite (zero-config).
// Set STORAGE=sheets to use the Google Sheets adapter.
import { SqliteStore } from './sqlite.js';
import { SheetsStore } from './sheets.js';

let _store;
export function store() {
  if (!_store) {
    const backend = (process.env.STORAGE || 'sqlite').toLowerCase();
    _store = backend === 'sheets' ? new SheetsStore() : new SqliteStore();
    console.log(`Storage backend: ${_store.kind}`);
  }
  return _store;
}
