import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { readFileSync } from 'node:fs';

// 2026-11-26: DB 백업에 화면 설정이 빠졌다 → 설정만 서버에 보관한다(로그인정보·법인카드는 올리지 않는다).
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const stored = new Map();
globalThis.localStorage = {
  getItem: key => stored.get(key) ?? null,
  setItem: (key, value) => stored.set(key, String(value)),
  removeItem: key => stored.delete(key),
  key: index => [...stored.keys()][index] ?? null,
  get length() {
    return stored.size;
  },
};

let server = {};
let failPost = false;
let authoritative = true;
let blocked = false;
const posts = [];
jest.unstable_mockModule('@/lib/session', () => ({
  fetchAppJson: async (_path, options) => {
    if (options?.method !== 'POST') return { ok: true, values: { ...server } };
    if (failPost) throw new Error('저장 실패');
    const { values } = JSON.parse(options.body);
    posts.push(values);
    Object.assign(server, values);
    return { ok: true };
  },
}));
jest.unstable_mockModule('@/lib/db/sync-mode', () => ({
  isAuthoritativeClient: () => authoritative,
  isSyncModeForcedReadonly: () => false,
}));
jest.unstable_mockModule('@/lib/db/sync-guard', () => ({
  ensureSyncGuardEvaluated: async () => {},
  isSyncGuardBlocked: () => blocked,
}));

const {
  BATCH_MAX_BYTES,
  BATCH_MAX_KEYS,
  batchSettings,
  pushSettingsToServer,
  pullSettingsFromServer,
  collectServerSettings,
} = await import('../../lib/settings-sync/client.js');
const { isServerSettingKey, SERVER_SETTING_KEYS } = await import('../../lib/settings-sync/keys.js');
const { normalizeSettingsPayload, readBrowserSettings, writeBrowserSettings } =
  await import('../../lib/server/browser-settings.js');

beforeEach(() => {
  stored.clear();
  server = {};
  failPost = false;
  authoritative = true;
  blocked = false;
  posts.length = 0;
});

describe('서버에 보관하는 설정', () => {
  test('화면 설정만 대상이고 계정 선택·인증값·초안·민감정보는 아니다', () => {
    expect(isServerSettingKey('v3:note-sort')).toBe(true);
    expect(isServerSettingKey('v3:margin-cost-warn')).toBe(true);
    for (const key of [
      'rnd_active_account_id',
      'rnd_active_account_id:main',
      'v3:auth-hash',
      'v3:note-draft-write',
      'v3:backup-history',
      'rnd_login_credentials',
    ]) {
      expect(isServerSettingKey(key)).toBe(false);
    }
    expect(SERVER_SETTING_KEYS.some(key => /auth|password|credential|card/i.test(key))).toBe(false);
    stored.set('v3:auth-hash', 'secret');
    stored.set('v3:note-sort', 'date');
    expect(collectServerSettings()).toEqual({ 'v3:note-sort': 'date' });
  });
});

describe('올리기', () => {
  test('처음에는 서버에 없는 설정만 올려, 있는 값을 덮지 않는다', async () => {
    server = { 'v3:note-sort': 'operator' };
    stored.set('v3:note-sort', 'default');
    stored.set('v3:note-view', 'card');
    await pushSettingsToServer();
    expect(posts).toEqual([{ 'v3:note-view': 'card' }]);
    expect(server['v3:note-sort']).toBe('operator');
  });

  test('그 뒤에는 바뀐 설정만 올린다', async () => {
    stored.set('v3:note-sort', 'a');
    stored.set('v3:note-view', 'card');
    await pushSettingsToServer();
    posts.length = 0;
    await pushSettingsToServer();
    expect(posts).toEqual([]);
    stored.set('v3:note-sort', 'b');
    await pushSettingsToServer();
    expect(posts).toEqual([{ 'v3:note-sort': 'b' }]);
  });

  test.each([
    ['읽기 전용 브라우저', () => (authoritative = false), 'readonly'],
    ['불러오기 전의 빈 브라우저', () => (blocked = true), 'guard'],
  ])('%s는 올리지 않는다', async (_label, arrange, skipped) => {
    stored.set('v3:note-sort', 'a');
    arrange();
    expect(await pushSettingsToServer()).toEqual({ skipped });
    expect(posts).toEqual([]);
  });
});

describe('서버가 설정을 잃었거나 값이 큰 경우', () => {
  test('앱을 새로 열면 서버에 빠진 설정을 다시 올리고, 서버의 다른 값은 두고 본다', async () => {
    stored.set('v3:note-sort', 'a');
    stored.set('v3:note-view', 'card');
    await pushSettingsToServer();
    // 서버 DB를 예전 상태로 되돌린 뒤 앱을 새로 연다
    server = { 'v3:note-sort': 'restored-old' };
    posts.length = 0;
    jest.resetModules();
    const reopened = await import('../../lib/settings-sync/client.js');
    await reopened.pushSettingsToServer();
    expect(posts).toEqual([{ 'v3:note-view': 'card' }]);
  });

  test('다시 올리기가 실패하면 다음 시도에서 서버를 다시 확인한다', async () => {
    stored.set('v3:note-sort', 'a');
    await pushSettingsToServer();
    server = {};
    posts.length = 0;
    jest.resetModules();
    const reopened = await import('../../lib/settings-sync/client.js');
    failPost = true;
    await expect(reopened.pushSettingsToServer()).rejects.toThrow('저장 실패');
    failPost = false;
    await reopened.pushSettingsToServer();
    expect(posts).toEqual([{ 'v3:note-sort': 'a' }]);
  });

  test('전체 재전송은 모든 설정을 이 PC 값으로 올린다', async () => {
    stored.set('v3:note-sort', 'local');
    await pushSettingsToServer();
    server['v3:note-sort'] = 'old';
    posts.length = 0;
    await Promise.all([pushSettingsToServer(), pushSettingsToServer({ all: true })]);
    expect(server['v3:note-sort']).toBe('local');
  });

  test('너무 큰 설정 하나는 빼고 나머지를 올린다', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    stored.set('v3:nutrition-import-aliases', 'x'.repeat(1024 * 1024 + 1));
    stored.set('v3:note-sort', 'a');
    expect(await pushSettingsToServer()).toEqual({ saved: 1 });
    expect(posts).toEqual([{ 'v3:note-sort': 'a' }]);
  });

  test('많거나 큰 설정은 나눠 보낸다', () => {
    const many = Array.from({ length: BATCH_MAX_KEYS * 2 + 1 }, (_, i) => [`k${i}`, 'v']);
    expect(batchSettings(many).map(batch => batch.length)).toEqual([
      BATCH_MAX_KEYS,
      BATCH_MAX_KEYS,
      1,
    ]);
    const big = 'x'.repeat(Math.floor(BATCH_MAX_BYTES * 0.6));
    expect(
      batchSettings([
        ['a', big],
        ['b', big],
      ])
    ).toHaveLength(2);
    expect(batchSettings([])).toEqual([]);
  });

  test('재전송 화면이 설정도 보낸다', () => {
    expect(read('app/settings/sync/_ServerRepushCard.jsx')).toContain(
      'pushSettingsToServer({ all: true })'
    );
  });
});

describe('받기', () => {
  test('서버 설정을 적용하고 계정 선택은 바꾸지 않으며, 받은 값을 되올리지 않는다', async () => {
    stored.set('rnd_active_account_id', '1');
    server = { 'v3:note-sort': 'server', 'v3:note-view': 'table' };
    expect((await pullSettingsFromServer()).applied).toBe(2);
    expect(stored.get('v3:note-sort')).toBe('server');
    expect(stored.get('rnd_active_account_id')).toBe('1');
    await pushSettingsToServer();
    expect(posts).toEqual([]);
  });
});

describe('서버 저장', () => {
  test('허용되지 않은 키·잘못된 값은 거부한다', () => {
    expect(() => normalizeSettingsPayload({ values: { 'v3:auth-hash': 'x' } })).toThrow(
      '보관하지 않는'
    );
    expect(() => normalizeSettingsPayload({ values: { 'v3:note-sort': 1 } })).toThrow();
    expect(() => normalizeSettingsPayload({ values: {} })).toThrow();
    expect(() => normalizeSettingsPayload(null)).toThrow();
  });

  test('이 경로로 저장한 행만 돌려준다(예전에 가져온 낡은 행 제외)', async () => {
    const rows = [
      { key: 'v3:note-sort', value: 'old', metadata: null },
      { key: 'v3:note-view', value: 'card', metadata: { source: 'settings-sync' } },
    ];
    const prisma = {
      localStorageEntry: {
        findMany: async () => rows,
        upsert: args => args,
      },
      $transaction: async list => list,
    };
    expect(await readBrowserSettings(prisma)).toEqual({ 'v3:note-view': 'card' });
    expect(await writeBrowserSettings(prisma, { values: { 'v3:note-sort': 'new' } })).toEqual({
      ok: true,
      saved: 1,
    });
  });

  test('API는 로컬·로그인 검사를 하고 샌드박스 쓰기를 거부한다', () => {
    const route = read('app/api/db/settings/route.js');
    expect(route.match(/assertLocalRequest\(request\)/g)).toHaveLength(2);
    expect(route.match(/assertAuthenticatedRequest\(request\)/g)).toHaveLength(2);
    expect(route).toContain('RND_SANDBOX_REJECT_WRITES');
  });
});

describe('화면 연결', () => {
  test('불러오기에서 설정을 받은 뒤에 동기화 가드를 푼다', () => {
    const page = read('app/settings/sync/page.jsx');
    expect(page.indexOf('await pullSettingsFromServer()')).toBeGreaterThan(-1);
    expect(page.indexOf('await pullSettingsFromServer()')).toBeLessThan(
      page.indexOf('      clearSyncGuard();')
    );
  });

  test('업무 화면에서만 올리고, 백업 화면은 DB 백업에 없는 항목을 알린다', () => {
    const shell = read('components/AppShell.jsx');
    expect(shell.slice(shell.indexOf('function WorkShell'))).toContain('useSettingsSync();');
    expect(shell.slice(0, shell.indexOf('function WorkShell'))).not.toContain('useSettingsSync();');
    expect(read('app/settings/backup/panels/ServerBackupStatusCard.jsx')).toContain(
      '외부 로그인정보·법인카드와 로그인 인증 파일이 없습니다'
    );
  });
});
