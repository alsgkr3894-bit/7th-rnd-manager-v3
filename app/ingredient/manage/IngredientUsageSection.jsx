'use client';
import { Icon } from '@/components/icons';

const CATEGORY_STYLE = {
  피자: { background: 'var(--cat-1-bg)', color: 'var(--cat-1-text)' },
  '1인피자': { background: 'var(--cat-3-bg)', color: 'var(--cat-3-text)' },
  사이드: { background: 'var(--cat-2-bg)', color: 'var(--cat-2-text)' },
  세트박스: { background: 'var(--surface-3)', color: 'var(--text-2)' },
};

function SourceChips({ sources = [] }) {
  if (!sources.length) return null;
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 5 }}>
      {sources.map(source => (
        <span
          key={source.label}
          style={{
            padding: '1px 5px',
            borderRadius: 4,
            background: 'var(--surface-2)',
            color: 'var(--text-3)',
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          {source.label}
        </span>
      ))}
    </div>
  );
}

export function IngredientUsageSection({ loading, rows = [], error }) {
  return (
    <section
      style={{
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: 12,
        background: 'var(--surface)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
          marginBottom: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 800 }}>
          <Icon.doc style={{ width: 15, height: 15, color: 'var(--accent)' }} />
          사용 메뉴
        </div>
        <span
          style={{
            minWidth: 26,
            height: 22,
            padding: '0 7px',
            borderRadius: 999,
            background: rows.length ? 'var(--accent-soft)' : 'var(--surface-2)',
            color: rows.length ? 'var(--accent-text)' : 'var(--text-3)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          {loading ? '...' : rows.length}
        </span>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gap: 6 }}>
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="skeleton"
              style={{ height: 32, borderRadius: 6, opacity: 1 - index * 0.15 }}
            />
          ))}
        </div>
      ) : error ? (
        <div style={{ color: 'var(--negative)', fontSize: 12 }}>{error}</div>
      ) : rows.length === 0 ? (
        <div style={{ color: 'var(--text-3)', fontSize: 12 }}>사용 중인 메뉴 없음</div>
      ) : (
        <div style={{ display: 'grid', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
          {rows.map(row => (
            <div
              key={row.menuCode}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto',
                gap: 8,
                alignItems: 'start',
                padding: '8px 0',
                borderTop: '1px solid var(--divider)',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{row.menuName}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                  {row.menuCode}
                </div>
                <SourceChips sources={row.sources} />
              </div>
              <span
                style={{
                  padding: '2px 7px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 800,
                  whiteSpace: 'nowrap',
                  ...(CATEGORY_STYLE[row.category] || {
                    background: 'var(--surface-2)',
                    color: 'var(--text-2)',
                  }),
                }}
              >
                {row.category}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
