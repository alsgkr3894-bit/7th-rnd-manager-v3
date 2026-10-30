import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { escapeHtml } from '../../lib/print/escape-html.js';

// 2026-10-30 원가 흐름 점검(보안): 인쇄 창은 앱과 같은 출처라 스크립트가 들어가면 저장 데이터가 열린다.
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('escapeHtml', () => {
  test('& < > " \' 다섯 문자를 모두 바꾼다', () => {
    expect(escapeHtml(`<img src=x onerror="alert('x')">&`)).toBe(
      '&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;&amp;'
    );
  });

  test('&가 먼저 바뀌어 이중 변환되지 않고, 비어 있는 값은 빈 문자열', () => {
    expect(escapeHtml('&lt;')).toBe('&amp;lt;');
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml(0)).toBe('0');
  });

  test('작은따옴표 속성값으로도 빠져나가지 못한다', () => {
    const html = `<td title='${escapeHtml("x' onmouseover='alert(1)")}'>ok</td>`;
    expect(html).toBe(`<td title='x&#39; onmouseover=&#39;alert(1)'>ok</td>`);
  });
});

describe('출력 빌더 8곳이 모두 같은 helper를 쓴다', () => {
  const files = [
    'lib/cost/margin/export-format.js',
    'lib/cost/usage-print.js',
    'lib/ingredient/manage-print/formatters.js',
    'lib/note/journal-print.js',
    'lib/note/report-print/format.js',
    'lib/nutrition/label/print.js',
    'lib/nutrition/origin/print.js',
    'lib/sample/report-print.js',
  ];
  test.each(files)('%s', file => {
    const source = read(file);
    expect(source).toContain("from '@/lib/print/escape-html'");
    expect(source).toMatch(/esc = escapeHtml/);
    // 예전처럼 helper를 따로 만들지 않는다
    expect(source).not.toMatch(/\.replace\(\/&\/g,\s*'&amp;'\)/);
  });
});
