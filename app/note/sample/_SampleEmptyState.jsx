'use client';

function getEmptyMessage({ search, ratingMin, catFilter }) {
  if (search) return `"${search}" 검색 결과가 없어요`;
  if (ratingMin === -1) return '별점 없는 샘플이 없어요';
  if (ratingMin > 0) return `별점 ${ratingMin}점 이상 샘플이 없어요`;
  if (catFilter !== 'all') return `${catFilter} 카테고리 샘플이 없어요`;
  return '샘플 기록이 없어요';
}

export function SampleEmptyState({ search, ratingMin, catFilter, onCreateSample }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-3)' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📷</div>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
        {getEmptyMessage({ search, ratingMin, catFilter })}
      </div>
      {!search && catFilter === 'all' && ratingMin === 0 && (
        <button className="btn primary" style={{ marginTop: 8 }} onClick={onCreateSample}>
          첫 샘플 작성하기
        </button>
      )}
    </div>
  );
}
