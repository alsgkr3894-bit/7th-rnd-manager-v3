/**
 * lib/ingredient/migrate-product-code-case.js — 상품코드 대문자 1회성 백필
 *
 * 저장 경로(buildRecord / upsertIngredientMeta / bulkImportIngredients)는 이제 모두
 * productCode를 trim().toUpperCase()로 통일하지만, 그 전에 저장된 행에는 소문자·공백 섞인
 * 코드가 남아 있을 수 있다. 조회는 대부분 대소문자 무관(productCodeKey)이지만
 * getIngredientMetaMap/mergeIngredientRows처럼 저장값 그대로 키를 잡는 곳이 있어, 제때
 * 가격파일의 대문자 코드와 맞지 않으면 "연동 없음"으로 보인다.
 *
 * idempotent: 대문자화가 필요한 행만 put. 대문자화한 코드가 다른 행과 겹치면(대소문자만
 * 다른 중복) 건드리지 않고 건너뛴다 — 그 정리는 중복 정리 도구(dedupe-repair)가 맡는다.
 */
import { getAll, runTransaction, hasStore } from '@/lib/db';
import { assertActiveAdmin } from '@/lib/auth/guard';

function normalizedCodeOf(row) {
  return String(row?.productCode ?? '')
    .trim()
    .toUpperCase();
}

/**
 * 순수 계산 — 백필 대상과 충돌로 건너뛸 행을 가른다.
 * @param {Array<object>} rows cost_ingredients 전체
 * @returns {{ toUpdate: object[], skippedConflicts: object[] }}
 */
export function planProductCodeCaseBackfill(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const ownersByCode = new Map();
  for (const row of list) {
    const code = normalizedCodeOf(row);
    if (!code) continue;
    if (!ownersByCode.has(code)) ownersByCode.set(code, []);
    ownersByCode.get(code).push(row);
  }

  const toUpdate = [];
  const skippedConflicts = [];
  for (const row of list) {
    const raw = row?.productCode;
    if (raw == null || raw === '') continue;
    const code = normalizedCodeOf(row);
    if (!code || raw === code) continue;
    if ((ownersByCode.get(code) || []).length > 1) {
      skippedConflicts.push(row);
      continue;
    }
    toUpdate.push({ ...row, productCode: code });
  }
  return { toUpdate, skippedConflicts };
}

/**
 * @returns {Promise<{ updated: number, skippedConflicts: number, skipped?: string }>}
 */
export async function backfillProductCodeCase() {
  try {
    await assertActiveAdmin('상품코드 대문자 백필');
  } catch (error) {
    if (error?.code === 'PERMISSION_DENIED') {
      return { updated: 0, skippedConflicts: 0, skipped: 'permission' };
    }
    throw error;
  }
  if (!hasStore('cost_ingredients')) return { updated: 0, skippedConflicts: 0 };

  const rows = await getAll('cost_ingredients');
  const { toUpdate, skippedConflicts } = planProductCodeCaseBackfill(rows);
  if (toUpdate.length === 0) return { updated: 0, skippedConflicts: skippedConflicts.length };

  const now = new Date().toISOString();
  await runTransaction(['cost_ingredients'], 'readwrite', tx => {
    const store = tx.objectStore('cost_ingredients');
    for (const record of toUpdate) store.put({ ...record, updatedAt: now });
  });

  if (skippedConflicts.length > 0) {
    console.warn(
      '[ingredient] 상품코드 대문자 백필 — 대소문자만 다른 중복 코드가 있어 건너뜀:',
      skippedConflicts.map(r => r.productCode)
    );
  }
  return { updated: toUpdate.length, skippedConflicts: skippedConflicts.length };
}
