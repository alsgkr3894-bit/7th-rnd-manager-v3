import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { readFileSync } from 'node:fs';

// 2026-11-26 점검 목록 2·3번: 임시저장 실패를 성공으로 표시하지 않고, 상태만 바꾼 초안도 복구 안내가 뜬다.
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

// 훅이 쓰는 것은 useEffect뿐이라 바로 실행하는 대역으로 충분하다
jest.unstable_mockModule('react', () => ({ useEffect: effect => effect() }));
// writeTypes는 .jsx를 끌어오므로 훅이 쓰는 판정 함수만 대신한다
jest.unstable_mockModule('../../app/note/write/writeTypes.js', () => ({
  isMenuWriteType: () => true,
}));

let quotaFull = false;
const stored = new Map();
globalThis.localStorage = {
  getItem: key => stored.get(key) ?? null,
  setItem: (key, value) => {
    if (quotaFull) throw new Error('QuotaExceededError');
    stored.set(key, value);
  },
  removeItem: key => stored.delete(key),
};

const { saveDraft, loadDraft } = await import('../../lib/note/storage.js');
const { useNoteWriteDraftAutosave: autosaveHook } =
  await import('../../app/note/write/useNoteWriteDraftAutosave.js');
const { hasStoredNoteDraft } = await import('../../app/note/[id]/detail/noteDetailUtils.js');
const { KEYS } = await import('../../lib/note/keys.js');

beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  stored.clear();
  quotaFull = false;
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function runAutosave(statuses) {
  return autosaveHook({
    canEdit: true,
    form: { title: '새 노트', testContent: '마지막 입력', photos: [{ data: 'x' }] },
    writeType: 'menu',
    isDirtyRef: { current: true },
    timerRef: { current: null },
    draftTimer: { current: null },
    setDraftStatus: status => statuses.push(status),
  });
}

describe('새 노트 임시저장', () => {
  test('저장 성공 여부를 돌려준다', () => {
    expect(saveDraft('k', { a: 1 })).toBe(true);
    quotaFull = true;
    expect(saveDraft('k', { a: 2 })).toBe(false);
    expect(loadDraft('k')).toEqual({ a: 1 });
  });

  test('쓰기가 실패하면 "임시저장됨"이 아니라 실패 상태가 남는다', () => {
    const statuses = [];
    quotaFull = true;
    runAutosave(statuses);
    jest.advanceTimersByTime(10000);
    expect(statuses).toEqual(['saving', 'error']);
  });

  test('실패 뒤 다시 시도가 성공하면 마지막 입력이 남는다', () => {
    const statuses = [];
    quotaFull = true;
    const { retryDraftSave } = runAutosave(statuses);
    jest.advanceTimersByTime(2000);
    quotaFull = false;
    retryDraftSave();
    jest.advanceTimersByTime(10000);
    expect(statuses).toEqual(['saving', 'error', 'saving', 'saved', 'idle']);
    expect(loadDraft(KEYS.NOTE_DRAFT_WRITE)).toMatchObject({
      testContent: '마지막 입력',
      photos: [],
    });
  });

  test('작성 화면이 실패 안내와 다시 시도 버튼을 보여 준다', () => {
    const page = read('app/note/write/page.jsx');
    expect(page).toContain("draftStatus === 'error'");
    expect(page).toContain('onClick={retryDraftSave}');
  });
});

describe('노트 수정 화면의 초안 복구 안내', () => {
  const note = {
    id: 3,
    title: '제목',
    testContent: '내용',
    managerEval: '',
    status: '진행중',
    tasteRating: 0,
    photos: [{ data: 'a' }],
    updatedAt: '2026-11-20T00:00:00Z',
  };
  const draftOf = changes => ({ ...note, ...changes, photos: [] });

  test.each([
    ['상태', { status: '완료' }],
    ['평점', { tasteRating: 4 }],
    ['관리자 평가', { managerEval: '좋음' }],
  ])('%s만 바꾼 초안도 안내한다', (_label, changes) => {
    expect(hasStoredNoteDraft(draftOf(changes), note)).toBe(true);
  });

  test('내용이 같으면(사진·저장 시각 차이만 있으면) 안내하지 않는다', () => {
    expect(hasStoredNoteDraft(draftOf({ updatedAt: '2026-01-01T00:00:00Z' }), note)).toBe(false);
    expect(hasStoredNoteDraft(null, note)).toBe(false);
  });

  test('정식 저장 때 예약된 임시저장을 취소한 뒤 초안을 지운다', () => {
    expect(read('app/note/[id]/page.jsx')).toMatch(
      /clearTimeout\(timerRef\.current\);\s*clearDraft\(KEYS\.NOTE_DRAFT\(noteId\)\);/
    );
  });
});
