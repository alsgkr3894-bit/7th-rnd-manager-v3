/**
 * lib/menu-master/index.js
 *
 * 메뉴 마스터가 모든 모듈의 메인 데이터 소스.
 * 흐름: 메뉴 마스터 → cost_selling_prices (단방향)
 *
 * 다른 모듈은 menuCode를 키로 마스터를 참조.
 */

import {
  getAllMenuMaster,
  getMenuMasterMap,
  getMenuNameToCodeMap,
  upsertMenuMaster,
  deleteMenuMaster,
  resetAllMenuMaster,
} from './store';

import { getAll, runTransaction, hasStore } from '@/lib/db';

export {
  getAllMenuMaster,
  getMenuMasterMap,
  getMenuNameToCodeMap,
  upsertMenuMaster,
  deleteMenuMaster,
  resetAllMenuMaster,
};

/**
 * 메뉴 마스터 → cost_selling_prices 동기화 (마스터가 메인).
 * price가 있는 항목만 판매가 테이블에 반영.
 * status=discontinued 항목은 판매가 테이블에서 제거.
 *
 * @returns {{ pushed: number, removed: number }}
 */
export async function pushMasterToPrices() {
  if (!hasStore('menu_master') || !hasStore('cost_selling_prices')) {
    return { pushed: 0, removed: 0 };
  }

  const masters = await getAllMenuMaster();
  const priceRows = await getAll('cost_selling_prices');
  const priceMap  = new Map(priceRows.filter(r => r.menuCode).map(r => [r.menuCode, r]));

  let pushed = 0;
  let removed = 0;

  for (const m of masters) {
    if (!m.menuCode) continue;

    if (m.status === 'discontinued') {
      // 단종 → 판매가 테이블에서 제거
      const existing = priceMap.get(m.menuCode);
      if (existing) {
        await runTransaction(['cost_selling_prices'], 'readwrite', tx => {
          tx.objectStore('cost_selling_prices').delete(existing.id);
        });
        removed++;
      }
      continue;
    }

    const existing = priceMap.get(m.menuCode);
    const record = {
      menuCode: m.menuCode,
      menuName: m.menuName,
      category: m.category || '',
      size:     m.size || '단일',
      price:    m.price,
      note:     m.note || '',
      updatedAt: new Date().toISOString(),
    };

    if (existing) {
      await runTransaction(['cost_selling_prices'], 'readwrite', tx => {
        tx.objectStore('cost_selling_prices').put({ ...existing, ...record });
      });
    } else {
      await runTransaction(['cost_selling_prices'], 'readwrite', tx => {
        tx.objectStore('cost_selling_prices').add(record);
      });
    }
    pushed++;
  }

  return { pushed, removed };
}

/**
 * [레거시 / 일회성 가져오기]
 * cost_selling_prices → menu_master 로 가격 정보를 역으로 임포트.
 * 기존 판매가 데이터를 마스터에 병합할 때 한 번만 사용.
 */
export async function importPricesToMaster() {
  if (!hasStore('cost_selling_prices')) return { imported: 0 };
  const prices = await getAll('cost_selling_prices');
  let imported = 0;
  for (const p of prices) {
    if (!p.menuCode) continue;
    await upsertMenuMaster({
      menuCode: p.menuCode,
      menuName: p.menuName,
      category: p.category || '',
      size:     p.size !== '단일' ? p.size : null,
      price:    p.price,
      status:   'active',
      source:   'price-import',
    });
    imported++;
  }
  return { imported };
}
