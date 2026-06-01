'use client';
import React from 'react';
import { sampleNamesText, RATING_COLOR } from '@/lib/sample';

/**
 * SampleListRow — 샘플기록 리스트 뷰의 행(<tr>).
 * 클릭 시 onClick(배치/비교/상세 분기는 상위에서 처리), 액션은 stopPropagation.
 */
export const SampleListRow = React.memo(function SampleListRow({ sample, onClick, onEdit, onCopy, onDelete }) {
  const rec = sample;
  const thumb = rec.photos?.[0]?.data;
  const names = sampleNamesText(rec);
  return (
    <tr onClick={onClick} style={{ cursor: 'pointer' }}>
      <td style={{ width: 48 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 6, overflow: 'hidden',
          background: 'var(--surface-2)', display: 'grid', placeItems: 'center',
        }}>
          {thumb
            ? <img src={thumb} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
            : <span style={{ fontSize: 16, opacity: 0.4 }}>📷</span>}
        </div>
      </td>
      <td style={{ fontWeight: 700 }}>{rec.title}</td>
      <td style={{ color: 'var(--text-2)' }}>{names || '—'}</td>
      <td>{rec.category ? <span className="chip" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>{rec.category}</span> : '—'}</td>
      <td style={{ color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{rec.testDate || '—'}</td>
      <td style={{ color: 'var(--text-3)' }}>{rec.company || '—'}</td>
      <td style={{ color: 'var(--text-3)' }}>{rec.tester || '—'}</td>
      <td style={{ whiteSpace: 'nowrap', color: rec.rating > 0 ? (RATING_COLOR[rec.rating] || 'var(--text-2)') : 'var(--text-4)' }}>
        {rec.rating > 0 ? '★'.repeat(rec.rating) : '—'}
      </td>
      <td style={{ textAlign: 'right', whiteSpace: 'nowrap', color: 'var(--text-2)' }}>
        {rec.price ? `${Number(rec.price).toLocaleString('ko-KR')}원${rec.priceTaxType === 'excl' ? '(별도)' : ''}` : '—'}
      </td>
      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
          <button className="btn sm" onClick={onEdit}>수정</button>
          <button className="btn sm" onClick={onCopy}>복사</button>
          <button className="btn sm" style={{ color: 'var(--negative)' }} onClick={onDelete}>삭제</button>
        </div>
      </td>
    </tr>
  );
});
