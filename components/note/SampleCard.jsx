'use client';
import React from 'react';
import { noop } from '@/lib/ui/prop-guards';
import { SampleCardBody } from './sample-card/SampleCardBody';
import { SampleCardMedia } from './sample-card/SampleCardMedia';
import { SampleCardSelectionOverlay } from './sample-card/SampleCardSelectionOverlay';
import { buildSampleCardViewModel } from './sample-card/sampleCardUtils';

const S_CARD = {
  padding: 0,
  cursor: 'pointer',
  overflow: 'hidden',
  height: '100%',
};

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
  sample = {},
  batchMode,
  isBatchSelected,
  compareMode,
  compareIdx = -1,
  animDelay = 0,
  onCardClick,
  onRatingChange,
  onEdit,
  onCopy,
  onDelete,
}) {
  const model = buildSampleCardViewModel(sample);
  const rec = model.rec;
  const isCompareSelected = compareIdx !== -1;
  const cardClick = typeof onCardClick === 'function' ? onCardClick : noop;
  const ratingChange = typeof onRatingChange === 'function' ? onRatingChange : noop;
  const edit = typeof onEdit === 'function' ? onEdit : noop;
  const copy = typeof onCopy === 'function' ? onCopy : noop;
  const remove = typeof onDelete === 'function' ? onDelete : noop;

  return (
    <div className="stagger" style={{ animationDelay: `${animDelay}ms`, position: 'relative' }}>
      <SampleCardSelectionOverlay
        batchMode={batchMode}
        isBatchSelected={isBatchSelected}
        compareMode={compareMode}
        isCompareSelected={isCompareSelected}
        compareIdx={compareIdx}
      />

      <div
        className="card card-lift"
        style={{
          ...S_CARD,
          outline:
            batchMode && isBatchSelected
              ? '2px solid #22c55e'
              : compareMode && isCompareSelected
                ? '2px solid var(--accent)'
                : 'none',
        }}
        onClick={cardClick}
      >
        <SampleCardMedia
          thumb={model.thumb}
          photosCount={model.photos.length}
          category={model.category}
          altText={`${model.names || model.title} 샘플 사진`}
        />
        <SampleCardBody
          model={model}
          rating={rec.rating || 0}
          batchMode={batchMode}
          compareMode={compareMode}
          onRatingChange={ratingChange}
          onEdit={edit}
          onCopy={copy}
          onDelete={remove}
        />
      </div>
    </div>
  );
});
