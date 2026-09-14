'use client';
import { Icon } from '@/components/icons';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { DetailField } from './_MarketFields';

export function MarketDetailModal({ row, onClose, onEdit, canEdit, onPhotoClick }) {
  const photos = Array.isArray(row.photos) ? row.photos.filter(photo => photo?.data) : [];
  return (
    <ModalFrame
      title={row.title || row.type}
      subtitle={`${row.date || '날짜 없음'}${row.brand ? ` · ${row.brand}` : ''} · ${row.type}`}
      onClose={onClose}
      width="min(640px, 96vw)"
      zIndex={300}
    >
      <div style={{ display: 'grid', gap: 16 }}>
        <DetailField label="경쟁사 / 시장 키워드" value={row.competitor} />
        <DetailField label="시장분석 / 피해 트렌드 방향" value={row.marketTrend} />
        <DetailField label="타브랜드 참고 포인트" value={row.referencePoint} />
        <DetailField label="개발 방향 / 적용 아이디어" value={row.developmentDirection} />
        <DetailField label="다음 액션" value={row.actionIdea} />
        <DetailField label="태그" value={row.tags} />
        {photos.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--text-3)', marginBottom: 4 }}>
              사진 ({photos.length})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {photos.map((photo, index) => (
                <figure key={index} style={{ margin: 0 }}>
                  <button
                    type="button"
                    onClick={() => onPhotoClick(photo)}
                    aria-label={`${photo.caption || photo.name || '사진'} 크게 보기`}
                    style={{
                      all: 'unset',
                      cursor: 'zoom-in',
                      display: 'block',
                      width: '100%',
                    }}
                  >
                    <img
                      src={photo.data}
                      alt={photo.caption || photo.name || '시장조사 사진'}
                      style={{
                        width: '100%',
                        aspectRatio: '4/3',
                        objectFit: 'contain',
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        display: 'block',
                      }}
                    />
                  </button>
                  {photo.caption && (
                    <figcaption
                      style={{
                        fontSize: 11,
                        color: 'var(--text-3)',
                        marginTop: 4,
                        textAlign: 'center',
                      }}
                    >
                      {photo.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={onClose}>
            닫기
          </button>
          {canEdit && (
            <button type="button" className="btn primary" onClick={onEdit}>
              수정
            </button>
          )}
        </div>
      </div>
    </ModalFrame>
  );
}
