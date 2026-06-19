/**
 * 메뉴마스터 CSV 내보내기 — 수식 인젝션 방지 회귀 테스트
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const exportSrc = readFileSync(resolve('app/menu-master/menuMasterExport.js'), 'utf-8');
const downloadSrc = readFileSync(resolve('lib/download.js'), 'utf-8');

describe('메뉴마스터 CSV 내보내기 구조', () => {
  test('exportMenuMasterCsv가 downloadCsv를 경유한다 (수식 인젝션 방지 경로)', () => {
    expect(exportSrc).toContain('exportMenuMasterCsv');
    expect(exportSrc).toContain('downloadCsv');
    // 직접 rowsToCsv를 우회하는 수동 join이 없어야 한다
    expect(exportSrc).not.toContain(".map(r => r.map(v => '\"' +");
    expect(exportSrc).not.toContain('downloadCsvText');
  });

  test('makeFileNameWithBrand를 사용해 브랜드명이 포함된 파일명을 생성한다', () => {
    expect(exportSrc).toContain('makeFileNameWithBrand');
    expect(exportSrc).toContain("'메뉴마스터'");
    expect(exportSrc).toContain("'csv'");
  });

  test('rowsToCsv가 수식 트리거 문자를 접두 작은따옴표로 방어한다', () => {
    // =SUM, +수식, -수식, @참조, TAB 등
    expect(downloadSrc).toContain('isFormulaRisk');
    expect(downloadSrc).toContain('/^[=+\\-@\\t\\r]/');
    expect(downloadSrc).toContain("'${s}`");
  });
});
