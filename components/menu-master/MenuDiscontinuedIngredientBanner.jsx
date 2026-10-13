'use client';

import { countMenusWithDiscontinuedIngredients } from '@/lib/menu-master/discontinued-ingredient-count';

/**
 * 메뉴마스터 상단 경고 — 식자재 관리에서 단종 처리된 식자재가 아직 메뉴 레시피에 들어 있으면
 * 알린다(수정해야 원가·영양·원산지가 정확해진다). 단종 메뉴 자체는 세지 않는다.
 */
export function MenuDiscontinuedIngredientBanner({ rows, recipeSummaryMap, onOpen }) {
  const count = countMenusWithDiscontinuedIngredients(rows, recipeSummaryMap);
  if (count === 0) return null;
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        marginBottom: 12,
        borderRadius: 8,
        border: '1px solid var(--negative)',
        background: 'var(--negative-soft)',
        fontSize: 13,
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontWeight: 700, color: 'var(--negative)' }}>
        ⚠ 단종 식자재가 들어 있는 메뉴 {count}개
      </span>
      <span style={{ color: 'var(--text-3)' }}>
        식자재 관리에서 단종 처리된 식자재가 레시피에 남아 있습니다. 교체하거나 삭제해야 합니다.
      </span>
      <button className="btn xs" style={{ marginLeft: 'auto' }} onClick={onOpen}>
        확인
      </button>
    </div>
  );
}
