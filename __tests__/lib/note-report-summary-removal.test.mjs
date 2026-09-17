import { readdirSync, readFileSync } from 'fs';
import { resolve } from 'path';

function source(path) {
  return readFileSync(resolve(path), 'utf8');
}

describe('menu note report summary removal', () => {
  test('user-facing note surfaces do not render the legacy report summary field', () => {
    const form = source('app/note/_NoteFormBody.jsx');
    const detailFields = source('app/note/_NoteDetailFields.jsx');
    const detailModal = source('app/note/_NoteDetailModal.jsx');
    const noteCard = source('app/note/_NoteCard.jsx');
    const ideaGroupCard = source('app/note/_NoteIdeaGroupCard.jsx');
    const kanbanCard = source('components/note/KanbanCard.jsx');
    // report-print.js는 재수출 허브이므로 실제 구현 파일(report-print/*.js)까지 함께 검사한다
    const reportPrintDir = 'lib/note/report-print';
    const reportPrint = [
      source('lib/note/report-print.js'),
      ...readdirSync(resolve(reportPrintDir))
        .filter(file => file.endsWith('.js'))
        .map(file => source(`${reportPrintDir}/${file}`)),
    ].join('\n');

    expect(form).not.toContain('NoteReportSummaryCard');
    expect(form).not.toContain('generateNoteReportText');
    expect(detailFields).not.toContain('보고용 요약');
    expect(detailFields).not.toContain('reportSummary');
    expect(detailModal).not.toContain('보고용 요약');
    expect(detailModal).not.toContain('reportSummary');
    expect(noteCard).not.toContain("['요약', asText(note.reportSummary)]");
    expect(ideaGroupCard).not.toContain('note.reportSummary');
    expect(kanbanCard).not.toContain('note.reportSummary');
    expect(reportPrint).not.toContain('보고용 요약');
    expect(reportPrint).not.toContain('report-summary');
  });
});
