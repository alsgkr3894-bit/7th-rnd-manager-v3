'use client';

import { photosOf, previewTextOf } from './marketPageUtils';

/** 시장조사 목록의 기록 한 건 카드 — 제목/유형/경쟁사 chip, 미리보기, 사진 썸네일, 액션. */
export function MarketRecordCard({
  row,
  color,
  active,
  canEdit,
  onDetail,
  onEdit,
  onDelete,
  onPhotoClick,
}) {
  const photos = photosOf(row);
  return (
    <article
      className="market-record-card"
      style={{
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: 12,
        background: active ? 'var(--accent-soft)' : 'var(--surface-2)',
      }}
    >
      <div className="market-record-head">
        <strong className="market-record-title">{row.title || row.type}</strong>
        {photos.length > 0 && <span className="chip">사진 {photos.length}</span>}
        <span className="chip">{row.type}</span>
      </div>
      {row.competitor && (
        <div style={{ marginTop: 6 }}>
          <span
            className="chip"
            style={{
              background: 'var(--surface)',
              border: `1px solid ${color}`,
              color,
              fontWeight: 800,
            }}
          >
            {row.competitor}
          </span>
        </div>
      )}
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 5 }}>
        {row.date || '날짜 없음'} {row.brand ? `· ${row.brand}` : ''}
      </div>
      <p
        style={{
          margin: '8px 0 0',
          fontSize: 12,
          lineHeight: 1.5,
          color: 'var(--text-2)',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {previewTextOf(row)}
      </p>
      {photos.length > 0 && (
        <div
          style={{ display: 'flex', gap: 6, overflowX: 'auto', marginTop: 10, paddingBottom: 2 }}
        >
          {photos.slice(0, 4).map((photo, index) => (
            <button
              key={index}
              type="button"
              onClick={() => onPhotoClick(photo)}
              aria-label={`${photo.caption || photo.name || '사진'} 크게 보기`}
              style={{ all: 'unset', cursor: 'zoom-in', flex: '0 0 auto' }}
            >
              <img
                src={photo.data}
                alt={photo.caption || photo.name || '시장조사 사진'}
                style={{
                  width: 72,
                  height: 54,
                  objectFit: 'cover',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  display: 'block',
                }}
              />
            </button>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        <button type="button" className="btn sm" onClick={() => onDetail(row)}>
          자세히
        </button>
        <button type="button" className="btn sm" onClick={() => onEdit(row)} disabled={!canEdit}>
          수정
        </button>
        <button
          type="button"
          className="btn sm"
          onClick={() => onDelete(row)}
          disabled={!canEdit}
          style={{ color: 'var(--negative)' }}
        >
          삭제
        </button>
      </div>
    </article>
  );
}
