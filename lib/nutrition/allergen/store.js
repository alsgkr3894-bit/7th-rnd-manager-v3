/**
 * lib/nutrition/allergen/store.js
 *
 * ALLERGEN_SEED — 22종 알레르기 항목 상수 (법정 고정 목록, DB 불필요)
 * deleteAllergenLinksByIngredient — 식자재 삭제 시 legacy nutrition_allergy_links cascade
 */

import { getAll, runTransaction, hasStore } from '@/lib/db';

const LINKS_STORE = 'nutrition_allergy_links';

export const ALLERGEN_SEED = [
  { allergenCode: 'AL01', allergenName: '계란', displayOrder: 1 },
  { allergenCode: 'AL02', allergenName: '우유', displayOrder: 2 },
  { allergenCode: 'AL03', allergenName: '메밀', displayOrder: 3 },
  { allergenCode: 'AL04', allergenName: '땅콩', displayOrder: 4 },
  { allergenCode: 'AL05', allergenName: '대두', displayOrder: 5 },
  { allergenCode: 'AL06', allergenName: '밀', displayOrder: 6 },
  { allergenCode: 'AL07', allergenName: '고등어', displayOrder: 7 },
  { allergenCode: 'AL08', allergenName: '게', displayOrder: 8 },
  { allergenCode: 'AL09', allergenName: '새우', displayOrder: 9 },
  { allergenCode: 'AL10', allergenName: '돼지고기', displayOrder: 10 },
  { allergenCode: 'AL11', allergenName: '복숭아', displayOrder: 11 },
  { allergenCode: 'AL12', allergenName: '토마토', displayOrder: 12 },
  { allergenCode: 'AL13', allergenName: '아황산류', displayOrder: 13 },
  { allergenCode: 'AL14', allergenName: '호두', displayOrder: 14 },
  { allergenCode: 'AL15', allergenName: '닭고기', displayOrder: 15 },
  { allergenCode: 'AL16', allergenName: '쇠고기', displayOrder: 16 },
  { allergenCode: 'AL17', allergenName: '오징어', displayOrder: 17 },
  { allergenCode: 'AL18', allergenName: '굴', displayOrder: 18 },
  { allergenCode: 'AL19', allergenName: '전복', displayOrder: 19 },
  { allergenCode: 'AL20', allergenName: '홍합', displayOrder: 20 },
  { allergenCode: 'AL21', allergenName: '잣', displayOrder: 21 },
  { allergenCode: 'AL22', allergenName: '아몬드', displayOrder: 22 },
];

/**
 * 식자재 삭제 시 연결된 legacy 알레르기 링크를 함께 삭제한다.
 * store가 없으면(이미 제거된 DB) hasStore 가드로 no-op.
 *
 * @param {{ ingredientId?: number|string|null, productCode?: string|null }} params
 * @returns {Promise<Array<object>>} 삭제한 링크 레코드 배열(실행취소 복원용)
 */
export async function deleteAllergenLinksByIngredient({
  ingredientId = null,
  productCode = null,
} = {}) {
  if (!hasStore(LINKS_STORE)) return [];
  const code = String(productCode || '').trim();
  const hasIngredientId =
    ingredientId !== null && ingredientId !== undefined && ingredientId !== '';
  if (!hasIngredientId && !code) return [];

  const links = await getAll(LINKS_STORE);
  const targets = links.filter(link => {
    const idMatched = hasIngredientId && String(link.ingredientId) === String(ingredientId);
    const codeMatched = code && String(link.productCode || '').trim() === code;
    return idMatched || codeMatched;
  });
  if (!targets.length) return [];

  await runTransaction(LINKS_STORE, 'readwrite', tx => {
    const store = tx.objectStore(LINKS_STORE);
    targets.forEach(link => {
      if (link.id != null) store.delete(link.id);
    });
  });
  // 삭제된 링크 레코드를 반환 — 식자재 삭제 실행취소 시 함께 복원하기 위함.
  return targets;
}
