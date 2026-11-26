/**
 * lib/backup/restore-attention-text.js — 중단·부분 실패한 복원 안내 문구 (순수)
 */

const GROUP_LABELS = {
  brandScopedStores: '브랜드 데이터',
  sharedStores: '공용 데이터(노트·샘플 등)',
};
const groupLabel = name => GROUP_LABELS[name] || name;

const TITLES = {
  running: '데이터 복원이 끝나지 않았어요',
  running_group: '데이터 복원이 끝나지 않았어요',
  failed_partial: '데이터 복원이 일부만 적용됐어요',
  completed_with_errors: '데이터 복원 중 오류가 있었어요',
};

const MESSAGES = {
  running:
    '복원 도중 창이 닫히거나 중단됐을 수 있어요. 다른 탭에서 복원 중이라면 끝날 때까지 기다려 주세요.',
  running_group:
    '복원 도중 창이 닫히거나 중단됐을 수 있어요. 다른 탭에서 복원 중이라면 끝날 때까지 기다려 주세요.',
  failed_partial: '데이터가 서로 맞지 않을 수 있어요. 편집하기 전에 복구해 주세요.',
  completed_with_errors: '일부 항목이 복원되지 않았을 수 있어요. 편집하기 전에 확인해 주세요.',
};

export function describeRestoreAttention(attention) {
  if (!attention) return null;
  const applied = (attention.appliedGroups || []).map(group => groupLabel(group.name));
  const details = [
    attention.fileName && ['복원한 파일', attention.fileName],
    attention.safetyBackupFileName && ['복원 직전 자동 백업', attention.safetyBackupFileName],
    ['적용된 부분', applied.join(', ') || '확인된 것 없음'],
    attention.failedGroup && ['실패한 부분', groupLabel(attention.failedGroup)],
  ].filter(Boolean);
  return {
    title: TITLES[attention.status] || '데이터 복원을 확인해 주세요',
    message: MESSAGES[attention.status] || '복원 결과를 확인해 주세요.',
    details,
    steps: [
      attention.safetyBackupFileName
        ? '다운로드 폴더에서 복원 직전 자동 백업 파일이 있는지 확인합니다.'
        : '복원하려던 백업 파일이나 최근 백업 파일을 준비합니다.',
      '필요하면 시스템 설정의 "DB 완전 재생성"을 실행합니다.',
      '백업 파일을 다시 복원합니다.',
      '식자재·메뉴·레시피를 열어 확인한 뒤 아래에서 확인 완료를 누릅니다.',
    ],
  };
}
