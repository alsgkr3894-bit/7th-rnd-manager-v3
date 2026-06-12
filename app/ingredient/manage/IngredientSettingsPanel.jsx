import { Icon } from '@/components/icons';
import { getCategoryStyle } from '@/lib/ingredient';

export function IngredientSettingsPanel({
  mainCats,
  categoryCounts,
  hashTags,
  tagCounts,
  onRemoveRequest,
}) {
  return (
    <div
      className="card"
      style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
          분류 ({mainCats.length})
        </div>
        {mainCats.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>등록된 분류가 없습니다</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {mainCats.map(category => (
              <span
                key={category}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 6px 4px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  fontSize: 13,
                  fontWeight: 600,
                  ...getCategoryStyle(category),
                }}
              >
                {category}{' '}
                <span style={{ fontSize: 11, opacity: 0.7 }}>
                  {categoryCounts.get(category) || 0}
                </span>
                <button
                  onClick={() => onRemoveRequest({ type: 'cat', value: category })}
                  title="분류 삭제"
                  style={{
                    border: 0,
                    background: 'transparent',
                    cursor: 'pointer',
                    color: 'inherit',
                    opacity: 0.6,
                    display: 'inline-flex',
                    padding: 0,
                  }}
                >
                  <Icon.close style={{ width: 12, height: 12 }} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
          #태그 ({hashTags.length})
        </div>
        {hashTags.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>등록된 태그가 없습니다</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {hashTags.map(tag => (
              <span
                key={tag}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 6px 4px 10px',
                  borderRadius: 8,
                  background: 'var(--surface-2)',
                  color: 'var(--text-2)',
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                #{tag} <span style={{ fontSize: 11, opacity: 0.7 }}>{tagCounts.get(tag) || 0}</span>
                <button
                  onClick={() => onRemoveRequest({ type: 'tag', value: tag })}
                  title="태그 삭제"
                  style={{
                    border: 0,
                    background: 'transparent',
                    cursor: 'pointer',
                    color: 'inherit',
                    opacity: 0.6,
                    display: 'inline-flex',
                    padding: 0,
                  }}
                >
                  <Icon.close style={{ width: 12, height: 12 }} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-4)' }}>
        ※ 삭제 시 해당 분류/태그가 모든 식자재에서 제거됩니다(식자재 자체는 유지).
      </div>
    </div>
  );
}
