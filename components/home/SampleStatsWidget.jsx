'use client';
import { useMemo } from 'react';
import { asDisplayText, asFiniteNumber, asObjectArray } from '@/lib/ui/prop-guards';

function toTime(value) {
  const time = Date.parse(asDisplayText(value));
  return Number.isFinite(time) ? time : 0;
}

export function SampleStatsWidget({ samples, router }) {
  const safeSamples = useMemo(() => asObjectArray(samples), [samples]);

  const stats = useMemo(() => {
    const list = safeSamples;
    const rated = list.filter(sample => asFiniteNumber(sample.rating, 0) > 0);
    const avg =
      rated.length > 0
        ? rated.reduce((sum, sample) => sum + asFiniteNumber(sample.rating, 0), 0) / rated.length
        : 0;
    const withPhoto = list.filter(sample =>
      asObjectArray(sample.photos).some(photo => asDisplayText(photo.data))
    ).length;
    const recent = [...list]
      .sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt))
      .slice(0, 3);
    const ratingDist = [1, 2, 3, 4, 5].map(rating => ({
      rating,
      count: list.filter(sample => asFiniteNumber(sample.rating, 0) === rating).length,
    }));
    return { avg, withPhoto, recent, ratingDist };
  }, [safeSamples]);

  if (safeSamples.length === 0) return null;
  const { avg, withPhoto, recent, ratingDist } = stats;
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">샘플기록</div>
          <div className="card-sub">
            총 {safeSamples.length}개 · 사진 {withPhoto}개 · 평균 {avg.toFixed(1)}점
          </div>
        </div>
        <button className="link accent" onClick={() => router?.push?.('/note/sample')}>
          전체 →
        </button>
      </div>
      <div style={{ margin: '8px 0 12px' }}>
        {ratingDist
          .slice()
          .reverse()
          .map(({ rating, count }) => {
            const pct = safeSamples.length > 0 ? Math.round((count / safeSamples.length) * 100) : 0;
            return (
              <div key={rating} className="hist-bar-wrap" style={{ marginBottom: 4 }}>
                <span className="hist-label">{'★'.repeat(rating)}</span>
                <div
                  style={{
                    flex: 1,
                    background: 'var(--border)',
                    borderRadius: 4,
                    height: 8,
                    overflow: 'hidden',
                  }}
                >
                  <div className="hist-bar" style={{ width: pct + '%' }} />
                </div>
                <span className="hist-label" style={{ textAlign: 'right' }}>
                  {count}
                </span>
              </div>
            );
          })}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {recent.map((sample, index) => {
          const photo = asObjectArray(sample.photos).find(item => asDisplayText(item.data));
          const photoData = asDisplayText(photo?.data);
          const rating = Math.max(0, Math.min(5, Math.floor(asFiniteNumber(sample.rating, 0))));
          const href = sample.id == null ? null : `/note/sample/${sample.id}`;
          const title = asDisplayText(sample.title || sample.menuName, '제목 없음');
          const menuName = asDisplayText(sample.menuName);
          return (
            <div
              key={sample.id ?? index}
              className="widget-row"
              role="button"
              tabIndex={0}
              onClick={() => href && router?.push?.(href)}
              onKeyDown={event => event.key === 'Enter' && href && router?.push?.(href)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              {photoData ? (
                <img
                  src={photoData}
                  alt={`${menuName || title} 샘플 사진`}
                  style={{
                    width: 40,
                    height: 32,
                    objectFit: 'cover',
                    borderRadius: 6,
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 40,
                    height: 32,
                    borderRadius: 6,
                    background: 'var(--border)',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                >
                  📷
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  title={title}
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-1)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {title}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{menuName}</div>
              </div>
              {rating > 0 && (
                <span
                  style={{ fontSize: 11, color: 'var(--star)', flexShrink: 0, letterSpacing: 1 }}
                >
                  {'★'.repeat(rating)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
