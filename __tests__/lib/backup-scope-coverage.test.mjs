import { ALL_STORES } from '../../lib/db/constants.js';
import {
  MODULE_GROUPS,
  COMMON_STORES,
  LEGACY_RESERVED_STORES,
} from '../../lib/db/module-stores.js';

/**
 * 회귀 방지: 백업/복원 범위(MODULE_GROUPS ∪ COMMON_STORES)가 운영 store를 덮어야 한다.
 * 구버전/전체 백업 호환용 예약 store는 선택 백업 범위에서 의도적으로 제외한다.
 */
describe('백업 범위 커버리지', () => {
  const covered = new Set(COMMON_STORES);
  const legacyReserved = new Set(LEGACY_RESERVED_STORES);
  for (const g of Object.values(MODULE_GROUPS)) for (const s of g.stores) covered.add(s);

  test('예약 store를 제외한 ALL_STORES의 모든 store가 백업 범위에 포함된다', () => {
    const missing = ALL_STORES.filter(s => !legacyReserved.has(s) && !covered.has(s));
    expect(missing).toEqual([]);
  });

  test('백업 범위에 ALL_STORES에 없는 잘못된 store가 없다', () => {
    const all = new Set(ALL_STORES);
    const extra = [...covered].filter(s => !all.has(s));
    expect(extra).toEqual([]);
  });

  test('예약 store는 ALL_STORES에 남기되 선택 백업 공통 store에서는 제외한다', () => {
    for (const store of LEGACY_RESERVED_STORES) {
      expect(ALL_STORES).toContain(store);
      expect(COMMON_STORES).not.toContain(store);
    }
  });
});
