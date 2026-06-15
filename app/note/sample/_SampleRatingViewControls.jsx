'use client';

import { SampleChipOptionGroup } from './_SampleChipOptionGroup';
import { SampleRatingFilterGroup } from './_SampleRatingFilterGroup';

const VIEW_OPTIONS = [
  { v: 'grid', label: '갤러리' },
  { v: 'list', label: '리스트' },
  { v: 'calendar', label: '캘린더' },
];

export function SampleRatingViewControls({
  ratingMin,
  onRatingMinChange,
  ratingDist,
  sampleCount,
  sortOptions,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
}) {
  return (
    <div
      className="sample-filter-row"
      style={{
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap',
        alignItems: 'center',
        marginBottom: 12,
      }}
    >
      <SampleRatingFilterGroup
        ratingMin={ratingMin}
        onRatingMinChange={onRatingMinChange}
        ratingDist={ratingDist}
        sampleCount={sampleCount}
      />
      <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
      <SampleChipOptionGroup options={sortOptions} activeValue={sortBy} onChange={onSortChange} />
      <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
      <SampleChipOptionGroup
        options={VIEW_OPTIONS}
        activeValue={viewMode}
        valueKey="v"
        onChange={onViewModeChange}
        gap={4}
      />
    </div>
  );
}
