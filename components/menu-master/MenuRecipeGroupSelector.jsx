'use client';

import { useState } from 'react';

function groupIdText(group) {
  return String(group?.id ?? '').trim();
}

function groupMetaText(group) {
  const sizes = Array.isArray(group?.sizes) ? group.sizes.filter(Boolean) : [];
  const sizeText = sizes.length ? sizes.join(', ') : '모든 사이즈';
  const ingredientCount = Array.isArray(group?.ingredients) ? group.ingredients.length : 0;
  return `${sizeText} · 식자재 ${ingredientCount}개`;
}

export function MenuRecipeGroupSelector({ groups, selectedGroupIds, onToggle }) {
  const [expandedIds, setExpandedIds] = useState(new Set());
  const selected = new Set(Array.isArray(selectedGroupIds) ? selectedGroupIds : []);

  function toggleExpand(id) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div style={{ margin: '10px 0 12px' }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--text-3)',
          marginBottom: 6,
        }}
      >
        공통원가 선택
      </div>
      {groups.length === 0 ? (
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-4)',
            border: '1px dashed var(--border)',
            borderRadius: 6,
            padding: '8px 10px',
          }}
        >
          이 메뉴 카테고리에 지정된 공통원가가 없습니다 (공통원가 관리에서 카테고리를 지정해주세요)
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 6 }}>
          {groups.map(group => {
            const id = groupIdText(group);
            const checked = selected.has(id);
            const expanded = expandedIds.has(id);
            const ingredients = Array.isArray(group?.ingredients) ? group.ingredients : [];

            return (
              <div
                key={id}
                style={{
                  border: '1px solid',
                  borderColor: checked ? 'var(--accent)' : 'var(--border)',
                  borderRadius: 6,
                  overflow: 'hidden',
                  background: checked ? 'var(--accent-soft)' : 'var(--surface)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '7px 9px',
                      cursor: 'pointer',
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(id)}
                      style={{ width: 14, height: 14, margin: 0 }}
                    />
                    <span style={{ minWidth: 0 }}>
                      <span
                        style={{
                          display: 'block',
                          fontSize: 12,
                          fontWeight: 700,
                          color: checked ? 'var(--accent-text)' : 'var(--text-2)',
                        }}
                      >
                        {group.name || '이름 없는 공통원가'}
                      </span>
                      <span style={{ display: 'block', fontSize: 11, color: 'var(--text-4)' }}>
                        {groupMetaText(group)}
                      </span>
                    </span>
                  </label>
                  {ingredients.length > 0 && (
                    <button
                      type="button"
                      title={expanded ? '구성품 숨기기' : '구성품 보기'}
                      onClick={() => toggleExpand(id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px 10px',
                        fontSize: 11,
                        color: 'var(--text-3)',
                        flexShrink: 0,
                        alignSelf: 'stretch',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                      }}
                    >
                      {expanded ? '▲' : '▼'}
                    </button>
                  )}
                </div>

                {expanded && ingredients.length > 0 && (
                  <div
                    style={{
                      borderTop: '1px solid var(--divider)',
                      padding: '6px 10px 8px',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '4px 8px',
                    }}
                  >
                    {ingredients.map((ing, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: 11,
                          color: 'var(--text-3)',
                          background: 'var(--surface-2)',
                          borderRadius: 4,
                          padding: '1px 6px',
                        }}
                      >
                        {ing.ingredientName || ing.name || String(ing)}
                        {ing.quantity != null && (
                          <span style={{ color: 'var(--text-4)', marginLeft: 3 }}>
                            {ing.quantity}{ing.unit || 'g'}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
