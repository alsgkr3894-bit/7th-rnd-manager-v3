'use client';
import { formatNumber } from '@/lib/format';
import { ModuleScopeList } from '@/components/settings/ModuleScopeList';
import { RestoreModuleChip } from './RestoreModuleChip';

export function RestoreScopePanel({
  parsed,
  scopes,
  toggleScope,
  setAllScopes,
  selectedKeys,
  unchangedSelectedStores,
  selectedRestoreStoreCount,
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
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>3. 복원 범위</h2>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
            선택한 모듈만 백업 시점으로 되돌립니다. 나머지는 현재 상태 유지.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn sm" onClick={() => setAllScopes(true)}>
            전체
          </button>
          <button className="btn sm" onClick={() => setAllScopes(false)}>
            해제
          </button>
        </div>
      </div>
      <ModuleScopeList
        scopes={scopes}
        onToggle={toggleScope}
        getCountLabel={(key, group) => {
          const count = group.stores.reduce(
            (sum, name) =>
              sum + (Array.isArray(parsed.stores?.[name]) ? parsed.stores[name].length : 0),
            0
          );
          return `백업 ${formatNumber(count)}건`;
        }}
      />

      <div
        style={{
          marginTop: 14,
          paddingTop: 12,
          borderTop: '1px solid var(--border)',
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, marginRight: 2 }}>
          선택:
        </span>
        {selectedKeys.length === 0 ? (
          <span style={{ fontSize: 12, color: 'var(--warn)', fontWeight: 600 }}>
            ⚠ 복원할 모듈을 선택해주세요
          </span>
        ) : (
          selectedKeys.map(key => (
            <RestoreModuleChip key={key} moduleKey={key} />
          ))
        )}
      </div>

      <div
        style={{
          marginTop: 10,
          padding: '10px 12px',
          borderRadius: 8,
          background: 'var(--surface-2)',
          fontSize: 12,
          color: 'var(--text-3)',
          lineHeight: 1.5,
        }}
      >
        <b style={{ color: 'var(--text-2)' }}>항상 포함:</b> 시스템 설정·메뉴마스터·보고서 등 공통
        데이터는 모듈 선택과 무관하게 복원됩니다.
      </div>

      {(parsed._failedStores?.length ?? 0) > 0 && (
        <div
          style={{
            marginTop: 8,
            padding: '10px 12px',
            borderRadius: 8,
            background: 'var(--warn-soft)',
            fontSize: 12,
            color: 'var(--warn)',
            lineHeight: 1.5,
          }}
        >
          <b>⚠ 백업 생성 오류:</b> 아래 store는 백업 당시 읽기에 실패하여 포함되지 않았습니다.
          이 파일은 불완전 백업이므로 복원 실행 전 별도 위험 승인이 필요합니다.{' '}
          <span style={{ color: 'var(--text-3)' }}>
            {parsed._failedStores
              .map(failed => failed.store)
              .slice(0, 5)
              .join(', ')}
            {parsed._failedStores.length > 5 ? ` 외 ${parsed._failedStores.length - 5}개` : ''}
          </span>
        </div>
      )}
      {unchangedSelectedStores.length > 0 && (
        <div
          style={{
            marginTop: 8,
            padding: '10px 12px',
            borderRadius: 8,
            background: 'var(--surface-2)',
            fontSize: 12,
            color: 'var(--text-2)',
            lineHeight: 1.5,
          }}
        >
          <b>백업 파일에 없는 store는 현재 상태를 유지합니다.</b>{' '}
          <span className="num" style={{ color: 'var(--text-3)' }}>
            {unchangedSelectedStores.slice(0, 5).join(', ')}
            {unchangedSelectedStores.length > 5
              ? ` 외 ${unchangedSelectedStores.length - 5}개`
              : ''}
          </span>
        </div>
      )}
      {selectedKeys.length > 0 && selectedRestoreStoreCount === 0 && (
        <div
          style={{
            marginTop: 10,
            padding: '10px 12px',
            borderRadius: 8,
            background: 'var(--warn-soft)',
            fontSize: 12,
            color: 'var(--warn)',
            fontWeight: 700,
          }}
        >
          선택한 범위와 백업 파일이 겹치지 않아 복원할 store가 없습니다.
        </div>
      )}
    </div>
  );
}
