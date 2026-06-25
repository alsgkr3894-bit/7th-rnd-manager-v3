'use client';

import { SampleListRow } from '@/components/note/SampleListRow';

export function SampleListView({
  rows,
  catFilter,
  ratingMin,
  sortBy,
  batchMode,
  canEdit = false,
  toggleSelect,
  compareMode,
  toggleCompare,
  onOpenSample,
  onEditSample,
  onCopySample,
  onNextRoundSample,
  onDeleteSample,
}) {
  return (
    <div
      key={`list|${catFilter}|${ratingMin}|${sortBy}`}
      className="card table-card tab-content-enter"
    >
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col" style={{ width: 48 }} aria-label="선택"></th>
              <th scope="col">제목</th>
              <th scope="col">샘플명</th>
              <th scope="col" style={{ width: 90 }}>
                카테고리
              </th>
              <th scope="col" style={{ width: 110 }}>
                수령일
              </th>
              <th scope="col" style={{ width: 120 }}>
                업체
              </th>
              <th scope="col" style={{ width: 84 }}>
                담당자
              </th>
              <th scope="col" style={{ width: 84 }}>
                평점
              </th>
              <th scope="col" style={{ width: 110, textAlign: 'right' }}>
                단가
              </th>
              <th scope="col" style={{ width: 210 }} aria-label="액션"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(sample => (
              <SampleListRow
                key={sample.id}
                sample={sample}
                onClick={() => {
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
                onEdit={() => onEditSample(sample)}
                onCopy={event => onCopySample(sample, event)}
                onNextRound={event => onNextRoundSample(sample, event)}
                onDelete={() => onDeleteSample(sample)}
                canEdit={canEdit}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
