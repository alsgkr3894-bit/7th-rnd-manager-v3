'use client';
import { Icon } from '@/components/icons';
import { rowLabel } from '../_duplicate-diagnostics';

export function DuplicateGroupsBanner({ duplicateGroupCount, duplicateDiagnostics }) {
  if (duplicateGroupCount === 0) return null;
  return (
    <div
      className="info-banner"
      style={{
        marginBottom: 8,
        background: 'var(--warn-soft)',
        borderColor: 'var(--warn-soft)',
      }}
    >
      <div className="info-banner-ico" style={{ background: 'var(--warn)', color: '#fff' }}>
        <Icon.alert style={{ width: 16, height: 16 }} />
      </div>
      <div style={{ fontSize: 13, display: 'grid', gap: 6 }}>
        <div>
          <b>중복 가능성 {duplicateGroupCount}그룹</b> — 제품코드·제때코드·표시명 기준으로 확인이
          필요합니다.
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {duplicateDiagnostics.flatMap(check =>
            check.groups.slice(0, 3).map(group => (
              <span
                key={`${check.key}:${group.value}`}
                className="chip"
                title={group.rows.map(rowLabel).join(', ')}
              >
                {check.label} {group.value} · {group.rows.length}개
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
