import 'dotenv/config';
import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('Missing required environment variable: DATABASE_URL');

const expectedTables = [
  'users',
  'profiles',
  'doctors',
  'availability_slots',
  'consultations',
  'prescriptions',
  'payments',
  'audit_logs',
];

async function verify() {
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const result = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = ANY($1::text[])
       ORDER BY table_name`,
      [expectedTables],
    );

    const actual = result.rows.map((row) => row.table_name);
    const missing = expectedTables.filter((table) => !actual.includes(table));

    if (missing.length) {
      throw new Error(`Missing required tables: ${missing.join(', ')}`);
    }

    console.log('Database verification passed. Required core tables:', actual.join(', '));
  } finally {
    await pool.end();
  }
}

verify().catch((error) => {
  console.error('Database verification failed:', error);
  process.exitCode = 1;
});
