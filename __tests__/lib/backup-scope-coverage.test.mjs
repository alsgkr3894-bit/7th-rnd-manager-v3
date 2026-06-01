import { ALL_STORES } from '../../lib/db/constants.js';
import { MODULE_GROUPS, COMMON_STORES } from '../../lib/db/module-stores.js';

/**
 * 회귀 방지: 백업/복원 범위(MODULE_GROUPS ∪ COMMON_STORES)가 ALL_STORES 전체를 덮어야 한다.
 * 누락되면 해당 store가 수동 백업/복원에서 영구 제외되어 데이터 손실이 발생한다.
 */
describe('백업 범위 커버리지', () => {
  const covered = new Set(COMMON_STORES);
  for (const g of Object.values(MODULE_GROUPS)) for (const s of g.stores) covered.add(s);

  test('ALL_STORES의 모든 store가 백업 범위에 포함된다', () => {
    const missing = ALL_STORES.filter(s => !covered.has(s));
    expect(missing).toEqual([]);
  });

  test('백업 범위에 ALL_STORES에 없는 잘못된 store가 없다', () => {
    const all = new Set(ALL_STORES);
    const extra = [...covered].filter(s => !all.has(s));
    expect(extra).toEqual([]);
  });
});
