'use client';
import { buildPaginationPages, normalizePaginationState } from '@/lib/ui/pagination';

/**
 * Pagination — 클라이언트-사이드 페이지 네비게이션 바.
 *
 * totalPages <= 1 이면 null 반환(자리 차지 없음).
 *
 * @param {{ page, totalPages, onPage, total, pageSize }} props
 */
export function Pagination({ page, totalPages, onPage, total, pageSize }) {
  const {
    page: safePage,
    totalPages: safeTotalPages,
    total: safeTotal,
    start,
    end,
  } = normalizePaginationState({ page, totalPages, total, pageSize });

  if (safeTotalPages <= 1) return null;

  const pages = buildPaginationPages(safePage, safeTotalPages);

  const btnStyle = (active) => ({
    minWidth: 32, height: 32, padding: '0 6px',
    borderRadius: 7, border: '1px solid',
    cursor: active ? 'default' : 'pointer',
    fontSize: 13, fontWeight: active ? 700 : 400,
    borderColor: active ? 'var(--accent)' : 'var(--border)',
    background: active ? 'var(--accent)' : 'var(--surface)',
    color: active ? '#fff' : 'var(--text-2)',
  });

  const arrowStyle = (disabled) => ({
    minWidth: 32, height: 32, padding: '0 6px',
    borderRadius: 7, border: '1px solid var(--border)',
    cursor: disabled ? 'default' : 'pointer',
    fontSize: 13, background: 'var(--surface)',
    color: disabled ? 'var(--text-4)' : 'var(--text-2)',
    opacity: disabled ? 0.4 : 1,
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '10px 16px', flexWrap: 'wrap' }}>
      <button
        style={arrowStyle(safePage === 1)}
        disabled={safePage === 1}
        onClick={() => onPage?.(safePage - 1)}
        aria-label="이전"
      >
        ←
      </button>

      {pages.map((p, i) =>
        p === null ? (
          <span key={`ellipsis-${i}`} style={{ color: 'var(--text-4)', fontSize: 13, padding: '0 2px' }}>…</span>
        ) : (
          <button
            key={p}
            style={btnStyle(p === safePage)}
            disabled={p === safePage}
            onClick={() => onPage?.(p)}
          >
            {p}
          </button>
        )
      )}

      <button
        style={arrowStyle(safePage === safeTotalPages)}
        disabled={safePage === safeTotalPages}
        onClick={() => onPage?.(safePage + 1)}
        aria-label="다음"
      >
        →
      </button>

      <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-3)' }}>
        {start}–{end} / {safeTotal}개
      </span>
    </div>
  );
}
