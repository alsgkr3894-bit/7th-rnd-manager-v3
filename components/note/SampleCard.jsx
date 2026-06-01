'use client';
import React from 'react';
import { Icon } from '@/components/icons';
import { sampleNamesText } from '@/lib/sample';

/**
 * SampleCard — 샘플 갤러리 그리드의 개별 카드 컴포넌트.
 *
 * @param {object}   props.sample          - 샘플 레코드
 * @param {boolean}  props.batchMode       - 배치 선택 모드
 * @param {boolean}  props.isBatchSelected - 현재 선택됨 (배치 모드)
 * @param {boolean}  props.compareMode     - 비교 모드
 * @param {number}   props.compareIdx      - 비교 순서 인덱스 (-1이면 미선택)
 * @param {number}   props.animDelay       - stagger 애니메이션 딜레이(ms)
 * @param {function} props.onCardClick     - 카드 클릭 핸들러 (배치/비교/상세 분기 포함)
 * @param {function} props.onRatingChange  - 별점 변경 핸들러 (sampleId, newRating, e)
 * @param {function} props.onEdit          - 수정 버튼 클릭
 * @param {function} props.onCopy          - 복사 버튼 클릭 (e)
 * @param {function} props.onDelete        - 삭제 버튼 클릭
 */
export const SampleCard = React.memo(function SampleCard({
  sample,
  batchMode,
  isBatchSelected,
  compareMode,
  compareIdx,
  animDelay,
  onCardClick,
  onRatingChange,
  onEdit,
  onCopy,
  onDelete,
}) {
  const rec = sample;
  const thumb = rec.photos?.[0]?.data;
  const names = sampleNamesText(rec);
  const tags = rec.tags ? rec.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
  const isCompareSelected = compareIdx !== -1;

  return (
    <div
      className="stagger"
      style={{ animationDelay: `${animDelay}ms`, position: 'relative' }}
    >
      {/* 배치 체크박스 오버레이 */}
      {batchMode && (
        <div
          className={'batch-checkbox-wrap' + (isBatchSelected ? ' checked' : '')}
          style={{
            position: 'absolute', top: 8, right: 8, zIndex: 10,
            width: 20, height: 20, borderRadius: 4,
            background: '#fff', border: '2px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          {isBatchSelected && (
            <span style={{ color: '#22c55e', fontSize: 14, lineHeight: 1 }}>✓</span>
          )}
        </div>
      )}

      {/* 비교 뱃지 */}
      {compareMode && isCompareSelected && (
        <div style={{
          position: 'absolute', top: 8, right: 8, zIndex: 10,
          width: 22, height: 22, borderRadius: '50%',
          background: 'var(--accent)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 800, pointerEvents: 'none',
        }}>
          {compareIdx + 1}
        </div>
      )}

      <div
        className="card card-lift"
        style={{
          padding: 0, cursor: 'pointer', overflow: 'hidden', height: '100%',
          outline: batchMode && isBatchSelected
            ? '2px solid #22c55e'
            : compareMode && isCompareSelected
              ? '2px solid var(--accent)'
              : 'none',
        }}
        onClick={onCardClick}
      >
        {/* 썸네일 */}
        <div style={{
          height: 180, background: 'var(--surface-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          {thumb ? (
            <img
              src={thumb}
              alt={`${names || rec.title} 샘플 사진`}
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ fontSize: 40, opacity: 0.3 }}>📷</div>
          )}

          {/* 사진 수 배지 */}
          {(rec.photos?.length || 0) > 1 && (
            <span style={{
              position: 'absolute', top: 8, right: 8,
              background: 'rgba(0,0,0,0.55)', color: '#fff',
              fontSize: 10, padding: '2px 7px', borderRadius: 10, fontWeight: 700,
            }}>
              📷 {rec.photos.length}
            </span>
          )}

          {/* 카테고리 배지 */}
          <span style={{
            position: 'absolute', bottom: 8, left: 8,
            background: 'rgba(0,0,0,0.5)', color: '#fff',
            fontSize: 10, padding: '2px 8px', borderRadius: 6, fontWeight: 700,
          }}>{rec.category}</span>
        </div>

        {/* 카드 내용 */}
        <div style={{ padding: '12px 14px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <div style={{
              fontSize: 14, fontWeight: 700, color: 'var(--text-1)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
            }}>{rec.title}</div>

            <div className="inline-stars" onClick={e => e.stopPropagation()}>
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  className={'inline-star' + (n <= (rec.rating || 0) ? ' lit' : '')}
                  onClick={e => onRatingChange(rec.id, (rec.rating || 0) === n ? 0 : n, e)}
                >★</button>
              ))}
            </div>
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {names && <span style={{ fontWeight: 600, color: 'var(--text-2)' }}>{names}</span>}
            {rec.testDate && <span>· {rec.testDate}</span>}
            {rec.company  && <span>· {rec.company}</span>}
            {rec.price    && <span>· {rec.price}원{rec.priceTaxType === 'excl' ? '(별도)' : ''}</span>}
          </div>

          {rec.description && (
            <div style={{
              fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6,
              display: '-webkit-box', WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 8,
            }}>{rec.description}</div>
          )}

          {tags.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
              {tags.slice(0, 4).map(t => (
                <span key={t} style={{
                  background: 'var(--surface-2)', color: 'var(--text-3)',
                  fontSize: 10, padding: '1px 6px', borderRadius: 8,
                }}>#{t}</span>
              ))}
            </div>
          )}

          {/* 액션 버튼 (배치/비교 모드 아닐 때만) */}
          {!batchMode && !compareMode && (
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }} onClick={e => e.stopPropagation()}>
              <button className="btn sm" style={{ flex: 1 }} onClick={onEdit}>
                수정
              </button>
              <button className="btn sm" onClick={onCopy}>
                복사
              </button>
              <button className="btn sm" style={{ color: 'var(--negative)' }} onClick={onDelete}>
                삭제
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
