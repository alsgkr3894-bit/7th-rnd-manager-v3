/**
 * lib/db/reset-plan.js — "모든 데이터 초기화"가 지울 store 결정 (순수)
 *
 * 노트·샘플기록·시장조사·일정·작업일지·법인카드·로그인정보(SHARED_STORE_NAMES)는 브랜드가
 * 아니라 회사 단위 데이터라 main(7번가) DB에만 산다. 그런데 스키마는 모든 브랜드 DB에 같은
 * store를 만들어 두므로, 차이나X4·이천밥쌤에서 초기화 루프를 돌리면 `hasStore()`가 true라
 * 그 브랜드의 빈 껍데기를 비운다. 로컬에선 아무 일도 없어 보이지만, clearStore가 서버로 보내는
 * 삭제 작업은 공유 store를 항상 brandId:'main'으로 태깅(server-sync.js brandIdForStore)해서
 * **7번가의 노트·샘플·법인카드·로그인정보가 서버에서 지워졌다.**
 *
 * → main이 아닌 브랜드에서는 공유 store를 초기화 대상에서 뺀다.
 *   (비-main 브랜드 복원이 공유 store를 건너뛰는 lib/db/backup.js와 같은 규칙)
 */
import { SHARED_STORE_NAMES } from './module-stores';

export const MAIN_BRAND_ID = 'main';

/**
 * @param {string[]} allStores
 * @param {string} brandId 현재 활성 브랜드 id
 * @returns {{ stores: string[], skippedShared: string[] }}
 */
export function planBrandReset(allStores, brandId) {
  const names = Array.isArray(allStores) ? allStores : [];
  if (brandId === MAIN_BRAND_ID) return { stores: [...names], skippedShared: [] };
  return {
    stores: names.filter(name => !SHARED_STORE_NAMES.has(name)),
    skippedShared: names.filter(name => SHARED_STORE_NAMES.has(name)),
  };
}
