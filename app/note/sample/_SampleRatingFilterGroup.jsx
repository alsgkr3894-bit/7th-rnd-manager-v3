'use client';

import { SampleChipOptionButtons } from './_SampleChipOptionGroup';

const RATING_FILTERS = [
  { min: 0, label: '전체' },
  { min: 3, label: '★3이상' },
  { min: 4, label: '★4이상' },
  { min: 5, label: '★5' },
  { min: -1, label: '★없음' },
];

export function SampleRatingFilterGroup({ ratingMin, onRatingMinChange, ratingDist, sampleCount }) {
  return (
    <div className="sample-rating-row">
      <SampleChipOptionButtons
        options={RATING_FILTERS}
        activeValue={ratingMin}
        valueKey="min"
        onChange={onRatingMinChange}
      />
      {sampleCount > 0 && (
        <span
          className="sample-rating-dist"
          style={{ fontSize: 11, color: 'var(--text-4)', marginLeft: 2, whiteSpace: 'nowrap' }}
        >
          5★ {ratingDist[5]} · 4★ {ratingDist[4]} · 3★ {ratingDist[3]} · 2★ {ratingDist[2]} · 1★{' '}
          {ratingDist[1]} · 없음 {ratingDist.none}
        </span>
      )}
    </div>
  );
}
