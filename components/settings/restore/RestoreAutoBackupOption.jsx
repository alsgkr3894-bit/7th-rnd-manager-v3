import { Toggle } from '@/components/ui/Toggle';

export function RestoreAutoBackupOption({ autoBackup, onToggle }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 0',
        borderBottom: '1px solid var(--border)',
        marginBottom: 12,
      }}
    >
      <div>
        <div style={{ fontWeight: 600, fontSize: 13 }}>복원 직전 자동 백업</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
          복원 실행 직전에 현재 상태를 JSON으로 자동 다운로드합니다 (실수 시 되돌릴 수 있음)
        </div>
      </div>
      <Toggle value={autoBackup} onChange={onToggle} />
    </div>
  );
}
