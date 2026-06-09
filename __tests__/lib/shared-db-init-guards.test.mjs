import { jest } from '@jest/globals';

const records = {
  menu_dev_notes: [],
  sample_records: [],
  note_schedules: [],
  work_log: [],
};

const nextIds = {
  menu_dev_notes: 100,
  sample_records: 200,
  note_schedules: 300,
  work_log: 400,
};

function resetRecords() {
  records.menu_dev_notes = [
    {
      id: 1,
      title: '루트 노트',
      menuName: '콤비',
      parentId: null,
      createdAt: '2026-06-08T00:00:00.000Z',
      updatedAt: '2026-06-08T00:00:00.000Z',
    },
    {
      id: 2,
      title: '자식 노트',
      menuName: '콤비',
      parentId: 1,
      createdAt: '2026-06-08T01:00:00.000Z',
      updatedAt: '2026-06-08T01:00:00.000Z',
    },
  ];
  records.sample_records = [
    {
      id: 1,
      title: '샘플',
      menuName: '콤비',
      sampleNames: ['콤비'],
      createdAt: '2026-06-08T00:00:00.000Z',
      updatedAt: '2026-06-08T00:00:00.000Z',
    },
  ];
  records.note_schedules = [
    {
      id: 1,
      title: '일정',
      date: '2026-06-08',
      type: '기타',
      createdAt: '2026-06-08T00:00:00.000Z',
      updatedAt: '2026-06-08T00:00:00.000Z',
    },
  ];
  records.work_log = [
    { id: 1, date: '2026-03-01', at: '2026-03-01T00:00:00.000Z', type: 'OTHER', summary: 'old' },
    { id: 2, date: '2026-06-08', at: '2026-06-08T00:00:00.000Z', type: 'OTHER', summary: 'new' },
  ];
  nextIds.menu_dev_notes = 100;
  nextIds.sample_records = 200;
  nextIds.note_schedules = 300;
  nextIds.work_log = 400;
}

function storeApi(storeName) {
  return {
    add(record) {
      const id = nextIds[storeName]++;
      records[storeName].push({ ...record, id });
      const req = { result: id, onsuccess: null, onerror: null };
      Promise.resolve().then(() => {
        if (req.onsuccess) req.onsuccess();
      });
      return req;
    },
    put(record) {
      const index = records[storeName].findIndex(item => item.id === record.id);
      if (index >= 0) records[storeName][index] = record;
      else records[storeName].push(record);
      return { result: record.id, onsuccess: null, onerror: null };
    },
    delete(id) {
      records[storeName] = records[storeName].filter(item => item.id !== id);
    },
  };
}

const sharedMock = {
  initSharedDB: jest.fn(async () => {}),
  sharedHasStore: jest.fn(storeName => Object.prototype.hasOwnProperty.call(records, storeName)),
  sharedGetAll: jest.fn(async storeName => [...records[storeName]]),
  sharedGetById: jest.fn(
    async (storeName, id) => records[storeName].find(item => item.id === id) || null
  ),
  sharedGetByIndex: jest.fn(async (storeName, indexName, value) =>
    (records[storeName] || []).filter(item => item[indexName] === value)
  ),
  sharedDeleteById: jest.fn(async (storeName, id) => {
    records[storeName] = records[storeName].filter(item => item.id !== id);
  }),
  sharedRunTransaction: jest.fn(async (_storeNames, _mode, work) => {
    work({ objectStore: storeApi });
    await new Promise(resolve => setTimeout(resolve, 5));
  }),
};

jest.unstable_mockModule('@/lib/db/shared', () => sharedMock);

const noteStore = await import('@/lib/note/store');
const sampleStore = await import('@/lib/sample/store');
const schedules = await import('@/lib/note/schedules');
const workLog = await import('@/lib/work-log');

globalThis.localStorage = {
  removeItem: jest.fn(),
};

async function expectSharedInit(action) {
  resetRecords();
  jest.clearAllMocks();
  await action();
  expect(sharedMock.initSharedDB).toHaveBeenCalled();
}

describe('공용 DB 직접 진입 보호', () => {
  test('노트 store public 함수는 main 공유 DB를 먼저 연다', async () => {
    const actions = [
      () => noteStore.getAllNotes(),
      () => noteStore.getNoteById(1),
      () => noteStore.addNote({ title: '신규 노트' }),
      () => noteStore.updateNote(1, { title: '수정 노트' }),
      () => noteStore.deleteNote(1),
      () => noteStore.getNotesInChain(1),
      () => noteStore.duplicateNote(1),
    ];

    for (const action of actions) {
      await expectSharedInit(action);
    }
  });

  test('샘플 store public 함수는 main 공유 DB를 먼저 연다', async () => {
    const actions = [
      () => sampleStore.getAllSamples(),
      () => sampleStore.getSampleById(1),
      () => sampleStore.addSample({ title: '신규 샘플', sampleNames: ['콤비'] }),
      () => sampleStore.updateSample(1, { title: '수정 샘플', sampleNames: ['콤비'] }),
      () => sampleStore.deleteSample(1),
    ];

    for (const action of actions) {
      await expectSharedInit(action);
    }
  });

  test('일정 store public 함수는 main 공유 DB를 먼저 연다', async () => {
    const actions = [
      () => schedules.getAllSchedules(),
      () => schedules.addSchedule({ title: '신규 일정', date: '2026-06-08' }),
      () => schedules.updateSchedule(1, { title: '수정 일정', date: '2026-06-08' }),
      () => schedules.deleteSchedule(1),
    ];

    for (const action of actions) {
      await expectSharedInit(action);
    }
  });

  test('작업 일지 public 함수는 main 공유 DB를 먼저 연다', async () => {
    const actions = [
      () => workLog.logWork('OTHER', '테스트'),
      () => workLog.getWorkLogByDate('2026-06-08'),
      () => workLog.getAllWorkLogs(),
      () => workLog.pruneOldWorkLogs(60),
    ];

    for (const action of actions) {
      await expectSharedInit(action);
    }
  });
});
