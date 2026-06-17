/**
 * scripts/site-status-audit-utils.mjs — 순수 비교 로직 (파일시스템 접근 없음)
 *
 * docs/SITE_STATUS.md에 적힌 수치를 정규식으로 추출해, 코드에서 계산한 실제값과
 * 비교한다. 실제값 계산(파일시스템)은 site-status-audit.mjs(runner)가 담당한다.
 */

/**
 * 각 지표: doc 문구에서 기대값을 뽑는 정규식 + 캡처 그룹 순서대로의 metric key.
 * key는 computeActuals()가 반환하는 actuals 객체의 키와 일치해야 한다.
 */
export const METRICS = [
  { label: 'page.jsx 총 개수', pattern: /총 (\d+)개 page 파일/, keys: ['pageCount'] },
  {
    label: '실제 화면 / 리다이렉트 page',
    pattern: /실제 화면 (\d+)개 \+ 리다이렉트 (\d+)개/,
    keys: ['screenCount', 'redirectCount'],
  },
  {
    label: 'hooks 파일 수 / 라인 수',
    pattern: /총 ([\d,]+)개 파일\(\d+ \.js \+ \d+ \.jsx\), ([\d,]+)줄/,
    keys: ['hookFiles', 'hookLines'],
  },
  {
    label: 'useDBLoad 소비 파일 수',
    pattern: /소비 기준 (\d+)개 파일에서 사용/,
    keys: ['useDbLoadConsumers'],
  },
  {
    label: 'DB 버전 / store 수',
    pattern: /DB 버전 (\d+), 총 (\d+)개 store/,
    keys: ['dbVersion', 'storeCount'],
  },
  { label: 'globals.css @import 수', pattern: /총 (\d+)개 CSS 파일/, keys: ['cssImports'] },
  {
    label: 'Jest 테스트 파일 수(total/lib/hooks/scripts)',
    pattern: /Jest 단위 테스트 (\d+)개 파일\(lib (\d+), hooks (\d+), scripts (\d+)\)/,
    keys: ['testTotal', 'testLib', 'testHooks', 'testScripts'],
  },
];

/** "4,480" → 4480 */
export function toNumber(raw) {
  return Number(String(raw).replace(/,/g, ''));
}

/**
 * 문서 텍스트에서 기대값을 추출한다.
 * @returns {{ values: Record<string, number>, missing: string[] }}
 *   values: metric key → 기대 숫자, missing: 정규식이 매칭되지 않은 지표 라벨
 */
export function parseExpected(docText) {
  const values = {};
  const missing = [];
  for (const metric of METRICS) {
    const m = docText.match(metric.pattern);
    if (!m) {
      missing.push(metric.label);
      continue;
    }
    metric.keys.forEach((key, i) => {
      values[key] = toNumber(m[i + 1]);
    });
  }
  return { values, missing };
}

/**
 * 실제값 vs 문서값 비교.
 * @param {Record<string, number>} actuals
 * @param {string} docText
 * @returns {{ results: Array<{key,label,actual,expected,ok}>, missing: string[], allOk: boolean }}
 */
export function compareMetrics(actuals, docText) {
  const { values: expected, missing } = parseExpected(docText);
  const results = [];
  for (const metric of METRICS) {
    for (const key of metric.keys) {
      const actual = actuals[key];
      const exp = expected[key];
      results.push({
        key,
        label: metric.label,
        actual,
        expected: exp,
        ok: exp != null && actual === exp,
      });
    }
  }
  const allOk = missing.length === 0 && results.every(r => r.ok);
  return { results, missing, allOk };
}

/** 콘솔 리포트 문자열 생성 */
export function formatReport({ results, missing }) {
  const lines = [];
  for (const r of results) {
    const mark = r.ok ? '✅' : '❌';
    const exp = r.expected == null ? '(문서에서 못 찾음)' : r.expected;
    lines.push(`  ${mark} ${r.key.padEnd(20)} 코드=${r.actual}  문서=${exp}  [${r.label}]`);
  }
  if (missing.length) {
    lines.push('');
    lines.push(`  ⚠ 문서에서 패턴을 찾지 못한 지표: ${missing.join(', ')}`);
  }
  return lines.join('\n');
}
