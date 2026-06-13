// Drops, rebuilds and reseeds the database. `npm run db:reset`.
import { existsSync, rmSync } from 'fs';
import { db, DB_PATH } from './connection.js';
import { buildSchema } from './schema.js';
import { seed } from './seed.js';

for (const suffix of ['', '-wal', '-shm']) {
  const p = DB_PATH + suffix;
  if (existsSync(p)) rmSync(p);
}

const database = db();
buildSchema(database);
seed();
console.log('Database reset at', DB_PATH);
process.exit(0);
