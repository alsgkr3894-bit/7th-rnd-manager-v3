'use client';
import { Icon } from '@/components/icons';
import { SAMPLE_RECORD_LABEL } from '@/lib/sample/constants';
import { S_ALERT_ICON, S_ALERT_WRAP } from './backupPanelShared';

export function BackupBrandBanner({ activeBrand }) {
  if (!activeBrand || activeBrand.id === 'main')
    return <div style={{ minHeight: 44, marginTop: 12 }} />;
  return (
    <div style={{ minHeight: 44, marginTop: 12 }}>
      <div style={S_ALERT_WRAP}>
        <Icon.alert style={S_ALERT_ICON} />
        <span style={{ fontSize: 13 }}>
          <b>현재 브랜드: {activeBrand.name}</b>
          <span style={{ color: 'var(--warn)', fontWeight: 700 }}>
            {' '}
            — 개발노트·{SAMPLE_RECORD_LABEL}은 7번가피자 DB에 저장됩니다. 노트를 백업하려면
            7번가피자로 전환 후 백업하세요.
          </span>
        </span>
      </div>
    </div>
  );
}

export function BackupReminderBanner({ backupReminder }) {
  if (!backupReminder?.stale) return null;
  return (
    <div style={{ ...S_ALERT_WRAP, marginTop: 12 }}>
      <Icon.alert style={S_ALERT_ICON} />
      <span style={{ fontSize: 13 }}>
        {backupReminder.never ? (
          <>
            <b>아직 백업하지 않았어요.</b> 데이터를 정기적으로 백업해 두세요.
          </>
        ) : (
          <>
            <b>마지막 백업 후 {backupReminder.daysSince}일이 지났어요.</b> 최신 데이터를 백업해
            두세요.
          </>
        )}
      </span>
    </div>
  );
}
