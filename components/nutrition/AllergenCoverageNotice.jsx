'use client';
import { useState } from 'react';
import { asObjectArray } from '@/lib/ui/prop-guards';

/**
 * 알레르기 자동 집계에서 조용히 빠지는 항목을 화면에만 알린다(no-print).
 * 레시피 없음 / 구성품이 식자재 마스터에 없음 / 피자 도우 미설정 — 셋 다 표에는
 * 그냥 빈칸이나 불완전한 목록으로 찍히므로 출력 전에 반드시 눈에 띄어야 한다.
 */
export function AllergenCoverageNotice({ warnings }) {
  const [open, setOpen] = useState(false);
  if (!warnings || !warnings.total) return null;
  const menusWithoutRecipe = asObjectArray(warnings.menusWithoutRecipe);
  const unmatched = asObjectArray(warnings.unmatchedComponents);
  const noAllergens = asObjectArray(warnings.componentsWithoutAllergens);

  return (
    <div
      className="no-print"
      style={{
        margin: '12px 0',
        padding: '12px 14px',
        border: '1px solid var(--negative)',
        borderRadius: 8,
        background: 'color-mix(in srgb, var(--negative) 8%, var(--surface))',
        color: 'var(--text-1)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--negative)' }}>
          알레르기 표시 확인 필요 — 자동 집계에서 빠진 항목 {warnings.total}건
        </div>
        <button className="btn sm" type="button" onClick={() => setOpen(v => !v)}>
          {open ? '접기' : '자세히'}
        </button>
      </div>
      <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
        아래 항목은 표의 알레르기 열에 반영되지 않습니다. 법정 표시 항목이므로 출력 전에 식자재
        마스터의 알레르기 입력·레시피 연결·도우 설정을 확인하세요.
      </div>
      {open && (
        <div style={{ marginTop: 10, display: 'grid', gap: 10, fontSize: 12 }}>
          {warnings.doughNotConfigured && (
            <div>
              <div style={{ fontWeight: 700 }}>
                피자 도우 알레르기 미설정 — 공통 원가 관리의 엣지/도우 구성이 비어 있어 도우의
                밀·대두 등이 피자 {warnings.pizzaMenuCount}개 어디에도 반영되지 않습니다.
              </div>
            </div>
          )}
          {menusWithoutRecipe.length > 0 && (
            <div>
              <div style={{ fontWeight: 700 }}>
                레시피가 없어 알레르기를 집계할 수 없는 메뉴 {menusWithoutRecipe.length}개
              </div>
              <div style={{ color: 'var(--text-3)' }}>
                {menusWithoutRecipe.map(m => `${m.menuName} (${m.menuCode})`).join(', ')}
              </div>
            </div>
          )}
          {unmatched.length > 0 && (
            <div>
              <div style={{ fontWeight: 700 }}>
                식자재 마스터에 없는 레시피 구성품 {unmatched.length}개 — 알레르기 정보 없음
              </div>
              <ul style={{ margin: '4px 0 0 16px', color: 'var(--text-3)' }}>
                {unmatched.map(c => (
                  <li key={`${c.productCode}|${c.ingredientName}`}>
                    {c.ingredientName || '(이름 없음)'}
                    {c.productCode ? ` [${c.productCode}]` : ''} — 메뉴 {c.menuCodes.length}개
                  </li>
                ))}
              </ul>
            </div>
          )}
          {noAllergens.length > 0 && (
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-2)' }}>
                참고: 알레르기가 비어 있는 식자재 {noAllergens.length}개 (해당 없음이면 정상)
              </div>
              <div style={{ color: 'var(--text-3)' }}>
                {noAllergens
                  .slice(0, 12)
                  .map(c => c.ingredientName || c.productCode)
                  .join(', ')}
                {noAllergens.length > 12 ? ` 외 ${noAllergens.length - 12}개` : ''}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
