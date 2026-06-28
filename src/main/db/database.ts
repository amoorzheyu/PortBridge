import { app } from 'electron';
import Database from 'better-sqlite3';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { runMigrations } from './migrations';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (db) return db;

  const dataDir = join(app.getPath('userData'), 'data');
  mkdirSync(dataDir, { recursive: true });
  db = new Database(join(dataDir, 'portbridge.db'));
  runMigrations(db);
  return db;
}
