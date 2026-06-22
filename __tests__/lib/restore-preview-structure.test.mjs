import { readFileSync } from 'fs';
import { resolve } from 'path';

const previewSource = readFileSync(
  resolve('components/settings/restore/RestorePreview.jsx'),
  'utf8'
);
const summarySource = readFileSync(
  resolve('components/settings/restore/RestorePreviewSummary.jsx'),
  'utf8'
);
const scopeSource = readFileSync(
  resolve('components/settings/restore/RestoreScopePanel.jsx'),
  'utf8'
);
const impactSource = readFileSync(
  resolve('components/settings/restore/RestoreImpactPanel.jsx'),
  'utf8'
);

describe('restore preview structure', () => {
  test('RestorePreview delegates long preview sections to focused panels', () => {
    expect(previewSource).toContain('<RestorePreviewSummary');
    expect(previewSource).toContain('<RestoreScopePanel');
    expect(previewSource).toContain('<RestoreImpactPanel');
    expect(previewSource).toContain('backupSourceMetadataOf(parsed)');
    expect(previewSource).toContain('isBackupSourceMismatch(parsed');
    expect(previewSource).toContain('localStorageSummary');
    expect(previewSource).not.toContain('백업 파일 미리보기</h2>');
    expect(previewSource).not.toContain('<ModuleScopeList');
    expect(previewSource).not.toContain('선택한 모듈의 현재 상태와 백업 시점 비교');
  });

  test('restore preview panels own their section UI', () => {
    expect(summarySource).toContain('export function RestorePreviewSummary');
    expect(summarySource).toContain('백업 파일 미리보기');
    expect(summarySource).toContain('복원 저장 위치');
    expect(summarySource).toContain('설정값(localStorage) 섹션');
    expect(scopeSource).toContain('export function RestoreScopePanel');
    expect(scopeSource).toContain('<ModuleScopeList');
    expect(scopeSource).toContain('별도 위험 승인이 필요합니다');
    expect(impactSource).toContain('export function RestoreImpactPanel');
    expect(impactSource).toContain('예상 변경 사항');
    expect(impactSource).toContain('전체 삭제');
  });
});
