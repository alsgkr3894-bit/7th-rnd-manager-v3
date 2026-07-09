'use client';

import { SampleListRow } from '@/components/note/SampleListRow';
import { buildSampleIngredientGroups } from './samplePageStateUtils';

export function SampleListView({
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
}) {
  const groups = buildSampleIngredientGroups(rows);
  // 그룹 헤더 건수는 현재 페이지가 아니라 전체 filtered 집합 기준이어야 정확하다.
  const fullGroups = buildSampleIngredientGroups(Array.isArray(allRows) ? allRows : rows);
  const fullByName = new Map(fullGroups.map(group => [group.name, group]));
  const countsOf = name => fullByName.get(name) || null;
  const selectedSet = selected instanceof Set ? selected : null;
  const compareMap = compareIdxMap instanceof Map ? compareIdxMap : null;

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
            {groups.flatMap(group => [
              <tr key={`group-${group.name}`}>
                <td colSpan={10} style={{ background: 'var(--surface-2)', fontWeight: 800 }}>
                  {group.name}
                  <span style={{ marginLeft: 8, color: 'var(--text-3)', fontWeight: 500 }}>
                    샘플테스트 {(countsOf(group.name) || group).sampleTestCount}건 · 이슈{' '}
                    {(countsOf(group.name) || group).issueCount}건
                  </span>
                </td>
              </tr>,
              ...group.rows.map(sample => (
                <SampleListRow
                  key={sample.id}
                  sample={sample}
                  batchMode={batchMode}
                  isBatchSelected={selectedSet ? selectedSet.has(sample.id) : false}
                  compareMode={compareMode}
                  compareIdx={
                    compareMap && compareMap.has(sample.id) ? compareMap.get(sample.id) : -1
                  }
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
              )),
            ])}
          </tbody>
        </table>
      </div>
    </div>
  );
}
