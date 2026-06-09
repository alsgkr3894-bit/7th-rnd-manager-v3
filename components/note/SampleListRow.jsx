'use client';
import React from 'react';
import { sampleNamesText, RATING_COLOR } from '@/lib/sample';
import { asDisplayText, asFiniteNumber, asObjectArray, clampInteger } from '@/lib/ui/prop-guards';

const noop = () => {};

/**
 * SampleListRow — 샘플기록 리스트 뷰의 행(<tr>).
 * 클릭 시 onClick(배치/비교/상세 분기는 상위에서 처리), 액션은 stopPropagation.
 */
export const SampleListRow = React.memo(function SampleListRow({
  sample = {},
  onClick,
  onEdit,
  onCopy,
  onDelete,
}) {
  const rec = sample && typeof sample === 'object' ? sample : {};
  const photos = asObjectArray(rec.photos).filter(p => asDisplayText(p.data));
  const thumb = asDisplayText(photos[0]?.data);
  const names = sampleNamesText(rec);
  const title = asDisplayText(rec.title, '제목 없음');
  const category = asDisplayText(rec.category);
  const testDate = asDisplayText(rec.testDate);
  const company = asDisplayText(rec.company);
  const tester = asDisplayText(rec.tester);
  const click = typeof onClick === 'function' ? onClick : noop;
  const edit = typeof onEdit === 'function' ? onEdit : noop;
  const copy = typeof onCopy === 'function' ? onCopy : noop;
  const remove = typeof onDelete === 'function' ? onDelete : noop;
  const rating = clampInteger(rec.rating, { min: 0, max: 5, fallback: 0 });
  const price = asFiniteNumber(rec.price);
  const hasPrice = Number.isFinite(price) && price > 0;
  return (
    <tr onClick={click} style={{ cursor: 'pointer' }}>
      <td style={{ width: 48 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 6,
            overflow: 'hidden',
            background: 'var(--surface-2)',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          {thumb ? (
            <img
              src={thumb}
              alt=""
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ fontSize: 16, opacity: 0.4 }}>📷</span>
          )}
        </div>
      </td>
      <td style={{ fontWeight: 700 }}>{title}</td>
      <td style={{ color: 'var(--text-2)' }}>{names || '—'}</td>
      <td>
        {category ? (
          <span className="chip" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>
            {category}
          </span>
        ) : (
          '—'
        )}
      </td>
      <td style={{ color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{testDate || '—'}</td>
      <td style={{ color: 'var(--text-3)' }}>{company || '—'}</td>
      <td style={{ color: 'var(--text-3)' }}>{tester || '—'}</td>
      <td
        style={{
          whiteSpace: 'nowrap',
          color: rating > 0 ? RATING_COLOR[rating] || 'var(--text-2)' : 'var(--text-4)',
        }}
      >
        {rating > 0 ? '★'.repeat(Math.min(5, rating)) : '—'}
      </td>
      <td style={{ textAlign: 'right', whiteSpace: 'nowrap', color: 'var(--text-2)' }}>
        {hasPrice
          ? `${price.toLocaleString('ko-KR')}원${rec.priceTaxType === 'excl' ? '(별도)' : ''}`
          : '—'}
      </td>
      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
          <button className="btn sm" onClick={edit}>
            수정
          </button>
          <button className="btn sm" onClick={copy}>
            복사
          </button>
          <button className="btn sm" style={{ color: 'var(--negative)' }} onClick={remove}>
            삭제
          </button>
        </div>
      </td>
    </tr>
  );
});
