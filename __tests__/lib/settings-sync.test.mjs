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
let authoritative = true;
let blocked = false;
const posts = [];
jest.unstable_mockModule('@/lib/session', () => ({
  fetchAppJson: async (_path, options) => {
    if (options?.method !== 'POST') return { ok: true, values: { ...server } };
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

const { pushSettingsToServer, pullSettingsFromServer, collectServerSettings } =
  await import('../../lib/settings-sync/client.js');
const { isServerSettingKey, SERVER_SETTING_KEYS } = await import('../../lib/settings-sync/keys.js');
const { normalizeSettingsPayload, readBrowserSettings, writeBrowserSettings } =
  await import('../../lib/server/browser-settings.js');

beforeEach(() => {
  stored.clear();
  server = {};
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
