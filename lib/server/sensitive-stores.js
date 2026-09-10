/**
 * lib/server/sensitive-stores.js — 네트워크로 절대 내보내지 않는 store.
 *
 * `rnd_login_credentials` 는 외부 사이트 비밀번호를 **평문**으로 들고 있고
 * (lib/rnd/login-info.js 의 `password: String(...)`), `rnd_corporate_card_entries` 는
 * 법인카드 사용 내역이다. 앱은 이미 두 화면을 관리자 전용으로 취급한다
 * (lib/navigation/role-visibility.js 의 EDIT_ONLY_HREFS).
 *
 * `/api/db/store-rows`에는 인증이 없다(middleware.ts 가 /api/ 를 공개 경로로 둔다).
 * 포트에 닿는 사람은 누구나 요청할 수 있으므로, 읽기(GET)뿐 아니라 쓰기(POST — upsert/
 * delete/clear)에서도 이 store를 거부한다. 운영 PC에는 이미 로컬 IndexedDB에 있으므로
 * 기능 손실은 없다.
 *
 * store-row-read.js(읽기)와 store-row-sync.js(쓰기) 양쪽에서 이 목록을 공유한다 —
 * 한쪽에만 있으면 반대쪽 경로로 그대로 새어나간다.
 */
export const LAN_EXCLUDED_STORE_NAMES = new Set([
  'rnd_login_credentials',
  'rnd_corporate_card_entries',
]);
