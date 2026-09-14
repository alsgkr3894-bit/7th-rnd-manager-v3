'use client';
import { ModuleScopeList } from '@/components/settings/ModuleScopeList';
import { formatNumber } from '@/lib/format';

export function BackupScopeCard({
  ready,
  stats,
  scopes,
  onToggle,
  onSelectAll,
  onClearAll,
  selectedKeys,
}) {
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>백업 범위</h2>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
            포함할 모듈을 선택하세요. 공통 설정·업로드 로그는 항상 포함됩니다.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn sm" onClick={onSelectAll} disabled={!ready}>
            전체 선택
          </button>
          <button className="btn sm" onClick={onClearAll} disabled={!ready}>
            모두 해제
          </button>
        </div>
      </div>

      <ModuleScopeList
        scopes={scopes}
        onToggle={onToggle}
        disabled={!ready}
        getCountLabel={(key, g) => {
          const count = stats ? g.stores.reduce((s, n) => s + (stats[n] || 0), 0) : 0;
          return `${formatNumber(count)}건`;
        }}
      />
    </div>
  );
}
