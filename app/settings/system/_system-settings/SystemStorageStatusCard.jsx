'use client';
import { formatNumber } from '@/lib/format';
import { InfoCell, StorageUsageBar } from './primitives';

export function SystemStorageStatusCard({
  ready,
  stats,
  storageEst,
  totalStoreCount,
  totalRows,
  busy,
  onReload,
}) {
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>저장소 상태</h2>
      {!ready ? (
        <div style={{ color: 'var(--text-3)' }}>DB 초기화 중…</div>
      ) : (
        <>
          {storageEst && <StorageUsageBar usage={storageEst.usage} quota={storageEst.quota} />}
          <div
            style={{
              display: 'flex',
              gap: 32,
              marginBottom: 20,
              padding: '12px 0',
              borderBottom: '1px solid var(--border)',
              marginTop: storageEst ? 16 : 0,
            }}
          >
            <InfoCell label="전체 저장 행" value={`${formatNumber(totalRows)}건`} big />
            <InfoCell label="정의된 store 수" value={`${totalStoreCount}개`} big />
            <InfoCell
              label="데이터 있는 store"
              value={`${stats ? Object.values(stats).filter(n => n > 0).length : 0}개`}
              big
            />
          </div>
          {stats && Object.values(stats).some(n => n > 0) ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))',
                gap: 12,
              }}
            >
              {Object.entries(stats)
                .filter(([, n]) => n > 0)
                .map(([name, count]) => (
                  <div
                    key={name}
                    style={{
                      padding: 12,
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      background: 'var(--surface-2)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--text-3)',
                        fontFamily: 'monospace',
                        marginBottom: 4,
                      }}
                    >
                      {name}
                    </div>
                    <div className="num" style={{ fontSize: 16, fontWeight: 600 }}>
                      {formatNumber(count)}건
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div style={{ color: 'var(--text-3)', padding: '8px 0' }}>
              저장된 데이터가 없습니다.
            </div>
          )}
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn" onClick={onReload} disabled={busy}>
              새로고침
            </button>
          </div>
        </>
      )}
    </div>
  );
}
