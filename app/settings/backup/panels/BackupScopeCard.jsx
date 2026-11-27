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
          <p style={{ fontSize: 12, color: 'var(--warn)', marginTop: 4, fontWeight: 700 }}>
            {scopes?.rnd
              ? '외부 사이트 비밀번호와 법인카드 내역이 암호화 없이 파일에 담깁니다. 파일을 안전한 곳에 보관해 주세요.'
              : '로그인 정보·법인카드(RND 업무)는 직접 켜야 담깁니다. 켜지 않으면 이 데이터는 어떤 백업에도 들어가지 않습니다.'}
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
