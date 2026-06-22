'use client';

import { SectionLabel } from '@/components/cost/shared/FormLabels';
import { GROUP_EDITOR_CATEGORIES } from './groupEditorUtils';

export function GroupEditorCategoryChips({ selectedCategories, readOnly = false, onToggle }) {
  return (
    <>
      <SectionLabel>
        선택 가능 카테고리
        <span
          style={{
            marginLeft: 6,
            fontSize: 11,
            fontWeight: 400,
            color: selectedCategories.length === 0 ? 'var(--negative, #e03131)' : 'var(--text-4)',
          }}
        >
          {selectedCategories.length === 0
            ? '(최소 1개 선택 필요 · 미선택 시 메뉴에 표시 안 됨)'
            : `${selectedCategories.length}개 선택`}
        </span>
      </SectionLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
        {GROUP_EDITOR_CATEGORIES.map(category => {
          const selected = selectedCategories.includes(category);
          return (
            <button
              key={category}
              type="button"
              onClick={() => onToggle(category)}
              disabled={readOnly}
              style={{
                padding: '4px 10px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                cursor: readOnly ? 'default' : 'pointer',
                border: '1px solid',
                borderColor: selected ? 'var(--accent)' : 'var(--border)',
                background: selected ? 'var(--accent-soft)' : 'var(--surface)',
                color: selected ? 'var(--accent-text)' : 'var(--text-2)',
              }}
            >
              {category}
            </button>
          );
        })}
      </div>
    </>
  );
}
