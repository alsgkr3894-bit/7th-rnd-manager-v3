/**
 * scripts/pull-store-rows.mjs — 감사 테스트(__tests__/audit)용 데이터 사본을 읽기 전용으로 내려받는다.
 *
 *   npm run audit:cross-module                      # 임시 폴더에 받아 감사 실행 후 사본 삭제
 *   node scripts/pull-store-rows.mjs --out <폴더>   # 사본만 만들기(업무 데이터이므로 저장소 밖에)
 *
 * DB는 읽기 전용 연결로만 접근한다. 7번가(main) 브랜드의 감사에 필요한 저장소만 받는다.
 */
import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import pg from 'pg';

const ROOT = process.cwd();
const STORES = [
  'menu_master',
  'menu_recipes',
  'cost_ingredients',
  'cost_selling_prices',
  'cost_edge_dough',
  'cost_recipe_groups',
  'price_files',
  'price_rows',
  'nutrition_menu_ref',
  'nutrition_raw_values',
  'nutrition_topping_master',
  'nutrition_edge_master',
  'nutrition_set_composition',
  'sales_rows',
  'sales_rules',
  'ref_sales_aliases',
  'ref_excluded',
  'ref_discontinued',
  'ref_registered_overrides',
];

const argValue = name => {
  const index = process.argv.indexOf(name);
  return index === -1 ? '' : process.argv[index + 1] || '';
};

/** 서버 행을 화면이 읽는 레코드로 — id가 없으면 서버 키에서 되살린다 */
function recordOf(row) {
  const data = row.data;
  if (data?.id != null) return data;
  if (Number.isInteger(row.legacyNumericId)) return { ...data, id: row.legacyNumericId };
  return /^-?\d+$/.test(row.recordKey) ? { ...data, id: Number(row.recordKey) } : data;
}

async function pull(dir) {
  const connectionString = String(process.env.DATABASE_URL || '').trim();
  if (!connectionString) throw new Error('DATABASE_URL이 필요합니다.');
  const client = new pg.Client({
    connectionString,
    options: '-c default_transaction_read_only=on',
  });
  await client.connect();
  const counts = {};
  try {
    mkdirSync(dir, { recursive: true });
    for (const store of STORES) {
      const { rows } = await client.query(
        `select record_key as "recordKey", legacy_numeric_id as "legacyNumericId", data
           from store_rows
          where brand_id = 'main' and store_name = $1 and record_key not like '%\_\_client:%'
          order by legacy_numeric_id nulls last, record_key`,
        [store]
      );
      counts[store] = rows.length;
      writeFileSync(join(dir, `${store}.json`), JSON.stringify(rows.map(recordOf)), 'utf8');
    }
  } finally {
    await client.end();
  }
  writeFileSync(
    join(dir, '_manifest.json'),
    JSON.stringify({ pulledAt: new Date().toISOString(), brandId: 'main', counts }, null, 2),
    'utf8'
  );
  return counts;
}

async function main() {
  const test = process.argv.includes('--test');
  const out = argValue('--out');
  if (!test && !out) throw new Error('--out <폴더> 또는 --test가 필요합니다.');
  if (out && resolve(out).startsWith(ROOT + sep)) {
    throw new Error('업무 데이터 사본은 저장소 밖에 만들어 주세요.');
  }
  const dir = out ? resolve(out) : mkdtempSync(join(tmpdir(), 'rnd-audit-data-'));
  try {
    const counts = await pull(dir);
    console.log(`받은 저장소 ${Object.keys(counts).length}개:`, JSON.stringify(counts));
    if (!test) return;
    const result = spawnSync(
      process.execPath,
      [
        '--experimental-vm-modules',
        join(ROOT, 'node_modules', 'jest', 'bin', 'jest.js'),
        '__tests__/audit',
        '--no-coverage',
        '--runInBand',
      ],
      { cwd: ROOT, env: { ...process.env, RND_AUDIT_DATA_DIR: dir }, stdio: 'inherit' }
    );
    process.exitCode = result.status ?? 1;
  } finally {
    // --test로 만든 임시 사본은 남기지 않는다
    if (!out) rmSync(dir, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error?.message || error);
  process.exitCode = 1;
});
