/**
 * lib/nutrition/allergen/store.js
 *
 * nutrition_allergy_master — 22종 알레르기 항목 마스터 (시드 데이터)
 *   { id, allergenCode, allergenName, displayOrder }
 *
 * nutrition_allergy_links — 식재료별 알레르기 체크
 *   { id, ingredientId, productCode, ingredientName, displayName, allergenCodes[] }
 *   (ingredientId = cost_ingredients.id 연결 기준)
 */

import { getAll, put, deleteById, runTransaction, hasStore } from '@/lib/db';

const MASTER_STORE = 'nutrition_allergy_master';
const LINKS_STORE = 'nutrition_allergy_links';

/* ── 마스터 (22종 시드) ──────────────────────────── */

export const ALLERGEN_SEED = [
  { allergenCode: 'AL01', allergenName: '알류(계란)', displayOrder: 1 },
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

/** 알레르기 마스터는 법정 고정 목록 — DB 불필요, 상수 직접 반환 */
export function getAllAllergenMasters() {
  return Promise.resolve([...ALLERGEN_SEED]);
}

/* ── 식재료별 알레르기 링크 ──────────────────────── */

export async function getAllAllergenLinks() {
  if (!hasStore(LINKS_STORE)) return [];
  return await getAll(LINKS_STORE);
}

/** ingredientId로 해당 식재료 알레르기 레코드 반환 */
export async function getAllergenLinkByIngredient(ingredientId) {
  if (!hasStore(LINKS_STORE)) return null;
  const all = await getAll(LINKS_STORE);
  return all.find(r => r.ingredientId === ingredientId) || null;
}

/**
 * 식재료의 알레르기 저장 (upsert)
 * @param {{ ingredientId, productCode, ingredientName, displayName, allergenCodes[] }} data
 */
export async function saveIngredientAllergens(data) {
  if (!hasStore(LINKS_STORE)) throw new Error(`${LINKS_STORE} store 없음`);
  const all = await getAll(LINKS_STORE);
  const existing = all.find(r => r.ingredientId === data.ingredientId);
  return await put(LINKS_STORE, {
    ...(existing ? { id: existing.id } : {}),
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteAllergenLink(id) {
  return await deleteById(LINKS_STORE, id);
}
