/**
 * lib/nutrition/allergen/store.js
 *
 * nutrition_allergy_master — 22종 알레르기 항목 마스터
 *   { id, allergenCode, allergenName, displayOrder }
 *
 * nutrition_allergy_links — 메뉴별 알레르기 체크
 *   { id, menuCode, menuName, allergenCode }
 */

import { getAll, put, deleteById, getByIndex, runTransaction, hasStore } from '@/lib/db';

const MASTER_STORE = 'nutrition_allergy_master';
const LINKS_STORE  = 'nutrition_allergy_links';

/* ── 마스터 ─────────────────────────────────────── */

/** 한국 법정 22종 (2023년 기준) 시드 데이터 */
export const ALLERGEN_SEED = [
  { allergenCode: 'AL01', allergenName: '알류(계란)',   displayOrder: 1  },
  { allergenCode: 'AL02', allergenName: '우유',        displayOrder: 2  },
  { allergenCode: 'AL03', allergenName: '메밀',        displayOrder: 3  },
  { allergenCode: 'AL04', allergenName: '땅콩',        displayOrder: 4  },
  { allergenCode: 'AL05', allergenName: '대두',        displayOrder: 5  },
  { allergenCode: 'AL06', allergenName: '밀',          displayOrder: 6  },
  { allergenCode: 'AL07', allergenName: '고등어',      displayOrder: 7  },
  { allergenCode: 'AL08', allergenName: '게',          displayOrder: 8  },
  { allergenCode: 'AL09', allergenName: '새우',        displayOrder: 9  },
  { allergenCode: 'AL10', allergenName: '돼지고기',    displayOrder: 10 },
  { allergenCode: 'AL11', allergenName: '복숭아',      displayOrder: 11 },
  { allergenCode: 'AL12', allergenName: '토마토',      displayOrder: 12 },
  { allergenCode: 'AL13', allergenName: '아황산류',    displayOrder: 13 },
  { allergenCode: 'AL14', allergenName: '호두',        displayOrder: 14 },
  { allergenCode: 'AL15', allergenName: '닭고기',      displayOrder: 15 },
  { allergenCode: 'AL16', allergenName: '쇠고기',      displayOrder: 16 },
  { allergenCode: 'AL17', allergenName: '오징어',      displayOrder: 17 },
  { allergenCode: 'AL18', allergenName: '굴',          displayOrder: 18 },
  { allergenCode: 'AL19', allergenName: '전복',        displayOrder: 19 },
  { allergenCode: 'AL20', allergenName: '홍합',        displayOrder: 20 },
  { allergenCode: 'AL21', allergenName: '잣',          displayOrder: 21 },
  { allergenCode: 'AL22', allergenName: '아몬드',      displayOrder: 22 },
];

export async function getAllAllergenMasters() {
  if (!hasStore(MASTER_STORE)) return [];
  const rows = await getAll(MASTER_STORE);
  if (rows.length === 0) return ALLERGEN_SEED;
  return rows.sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));
}

export async function seedAllergenMasters() {
  if (!hasStore(MASTER_STORE)) return;
  const existing = await getAll(MASTER_STORE);
  if (existing.length > 0) return;
  await runTransaction(MASTER_STORE, 'readwrite', (tx) => {
    const s = tx.objectStore(MASTER_STORE);
    ALLERGEN_SEED.forEach(item => s.put(item));
  });
}

/* ── 메뉴별 알레르기 링크 ─────────────────────────── */

export async function getAllAllergenLinks() {
  if (!hasStore(LINKS_STORE)) return [];
  return await getAll(LINKS_STORE);
}

/** menuCode에 해당하는 allergenCode 목록 반환 */
export async function getAllergensByMenu(menuCode) {
  if (!hasStore(LINKS_STORE)) return [];
  const rows = await getByIndex(LINKS_STORE, 'menuCode', menuCode);
  return rows.map(r => r.allergenCode).filter(Boolean);
}

/** 메뉴의 알레르기 전체 교체 저장 */
export async function saveMenuAllergens(menuCode, menuName, allergenCodes) {
  if (!hasStore(LINKS_STORE)) return;
  const all = await getAll(LINKS_STORE);
  const existing = all.filter(r => r.menuCode === menuCode);

  await runTransaction(LINKS_STORE, 'readwrite', (tx) => {
    const s = tx.objectStore(LINKS_STORE);
    existing.forEach(r => s.delete(r.id));
    allergenCodes.forEach(code => s.put({
      menuCode,
      menuName,
      allergenCode: code,
      updatedAt: new Date().toISOString(),
    }));
  });
}

/** 메뉴 목록 구조 (알레르기 페이지용) */
export async function getMenuAllergenMatrix() {
  if (!hasStore(LINKS_STORE)) return {};
  const links = await getAllAllergenLinks();
  const matrix = {};
  links.forEach(r => {
    if (!r.menuCode) return;
    if (!matrix[r.menuCode]) matrix[r.menuCode] = { menuCode: r.menuCode, menuName: r.menuName || '', codes: new Set() };
    if (r.allergenCode) matrix[r.menuCode].codes.add(r.allergenCode);
  });
  Object.values(matrix).forEach(m => { m.codes = [...m.codes]; });
  return matrix;
}
