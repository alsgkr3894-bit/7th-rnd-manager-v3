/**
 * lib/server/request-guard.js — 로컬/사내 LAN 전용 API 방어
 *
 * 이 앱의 API 라우트에는 서버 세션 인증이 없다. 최소한 방문한 외부 웹페이지가
 * 엔드포인트로 요청(CSRF)을 보내 DB를 조작·열람하는 것을 막기 위해 Origin/Host를 제한한다.
 *
 * 기본값은 루프백 전용이다. `RND_ALLOW_LAN=1` 을 켜면 RFC1918 사설 대역
 * (10/8, 172.16/12, 192.168/16)과 `RND_ALLOWED_LAN_HOSTS` 에 등록한 호스트명까지 허용해
 * 같은 사무실 LAN의 다른 PC가 접속할 수 있다. 사설 대역은 인터넷에서 라우팅되지 않으므로
 * 이 완화는 공개 노출로 이어지지 않는다.
 *
 * 허용 대역이 넓어진 만큼, Origin과 Host가 모두 있으면 두 호스트명이 같은지 추가로 검사해
 * 교차 출처 요청을 계속 차단한다.
 *
 * 여전히 인증을 대체하지는 않는다 — 포트에 닿을 수 있는 사람은 데이터를 읽을 수 있다.
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

/** 점 4개짜리 IPv4 리터럴만 옥텟 배열로. 그 외(호스트명·IPv6)는 null. */
function parseIpv4(hostname) {
  const parts = hostname.split('.');
  if (parts.length !== 4) return null;
  const octets = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const num = Number(part);
    if (num > 255) return null;
    octets.push(num);
  }
  return octets;
}

/**
 * RFC1918 사설 대역인지. 172.32.x 처럼 경계 바로 밖은 반드시 거부해야 한다.
 * @param {string} value Origin 또는 Host 헤더 값
 */
export function isPrivateLanHostname(value) {
  const octets = parseIpv4(hostnameOf(value));
  if (!octets) return false;
  const [a, b] = octets;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

// env는 호출 시점에 읽는다(모듈 로드 시점 캐시 금지) — 테스트가 process.env를 바꿔가며 검증한다.
function isLanAllowed() {
  return process.env.RND_ALLOW_LAN === '1';
}

function allowedLanHostNames() {
  return String(process.env.RND_ALLOWED_LAN_HOSTS || '')
    .split(',')
    .map(entry => entry.trim().toLowerCase())
    .filter(Boolean);
}

function isAllowedHostname(value) {
  if (isLocalHostname(value)) return true;
  if (!isLanAllowed()) return false;
  if (isPrivateLanHostname(value)) return true;
  return allowedLanHostNames().includes(hostnameOf(value));
}

export class RequestNotLocalError extends Error {
  constructor(message = '허용되지 않은 요청입니다.') {
    super(message);
    this.name = 'RequestNotLocalError';
    this.code = 'REQUEST_NOT_LOCAL';
  }
}

/**
 * 요청이 허용된 출처(루프백, 또는 RND_ALLOW_LAN=1 일 때 사내 LAN)에서 온 것인지 검증.
 * 아니면 RequestNotLocalError를 던진다.
 * @param {Request} request
 */
export function assertLocalRequest(request) {
  const headers = request?.headers;
  if (!headers || typeof headers.get !== 'function') {
    throw new RequestNotLocalError();
  }
  const origin = headers.get('origin');
  const host = headers.get('host');

  if (origin) {
    if (!isAllowedHostname(origin)) throw new RequestNotLocalError();
    // 같은 출처에서 온 요청이면 Origin과 Host의 호스트명이 일치한다.
    // 불일치는 교차 출처 요청이므로, 사설 대역을 허용한 뒤에도 여기서 막는다.
    if (host && hostnameOf(origin) !== hostnameOf(host)) {
      throw new RequestNotLocalError();
    }
    return;
  }
  if (!isAllowedHostname(host)) throw new RequestNotLocalError();
}
