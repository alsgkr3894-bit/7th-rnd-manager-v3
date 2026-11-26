/**
 * prisma/verify-db-restore.mjs — 백업(.dump)을 격리된 임시 PostgreSQL에 실제로 복원해 검증한다.
 *
 *   npm run db:restore:verify                       # 가장 최근 백업
 *   npm run db:restore:verify -- --dump <파일>      # 지정한 백업
 *   npm run db:restore:verify -- --keep --env-out <파일>   # 임시 DB를 남겨 화면 확인에 사용
 *   npm run db:restore:verify -- --cleanup <임시 폴더>     # 남긴 임시 DB 정리
 *
 * 운영 DB 서버에는 아무것도 만들지 않는다. 임시 폴더에 새 클러스터를 만들어 다른 포트로 띄우고,
 * 운영 DB는 읽기 전용 연결로 비교만 한다. 결과는 <백업>.dump.verify.json에 남긴다.
 */
import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import {
  createReadStream,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import pg from 'pg';

import { backupFiles } from './local-db-backup.mjs';
import {
  REQUIRED_STORES,
  TEMP_DIR_PREFIX,
  VERIFY_SIDECAR_SUFFIX,
  allPassed,
  assertIsolatedTarget,
  compareStoreRows,
  dumpStartedAt,
  isOwnTempDir,
  summarizeComparison,
} from './restore-verify-core.mjs';

const ROOT = process.cwd();
const MARKER = 'restore-verify.marker';
const TEMP_DB = 'restore_check';
const TEMP_USER = 'verify';

const argValue = name => {
  const index = process.argv.indexOf(name);
  return index === -1 ? '' : process.argv[index + 1] || '';
};
const hasFlag = name => process.argv.includes(name);

function postgresBin(name) {
  const executable = process.platform === 'win32' ? `${name}.exe` : name;
  const portable = join(ROOT, '.postgresql', 'pgsql', 'bin', executable);
  return existsSync(portable) ? portable : executable;
}

function run(name, args, { env = {}, quiet = false } = {}) {
  const result = spawnSync(postgresBin(name), args, {
    cwd: ROOT,
    // Windows 한글 오류 메시지가 깨지지 않게 영어로 받는다
    env: { ...process.env, LC_MESSAGES: 'C', ...env },
    encoding: 'utf8',
    // pg_ctl이 띄운 서버가 파이프를 물고 있으면 Windows에서 끝나지 않는다
    stdio: quiet ? 'ignore' : ['ignore', 'pipe', 'pipe'],
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${name} 실패 (${result.status}): ${String(result.stderr || '').slice(-2000)}`);
  }
  return result.stdout || '';
}

function assertPortFree(port) {
  return new Promise((done, fail) => {
    const server = createServer();
    server.once('error', () => fail(new Error(`포트 ${port}를 이미 사용 중입니다.`)));
    server.listen(port, '127.0.0.1', () => server.close(() => done()));
  });
}

const sha256Of = file =>
  new Promise((done, fail) => {
    const hash = createHash('sha256');
    createReadStream(file)
      .on('data', chunk => hash.update(chunk))
      .on('end', () => done(hash.digest('hex')))
      .on('error', fail);
  });

async function withClient(connectionString, readOnly, work) {
  const client = new pg.Client({
    connectionString,
    ...(readOnly ? { options: '-c default_transaction_read_only=on' } : {}),
  });
  await client.connect();
  try {
    return await work(client);
  } finally {
    await client.end();
  }
}

const ROW_SQL = `select brand_id as "brandId", store_name as "storeName", record_key as "recordKey",
  md5(data::text) as hash,
  extract(epoch from created_at)::float8 as "createdAt",
  extract(epoch from updated_at)::float8 as "updatedAt"
  from store_rows`;
const OTHER_TABLES = ['brands', 'store_catalog', 'local_storage_entries', 'server_settings'];

async function readSnapshot(client) {
  const rows = (await client.query(ROW_SQL)).rows;
  const tables = {};
  for (const table of OTHER_TABLES) {
    tables[table] = (await client.query(`select count(*)::int as n from ${table}`)).rows[0].n;
  }
  return { rows, tables };
}

function runCostAudit(databaseUrl) {
  const result = spawnSync(process.execPath, [join(ROOT, 'scripts', 'audit-recipe-cost.mjs')], {
    cwd: ROOT,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    timeout: 300_000,
  });
  if (result.status !== 0) {
    throw new Error(`원가 감사 실패: ${String(result.stderr || result.error).slice(-1500)}`);
  }
  return JSON.parse(result.stdout.slice(result.stdout.indexOf('{')));
}

function startCluster(dir, port) {
  const password = randomBytes(24).toString('hex');
  const passwordFile = join(dir, 'pw');
  writeFileSync(passwordFile, password, 'utf8');
  const data = join(dir, 'data');
  run('initdb', [
    '-D',
    data,
    '-U',
    TEMP_USER,
    '-E',
    'UTF8',
    '--locale=C',
    '--auth=scram-sha-256',
    `--pwfile=${passwordFile}`,
  ]);
  rmSync(passwordFile, { force: true });
  run(
    'pg_ctl',
    [
      'start',
      '-D',
      data,
      '-w',
      '-l',
      join(dir, 'postgres.log'),
      '-o',
      `-p ${port} -c listen_addresses=127.0.0.1`,
    ],
    { quiet: true }
  );
  return password;
}

function destroyCluster(dir) {
  if (!isOwnTempDir(dir, tmpdir()) || !existsSync(join(dir, MARKER))) {
    throw new Error(`이 도구가 만든 임시 폴더가 아니라 지우지 않습니다: ${dir}`);
  }
  const data = join(dir, 'data');
  if (existsSync(join(data, 'postmaster.pid'))) {
    run('pg_ctl', ['stop', '-D', data, '-m', 'fast', '-w'], { quiet: true });
  }
  rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
}

async function verify() {
  const productionUrl = String(process.env.DATABASE_URL || '').trim();
  const port = assertIsolatedTarget(argValue('--port') || 55432, productionUrl);
  const dump = argValue('--dump') ? resolve(argValue('--dump')) : backupFiles()[0]?.path;
  if (!dump || !existsSync(dump)) throw new Error('검증할 백업 파일이 없습니다.');
  await assertPortFree(port);

  const started = Date.now();
  const snapshotAt = dumpStartedAt(dump) || statSync(dump).mtime;
  const checks = [];
  const check = (name, ok, detail) => {
    checks.push({ name, ok: Boolean(ok), detail });
    console.log(`${ok ? '통과' : '실패'}  ${name}${detail ? ` — ${detail}` : ''}`);
  };
  const report = {
    verifiedAt: null,
    ok: false,
    dump: basename(dump),
    dumpSize: statSync(dump).size,
    dumpStartedAt: snapshotAt.toISOString(),
    sha256: await sha256Of(dump),
    checks,
  };

  const dir = mkdtempSync(join(tmpdir(), TEMP_DIR_PREFIX));
  writeFileSync(join(dir, MARKER), 'verify-db-restore\n', 'utf8');
  const keep = hasFlag('--keep');
  let kept = false;
  try {
    console.log(`백업: ${basename(dump)} · 임시 DB: 127.0.0.1:${port}`);
    const password = startCluster(dir, port);
    const env = { PGPASSWORD: password };
    const server = ['-h', '127.0.0.1', '-p', String(port), '-U', TEMP_USER];
    run('createdb', [...server, TEMP_DB], { env });
    const restoreStarted = Date.now();
    run(
      'pg_restore',
      [...server, '-d', TEMP_DB, '--no-owner', '--no-privileges', '--exit-on-error', dump],
      { env }
    );
    report.restoreSeconds = Math.round((Date.now() - restoreStarted) / 100) / 10;
    check('pg_restore 완료', true, `${report.restoreSeconds}초`);

    const url = `postgresql://${TEMP_USER}:${password}@127.0.0.1:${port}/${TEMP_DB}`;
    const restored = await withClient(url, false, async client => {
      report.postgresVersion = (await client.query('show server_version')).rows[0].server_version;
      const applied = (
        await client.query(
          'select migration_name from _prisma_migrations where finished_at is not null and rolled_back_at is null'
        )
      ).rows.map(row => row.migration_name);
      const expected = readdirSync(join(ROOT, 'prisma', 'migrations'), { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
      const missing = expected.filter(name => !applied.includes(name));
      check(
        'DB 마이그레이션 일치',
        missing.length === 0,
        missing.length ? `빠짐: ${missing.join(', ')}` : `${applied.length}건`
      );
      return readSnapshot(client);
    });

    report.storeRows = restored.rows.length;
    report.tables = restored.tables;
    check('저장 행 복원', restored.rows.length > 0, `${restored.rows.length}행`);
    report.coreCounts = Object.fromEntries(
      REQUIRED_STORES.map(store => [
        store,
        restored.rows.filter(row => row.storeName === store).length,
      ])
    );
    const empty = REQUIRED_STORES.filter(store => report.coreCounts[store] === 0);
    check(
      '핵심 업무 저장소',
      empty.length === 0,
      empty.length ? `비어 있음: ${empty.join(', ')}` : JSON.stringify(report.coreCounts)
    );

    const audit = runCostAudit(url);
    report.audit = audit;
    check(
      '원가 계산(복원본)',
      audit.메뉴수 > 0 && audit.화면간원가불일치 === 0,
      `메뉴 ${audit.메뉴수} · 화면 간 불일치 ${audit.화면간원가불일치}`
    );

    if (hasFlag('--skip-live') || !productionUrl) {
      report.liveComparison = null;
      console.log('운영 DB 비교는 건너뜀');
    } else {
      const live = await withClient(productionUrl, true, readSnapshot);
      const comparison = compareStoreRows(restored.rows, live.rows, snapshotAt.getTime() / 1000);
      report.liveRows = live.rows.length;
      report.liveTables = live.tables;
      report.liveComparison = summarizeComparison(comparison);
      check(
        '운영 DB와 비교(설명되지 않는 차이 없음)',
        comparison.unexplained.length === 0,
        `같음 ${comparison.identical} · 백업 후 변경 ${comparison.changedAfterBackup.length} · ` +
          `백업 후 추가 ${comparison.addedAfterBackup.length} · 백업에만 ${comparison.onlyInBackup.length} · ` +
          `설명 안 됨 ${comparison.unexplained.length}`
      );
    }

    if (keep) {
      const envOut = argValue('--env-out');
      if (envOut) writeFileSync(envOut, JSON.stringify({ dir, url }), 'utf8');
      kept = true;
    }
  } catch (error) {
    check('검증 실행', false, error.message);
  } finally {
    if (!kept) destroyCluster(dir);
  }

  report.verifiedAt = new Date().toISOString();
  report.totalSeconds = Math.round((Date.now() - started) / 100) / 10;
  report.ok = allPassed(checks);
  writeFileSync(`${dump}${VERIFY_SIDECAR_SUFFIX}`, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`${report.ok ? '복원 검증 성공' : '복원 검증 실패'} (${report.totalSeconds}초)`);
  if (kept) {
    console.log(`임시 DB를 남겼습니다. 정리: npm run db:restore:verify -- --cleanup "${dir}"`);
  }
  if (!report.ok) process.exitCode = 1;
}

async function main() {
  const cleanup = argValue('--cleanup');
  if (cleanup) {
    const dir =
      existsSync(cleanup) && statSync(cleanup).isFile()
        ? JSON.parse(readFileSync(cleanup, 'utf8')).dir
        : cleanup;
    destroyCluster(resolve(dir));
    console.log('임시 DB를 정리했습니다.');
    return;
  }
  await verify();
}

main().catch(error => {
  console.error(error?.message || error);
  process.exitCode = 1;
});
