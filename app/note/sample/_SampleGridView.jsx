'use client';

import { SampleCard } from '@/components/note/SampleCard';

export function SampleGridView({
  rows,
  catFilter,
  ratingMin,
  sortBy,
  batchMode,
  selected,
  canEdit = false,
  toggleSelect,
  compareMode,
  toggleCompare,
  compareIdxMap,
  onOpenSample,
  onEditSample,
  onCopySample,
  onDeleteSample,
  onRatingChange,
}) {
  return (
    <div
      key={`${catFilter}|${ratingMin}|${sortBy}`}
      className="tab-content-enter"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 16,
      }}
    >
      {rows.map((sample, index) => {
        const isBatchSelected = selected.has(sample.id);
        const compareIdx = compareIdxMap.has(sample.id) ? compareIdxMap.get(sample.id) : -1;

        return (
          <SampleCard
            key={sample.id}
            sample={sample}
            batchMode={batchMode}
            isBatchSelected={isBatchSelected}
            compareMode={compareMode}
            compareIdx={compareIdx}
            animDelay={Math.min(index, 8) * 40}
            onCardClick={() => {
              if (batchMode) {
                if (!canEdit) return;
                toggleSelect(sample.id);
                return;
              }
              if (compareMode) {
                toggleCompare(sample.id);
                return;
              }
              onOpenSample(sample);
            }}
            onRatingChange={onRatingChange}
            onEdit={() => onEditSample(sample)}
            onCopy={event => onCopySample(sample, event)}
            onDelete={() => onDeleteSample(sample)}
            canEdit={canEdit}
          />
        );
      })}
    </div>
  );
}
