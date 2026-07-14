/**
 * 회귀 테스트 — saveMarketResearch가 신규 작성 폼(id: null)을 저장할 때
 * IDBObjectStore.put()이 "key path 값이 유효한 key가 아니다"(DataError)를 던지며
 * 저장이 전부 실패하던 버그. keyPath(autoIncrement)에 id: null이 그대로 남아있으면
 * 발생한다 — id가 없을 때는 record에서 완전히 지워야 한다.
 */
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const sharedPutMock = jest.fn(async (storeName, record) => 42);

jest.unstable_mockModule('@/lib/db/shared', () => ({
  initSharedDB: jest.fn(async () => {}),
  sharedDeleteById: jest.fn(async () => {}),
  sharedGetAll: jest.fn(async () => []),
  sharedHasStore: jest.fn(() => true),
  sharedPut: sharedPutMock,
}));

jest.unstable_mockModule('@/lib/auth/guard', () => ({
  assertActiveAdmin: jest.fn(async () => {}),
}));

const { saveMarketResearch } = await import('../../lib/note/market-research.js');

describe('saveMarketResearch', () => {
  beforeEach(() => {
    sharedPutMock.mockClear();
  });

  test('신규 작성 폼의 id: null은 저장 전 제거되어 autoIncrement가 동작한다', async () => {
    await saveMarketResearch({
      id: null,
      type: '시장분석',
      date: '2026-07-14',
      title: '테스트',
      marketTrend: '흐름',
    });

    expect(sharedPutMock).toHaveBeenCalledTimes(1);
    const [, record] = sharedPutMock.mock.calls[0];
    expect('id' in record).toBe(false);
  });

  test('기존 기록 수정 시에는 id를 그대로 유지한다', async () => {
    await saveMarketResearch({
      id: 7,
      type: '시장분석',
      date: '2026-07-14',
      title: '수정된 제목',
    });

    expect(sharedPutMock).toHaveBeenCalledTimes(1);
    const [, record] = sharedPutMock.mock.calls[0];
    expect(record.id).toBe(7);
  });
});
