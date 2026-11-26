'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/icons';
import { useRestoreAttention } from '@/hooks/useRestoreAttention';
import { acknowledgeRestoreJournal } from '@/lib/backup/restore-journal';
import { describeRestoreAttention } from '@/lib/backup/restore-attention-text';

const WRAP = {
  background: 'var(--negative-soft)',
  border: '1px solid color-mix(in oklab, var(--negative) 30%, transparent)',
  borderRadius: 8,
  fontSize: 13,
  color: 'var(--text-1)',
};

/**
 * 끝나지 않았거나 일부 실패한 복원 안내.
 * banner: 모든 업무 화면 상단 / card: 복원 화면의 자세한 안내와 확인 처리.
 */
export function RestoreJournalNotice({ variant = 'banner', canAcknowledge = false }) {
  const attention = useRestoreAttention();
  const [checked, setChecked] = useState(false);
  const text = describeRestoreAttention(attention);
  if (!text) return null;

  if (variant === 'banner') {
    return (
      <div
        className="no-print"
        role="alert"
        style={{
          ...WRAP,
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          flexWrap: 'wrap',
          margin: '12px 16px 0',
          padding: '10px 14px',
        }}
      >
        <Icon.alert style={{ width: 16, height: 16, color: 'var(--negative)', flexShrink: 0 }} />
        <span style={{ flex: '1 1 260px' }}>
          <b>{text.title}.</b> {text.message}
        </span>
        <Link className="btn sm primary" href="/settings/restore">
          복원 화면에서 확인
        </Link>
        <Link className="btn sm" href="/settings/system">
          시스템 설정
        </Link>
      </div>
    );
  }

  return (
    <div className="card" role="alert" style={{ ...WRAP, marginTop: 16, padding: '16px 18px' }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--negative)' }}>{text.title}</h2>
      <p style={{ margin: '6px 0 10px' }}>{text.message}</p>
      <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px' }}>
        {text.details.map(([label, value]) => (
          <div key={label} style={{ display: 'contents' }}>
            <dt style={{ color: 'var(--text-3)' }}>{label}</dt>
            <dd style={{ margin: 0, wordBreak: 'break-all' }}>{value}</dd>
          </div>
        ))}
      </dl>
      <ol style={{ margin: '12px 0', paddingLeft: 18, lineHeight: 1.7 }}>
        {text.steps.map(step => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={checked}
            onChange={event => setChecked(event.target.checked)}
            disabled={!canAcknowledge}
          />
          복구를 마쳤거나 데이터가 정상인 것을 확인했어요
        </label>
        <button
          type="button"
          className="btn sm"
          disabled={!canAcknowledge || !checked}
          onClick={() => {
            acknowledgeRestoreJournal();
            setChecked(false);
          }}
        >
          확인 완료
        </button>
        <Link className="btn sm" href="/settings/system">
          시스템 설정
        </Link>
      </div>
    </div>
  );
}
