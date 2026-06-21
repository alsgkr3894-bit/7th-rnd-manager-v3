'use client';
import { SettingTile } from '@/components/ui/SettingTile';
import { formatRelative } from '@/lib/format';

export function AccountSessionCard({ lastLogin, ipEntry, ipLoading, onRefreshIP }) {
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>세션 정보</h2>
      <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>
        현재 브라우저 세션 기준 마지막 로그인 시각과 접속 IP입니다. IP는 외부 공개 API(
        <span style={{ fontFamily: 'monospace' }}>api.ipify.org</span>)로 조회합니다.
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
          gap: 16,
        }}
      >
        <SettingTile
          variant="tile"
          label="마지막 로그인"
          value={lastLogin ? new Date(lastLogin).toLocaleString('ko-KR') : '기록 없음'}
          sub={lastLogin ? formatRelative(lastLogin) : '새 브라우저 세션이 시작되면 기록됩니다'}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SettingTile
            variant="tile"
            label="접속 IP"
            value={ipEntry ? ipEntry.ip : ipLoading ? '조회 중…' : '—'}
            sub={
              ipEntry
                ? `갱신: ${new Date(ipEntry.at).toLocaleString('ko-KR')}`
                : ipLoading
                  ? '잠시만 기다려 주세요'
                  : 'api.ipify.org 조회 — 버튼을 눌러 실행'
            }
            mono
          />
          {!ipLoading && (
            <button
              className="btn sm ghost"
              onClick={onRefreshIP}
              style={{ fontSize: 11, alignSelf: 'flex-start' }}
            >
              IP 조회
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
