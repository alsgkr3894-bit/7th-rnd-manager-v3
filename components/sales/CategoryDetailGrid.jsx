'use client';
import { formatNumber } from '@/lib/format';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

function normalizeShare(value) {
  const share = Number(value);
  if (!Number.isFinite(share)) return 0;
  return Math.max(0, Math.min(1, share));
}

/**
 * CategoryDetailGrid — 카테고리별 판매 비중 카드 그리드
 *
 * 디자인:
 *   - 상단 가로 바 차트 (카테고리 색상 비중)
 *   - 카드 그리드 (4열) — 카테고리당 1카드
 *     - 카테고리명 + 비중%
 *     - 총 판매량
 *     - TOP 3 메뉴 (순위 + 메뉴명 + 판매량)
 *
 * @param {{ total, categories: [...] }} detail
 * @param {(category) => void} onCategoryClick
 */
export function CategoryDetailGrid({ detail, onCategoryClick }) {
  const total = Number.isFinite(Number(detail?.total)) ? Number(detail.total) : 0;
  const categories = asObjectArray(detail?.categories);
  if (!detail || total === 0) {
    return (
      <div
        className="card"
        style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}
      >
        해당 월에 판매 데이터가 없습니다
      </div>
    );
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-header">
        <div>
          <div className="card-title">카테고리별 판매 비중</div>
          <div className="card-sub">상위 카테고리 · 카테고리별 TOP 3</div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
          총{' '}
          <b className="num" style={{ color: 'var(--text-1)' }}>
            {formatNumber(total)}
          </b>
          개
        </div>
      </div>

      {/* 가로 바 차트 — 카테고리 비중 */}
      <div
        style={{
          display: 'flex',
          height: 10,
          borderRadius: 6,
          overflow: 'hidden',
          background: 'var(--surface-2)',
          marginBottom: 20,
        }}
      >
        {categories.map((c, index) => {
          const name = asDisplayText(c.name, `카테고리 ${index + 1}`);
          const color = asDisplayText(c.color, 'var(--surface-3)');
          const share = normalizeShare(c.share);
          return (
            <div
              key={`${name}-${index}`}
              title={`${name} ${(share * 100).toFixed(1)}%`}
              style={{ width: `${share * 100}%`, background: color }}
            />
          );
        })}
      </div>

      {/* 카드 그리드 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 12,
        }}
      >
        {categories.map((c, index) => (
          <CategoryCard
            key={`${asDisplayText(c.name, 'category')}-${index}`}
            cat={c}
            onClick={onCategoryClick}
          />
        ))}
      </div>
    </div>
  );
}

function CategoryCard({ cat, onClick }) {
  const clickable = typeof onClick === 'function';
  const categoryName = asDisplayText(cat.name, '카테고리');
  const color = asDisplayText(cat.color, 'var(--surface-3)');
  const share = normalizeShare(cat.share);
  const value = Number.isFinite(Number(cat.value)) ? Number(cat.value) : 0;
  const topMenus = asObjectArray(cat.topMenus);
  return (
    <button
      onClick={() => clickable && onClick(categoryName)}
      disabled={!clickable}
      style={{
        padding: '14px 16px',
        border: '1px solid var(--border)',
        borderRadius: 10,
        background: 'var(--surface-2)',
        textAlign: 'left',
        font: 'inherit',
        color: 'var(--text-1)',
        cursor: clickable ? 'pointer' : 'default',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 6,
        }}
      >
        <span
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700 }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
          {categoryName}
        </span>
        <span className="num" style={{ fontSize: 13, fontWeight: 700 }}>
          {(share * 100).toFixed(1)}%
        </span>
      </div>
      <div className="num" style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
        {formatNumber(value)}
        <span className="unit" style={{ fontSize: 13, opacity: 0.6 }}>
          개
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {topMenus.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-4)' }}>판매 기록 없음</div>
        ) : (
          topMenus.map((m, i) => {
            const menuName = asDisplayText(m.name, '-');
            const quantity = Number.isFinite(Number(m.quantity)) ? Number(m.quantity) : 0;

            return (
              <div
                key={`${menuName}-${i}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 12,
                  color: 'var(--text-2)',
                }}
              >
                <span style={{ display: 'flex', gap: 6, minWidth: 0, alignItems: 'baseline' }}>
                  <span className="num" style={{ color: 'var(--text-4)', minWidth: 10 }}>
                    {i + 1}
                  </span>
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: 140,
                    }}
                  >
                    {menuName}
                  </span>
                </span>
                <span className="num" style={{ fontWeight: 600 }}>
                  {formatNumber(quantity)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </button>
  );
}
