'use client';

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
  const selected = new Set(Array.isArray(selectedGroupIds) ? selectedGroupIds : []);

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
            return (
              <label
                key={id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  border: '1px solid',
                  borderColor: checked ? 'var(--accent)' : 'var(--border)',
                  borderRadius: 6,
                  padding: '7px 9px',
                  cursor: 'pointer',
                  background: checked ? 'var(--accent-soft)' : 'var(--surface)',
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
            );
          })}
        </div>
      )}
    </div>
  );
}
