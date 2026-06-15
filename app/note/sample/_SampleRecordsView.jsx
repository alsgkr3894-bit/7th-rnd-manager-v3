'use client';

import { SampleCardSkeleton } from '@/components/ui/Skeleton';
import { SampleCard } from '@/components/note/SampleCard';
import { SampleListRow } from '@/components/note/SampleListRow';

export function SampleRecordsView({
  loading,
  viewMode,
  filtered,
  catFilter,
  ratingMin,
  sortBy,
  search,
  batchMode,
  selected,
  toggleSelect,
  compareMode,
  toggleCompare,
  compareIdxMap,
  onOpenSample,
  onEditSample,
  onCopySample,
  onDeleteSample,
  onRatingChange,
  onCreateSample,
}) {
  const rows = Array.isArray(filtered) ? filtered : [];

  if (loading) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 16,
        }}
      >
        {Array.from({ length: 8 }).map((_, index) => (
          <SampleCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if ((viewMode === 'grid' || viewMode === 'list') && rows.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-3)' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📷</div>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
          {search
            ? `"${search}" 검색 결과가 없어요`
            : ratingMin === -1
              ? '별점 없는 샘플이 없어요'
              : ratingMin > 0
                ? `별점 ${ratingMin}점 이상 샘플이 없어요`
                : catFilter !== 'all'
                  ? `${catFilter} 카테고리 샘플이 없어요`
                  : '샘플 기록이 없어요'}
        </div>
        {!search && catFilter === 'all' && ratingMin === 0 && (
          <button className="btn primary" style={{ marginTop: 8 }} onClick={onCreateSample}>
            첫 샘플 작성하기
          </button>
        )}
      </div>
    );
  }

  if (viewMode === 'grid' && rows.length > 0) {
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
            />
          );
        })}
      </div>
    );
  }

  if (viewMode === 'list' && rows.length > 0) {
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
                <th scope="col" style={{ width: 150 }} aria-label="액션"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(sample => (
                <SampleListRow
                  key={sample.id}
                  sample={sample}
                  onClick={() => {
                    if (batchMode) {
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
                  onDelete={() => onDeleteSample(sample)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return null;
}
