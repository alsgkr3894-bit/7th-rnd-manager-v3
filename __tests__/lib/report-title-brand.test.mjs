/**
 * 원가표·판매량 보고서 제목에 선택한 브랜드명 (2026-09-29 주임님).
 * 예: "7번가피자 제품원가표 (단가 기준)", "7번가피자 2026년 6월 판매량 보고서".
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';
import { reportTitleWithBrand } from '../../lib/report/report-title.js';
import { makeReportPrintTitle } from '../../lib/report/print.js';

const src = f => readFileSync(resolve(f), 'utf8');

describe('reportTitleWithBrand', () => {
  test('브랜드명을 제목 앞에 붙인다', () => {
    expect(reportTitleWithBrand('7번가피자', '제품원가표 (단가 기준)')).toBe(
      '7번가피자 제품원가표 (단가 기준)'
    );
    expect(reportTitleWithBrand('이천밥쌤', '2026년 6월', '판매량 보고서')).toBe(
      '이천밥쌤 2026년 6월 판매량 보고서'
    );
  });

  test('브랜드를 아직 못 읽었을 때(첫 렌더)도 앞뒤 공백 없이 제목만 나온다', () => {
    expect(reportTitleWithBrand('', '레시피 출력')).toBe('레시피 출력');
    expect(reportTitleWithBrand(undefined, '2026년 6월', '판매량 보고서')).toBe(
      '2026년 6월 판매량 보고서'
    );
    expect(reportTitleWithBrand('7번가피자', null, '판매량 보고서')).toBe(
      '7번가피자 판매량 보고서'
    );
  });
});

describe('보고서 미리보기가 제목에 브랜드를 쓴다', () => {
  test('원가표·레시피 출력 제목', () => {
    const s = src('components/report/cost/CostReportPreview.jsx');
    expect(s).toContain('useActiveBrandName()');
    expect(s).toContain("reportTitleWithBrand(brandName, '제품원가표 (단가 기준)')");
    expect(s).toContain("reportTitleWithBrand(brandName, '레시피 출력')");
    // 위 작은 글씨(eyebrow)는 대표 회사명 그대로
    expect(s).toContain('{PARENT_COMPANY.name} 본사 · 원가관리');
  });

  test('판매량 보고서 제목', () => {
    const s = src('components/report/sales/SalesReportPreview.jsx');
    expect(s).toContain('useActiveBrandName()');
    expect(s).toContain("reportTitleWithBrand(brandName, periodLabel, '판매량 보고서')");
    expect(s).toContain('{PARENT_COMPANY.name} 본사 · R&amp;D팀');
  });
});

describe('파일명에는 브랜드가 한 번만 들어간다', () => {
  test('reportMeta.name에는 브랜드를 넣지 않는다 — makeReportPrintTitle이 이미 브랜드를 붙인다', () => {
    expect(
      makeReportPrintTitle(
        { period: '2026년 6월', name: '2026년 6월 판매량 보고서' },
        { brandName: '7번가피자', now: new Date('2026-06-08T00:00:00.000Z') }
      )
    ).toBe('7번가피자_2026년06월 판매량 보고서_20260608');
    expect(src('app/report/sales/page.jsx')).toContain('name: `${periodLabel} 판매량 보고서`');
  });
});
