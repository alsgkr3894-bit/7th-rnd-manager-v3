import { describe, expect, test } from '@jest/globals';
import { toNumber, parseExpected, compareMetrics } from '../../scripts/site-status-audit-utils.mjs';

// 모든 METRICS 패턴을 담은 합성 문서 (실제 SITE_STATUS.md 문구 형식과 동일)
const DOC = `
총 56개 page 파일 (실제 화면 44개 + 리다이렉트 12개). 섹션 구성.
총 59개 파일(58 .js + 1 .jsx), 4,480줄. 분류됨.
소비 기준 24개 파일에서 사용. 나머지 설명.
DB 버전 23, 총 43개 store. 멀티브랜드.
총 22개 CSS 파일을 @import로 조합.
Jest 단위 테스트 265개 파일(lib 240, hooks 20, scripts 5), QA 명령.
`;

const MATCHING_ACTUALS = {
  pageCount: 56,
  screenCount: 44,
  redirectCount: 12,
  hookFiles: 59,
  hookLines: 4480,
  useDbLoadConsumers: 24,
  dbVersion: 23,
  storeCount: 43,
  cssImports: 22,
  testTotal: 265,
  testLib: 240,
  testHooks: 20,
  testScripts: 5,
};

describe('site-status-audit-utils', () => {
  test('toNumber는 콤마를 제거하고 숫자로 변환한다', () => {
    expect(toNumber('4,480')).toBe(4480);
    expect(toNumber('56')).toBe(56);
  });

  test('parseExpected는 문서에서 모든 지표를 추출한다', () => {
    const { values, missing } = parseExpected(DOC);
    expect(missing).toEqual([]);
    expect(values.pageCount).toBe(56);
    expect(values.hookLines).toBe(4480);
    expect(values.storeCount).toBe(43);
    expect(values.testTotal).toBe(265);
    expect(values.testScripts).toBe(5);
  });

  test('일치하는 실제값이면 allOk=true', () => {
    const { allOk, results, missing } = compareMetrics(MATCHING_ACTUALS, DOC);
    expect(missing).toEqual([]);
    expect(allOk).toBe(true);
    expect(results.every(r => r.ok)).toBe(true);
  });

  test('한 지표가 어긋나면 해당 result.ok=false, allOk=false', () => {
    const drifted = { ...MATCHING_ACTUALS, hookLines: 4500 };
    const { allOk, results } = compareMetrics(drifted, DOC);
    expect(allOk).toBe(false);
    const hookLines = results.find(r => r.key === 'hookLines');
    expect(hookLines.ok).toBe(false);
    expect(hookLines.actual).toBe(4500);
    expect(hookLines.expected).toBe(4480);
    // 나머지는 정상
    expect(results.find(r => r.key === 'pageCount').ok).toBe(true);
  });

  test('문서에 패턴이 없으면 missing에 보고되고 allOk=false', () => {
    const partialDoc = '총 56개 page 파일 (실제 화면 44개 + 리다이렉트 12개).';
    const { allOk, missing } = compareMetrics(MATCHING_ACTUALS, partialDoc);
    expect(allOk).toBe(false);
    expect(missing.length).toBeGreaterThan(0);
  });
});
