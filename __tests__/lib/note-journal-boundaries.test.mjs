import { describe, expect, test } from '@jest/globals';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { noteDayKey } from '../../lib/note/day-key.js';
import { noteDayKey as journalNoteDayKey } from '../../app/note/journal/journalDates.js';

// 2026-10-06: 캘린더·노트 상세가 연구일지 화면 폴더(app/note/journal)의 날짜 함수를 가져다 쓰던 것을
// lib/note/day-key.js로 옮겼다. 화면 폴더는 그 화면만 쓰게 한다.
const ROOT = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

function sourceFiles(dir) {
  return readdirSync(join(ROOT, dir), { recursive: true })
    .map(file => join(dir, String(file)).replace(/\\/g, '/'))
    .filter(file => /\.(js|jsx|mjs)$/.test(file));
}

describe('연구일지 화면 폴더 경계', () => {
  test('noteDayKey는 lib에 있고 연구일지 쪽은 같은 함수를 다시 내보낸다', () => {
    expect(journalNoteDayKey).toBe(noteDayKey);
    expect(noteDayKey({ testDate: '2026-10-06T09:00' })).toBe('2026-10-06');
    expect(noteDayKey({})).toBe('');
  });

  test('연구일지 화면 폴더 밖에서는 app/note/journal/을 import하지 않는다', () => {
    const offenders = ['app', 'lib', 'components', 'hooks']
      .flatMap(sourceFiles)
      .filter(file => !file.startsWith('app/note/journal/'))
      .filter(file =>
        /from\s+['"]@\/app\/note\/journal\//.test(readFileSync(join(ROOT, file), 'utf8'))
      );
    expect(offenders).toEqual([]);
  });
});
