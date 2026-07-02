import { noteDisplayTitle } from './display';
import { formatNoteRating, formatTestRound, NOTE_EVALUATION_FIELDS } from './evaluation';

/**
 * 메뉴개발노트 보고용 텍스트를 생성하는 순수 함수.
 * 클립보드 복사·토스트 등의 부수효과는 호출부에서 처리한다.
 *
 * @param {object} form - NoteFormBody의 form 상태
 * @returns {string}
 */
export function generateNoteReportText(form) {
  const title = noteDisplayTitle(form, '—');
  const ratings = NOTE_EVALUATION_FIELDS.map(
    item => `${item.label} ${formatNoteRating(form?.[item.key]) || '-'}`
  ).join('  ');
  return `[메뉴개발노트 보고용]
제목: ${title}
메뉴 코드: ${form.menuCode || '-'}
개발 구분: ${form.category}  유형: ${form.noteType}  상태: ${form.status}
테스트 날짜: ${form.testDate || '—'}
테스트 차수: ${formatTestRound(form.testRound) || '—'}
항목별 평가: ${ratings}
테스트 내용:
${form.testContent || '—'}
맛 평가: ${form.tasteEval || '—'}
상무님 평가: ${form.managerEval || '—'}
이슈: ${form.issues || '—'}
다음 액션: ${form.nextAction || '—'}
보고용 요약:
${form.reportSummary || '—'}`;
}
