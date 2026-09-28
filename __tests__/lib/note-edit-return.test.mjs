/**
 * 편집 화면에서 "돌아갈 곳" 결정 (2026-09-28 주임님: 수정하면 다른 화면으로 튕기는 문제).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';
import { editReturnQuery, resolveEditReturn } from '../../lib/note/edit-return.js';

const src = f => readFileSync(resolve(f), 'utf8');

describe('resolveEditReturn', () => {
  test('아는 출처는 그 화면으로 돌려보낸다', () => {
    expect(resolveEditReturn('?from=note', '/x')).toBe('/note');
    expect(resolveEditReturn('?from=board', '/x')).toBe('/note/board');
    expect(resolveEditReturn('?from=calendar', '/x')).toBe('/note/calendar');
    expect(resolveEditReturn('?from=journal', '/x')).toBe('/note/journal');
  });

  test('출처가 없거나 모르면 기본값', () => {
    expect(resolveEditReturn('', '/note/sample')).toBe('/note/sample');
    expect(resolveEditReturn('?from=', '/note/sample')).toBe('/note/sample');
    expect(resolveEditReturn('?from=엉뚱한값', '/note/sample')).toBe('/note/sample');
  });

  test('임의 경로를 넣어도 그대로 따라가지 않는다', () => {
    expect(resolveEditReturn('?from=/settings/backup', '/note')).toBe('/note');
    expect(resolveEditReturn('?from=https://example.com', '/note')).toBe('/note');
  });

  test('노트의 관련 샘플에서 열었으면 그 노트로 정확히 되돌린다', () => {
    expect(resolveEditReturn('?from=note&backId=42', '/note/sample')).toBe('/note/42');
    // 경로 조각으로 안전하지 않은 값은 무시하고 목록으로
    expect(resolveEditReturn('?from=note&backId=../settings', '/note/sample')).toBe('/note');
  });

  test('editReturnQuery는 아는 출처만 쿼리로 만든다', () => {
    expect(editReturnQuery('journal')).toBe('?from=journal');
    expect(editReturnQuery('엉뚱')).toBe('');
    expect(editReturnQuery('note', 42)).toBe('?from=note&backId=42');
  });
});

describe('편집 화면을 여는 곳들이 출처를 넘긴다', () => {
  test('노트 목록·보드·달력·연구일지', () => {
    expect(src('lib/note/content-prop-body-builders.js')).toContain('?from=note');
    expect(src('app/note/board/page.jsx')).toContain('?from=board');
    expect(src('app/note/calendar/page.jsx')).toContain('?from=calendar');
    expect(src('app/note/calendar/_DayPanel.jsx')).toContain('?from=calendar');
    expect(src('app/note/journal/_JournalDayRecords.jsx')).toContain('?from=journal');
    expect(src('app/note/[id]/page.jsx')).toContain('?from=note&backId=');
  });

  test('노트·샘플 편집 화면이 출처를 해석한다', () => {
    expect(src('app/note/[id]/page.jsx')).toContain('resolveEditReturn(window.location.search');
    expect(src('app/note/sample/[id]/page.jsx')).toContain(
      'resolveEditReturn(window.location.search'
    );
  });

  test('새로 작성할 때도 출처를 넘기고, 작성 화면이 그걸 해석한다', () => {
    expect(src('app/note/board/page.jsx')).toContain("'/note/write?from=board'");
    expect(src('app/note/calendar/page.jsx')).toContain("'/note/write?from=calendar'");
    expect(src('app/note/calendar/page.jsx')).toContain('&from=calendar`');
    expect(src('app/note/sample/samplePageControllerProps.js')).toContain(
      "'/note/write?type=sample&from=sample'"
    );
    expect(src('app/note/[id]/page.jsx')).toContain('?type=sample&from=note&backId=');

    const controller = src('app/note/write/useNoteWriteController.js');
    expect(controller).toContain('afterWriteDestination');
    expect(controller).toContain('resolveEditReturn(window.location.search, fallback)');
    // 저장(노트/샘플)·취소 3곳 모두 출처를 거친다
    expect(controller.match(/afterWriteDestination\(/g) || []).toHaveLength(4);
  });

  test('시장조사는 딥링크 수정이 끝나면 원래 화면으로 돌아간다', () => {
    expect(src('app/note/market/useMarketWriteForm.js')).toContain('onFinishDeepLinkEdit');
    expect(src('app/note/market/page.jsx')).toContain('resolveEditReturn');
  });
});
