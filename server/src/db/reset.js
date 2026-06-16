// Rebuilds and reseeds the active backend. `npm run db:reset`.
// SQLite: deletes the local DB file. Sheets: clears every tab. Then seeds.
import { existsSync, rmSync } from 'fs';
import { DB_PATH } from './connection.js';
import { store } from '../store/index.js';
import { seed } from './seed.js';

async function main() {
  const backend = (process.env.STORAGE || 'sqlite').toLowerCase();

  if (backend !== 'sheets') {
    for (const suffix of ['', '-wal', '-shm']) {
      const p = DB_PATH + suffix;
      if (existsSync(p)) rmSync(p);
    }
  }

  const st = store();
  await st.init();
  if (backend === 'sheets') {
    console.log('Clearing all Google Sheets tabs…');
    await st.clearAll();
  }
  await seed();
  console.log(`Database reset complete (store: ${st.kind}).`);
  process.exit(0);
}

main().catch((e) => { console.error('Reset failed:', e); process.exit(1); });
