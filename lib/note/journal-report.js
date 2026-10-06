/**
 * lib/note/journal-report.js — 연구일지 '오늘 내용 보고서' 본문 (순수)
 *
 * 2026-10-06부터 연구일지는 보고서 한 칸(testContent)만 쓴다. 예전 세 칸 시절 따로 적은 칸은
 * 소제목을 붙여 본문 아래에 이어 붙여 보여준다 — 작성 화면·웹 카드·PDF가 모두 이 함수를 써서,
 * 다시 저장하지 않은 옛 일지도 내용이 빠지지 않는다.
 *
 * 묶음은 예전 작성 화면과 같다: '테스트 결과' 칸 = tasteEval + improvements,
 * '다음 일정' 칸 = nextAction + materials (예전 일지는 materials에 일정 메모를 적었다).
 */

export const LEGACY_JOURNAL_SECTIONS = [
  ['테스트 결과', ['tasteEval', 'improvements']],
  ['다음 일정', ['nextAction', 'materials']],
];

/** 저장할 때 비우는 예전 보조 칸 */
export const LEGACY_JOURNAL_FIELDS = LEGACY_JOURNAL_SECTIONS.flatMap(([, keys]) => keys);

export function journalReportText(note) {
  const base = String(note?.testContent || '');
  const legacy = LEGACY_JOURNAL_SECTIONS.map(([label, keys]) => {
    const text = keys
      .map(key => String(note?.[key] || '').trim())
      .filter(Boolean)
      .join('\n');
    return text ? `[${label}]\n${text}` : '';
  }).filter(Boolean);
  if (legacy.length === 0) return base;
  return [base.trim(), ...legacy].filter(Boolean).join('\n\n');
}
