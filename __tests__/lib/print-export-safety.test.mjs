/**
 * 출력·다운로드 파이프라인 보안 구조 테스트 (7단계)
 * - HTML 인쇄 경로: esc() 적용 확인
 * - CSV 경로: 수식 인젝션 방지 + downloadCsvText 미사용 확인
 * - 출력 실패 toast: 폴백 메시지 포함 확인
 * - 파일명: makeFileNameWithBrand 사용 확인
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function src(path) {
  return readFileSync(resolve(path), 'utf-8');
}

// ── HTML 인쇄 빌더 escaping ───────────────────────────────────────────────────

describe('인쇄 HTML 빌더 — esc() 적용 여부', () => {
  test('원가 사용량 인쇄 빌더가 escaping 함수를 로컬에 정의한다', () => {
    const s = src('lib/cost/usage-print.js');
    expect(s).toMatch(/\.replace\(\/&\/g,\s*'&amp;'\)/);
    expect(s).toMatch(/\.replace\(\/<\/g,\s*'&lt;'\)/);
  });

  test('원산지 인쇄 빌더가 escaping 함수를 로컬에 정의한다', () => {
    const s = src('lib/nutrition/origin/print.js');
    expect(s).toMatch(/\.replace\(\/&\/g,\s*'&amp;'\)/);
    expect(s).toMatch(/\.replace\(\/<\/g,\s*'&lt;'\)/);
  });

  test('영양성분표 인쇄 빌더가 escaping 함수를 로컬에 정의한다', () => {
    const s = src('lib/nutrition/label/print.js');
    expect(s).toMatch(/\.replace\(\/&\/g,\s*'&amp;'\)/);
    expect(s).toMatch(/\.replace\(\/<\/g,\s*'&lt;'\)/);
  });

  test('식자재 테이블 인쇄 빌더가 formatters의 esc()를 import해 사용한다', () => {
    const s = src('lib/ingredient/manage-print/table-report.js');
    expect(s).toContain('esc,');
    // 실제 사용: esc(row?....)
    expect(s).toMatch(/esc\(/);
  });

  test('식자재 사진 인쇄 빌더가 formatters의 esc()를 import해 사용한다', () => {
    const s = src('lib/ingredient/manage-print/photo-report.js');
    expect(s).toContain('esc,');
    expect(s).toMatch(/esc\(/);
  });
});

// ── CSV 수식 인젝션 방지 ──────────────────────────────────────────────────────

describe('CSV 수식 인젝션 방지 (rowsToCsv)', () => {
  test('rowsToCsv가 수식 트리거 문자(= + - @ tab CR)로 시작하는 셀을 살균한다', () => {
    const s = src('lib/download.js');
    // 작은따옴표 접두로 살균하는 로직 존재 여부
    expect(s).toContain('isFormulaRisk');
    expect(s).toMatch(/\[=\+\\-@\\t\\r\]/);
  });

  test('downloadCsvText가 lib/download.js에만 선언되고 다른 export 파일에서 직접 호출되지 않는다', () => {
    const exportFiles = [
      'lib/cost/margin/export.js',
      'lib/sales/export-xlsx.js',
      'lib/report/export-cost-xlsx.js',
      'lib/nutrition/origin/export.js',
      'lib/nutrition/label/export.js',
      'app/menu-master/menuMasterExport.js',
      'app/nutrition/allergen/useAllergenPageData.js',
    ];
    for (const f of exportFiles) {
      const content = src(f);
      expect(content).not.toContain('downloadCsvText');
    }
  });
});

// ── 출력 실패 toast 폴백 패턴 ────────────────────────────────────────────────

describe('출력 실패 toast — 폴백 메시지 포함', () => {
  test('_ReportPreviewModal handlePrint 실패 toast가 라벨+폴백 패턴이다', () => {
    const s = src('components/report/_ReportPreviewModal.jsx');
    expect(s).toContain("'PDF 출력 실패: '");
    expect(s).toContain("'알 수 없는 오류'");
  });

  test('NutritionLabelResult handleExcel 실패 toast가 폴백을 포함한다', () => {
    const s = src('app/nutrition/export/NutritionLabelResult.jsx');
    // e?.message || '알 수 없는 오류' 패턴
    expect(s).toMatch(/e\?\.message\s*\|\|\s*'알 수 없는 오류'/);
  });

  test('원가계산 보고서 엑셀 내보내기 실패 toast가 폴백을 포함한다', () => {
    const s = src('app/report/cost/page.jsx');
    expect(s).toMatch(/err\?\.message\s*\|\|\s*'알 수 없는 오류'/);
  });
});

// ── 파일명 규칙 ──────────────────────────────────────────────────────────────

describe('다운로드 파일명 — makeFileNameWithBrand 사용', () => {
  test('원가마진표 XLSX 파일명이 makeFileNameWithBrand로 생성된다', () => {
    const s = src('lib/cost/margin/export.js');
    expect(s).toContain('makeFileNameWithBrand');
  });

  test('메뉴마스터 CSV 파일명이 makeFileNameWithBrand로 생성된다', () => {
    const s = src('app/menu-master/menuMasterExport.js');
    expect(s).toContain('makeFileNameWithBrand');
  });

  test('알레르기 매트릭스 CSV 파일명이 makeFileNameWithBrand로 생성된다', () => {
    const s = src('app/nutrition/allergen/useAllergenPageData.js');
    expect(s).toContain('makeFileNameWithBrand');
  });

  test('원산지 XLSX 파일명이 makeFileNameWithBrand로 생성된다', () => {
    const s = src('lib/nutrition/origin/export.js');
    expect(s).toContain('makeFileNameWithBrand');
  });
});
