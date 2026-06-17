#!/usr/bin/env node
/**
 * scripts/site-status-audit.mjs — docs/SITE_STATUS.md 수치 ↔ 실제 코드 자동 검증
 *
 * 실행: npm run audit:docs
 * 코드에서 계산한 실제 수치와 SITE_STATUS.md에 적힌 수치를 비교해 mismatch를 출력하고,
 * 하나라도 어긋나면 exit code 1로 종료한다. (CI/수동 점검용)
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { compareMetrics, formatReport } from './site-status-audit-utils.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const r = p => join(ROOT, p);

/** 디렉터리를 재귀 순회하며 조건에 맞는 파일 경로를 모은다. */
function walk(dir, predicate, acc = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, predicate, acc);
    else if (predicate(full)) acc.push(full);
  }
  return acc;
}

function countLines(file) {
  const text = readFileSync(file, 'utf8');
  if (text === '') return 0;
  const n = text.split('\n').length;
  // 파일이 개행으로 끝나면 마지막 빈 조각을 제외해 `wc -l`과 동일하게 맞춘다.
  return text.endsWith('\n') ? n - 1 : n;
}

const isJsFile = f => f.endsWith('.js') || f.endsWith('.jsx');

export async function computeActuals() {
  // page.jsx
  const pageFiles = walk(r('app'), f => f.endsWith('page.jsx'));
  const pageCount = pageFiles.length;

  // 라우트 분류(순수 데이터 모듈) → redirect 수
  const { ROUTE_CLASSIFICATIONS, ROUTE_KIND } = await import(
    pathToFileURL(r('lib/navigation/route-classification.js')).href
  );
  const redirectCount = ROUTE_CLASSIFICATIONS.filter(c => c.kind === ROUTE_KIND.REDIRECT).length;
  const screenCount = pageCount - redirectCount;

  // hooks/
  const hookFilesList = walk(r('hooks'), isJsFile);
  const hookFiles = hookFilesList.length;
  const hookLines = hookFilesList.reduce((sum, f) => sum + countLines(f), 0);

  // useDBLoad 소비 파일 (정의 파일 제외)
  const defPath = r('hooks/useDBLoad.js');
  const useDbLoadConsumers = ['app', 'hooks', 'components', 'lib']
    .flatMap(d => walk(r(d), isJsFile))
    .filter(f => f !== defPath && readFileSync(f, 'utf8').includes("from '@/hooks/useDBLoad'"))
    .length;

  // DB 버전 / store 수
  const { DB_VERSION, ALL_STORES } = await import(
    pathToFileURL(r('lib/db/constants.js')).href
  );
  const dbVersion = DB_VERSION;
  const storeCount = ALL_STORES.length;

  // globals.css @import
  const cssImports = readFileSync(r('app/globals.css'), 'utf8')
    .split('\n')
    .filter(l => l.trim().startsWith('@import')).length;

  // 테스트 파일 수
  const isTest = f => f.endsWith('.test.mjs');
  const testLib = walk(r('__tests__/lib'), isTest).length;
  const testHooks = walk(r('__tests__/hooks'), isTest).length;
  const testScripts = walk(r('__tests__/scripts'), isTest).length;
  const testTotal = walk(r('__tests__'), isTest).length;

  return {
    pageCount,
    redirectCount,
    screenCount,
    hookFiles,
    hookLines,
    useDbLoadConsumers,
    dbVersion,
    storeCount,
    cssImports,
    testTotal,
    testLib,
    testHooks,
    testScripts,
  };
}

async function main() {
  const actuals = await computeActuals();
  const docText = readFileSync(r('docs/SITE_STATUS.md'), 'utf8');
  const { results, missing, allOk } = compareMetrics(actuals, docText);

  console.log('\n  SITE_STATUS.md 수치 검증\n');
  console.log(formatReport({ results, missing }));
  console.log('');

  if (allOk) {
    console.log('  ✅ 문서 수치가 코드와 일치합니다.\n');
    process.exit(0);
  }
  const bad = results.filter(x => !x.ok).length;
  console.log(`  ❌ ${bad}개 지표가 어긋났습니다. SITE_STATUS.md를 갱신하세요.\n`);
  process.exit(1);
}

// 직접 실행될 때만 동작 (테스트에서 import 시에는 실행 안 함)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
