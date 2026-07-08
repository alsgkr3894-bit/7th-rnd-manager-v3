import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import pg from 'pg';

const ROOT = process.cwd();
const { Client } = pg;

function parseDatabaseUrl(raw = process.env.DATABASE_URL) {
  const value = String(raw || '').trim();
  if (!value) throw new Error('DATABASE_URL is required.');

  const url = new URL(value);
  return {
    database: decodeURIComponent(url.pathname.replace(/^\//, '')),
    host: url.hostname || '127.0.0.1',
    password: decodeURIComponent(url.password || ''),
    port: url.port || '5432',
    user: decodeURIComponent(url.username || ''),
  };
}

function databaseUrlFor(database) {
  const db = parseDatabaseUrl();
  const url = new URL(process.env.DATABASE_URL);
  url.pathname = `/${encodeURIComponent(database)}`;
  return url.toString();
}

function postgresBin(name) {
  const executable = process.platform === 'win32' ? `${name}.exe` : name;
  const portable = join(ROOT, '.postgresql', 'pgsql', 'bin', executable);
  return existsSync(portable) ? portable : executable;
}

function runPostgresTool(name, args) {
  const db = parseDatabaseUrl();
  const result = spawnSync(postgresBin(name), args, {
    cwd: ROOT,
    env: { ...process.env, PGPASSWORD: db.password },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      result.stderr || result.stdout || `${name} failed with status ${result.status}`
    );
  }
}

async function withClient(database, fn) {
  const client = new Client({ connectionString: databaseUrlFor(database) });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

function quoteIdent(name) {
  return `"${String(name).replaceAll('"', '""')}"`;
}

async function databaseExists(database) {
  const db = parseDatabaseUrl();
  return withClient('postgres', async client => {
    const result = await client.query('select 1 from pg_database where datname = $1', [database]);
    return result.rowCount > 0 && database !== db.database;
  });
}

async function dropDatabase(database) {
  if (!(await databaseExists(database))) return;
  await withClient('postgres', async client => {
    await client.query(
      'select pg_terminate_backend(pid) from pg_stat_activity where datname = $1 and pid <> pg_backend_pid()',
      [database]
    );
    await client.query(`drop database ${quoteIdent(database)}`);
  });
}

async function createDatabase(database) {
  await withClient('postgres', async client => {
    await client.query(`create database ${quoteIdent(database)}`);
  });
}

async function tableNames(database) {
  return withClient(database, async client => {
    const result = await client.query(`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_type = 'BASE TABLE'
      order by table_name
    `);
    return result.rows.map(row => row.table_name);
  });
}

async function tableFingerprint(database, tableName) {
  return withClient(database, async client => {
    const table = quoteIdent(tableName);
    const result = await client.query(`
      select
        count(*)::int as count,
        coalesce(md5(string_agg(row_to_json(t)::text, E'\\n' order by row_to_json(t)::text)), md5('')) as hash
      from public.${table} t
    `);
    return result.rows[0];
  });
}

async function fingerprints(database) {
  const names = await tableNames(database);
  const result = {};
  for (const tableName of names) {
    result[tableName] = await tableFingerprint(database, tableName);
  }
  return result;
}

function compareFingerprints(current, restored) {
  const tables = [...new Set([...Object.keys(current), ...Object.keys(restored)])].sort();
  return tables.map(table => {
    const a = current[table] || null;
    const b = restored[table] || null;
    return {
      table,
      currentCount: a?.count ?? null,
      backupCount: b?.count ?? null,
      countMatch: a?.count === b?.count,
      hashMatch: a?.hash === b?.hash,
    };
  });
}

async function main() {
  const dumpPath = resolve(process.argv[2] || '');
  if (!dumpPath || !existsSync(dumpPath)) {
    throw new Error('Usage: node scripts/db-compare-dump.mjs <backup.dump>');
  }

  const currentDb = parseDatabaseUrl().database;
  const tempDb = `${currentDb}_compare_${Date.now()}`;
  await dropDatabase(tempDb);
  await createDatabase(tempDb);

  try {
    runPostgresTool('pg_restore', [
      '-h',
      parseDatabaseUrl().host,
      '-p',
      parseDatabaseUrl().port,
      '-U',
      parseDatabaseUrl().user,
      '-d',
      tempDb,
      '--no-owner',
      '--no-privileges',
      '--single-transaction',
      '--exit-on-error',
      dumpPath,
    ]);

    const [current, restored] = await Promise.all([fingerprints(currentDb), fingerprints(tempDb)]);
    const tables = compareFingerprints(current, restored);
    const mismatches = tables.filter(row => !row.countMatch || !row.hashMatch);
    const output = {
      ok: mismatches.length === 0,
      currentDb,
      backupFile: basename(dumpPath),
      comparedAt: new Date().toISOString(),
      tableCount: tables.length,
      mismatches,
      tables,
    };
    console.log(JSON.stringify(output, null, 2));
    process.exitCode = output.ok ? 0 : 1;
  } finally {
    await dropDatabase(tempDb);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
