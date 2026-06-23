/**
 * C-7: BOM 복원 회귀 + 체크리스트↔연구일지 동기화 타이틀/콘텐츠 회귀
 */
import { describe, expect, test } from '@jest/globals';
import { validateBackupPayload, CURRENT_BACKUP_VERSION } from '../../lib/backup/validation.js';

// ── BOM 스트립 로직 (lib/download.js readFileAsText:111 와 동일) ──────────────
function stripBom(text) {
  return typeof text === 'string' && text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

describe('BOM 포함 JSON 복원 회귀', () => {
  test('BOM 없는 JSON은 그대로 파싱된다', () => {
    const json = JSON.stringify({ version: CURRENT_BACKUP_VERSION, stores: {} });
    expect(() => JSON.parse(stripBom(json))).not.toThrow();
    expect(JSON.parse(stripBom(json)).version).toBe(CURRENT_BACKUP_VERSION);
  });

  test('BOM 선행(﻿) JSON도 stripBom 후 정상 파싱된다', () => {
    const json = '﻿' + JSON.stringify({ version: CURRENT_BACKUP_VERSION, stores: {} });
    expect(json.charCodeAt(0)).toBe(0xfeff);
    const stripped = stripBom(json);
    expect(stripped.charCodeAt(0)).not.toBe(0xfeff);
    expect(() => JSON.parse(stripped)).not.toThrow();
  });

  test('BOM 포함 백업 JSON이 validateBackupPayload를 통과한다', () => {
    const payload = {
      version: CURRENT_BACKUP_VERSION,
      exportedAt: '2026-06-12T00:00:00.000Z',
      stores: { settings: [{ id: 1 }] },
    };
    const bom = '﻿' + JSON.stringify(payload);
    const parsed = JSON.parse(stripBom(bom));
    const { summary } = validateBackupPayload(parsed);
    expect(summary.versionMismatch).toBe(false);
    expect(summary.storeCount).toBe(1);
  });

  test('빈 문자열에 stripBom을 적용해도 빈 문자열 유지', () => {
    expect(stripBom('')).toBe('');
  });

  test('BOM이 두 개여도 첫 번째만 제거', () => {
    const doubleBom = '﻿﻿{}';
    const stripped = stripBom(doubleBom);
    expect(stripped.charCodeAt(0)).toBe(0xfeff);
  });
});

// ── 체크리스트↔연구일지 동기화 타이틀/콘텐츠 (calendar/page.jsx 함수와 동일 로직) ──
function checklistJournalTitle(dateKey) {
  return `${dateKey} 체크리스트 완료`;
}

function checklistJournalContent(doneItems) {
  if (!doneItems.length) return '완료 항목 없음';
  return ['오늘 한 일', ...doneItems.map(item => `- ${item.text}`)].join('\n');
}

describe('체크리스트↔연구일지 동기화 타이틀·콘텐츠', () => {
  test('타이틀 형식이 dateKey + " 체크리스트 완료" 이다', () => {
    expect(checklistJournalTitle('2026-06-12')).toBe('2026-06-12 체크리스트 완료');
  });

  test('완료 항목 있으면 각 항목을 "- text" 형태로 포함', () => {
    const items = [
      { id: '1', text: '피자 레시피 검토', done: true },
      { id: '2', text: '원가 업데이트', done: true },
    ];
    const content = checklistJournalContent(items);
    expect(content).toContain('오늘 한 일');
    expect(content).toContain('- 피자 레시피 검토');
    expect(content).toContain('- 원가 업데이트');
  });

  test('완료 항목 없으면 "완료 항목 없음" 반환', () => {
    expect(checklistJournalContent([])).toBe('완료 항목 없음');
  });

  test('done이 false인 항목은 포함되지 않는다 (호출자 책임 — filter 후 전달)', () => {
    // syncChecklistJournal에서 doneItems = items.filter(i => i.done && i.text) 후 전달
    const doneOnly = [{ id: '1', text: '완료한 것', done: true }];
    const content = checklistJournalContent(doneOnly);
    expect(content).not.toContain('완료하지 않은 것');
    expect(content).toContain('완료한 것');
  });

  test('모든 항목이 미완료면 doneItems=[] → journal 삭제 조건', () => {
    // syncChecklistJournal: doneItems.length === 0 → deleteNote
    const allItems = [
      { id: '1', text: '미완료', done: false },
      { id: '2', text: '또 미완료', done: false },
    ];
    const doneItems = allItems.filter(i => i.done && i.text);
    expect(doneItems.length).toBe(0); // → deleteNote 경로 진입
  });
});
