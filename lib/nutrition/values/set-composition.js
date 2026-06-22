/**
 * lib/nutrition/values/set-composition.js — nutrition_set_composition CRUD
 *
 * getAllSetCompositions은 순수 읽기만 한다.
 * setSide 유효성 검사 및 불량 행 제거는 repairSetCompositions에서만 수행한다.
 */
import { getAll, deleteById, hasStore } from '@/lib/db';
import { assertActiveAdmin } from '@/lib/auth/guard';
import { upsertWithTimestamp } from './shared';

export async function getAllSetCompositions() {
  if (!hasStore('nutrition_set_composition')) return [];
  const rows = await getAll('nutrition_set_composition');
  return rows.sort((a, b) => (a.updatedAt || '').localeCompare(b.updatedAt || ''));
}

/** setSide가 L/R 이 아닌 잘못된 세트 행을 삭제한다. */
export async function repairSetCompositions() {
  await assertActiveAdmin('영양 세트 구성 오류 정리');
  if (!hasStore('nutrition_set_composition')) return { removed: 0 };
  const rows = await getAll('nutrition_set_composition');
  const invalid = rows.filter(row => row?.kind === 'set' && !['L', 'R'].includes(row.setSide));
  for (const row of invalid) {
    if (row.id != null) await deleteById('nutrition_set_composition', row.id);
  }
  return { removed: invalid.length };
}

export async function upsertSetComposition(data) {
  await assertActiveAdmin('영양 세트 구성 저장');
  return upsertWithTimestamp('nutrition_set_composition', data);
}

export async function deleteSetComposition(id) {
  await assertActiveAdmin('영양 세트 구성 삭제');
  return deleteById('nutrition_set_composition', id);
}
