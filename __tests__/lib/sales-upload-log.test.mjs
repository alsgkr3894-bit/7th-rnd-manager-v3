import { jest } from '@jest/globals';

const dbState = {
  sales_files: [],
  sales_rows: [],
  menu_sales_issues: [],
  upload_log: [],
};

const nextIds = {
  sales_files: 1,
  sales_rows: 1,
  menu_sales_issues: 1,
  upload_log: 1,
};

function resetDbState() {
  for (const key of Object.keys(dbState)) dbState[key] = [];
  for (const key of Object.keys(nextIds)) nextIds[key] = 1;
}

function addToStore(storeName, record) {
  const id = nextIds[storeName]++;
  const saved = { ...record, id };
  dbState[storeName].push(saved);
  return id;
}

function indexMatches(record, indexName, value) {
  if (indexName === 'year_month') return record.year === value[0] && record.month === value[1];
  return record[indexName] === value;
}

const dbMock = {
  hasStore: jest.fn(storeName => Object.prototype.hasOwnProperty.call(dbState, storeName)),
  getAll: jest.fn(async storeName => [...dbState[storeName]]),
  getByIndex: jest.fn(async (storeName, indexName, value) =>
    (dbState[storeName] || []).filter(record => indexMatches(record, indexName, value))
  ),
  runTransaction: jest.fn(async (_stores, _mode, work) => {
    let aborted = false;
    const tx = {
      abort: jest.fn(() => {
        aborted = true;
      }),
      objectStore(storeName) {
        return {
          index(indexName) {
            return {
              getKey(value) {
                const match = (dbState[storeName] || []).find(record =>
                  indexMatches(record, indexName, value)
                );
                const req = { result: match?.id, onsuccess: null, onerror: null };
                Promise.resolve().then(() => {
                  if (req.onsuccess) req.onsuccess();
                });
                return req;
              },
            };
          },
          add(record) {
            const id = addToStore(storeName, record);
            const req = { result: id, onsuccess: null, onerror: null };
            Promise.resolve().then(() => {
              if (req.onsuccess) req.onsuccess();
            });
            return req;
          },
          delete(id) {
            dbState[storeName] = dbState[storeName].filter(record => record.id !== id);
          },
        };
      },
    };
    work(tx);
    await new Promise(resolve => setTimeout(resolve, 5));
    if (aborted) throw new Error('Transaction aborted');
  }),
};

jest.unstable_mockModule('../../lib/db/index.js', () => dbMock);

jest.unstable_mockModule('@/lib/auth/guard', () => ({
  assertActiveAdmin: jest.fn().mockResolvedValue(undefined),
}));

const { assertActiveAdmin } = await import('@/lib/auth/guard');
const { SALES_UPLOAD_MODULE, deleteSalesFile, saveSalesUpload } =
  await import('../../lib/sales/store-files.js');

beforeEach(() => {
  resetDbState();
  jest.clearAllMocks();
  dbMock.hasStore.mockImplementation(storeName =>
    Object.prototype.hasOwnProperty.call(dbState, storeName)
  );
  dbMock.getAll.mockImplementation(async storeName => [...dbState[storeName]]);
  dbMock.getByIndex.mockImplementation(async (storeName, indexName, value) =>
    (dbState[storeName] || []).filter(record => indexMatches(record, indexName, value))
  );
});

describe('메뉴판매량 upload_log 정합성', () => {
  test('모듈명은 업로드 저장과 삭제 필터가 공유하는 단일 상수를 사용한다', () => {
    expect(SALES_UPLOAD_MODULE).toBe('menu-sales');
  });

  test('saveSalesUpload는 caller가 잘못 넘긴 module을 메뉴판매량 모듈명으로 보정한다', async () => {
    await saveSalesUpload({
      meta: {
        year: 2026,
        month: 6,
        fileName: 'sales.xlsx',
        uploadedAt: '2026-06-08T00:00:00.000Z',
        totalRows: 1,
      },
      classifiedRows: [
        { rawMenuName: '콤비', normalizedMenuName: '콤비', mappedMenuName: '콤비', quantity: 3 },
      ],
      groupedIssues: [],
      log: { module: 'sales', fileName: 'sales.xlsx', uploadedAt: '2026-06-08T00:00:00.000Z' },
    });

    expect(dbState.upload_log).toHaveLength(1);
    expect(assertActiveAdmin).toHaveBeenCalledWith('판매량 업로드 저장');
    expect(dbState.upload_log[0]).toMatchObject({
      module: SALES_UPLOAD_MODULE,
      linkedFileId: 1,
      deleted: false,
      deletedAt: null,
    });
  });

  test('saveSalesUpload는 같은 연월 중복 업로드를 저장 전에 차단한다', async () => {
    dbState.sales_files = [
      {
        id: 7,
        year: 2026,
        month: 6,
        fileName: 'existing.xlsx',
      },
    ];
    dbState.sales_rows = [{ id: 70, fileId: 7, rawMenuName: '기존 메뉴' }];

    await expect(
      saveSalesUpload({
        meta: {
          year: 2026,
          month: 6,
          fileName: 'duplicate.xlsx',
          uploadedAt: '2026-06-08T00:00:00.000Z',
          totalRows: 1,
        },
        classifiedRows: [
          { rawMenuName: '중복 메뉴', normalizedMenuName: '중복 메뉴', quantity: 1 },
        ],
        groupedIssues: [],
        log: { fileName: 'duplicate.xlsx', uploadedAt: '2026-06-08T00:00:00.000Z' },
      })
    ).rejects.toThrow('DUPLICATE_MONTH');

    expect(dbMock.runTransaction).not.toHaveBeenCalled();
    expect(dbState.sales_files).toEqual([
      {
        id: 7,
        year: 2026,
        month: 6,
        fileName: 'existing.xlsx',
      },
    ]);
    expect(dbState.sales_rows).toEqual([{ id: 70, fileId: 7, rawMenuName: '기존 메뉴' }]);
  });

  test('saveSalesUpload는 저장 트랜잭션 안에서도 같은 연월 중복을 다시 차단한다', async () => {
    dbState.sales_files = [
      {
        id: 7,
        year: 2026,
        month: 6,
        fileName: 'existing.xlsx',
      },
    ];
    dbMock.getByIndex.mockResolvedValueOnce([]);

    await expect(
      saveSalesUpload({
        meta: {
          year: 2026,
          month: 6,
          fileName: 'racing.xlsx',
          uploadedAt: '2026-06-08T00:00:00.000Z',
          totalRows: 1,
        },
        classifiedRows: [
          { rawMenuName: '동시 업로드', normalizedMenuName: '동시 업로드', quantity: 1 },
        ],
        groupedIssues: [],
        log: { fileName: 'racing.xlsx', uploadedAt: '2026-06-08T00:00:00.000Z' },
      })
    ).rejects.toThrow('DUPLICATE_MONTH');

    expect(dbMock.runTransaction).toHaveBeenCalledTimes(1);
    expect(dbState.sales_files).toEqual([
      {
        id: 7,
        year: 2026,
        month: 6,
        fileName: 'existing.xlsx',
      },
    ]);
    expect(dbState.sales_rows).toEqual([]);
    expect(dbState.upload_log).toEqual([]);
  });

  test('deleteSalesFile은 같은 linkedFileId라도 다른 모듈 로그는 삭제하지 않는다', async () => {
    dbState.sales_files = [{ id: 1 }, { id: 2 }];
    dbState.sales_rows = [
      { id: 10, fileId: 1 },
      { id: 11, fileId: 2 },
    ];
    dbState.menu_sales_issues = [{ id: 20, fileId: 1 }];
    dbState.upload_log = [
      { id: 30, linkedFileId: 1, module: SALES_UPLOAD_MODULE },
      { id: 31, linkedFileId: 1, module: 'price' },
      { id: 32, linkedFileId: 2, module: SALES_UPLOAD_MODULE },
    ];

    await deleteSalesFile(1);

    expect(assertActiveAdmin).toHaveBeenCalledWith('판매량 업로드 삭제');
    expect(dbState.sales_files.map(record => record.id)).toEqual([2]);
    expect(dbState.sales_rows.map(record => record.id)).toEqual([11]);
    expect(dbState.menu_sales_issues).toEqual([]);
    expect(dbState.upload_log.map(record => record.id)).toEqual([31, 32]);
  });
});
