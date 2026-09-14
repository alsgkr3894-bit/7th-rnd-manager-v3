'use client';
import { SettingTile } from '@/components/ui/SettingTile';
import { formatNumber, formatRelative } from '@/lib/format';
import { MODULE_GROUPS, MODULE_KEYS } from '@/lib/db';

export function BackupSummaryTiles({ lastBackupAt, selectedKeys, selectedRows, ready }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
        gap: 16,
        marginTop: 8,
      }}
    >
      <SettingTile
        label="마지막 백업"
        value={lastBackupAt ? formatRelative(lastBackupAt) : '없음'}
        sub={
          lastBackupAt ? new Date(lastBackupAt).toLocaleString('ko-KR') : '아직 백업하지 않았습니다'
        }
      />
      <SettingTile
        label="선택된 모듈"
        value={`${selectedKeys.length} / ${MODULE_KEYS.length}`}
        sub={selectedKeys.map(k => MODULE_GROUPS[k].label).join(' · ') || '선택된 항목 없음'}
      />
      <SettingTile
        label="선택된 데이터"
        value={`${formatNumber(selectedRows)}건`}
        sub={ready ? '백업 파일 예상 크기는 데이터에 따라 다릅니다' : 'DB 초기화 중…'}
        num
      />
    </div>
  );
}
