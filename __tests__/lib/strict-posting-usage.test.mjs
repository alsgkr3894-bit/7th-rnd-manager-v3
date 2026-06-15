import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const costReportSource = readFileSync(resolve('app/report/cost/page.jsx'), 'utf8');
const reportShellSource = readFileSync(resolve('components/report/ReportBuilderShell.jsx'), 'utf8');

describe('strict posting usage guards', () => {
  test('원가 보고서 생성은 strictPosting 설정과 단가누락 진단을 사용한다', () => {
    expect(costReportSource).toContain("useSettingValue('strictPosting')");
    expect(costReportSource).toContain('collectStrictPostingIssues(recipeRows)');
    expect(costReportSource).toContain('onBeforeGenerate={guardStrictPosting}');
    expect(costReportSource).toContain('buildStrictPostingMessage(strictPostingIssues)');
  });

  test('보고서 shell은 생성 직전 가드가 false를 반환하면 출력과 엑셀 생성을 중단한다', () => {
    expect(reportShellSource).toContain('onBeforeGenerate');
    expect(reportShellSource).toContain('handleBeforeGenerate');
    expect(reportShellSource).toContain('if (proceed === false) return');
    expect(reportShellSource.indexOf('if (proceed === false) return')).toBeLessThan(
      reportShellSource.indexOf('if (safeDocFormat.pdf) triggerPrint(reportMeta)')
    );
  });
});
