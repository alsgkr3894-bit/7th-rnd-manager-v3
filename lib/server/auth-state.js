/**
 * lib/server/auth-state.js — 인증 상태 파일(.runtime-auth.json) 읽기·쓰기
 *
 * 담는 값: 서명 키(secret), 비밀번호 확인값(verifier), 세션 버전, 로그인 실패 횟수.
 *
 * 파일이 손상됐을 때 새 키를 만들어 덮어쓰지 않는다 — 그러면 누구든 비밀번호를 새로
 * 정할 수 있게 되고, 무엇이 잘못됐는지도 사라진다. 같은 내용의 사본(.bak)을 함께 두고,
 * 사람이 되돌리거나 지우도록 안내한다.
 */
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const HEX_64 = /^[a-f0-9]{64}$/i;
const backedUp = new Set();

export function authStatePath() {
  return resolve(
    /* turbopackIgnore: true */ process.cwd(),
    process.env.RND_AUTH_STATE_PATH || '.runtime-auth.json'
  );
}

export class AuthStateError extends Error {
  constructor(reason, path = authStatePath()) {
    const name = basename(path);
    super(
      `로그인 설정 파일(${name})을 사용할 수 없습니다: ${reason}. ` +
        `사이트 폴더의 ${name}.bak을 ${name}(으)로 복사해 되돌리거나, ` +
        `두 파일을 모두 지운 뒤 이 PC에서 비밀번호를 새로 설정해 주세요.`
    );
    this.name = 'AuthStateError';
    this.code = 'AUTH_STATE_UNAVAILABLE';
  }
}

function writeAtomic(path, text) {
  const temp = `${path}.tmp`;
  writeFileSync(temp, text, { encoding: 'utf8', mode: 0o600 });
  renameSync(temp, path);
}

function serialize(state) {
  return `${JSON.stringify(state, null, 2)}\n`;
}

function writeCopy(path, text) {
  try {
    writeAtomic(`${path}.bak`, text);
    backedUp.add(path);
  } catch {
    // 사본을 못 써도 로그인은 계속돼야 한다
    console.warn('[auth] 로그인 설정 사본(.bak)을 쓰지 못했습니다.');
  }
}

export function writeAuthState(state) {
  const path = authStatePath();
  const text = serialize(state);
  writeAtomic(path, text);
  writeCopy(path, text);
}

function parseState(text, path) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new AuthStateError('내용이 손상되었습니다', path);
  }
  const secretOk = typeof parsed?.secret === 'string' && parsed.secret.length >= 32;
  const verifierOk = parsed?.verifier === null || HEX_64.test(String(parsed?.verifier));
  if (!secretOk || !verifierOk)
    throw new AuthStateError('필요한 값이 없거나 형식이 다릅니다', path);
  return parsed;
}

/** 현재 상태. 파일이 처음부터 없을 때만 새로 만든다. */
export function readAuthState() {
  const path = authStatePath();
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw new AuthStateError('읽을 수 없습니다', path);
    if (existsSync(`${path}.bak`)) throw new AuthStateError('파일이 없고 사본만 있습니다', path);
    const created = { secret: randomBytes(32).toString('hex'), verifier: null };
    writeAuthState(created);
    return created;
  }
  const state = parseState(text, path);
  if (!backedUp.has(path)) writeCopy(path, serialize(state));
  return state;
}
