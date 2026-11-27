import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { DELETE, GET, POST, PUT } from '../../app/api/auth/session/route.js';
import { setupTokenPath } from '@/lib/server/session-auth';

let tempDir;
let warn;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'rnd-auth-route-'));
  process.env.RND_AUTH_STATE_PATH = join(tempDir, 'auth.json');
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  warn.mockRestore();
  delete process.env.RND_AUTH_STATE_PATH;
  delete process.env.RND_ALLOW_LAN;
  rmSync(tempDir, { recursive: true, force: true });
});

const sha = text => createHash('sha256').update(text).digest('hex');
const URL_ = 'http://localhost:3000/api/auth/session';
function request(method, body, { host = 'localhost:3000', cookie, url = URL_ } = {}) {
  return new Request(url, {
    method,
    headers: { host, ...(cookie ? { cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
const challenge = async () => (await GET(request('GET'))).json();
const proof = async password => {
  const c = await challenge();
  return { challengeId: c.id, response: sha(`${sha(password)}:${c.nonce}`) };
};
const cookieOf = response => response.headers.get('set-cookie').split(';')[0];

async function setup() {
  await challenge();
  const setupToken = readFileSync(setupTokenPath(), 'utf8').trim();
  return POST(request('POST', { password: '1234', setupToken }));
}

describe('/api/auth/session', () => {
  test('설정 토큰 없이는 최초 설정이 되지 않는다', async () => {
    await challenge();
    const response = await POST(request('POST', { password: '1234', setupToken: '' }));

    expect(response.status).toBe(401);
    expect(response.headers.get('set-cookie')).toBeNull();
    expect((await challenge()).configured).toBe(false);
  });

  test('최초 설정은 LAN에서 할 수 없다', async () => {
    process.env.RND_ALLOW_LAN = '1';
    const response = await POST(
      request('POST', { password: '1234', setupToken: 'x' }, { host: '192.168.0.10:3000' })
    );
    expect(response.status).toBe(409);
  });

  test('5번 틀리면 429와 Retry-After를 보낸다', async () => {
    await setup();
    let response;
    for (let i = 0; i < 5; i += 1) response = await POST(request('POST', await proof('bad')));

    expect(response.status).toBe(429);
    expect(Number(response.headers.get('retry-after'))).toBeGreaterThan(890);
    expect((await POST(request('POST', await proof('1234')))).status).toBe(429);
  });

  test('비밀번호 변경은 새 쿠키를 주고, LAN의 HTTP에서는 거부한다', async () => {
    const cookie = cookieOf(await setup());
    process.env.RND_ALLOW_LAN = '1';
    const lan = await PUT(
      request(
        'PUT',
        { ...(await proof('1234')), password: '5678' },
        {
          cookie,
          host: '192.168.0.10:3000',
        }
      )
    );
    expect(lan.status).toBe(403);

    const wrong = await PUT(
      request('PUT', { ...(await proof('bad')), password: '5678' }, { cookie })
    );
    expect(wrong.status).toBe(403);

    const changed = await PUT(
      request('PUT', { ...(await proof('1234')), password: '5678' }, { cookie })
    );
    expect(changed.status).toBe(200);
    expect(cookieOf(changed)).not.toBe(cookie);
  });

  test('모든 로그인 해제는 로그인이 필요하고, 다른 사이트의 로그아웃 요청은 거부한다', async () => {
    const cookie = cookieOf(await setup());
    const all = `${URL_}?all=1`;

    expect((await DELETE(request('DELETE', null, { url: all }))).status).toBe(401);
    expect((await DELETE(request('DELETE', null, { host: 'evil.example' }))).status).toBe(403);
    const done = await DELETE(request('DELETE', null, { url: all, cookie }));
    expect(done.headers.get('set-cookie')).toContain('Max-Age=0');
    expect((await DELETE(request('DELETE', null, { url: all, cookie }))).status).toBe(401);
  });

  test('설정 파일이 손상되면 복구 방법을 500으로 알린다', async () => {
    writeFileSync(process.env.RND_AUTH_STATE_PATH, 'broken');
    const response = await GET(request('GET'));

    expect(response.status).toBe(500);
    expect((await response.json()).error).toContain('.bak');
  });
});
