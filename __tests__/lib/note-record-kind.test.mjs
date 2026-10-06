import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import {
  isUnifiedMarketResearchRecord,
  isUnifiedSampleRecord,
} from '../../lib/note/record-kind.js';
import { noteMetaPairs, noteTagList } from '../../lib/note/display.js';

// 2026-10-06: 샘플·시장조사 판별과 카드 메타·태그 처리가 4곳에 복사돼 있던 것을 한곳으로 모았다.
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('통합 기록 판별(lib/note/record-kind.js)', () => {
  test('_recordKind 또는 id 접두사로 판별', () => {
    expect(isUnifiedSampleRecord({ _recordKind: 'sample' })).toBe(true);
    expect(isUnifiedSampleRecord({ id: 'sample:3' })).toBe(true);
    expect(isUnifiedSampleRecord('sample:3')).toBe(true);
    expect(isUnifiedSampleRecord({ id: 3 })).toBe(false);
    expect(isUnifiedMarketResearchRecord({ _recordKind: 'market_research' })).toBe(true);
    expect(isUnifiedMarketResearchRecord({ id: 'market:1' })).toBe(true);
    expect(isUnifiedMarketResearchRecord({ id: 'sample:1' })).toBe(false);
  });

  test('카드 메타·태그는 공용 함수 하나', () => {
    expect(noteTagList('a, ,b')).toEqual(['a', 'b']);
    expect(noteTagList([' x ', null])).toEqual(['x']);
    expect(noteMetaPairs({ testDate: '2026-10-01', category: '피자' })).toEqual([
      ['작성일', '2026-10-01'],
      ['구분', '피자'],
    ]);
    expect(
      noteMetaPairs({ id: 'sample:1', testDate: '2026-10-01', recordType: '샘플테스트' })
    ).toEqual([
      ['작성일', '2026-10-01'],
      ['유형', '샘플테스트'],
    ]);
  });

  test('웹 카드·PDF·표시·통합기록 모듈에 판별·메타 함수 복사본이 다시 생기지 않는다', () => {
    for (const file of [
      'components/note/WebJournalCard.jsx',
      'lib/note/journal-print.js',
      'lib/note/display.js',
      'lib/note/unified-records.js',
    ]) {
      const src = read(file);
      expect(src).not.toContain("startsWith('sample:')");
      expect(src).not.toContain("startsWith('market:')");
      expect(src).not.toMatch(/^function (tagList|metaPairs|isSampleRecord)\b/m);
    }
  });
});
