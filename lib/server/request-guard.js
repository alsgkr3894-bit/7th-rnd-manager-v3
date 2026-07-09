/**
 * lib/server/request-guard.js — 로컬 전용 API 방어
 *
 * 이 앱은 로컬(127.0.0.1) 전용 도구다. API 라우트에는 서버 세션 인증이 없으므로,
 * 최소한 방문한 외부 웹페이지가 localhost 엔드포인트로 요청(CSRF)을 보내 백업 DB를
 * 조작·열람하는 것을 막기 위해 Origin/Host를 로컬 호스트로 제한한다.
 *
 * 로컬 전용 결정에 따른 최소 방어이며, 완전한 인증을 대체하지는 않는다.
 */

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

function hostnameOf(value) {
  if (!value) return '';
  let str = String(value)
    .trim()
    .replace(/^https?:\/\//i, '');
  str = str.split('/')[0];
  if (str.startsWith('[')) {
    const end = str.indexOf(']');
    return (end >= 0 ? str.slice(0, end + 1) : str).toLowerCase();
  }
  return str.split(':')[0].toLowerCase();
}

function isLocalHostname(value) {
  return LOCAL_HOSTNAMES.has(hostnameOf(value));
}

export class RequestNotLocalError extends Error {
  constructor(message = '로컬 요청만 허용됩니다.') {
    super(message);
    this.name = 'RequestNotLocalError';
    this.code = 'REQUEST_NOT_LOCAL';
  }
}

/**
 * 요청이 로컬(같은 호스트)에서 온 것인지 검증. 아니면 RequestNotLocalError를 던진다.
 * Origin 헤더가 있으면 Origin(교차 출처 요청 탐지에 유효)을, 없으면 Host를 검사한다.
 * @param {Request} request
 */
export function assertLocalRequest(request) {
  const headers = request?.headers;
  if (!headers || typeof headers.get !== 'function') {
    throw new RequestNotLocalError();
  }
  const origin = headers.get('origin');
  if (origin) {
    if (!isLocalHostname(origin)) throw new RequestNotLocalError();
    return;
  }
  const host = headers.get('host');
  if (!isLocalHostname(host)) throw new RequestNotLocalError();
}
