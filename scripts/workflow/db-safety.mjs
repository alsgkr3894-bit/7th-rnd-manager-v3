import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

function parseDatabaseUrl() {
  const raw = String(process.env.DATABASE_URL || '').trim();
  if (!raw) throw new Error('DATABASE_URL is required for workflow QA DB safety.');

  const url = new URL(raw);
  return {
    database: decodeURIComponent(url.pathname.replace(/^\//, '')),
    host: url.hostname || '127.0.0.1',
    password: decodeURIComponent(url.password || ''),
    port: url.port || '5432',
    user: decodeURIComponent(url.username || ''),
  };
}

function postgresBin(name) {
  const executable = process.platform === 'win32' ? `${name}.exe` : name;
  const portable = join(ROOT, '.postgresql', 'pgsql', 'bin', executable);
  return existsSync(portable) ? portable : executable;
}

function runPostgresTool(name, args, db) {
  const result = spawnSync(postgresBin(name), args, {
    cwd: ROOT,
    env: {
      ...process.env,
      PGPASSWORD: db.password,
    },
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

export function createWorkflowDbSafetySnapshot(tmpDir, runId = Date.now()) {
  const db = parseDatabaseUrl();
  const snapshotPath = join(tmpDir, `workflow-db-safety-${runId}.dump`);

  runPostgresTool(
    'pg_dump',
    [
      '-h',
      db.host,
      '-p',
      db.port,
      '-U',
      db.user,
      '-d',
      db.database,
      '-Fc',
      '--no-owner',
      '--no-privileges',
      '-f',
      snapshotPath,
    ],
    db
  );

  if (statSync(snapshotPath).size <= 0) {
    throw new Error('Workflow QA DB safety snapshot is empty.');
  }

  return snapshotPath;
}

export function restoreWorkflowDbSafetySnapshot(snapshotPath) {
  if (!snapshotPath) throw new Error('Workflow QA DB safety snapshot path is required.');
  if (!existsSync(snapshotPath)) {
    throw new Error(`Workflow QA DB safety snapshot is missing: ${snapshotPath}`);
  }

  const db = parseDatabaseUrl();
  runPostgresTool(
    'pg_restore',
    [
      '-h',
      db.host,
      '-p',
      db.port,
      '-U',
      db.user,
      '-d',
      db.database,
      '--clean',
      '--if-exists',
      '--no-owner',
      '--no-privileges',
      '--single-transaction',
      '--exit-on-error',
      snapshotPath,
    ],
    db
  );
}

export const createQaDbSafetySnapshot = createWorkflowDbSafetySnapshot;
export const restoreQaDbSafetySnapshot = restoreWorkflowDbSafetySnapshot;
