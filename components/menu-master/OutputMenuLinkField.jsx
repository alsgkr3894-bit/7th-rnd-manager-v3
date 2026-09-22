'use client';

import { useCallback } from 'react';
import { useDBLoad } from '@/hooks/useDBLoad';
import { getAllMenuMaster } from '@/lib/menu-master';
import { FieldLabel } from '@/components/menu-master/MenuMasterFieldPrimitives';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

const EMPTY = [];

/**
 * 출력 대표 메뉴 연결 — 같은 메뉴인데 매장마다 재료만 다른 변형 행(예: 오븐 스파게티 (건면))에서
 * 대표 메뉴를 고르면 영양성분표·알레르기·원산지 출력은 대표 메뉴 한 행으로 합쳐 나간다.
 */
export function OutputMenuLinkField({ value, menuCode, category, setField }) {
  const fetchFn = useCallback(() => getAllMenuMaster(), []);
  const { data } = useDBLoad(fetchFn, { initialData: EMPTY });
  const selfCode = asDisplayText(menuCode);
  const options = asObjectArray(data)
    .filter(m => asDisplayText(m.menuCode) && asDisplayText(m.menuCode) !== selfCode)
    .filter(m => !asDisplayText(m.outputMenuCode))
    .filter(m => !category || asDisplayText(m.category) === asDisplayText(category))
    .sort((a, b) => asDisplayText(a.menuName).localeCompare(asDisplayText(b.menuName), 'ko'));
  const current = asDisplayText(value);
  const hasCurrent = !current || options.some(m => asDisplayText(m.menuCode) === current);

  return (
    <div>
      <FieldLabel>출력 대표 메뉴 (재료만 다른 같은 메뉴일 때)</FieldLabel>
      <select
        className="input"
        value={current}
        onChange={e => setField('outputMenuCode', e.target.value)}
        style={{ width: '100%' }}
      >
        <option value="">연결 안 함 (이 메뉴가 그대로 출력됨)</option>
        {!hasCurrent && <option value={current}>{current} (목록에 없음)</option>}
        {options.map(m => (
          <option key={m.menuCode} value={m.menuCode}>
            {asDisplayText(m.menuName)} ({m.menuCode})
          </option>
        ))}
      </select>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
        연결하면 영양성분표·알레르기·원산지에는 대표 메뉴 한 행만 나가고, 이 메뉴의 재료
        (알레르기·원산지)는 대표 메뉴에 합쳐집니다. 원가·레시피·판매량은 따로 유지됩니다.
      </div>
    </div>
  );
}
