'use client';
import { Icon } from '@/components/icons';
import { Stars } from './_Stars';
import { sampleNamesText } from '@/lib/sample';
import { useModalShell } from '@/hooks/useModalShell';
import { asDisplayText, asFiniteNumber, asObjectArray, clampInteger } from '@/lib/ui/prop-guards';

function getSamplePhoto(sample) {
  const photos = asObjectArray(sample?.photos).filter(p => asDisplayText(p.data));
  return asDisplayText(photos[0]?.data);
}

export function CompareModal({ samples, onClose }) {
  const { containerRef, isClosing, close } = useModalShell(onClose);
  const safeSamples = asObjectArray(samples);
  const columnCount = Math.max(safeSamples.length, 1);

  const maxRating = Math.max(
    0,
    ...safeSamples.map(s => clampInteger(s.rating, { min: 0, max: 5, fallback: 0 }))
  );

  const fields = [
    { label: '샘플명', get: s => sampleNamesText(s) },
    { label: '카테고리', key: 'category' },
    { label: '업체명', key: 'company' },
    {
      label: '단가',
      get: s => {
        const price = asFiniteNumber(s.price);
        return price != null
          ? `${price.toLocaleString('ko-KR')}원${s.priceTaxType === 'excl' ? '(별도)' : ''}`
          : '';
      },
    },
    { label: '별점', key: 'rating', render: v => (v > 0 ? <Stars value={v} /> : '-') },
    { label: '테스트 내용', key: 'description' },
    { label: '평가 / 결과', key: 'result' },
    { label: '개선사항', key: 'improvements' },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 400,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        animation: 'fade 150ms ease',
      }}
    >
      <div
        ref={containerRef}
        className={'modal-anim' + (isClosing ? ' modal-exit' : '')}
        style={{
          background: 'var(--surface)',
          borderRadius: 20,
          overflow: 'hidden',
          width: '100%',
          maxWidth: 960,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-1)' }}>
            샘플 비교 ({safeSamples.length}개)
          </div>
          <button
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-3)',
              padding: 4,
            }}
            onClick={close}
            aria-label="비교 닫기"
          >
            <Icon.close style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 20px' }}>
          {safeSamples.length === 0 ? (
            <div
              style={{
                padding: '28px 0',
                textAlign: 'center',
                color: 'var(--text-3)',
                fontSize: 13,
              }}
            >
              비교할 샘플이 없습니다.
            </div>
          ) : (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                {safeSamples.map((s, idx) => {
                  const title = asDisplayText(s.title, '제목 없음');
                  const photo = getSamplePhoto(s);

                  return (
                    <div
                      key={asDisplayText(s.id, `sample-${idx}`)}
                      className="compare-col"
                      style={{ textAlign: 'center' }}
                    >
                      {photo ? (
                        <img
                          src={photo}
                          alt=""
                          style={{
                            width: '100%',
                            maxHeight: 140,
                            objectFit: 'cover',
                            borderRadius: 10,
                            marginBottom: 8,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '100%',
                            height: 100,
                            background: 'var(--surface-2)',
                            borderRadius: 10,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 28,
                            marginBottom: 8,
                          }}
                        >
                          📷
                        </div>
                      )}
                      <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-1)' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: 'var(--accent)',
                            color: '#fff',
                            fontSize: 12,
                            fontWeight: 800,
                            lineHeight: '22px',
                            textAlign: 'center',
                            marginRight: 6,
                          }}
                        >
                          {idx + 1}
                        </span>
                        {title}
                      </div>
                    </div>
                  );
                })}
              </div>

              {fields.map(({ label, key, render, get }) => (
                <div
                  key={label}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `160px repeat(${columnCount}, 1fr)`,
                    gap: 8,
                    marginBottom: 8,
                    alignItems: 'start',
                  }}
                >
                  <div
                    className="compare-field-label"
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--text-3)',
                      paddingTop: 4,
                      paddingRight: 8,
                    }}
                  >
                    {label}
                  </div>
                  {safeSamples.map((s, idx) => {
                    const val = get ? get(s) : s[key];
                    const rating =
                      key === 'rating' ? clampInteger(val, { min: 0, max: 5, fallback: 0 }) : 0;
                    const isHighlight = key === 'rating' && rating === maxRating && maxRating > 0;
                    return (
                      <div
                        key={asDisplayText(s.id, `sample-${idx}`)}
                        className={'compare-field-val' + (isHighlight ? ' highlight' : '')}
                        style={{
                          fontSize: 13,
                          color: 'var(--text-1)',
                          lineHeight: 1.6,
                          background: 'var(--surface-2)',
                          borderRadius: 8,
                          padding: '6px 10px',
                          border: isHighlight
                            ? '1.5px solid var(--accent)'
                            : '1px solid var(--border)',
                        }}
                      >
                        {render
                          ? render(rating)
                          : asDisplayText(val) || <span style={{ color: 'var(--text-3)' }}>-</span>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
