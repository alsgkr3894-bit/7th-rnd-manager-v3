/**
 * scripts/workflow-qa-utils.mjs — 업무 흐름 E2E QA의 순수 헬퍼 (브라우저/IO 없음, 단위 테스트 가능)
 */

/** 시나리오의 모든 스텝이 통과했는지 */
export function scenarioPassed(steps) {
  const list = Array.isArray(steps) ? steps : [];
  return list.length > 0 && list.every(s => s?.ok === true);
}

/** 시나리오 배열 요약 { passed, total } */
export function summarizeScenarios(scenarios) {
  const list = Array.isArray(scenarios) ? scenarios : [];
  const passed = list.filter(s => scenarioPassed(s?.steps)).length;
  return { passed, total: list.length };
}

/** 첫 실패 스텝(없으면 null) — 어디서 깨졌는지 보고용 */
export function firstFailedStep(steps) {
  const list = Array.isArray(steps) ? steps : [];
  return list.find(s => s && s.ok !== true) || null;
}

/** 다운로드한 백업 파일이 v3 백업 형태인지 (stores가 비-배열 객체) */
export function isValidBackupShape(obj) {
  return (
    !!obj &&
    typeof obj === 'object' &&
    !Array.isArray(obj) &&
    !!obj.stores &&
    typeof obj.stores === 'object' &&
    !Array.isArray(obj.stores)
  );
}

/** 스텝 한 줄 출력 문자열 */
export function formatStepLine(step) {
  const mark = step?.ok ? '✓' : '✗';
  const label = String(step?.label ?? '');
  const detail = step?.ok ? '' : ` — ${step?.error || '실패'}`;
  return `    ${mark} ${label}${detail}`;
}
