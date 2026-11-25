// Creates the tables (if missing) and then the demo accounts. Safe to run more than once.
// Used on hosts without a shell: the start command runs this before the server.
import { readFile } from 'fs/promises';
import { config } from '../config.js';
import { Database } from '../db.js';

const schemaPath = new URL('../sql/schema.sql', import.meta.url);
const schema = await readFile(schemaPath, 'utf8');

// schema.sql only uses CREATE ... IF NOT EXISTS, so existing data is kept.
const db = new Database(config.databaseUrl);
await db.runSchema(schema);
await db.close();
console.log('Tables ready.');

// seed.js creates john@john.com and admin@admin.com.
await import('./seed.js');
