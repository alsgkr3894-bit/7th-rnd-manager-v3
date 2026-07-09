'use client';

import { SampleCard } from '@/components/note/SampleCard';
import { buildSampleIngredientGroups } from './samplePageStateUtils';

export function SampleGridView({
  rows,
  allRows,
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
  onNextRoundSample,
  onDeleteSample,
  onRatingChange,
}) {
  const groups = buildSampleIngredientGroups(rows);
  // 그룹 헤더 건수는 현재 페이지가 아니라 전체 filtered 집합 기준이어야 정확하다.
  const fullGroups = buildSampleIngredientGroups(Array.isArray(allRows) ? allRows : rows);
  const fullByName = new Map(fullGroups.map(group => [group.name, group]));
  const countsOf = name => fullByName.get(name) || null;

  return (
    <div
      key={`${catFilter}|${ratingMin}|${sortBy}`}
      className="tab-content-enter"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      {groups.map(group => (
        <section key={group.name} className="card" style={{ padding: 14 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{group.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                샘플테스트 {(countsOf(group.name) || group).sampleTestCount}건 · 이슈{' '}
                {(countsOf(group.name) || group).issueCount}건
              </div>
            </div>
            <span className="chip">{(countsOf(group.name) || group).rows.length}건</span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 16,
            }}
          >
            {group.rows.map((sample, index) => {
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
                  onNextRound={event => onNextRoundSample(sample, event)}
                  onDelete={() => onDeleteSample(sample)}
                  canEdit={canEdit}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
