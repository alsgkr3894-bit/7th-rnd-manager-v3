'use client';
import React from 'react';
import { sampleIngredientGroupName, sampleNamesText, RATING_COLOR } from '@/lib/sample';
import { formatTestRound } from '@/lib/note/evaluation';
import {
  asDisplayText,
  asFiniteNumber,
  asObjectArray,
  clampInteger,
  noop,
} from '@/lib/ui/prop-guards';

/**
 * SampleListRow — 식자재 이슈 및 테스트 /샘플기록 리스트 뷰의 행(<tr>).
 * 클릭 시 onClick(배치/비교/상세 분기는 상위에서 처리), 액션은 stopPropagation.
 */
export const SampleListRow = React.memo(function SampleListRow({
  sample = {},
  onClick,
  onEdit,
  onCopy,
  onNextRound,
  onDelete,
  canEdit = false,
}) {
  const rec = sample && typeof sample === 'object' ? sample : {};
  const photos = asObjectArray(rec.photos).filter(p => asDisplayText(p.data));
  const thumb = asDisplayText(photos[0]?.data);
  const names = sampleNamesText(rec);
  const ingredientGroupName = sampleIngredientGroupName(rec);
  const recordType = asDisplayText(rec.recordType || '샘플테스트');
  const title = asDisplayText(rec.title, '제목 없음');
  const category = asDisplayText(rec.category);
  const testDate = asDisplayText(rec.testDate);
  const company = asDisplayText(rec.company);
  const tester = asDisplayText(rec.tester);
  const click = typeof onClick === 'function' ? onClick : noop;
  const edit = typeof onEdit === 'function' ? onEdit : noop;
  const copy = typeof onCopy === 'function' ? onCopy : noop;
  const nextRound = typeof onNextRound === 'function' ? onNextRound : noop;
  const remove = typeof onDelete === 'function' ? onDelete : noop;
  const rating = clampInteger(rec.rating, { min: 0, max: 5, fallback: 0 });
  const price = asFiniteNumber(rec.price);
  const hasPrice = Number.isFinite(price) && price > 0;
  const roundLabel = formatTestRound(rec.testRound);
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
      <td>
        <div style={{ fontWeight: 700 }}>{title}</div>
        {(recordType || ingredientGroupName || roundLabel || rec.parentId != null) && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
            {recordType && <span className="chip">{recordType}</span>}
            {ingredientGroupName && <span className="chip">{ingredientGroupName}</span>}
            {roundLabel && <span className="chip">{roundLabel}</span>}
            {rec.parentId != null && <span className="chip">차수 연결</span>}
          </div>
        )}
      </td>
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
          <button className="btn sm" onClick={edit} disabled={!canEdit}>
            수정
          </button>
          <button className="btn sm" onClick={copy} disabled={!canEdit}>
            복사
          </button>
          <button className="btn sm" onClick={nextRound} disabled={!canEdit}>
            다음 차수
          </button>
          <button
            className="btn sm"
            style={{ color: 'var(--negative)' }}
            onClick={remove}
            disabled={!canEdit}
          >
            삭제
          </button>
        </div>
      </td>
    </tr>
  );
});
