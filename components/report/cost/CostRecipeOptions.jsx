'use client';
import { useMemo, useState } from 'react';
import { Check, OptGroup } from '@/components/report/ReportBuilderShell';

const checked = (selection, key) => selection?.[key] !== false;

function matchesQuery(menu, query) {
  if (!query) return true;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    (menu.menuName || '').toLowerCase().includes(q) ||
    (menu.menuCode || '').toLowerCase().includes(q)
  );
}

/**
 * 레시피 탭/부록 전용 옵션 — 항상 렌더된다(레시피 탭이 아닐 때도 부록 옵션이 유효하므로).
 * 메뉴 목록은 카테고리별로 접이식(<details>)으로 묶는다 — 수십~백여 개까지 갈 수 있어서다.
 */
export function CostRecipeOptions({
  recipeMenuGroups = [],
  recipeSelection = {},
  recipePagePerMenu = true,
  onRecipeMenuChange,
  onRecipeGroupSelectAll,
  onRecipePagePerMenu,
}) {
  const [query, setQuery] = useState('');
  const hasAnyMenu = recipeMenuGroups.some(group => group.total > 0);

  return (
    <OptGroup
      label="레시피 출력 옵션"
      hint="레시피 출력 탭과 부록(포함 섹션)에 함께 적용됩니다 · 엣지 & 도우는 레시피 출력 대상이 아닙니다"
    >
      <Check
        label="피자 메뉴당 1페이지"
        value={recipePagePerMenu !== false}
        onChange={onRecipePagePerMenu}
        hint="피자·1인피자는 메뉴당 한 장, 세트박스·사이드·추가토핑은 카테고리별로 이어서 출력합니다"
      />

      {hasAnyMenu && (
        <input
          className="form-input"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="메뉴명 또는 코드로 검색"
          style={{ marginTop: 8, marginBottom: 4 }}
        />
      )}

      {recipeMenuGroups.map(group => {
        if (group.total === 0) return null;
        const visibleMenus = group.menus.filter(menu => matchesQuery(menu, query));
        if (query.trim() && visibleMenus.length === 0) return null;
        const allSelected = group.selectedCount === group.total;
        return (
          <details key={group.key} className="opt-menu-details" style={{ marginTop: 6 }}>
            <summary
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--text-2)',
                padding: '4px 0',
              }}
            >
              <span>
                {group.categoryLabel} ({group.selectedCount}/{group.total})
              </span>
              <button
                type="button"
                className="btn sm ghost"
                style={{ fontSize: 10, padding: '2px 8px' }}
                onClick={e => {
                  e.preventDefault();
                  onRecipeGroupSelectAll?.(group.kind, !allSelected);
                }}
              >
                {allSelected ? '전체 해제' : '전체 선택'}
              </button>
            </summary>
            <div style={{ paddingLeft: 4 }}>
              {visibleMenus.map(menu => (
                <Check
                  key={menu.id}
                  label={`${menu.menuName || '이름 없음'} (${menu.menuCode || '코드 없음'})`}
                  value={checked(recipeSelection, menu.id)}
                  onChange={value => onRecipeMenuChange?.(menu.id, value)}
                />
              ))}
            </div>
          </details>
        );
      })}
    </OptGroup>
  );
}
