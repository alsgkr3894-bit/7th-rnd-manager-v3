'use client';

/**
 * Chip — 필터/카테고리 토글 버튼
 *
 * @param {string}  label
 * @param {number}  [count]   - 우측 배지 (생략 시 미표시)
 * @param {boolean} active    - 활성 상태
 * @param {boolean} [dim]     - 비활성 강조 (multi-select에서 "전체" 활성 시 카테고리 dim 처리)
 * @param {string}  [color]   - 비활성 상태일 때 라벨 색상 (옵션)
 * @param {Function} onClick
 */
export function Chip({ label, count, active, dim, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className="chip"
      style={{
        cursor:'pointer', border:'none',
        background: active ? 'var(--accent)' : 'var(--surface-2)',
        color: active ? '#fff' : (dim ? 'var(--text-4)' : (color || 'var(--text-2)')),
        fontWeight: 600,
        opacity: dim ? 0.7 : 1,
        display:'inline-flex', alignItems:'center', gap:6,
      }}
    >
      {label}
      {count != null && (
        <span style={{
          background: active ? 'rgba(255,255,255,0.2)' : 'var(--surface)',
          color: active ? '#fff' : 'var(--text-3)',
          padding:'1px 6px', borderRadius:10, fontSize:11, fontWeight:700,
        }}>{count}</span>
      )}
    </button>
  );
}
