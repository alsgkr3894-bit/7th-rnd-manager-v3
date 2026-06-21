// 시스템 설정 UI — primitives + 카드 3종으로 분리됨. 기존 import 경로 유지를 위한 배럴.
export {
  SettingsGroup,
  SettingsRow,
  Segmented,
  StaticValue,
  StatusValue,
  DangerConfirm,
  InfoCell,
  StorageUsageBar,
} from './_system-settings/primitives';
export { SystemAppInfoCard } from './_system-settings/SystemAppInfoCard';
export { SystemStorageStatusCard } from './_system-settings/SystemStorageStatusCard';
export { SystemDangerZoneCard } from './_system-settings/SystemDangerZoneCard';
