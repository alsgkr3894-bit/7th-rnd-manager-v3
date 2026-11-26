# 2026-11-24 점검 종합본 사실 확인 (2026-11-26)

> 대상: `docs/SITE_SECURITY_PERFORMANCE_AUDIT_2026-11-24.md`
>
> 기준: 브랜치 `codex/next16-prisma-security-upgrade`, 커밋 `a34d5133`. 대상 문서에는 확인 시점에 커밋되지 않은 수정이 있었고, 그 작업 사본을 읽었다.
>
> 방법: 코드 읽기와 읽기 전용 명령. 코드·설정·데이터·원본 문서는 바꾸지 않았다.

## 1. 결론

코드에 근거한 주장 60건을 대조했다.

| 판정 | 건수 |
|---|---|
| 맞음 | 44 |
| 부분적으로 맞음 | 16 |
| 틀림 | 0 |
| 확인한 범위에서 이미 해결됨 | 0 (일부만 충족된 항목은 아래에 적음) |

발견 사항은 대체로 믿을 수 있다. 다만 작업을 시작하기 전에 2절의 세 가지는 작업 목록에 반영해야 한다.

## 2. 작업 순서에 영향을 주는 정정

### 2-1. 10절 수정 목록 4번: 알레르기 연결 복원은 지금 동작하지 않는 코드다

- 식자재 삭제 실행취소의 알레르기 연결 복원은 `hasStore('nutrition_allergy_links')`일 때만 실행된다 (`app/ingredient/manage/ingredientManageUtils.js:63-69`).
- 이 store는 DB v20에서 삭제됐다 (`lib/db/schema/index.js:97-100`, `lib/db/constants.js:74`). 알레르기는 `cost_ingredients.allergens`에 있다.
- 따라서 "식자재와 알레르기 연결을 한 트랜잭션으로 복원"은 고칠 대상이 없다. BUG-011(`docs/DEFERRED_WORK.md:322-326`)도 같은 이유로 지금은 영향이 없고 보류로 기록돼 있다.
- **남길 부분:** 일괄 실행취소가 실패 건수만 알리고 제품코드를 알려 주지 않는 문제는 맞다 (`ingredientManageUtils.js:73-85`).
- 문서의 완료 기준(연결 두 건 중 두 번째 저장 실패 재현)은 지금 DB에서 만들 수 없다.

### 2-2. 10절 수정 목록 1번: 문제는 맞고, 호출 원인은 따로 있다

- `/login`에도 `AppShell`이 마운트되는 것은 맞다 (`app/layout.jsx:44`, `app/login/layout.jsx`).
- `/api/db/store-rows?manifest=1` 호출은 `usePageStats`가 아니라 `SyncGuardNotice` → `evaluateSyncGuard` → `readServerManifest`에서 나온다 (`components/SyncGuardNotice.jsx:19-24`, `lib/db/sync-guard.js:200`, `lib/db/server-hydrate.js:74-76`).
- 이 호출은 권한 있는 클라이언트이면서 서버에서 불러온 적이 없는 브랜드일 때만 생긴다. `usePageStats`는 브라우저 IndexedDB만 읽는다.
- AppShell을 분리하면 둘 다 해결되지만, 완료 기준 검사는 "불러온 적 없는 브라우저"에서 해야 의미가 있다.

### 2-3. P0-4와 5단계 1번: 최초 설정의 localhost 제한은 이미 일부 있다

- 서버 인증이 설정되지 않았을 때 루프백이 아닌 요청은 409로 거절한다 (`app/api/auth/session/route.js:36-40`). 문서에는 이 제한이 빠져 있다.
- 다만 판정은 요청의 `Host` 헤더만 본다 (`lib/server/request-guard.js:37-39`). 포트가 LAN에 열린 상태에서는 직접 만든 요청이 `Host: localhost`를 보내 통과할 수 있다고 읽힌다. 실제 요청으로 시험하지는 않았다.
- 남은 작업은 일회용 설치 토큰, 서버 쪽 비밀번호 정책, Host 헤더에 의존하지 않는 판정이다.

## 3. 표현을 고쳐야 할 부분

| ID | 문서의 설명 | 실제 |
|---|---|---|
| A2 | HTTPS 요청에서는 `Secure`가 붙는다 | `request.url`의 프로토콜로만 판단한다. HTTPS를 대신 처리하는 프록시 뒤에서는 빠질 수 있고, 쿠키를 지우는 응답에는 `Secure`가 없다. |
| A11 | 공인 IP 조회를 기본 비활성화하고 버튼 실행 유지 | 이미 버튼을 눌렀을 때만 전송한다. 화면을 열 때는 저장된 값만 읽는다. 남은 것은 개인정보 안내 확인뿐이다. |
| A13 | `SECURITY_POLICY.md`의 서버 인증 없음, `middleware.ts`, `v3:auth` 설명 | 앞의 두 가지는 문서에 있다. `v3:auth` 설명은 없다. |
| A14 | 최초 설정 경로는 verifier 형식만 확인 | 형식 검사에 더해 루프백 제한이 있다 (2-3). |
| B2 | 라이브 위젯 13개와 판매 통계 6개를 병렬 호출 | 판매 통계 6개는 13개가 끝난 **뒤에** 실행된다. 요청 번호와 취소가 없는 것은 맞다. |
| B6 | focus·visibility 갱신에 최소 간격이 없음 | `useRefreshOnReturn`에는 1.5초 간격이 있다. 간격이 없는 것은 플랫폼 수수료 hydrate, `useVisibilityRefresh`, `usePageStats`다. |
| B8 | 중첩 깊이와 총 레코드 수 상한이 없음 | 맞다. 다만 localStorage 키 확인에는 2,000개 상한이 있다. |
| B10 | 다른 client가 같은 recordKey를 쓰면 분기 행 생성 | 기존 행의 출처가 다를 때 만든다. 출처가 없는 기존 행과 내용이 같으면 만들지 않는다. 해결 화면이 없는 것은 맞다. |
| B16 | 설정 store를 제외한 모든 store의 행 수 계산 | `settings`와 `migration_flags` 두 개를 제외한다. |
| B17 | 모든 `mousemove`마다 카드 위치 계산 | 대상 카드(`.card-lift`) 밖이면 바로 끝난다. rAF와 동작 줄이기 확인이 없는 것은 맞고, CSS의 동작 줄이기 규칙은 transform 자체를 없애지 않는다. |
| B19 | 전역 오류 화면이 모든 장애를 서버 연결 오류로 표시 | `app/error.jsx`만 그렇다(5초 대기). `app/global-error.jsx`는 다른 문구를 쓰고 바로 다시 시도한다. |
| B21 | barrel이 시드 모듈을 재수출 | 재수출하는 것은 상수 2개지만, 같은 16KB 데이터 파일(`INGREDIENT_MASTER_SEED` 포함)을 거친다. 실제 번들 포함 여부는 번들 분석이 필요하다. |
| C1 | 로그인 화면의 AppShell이 보호 API 호출 | 2-2 참고. |
| C4 | 알레르기 연결의 부분 복원 | 2-1 참고. |
| C10 | `readRestoreJournal()`을 호출하는 곳은 테스트뿐 | 결론은 맞다. 앱은 일지를 기록하지만(`lib/db/backup.js:288-455`) 다시 읽지 않는다. |
| D2 | 메뉴마스터의 상태별 필터·이슈·카테고리 개수가 렌더마다 다시 계산 | 상태별 필터 3개와 `buildRecipeIssues`, 레시피 작성 개수는 렌더마다 계산한다. 카테고리 개수는 `useMemo`로 감싸져 있어 데이터가 바뀔 때만 계산한다(카테고리마다 전체를 훑는 것은 맞다). |

경로 정정: `MenuMasterHeaderActions.jsx`는 `components/menu-master/`에 있다.

## 4. 문서에 없던 추가 발견

우선순위는 제안이다.

| 제안 | 내용 | 근거 |
|---|---|---|
| P1 (LAN 사용 시) | 루프백 판정이 `Host` 헤더에 의존한다. 최초 설정 전에만 영향이 있다. | `lib/server/request-guard.js:37-39` |
| P2 | 로그인 challenge 발급(GET)은 로그인이 필요 없다. 포트에 닿으면 누구나 메모리 Map을 늘릴 수 있다. P1-2를 고칠 때 함께 다룬다. | `app/api/auth/session/route.js:23-30`, `lib/server/session-auth.js:62-68` |
| P2 | `.runtime-auth.json`이 정상 JSON이어도 `secret`이 없으면 새 상태를 덮어써 기존 verifier가 사라진다. 이때 서버는 "인증 미설정" 상태가 된다. | `lib/server/session-auth.js:31-40` |
| P2 | 사진 변환 중 예외가 나면 대기 상태로 남는 것에 더해 임시 URL도 해제되지 않는다. | `lib/image/resize.js:50-72` |
| P3 | index를 섞은 React key가 문서가 짚은 식자재 표 외에도 있다. | `components/ingredient/IssuesView.jsx:374`, `components/ingredient/usage/IngredientUsageTable.jsx:42` |
| P3 | 사이드카 없는 덤프 2개(2026-09-29, 2026-11-23, 합계 약 303MB)가 `.db-backups`에 남아 있다. 백업 수에는 포함되지 않는다. | `lib/server/local-db-backups.js:57-74` |
| P3 | 요청 방어 파일의 설명 주석이 "서버 세션 인증이 없다"로 남아 있다. | `lib/server/request-guard.js:1-5` |
| 참고 | `package.json`의 `dev`·`start`에는 `-H`가 없다. 확인 시점의 실행 서버는 `127.0.0.1:3000`에만 열려 있었다. | `netstat` 확인 |

참고로 GET `/api/db/store-rows`만 모든 실패를 400으로 돌려주고, POST는 400과 503을 구분한다 (`app/api/db/store-rows/route.js:42-50, 90-105`). 문서의 P2-8은 GET에 한정된 것으로 맞다.

## 5. 숫자 지표 재측정

| 항목 | 문서 (11-24) | 재측정 (11-26) |
|---|---|---|
| Jest | 482묶음·3,417개 통과, 2묶음·13개 건너뜀 | 같음 |
| ESLint | 통과 | 통과 |
| Prisma 스키마 검증 | 통과 | 통과 |
| 문서 감사 | 9개 지표 불일치 | 같음(수치도 문서에 적힌 값과 같음) |
| npm audit | 고위험 6건 | 같음. `brace-expansion`·`browserslist`·`js-yaml`은 `npm audit fix`, `effect` 쪽은 `--force`만 제안됨 |
| 원가 감사 | 메뉴 95, 화면 간 불일치 0, 비교 71 | 같음. 없는 제품코드 0, 판매 중 메뉴의 단종 식자재 0 |
| 판매가 없는 레시피 | 2건(OPT-EDGE-001·004) | 같음 |
| 서버 저장 행 | 303,653 | 303,662 |
| 백업 | 유효 14개, 약 220~243MB | 유효 14개, 219.6~247.5MB. 최신 11-26 |
| CSS | 24개·약 235KB | 24개·235,959바이트 |
| 로고 | 약 169KB | 173,115바이트 |
| 버전 | Next 16.4.6, Prisma 7.10.1 | 같음 |

## 6. 이번에 확인하지 않은 것 (절 번호는 원본 문서 기준)

- 프로덕션 빌드, 로그인 HTTP 200·JS 22개 MIME, 390px·1280px Chromium 점검, 비로그인 307·401 응답
- 가져오기 이력, 실제 백업 복원, 재부팅, 장시간 사용, 성능 시간 측정
- 원본 2절의 CSV 수식 인젝션 방어와 업로드 정책, 7·8절, 16절의 느린 조회 경고(P2-21), 18절의 모션 적용 기록
- P2-7(민감 store 단일 기기 의존), P2-12(파괴적 작업의 서버 감사 이력)
- 14절은 결함 주장이 아니라 추가 점검 목록이라 대상에서 뺐다.
- 17절은 C11·C12만 확인했다. 나머지는 기능 제안이다.
- A10에서 Next가 기본으로 붙이는 응답 헤더는 실행 중 서버로 확인하지 않았다. 설정에 `default-src`·`script-src`·`poweredByHeader: false`가 없는 것은 확인했다.

## 7. 판정 전체

"부분" 항목과 2·4절의 근거는 코드를 직접 다시 읽었다. 나머지 "맞음" 항목은 조사 에이전트가 제시한 file:line을 옮겼다. 줄 번호는 기준 커밋의 것이다.

### 보안 (A)

| ID | 주장 요약 | 판정 | 근거 |
|---|---|---|---|
| A1 | DB API가 로컬 요청·인증을 모두 검사 | 맞음 | `app/api/db/store-rows/route.js:22-23,64-65`, `backups/route.js:18-19,38-39`, `health/route.js:11-12` |
| A2 | 세션 쿠키 속성 | 부분 | `app/api/auth/session/route.js:44`, `lib/server/session-auth.js:102,106` |
| A3 | 본문 크기 제한, proxy 선차단 | 맞음 | `proxy.ts:10-18`, `lib/server/request-body-limit.js:11-22` (Content-Length가 없으면 전부 읽은 뒤 검사) |
| A4 | 민감 store 동기화 제외 | 맞음 | `lib/server/sensitive-stores.js:17-20` |
| A5 | 서버에 사용자·역할 없음 | 맞음 | `lib/server/session-auth.js:100`, `lib/auth/accounts.js:137-150` (비루프백 viewer 판정도 브라우저 쪽이며 `lib/db/sync-mode.js:63-67`의 로컬 설정이 우선) |
| A6 | 로그인 실패 제한이 localStorage에만 있음 | 맞음 | `lib/auth.js:17-55`, `app/api/auth/session/route.js:32-51` |
| A7 | 외부 로그인정보 평문 저장 | 맞음 | `lib/rnd/login-info.js:32` |
| A8 | 비밀번호 변경 후 기존 세션 유지 | 맞음 | `lib/server/session-auth.js:92-96` |
| A9 | challenge Map 상한 없음 | 맞음 | `lib/server/session-auth.js:8-9,62-68` |
| A10 | CSP가 3개 지시어만 제한 | 맞음 | `next.config.mjs` |
| A11 | 공인 IP 조회 | 부분 | `lib/session.js:108-113`, `app/settings/account/page.jsx:88-100` |
| A12 | 로그아웃(DELETE)에 출처 검사 없음 | 맞음 | `app/api/auth/session/route.js:64-66` |
| A13 | 보안 정책 문서가 낡음 | 부분 | `docs/SECURITY_POLICY.md:4,15,75` |
| A14 | 최초 비밀번호 서버 검사 없음, verifier로 로그인 가능 | 부분 | `app/login/page.jsx:67-69`, `lib/server/session-auth.js:85-90`, `app/api/auth/session/route.js:36-40` |
| A15 | proxy가 쿠키 존재만 확인 | 맞음 | `proxy.ts:20-36` |
| A16 | 인증 상태 파일 손상 복구·동기 I/O | 맞음 | `lib/server/session-auth.js:24-40` |
| A17 | 백업 생성에 잠금·간격 제한 없음 | 맞음 | `lib/server/local-db-backups.js:100-108` |
| A18 | 조회 API가 DB 장애도 400 | 맞음 | `app/api/db/store-rows/route.js:42-50` |

### 성능·동기화·파일 (B)

| ID | 주장 요약 | 판정 | 근거 |
|---|---|---|---|
| B1 | 화면 이동마다 배지 재조회 | 맞음 | `hooks/usePageStats.js:48-78` |
| B2 | 홈 병렬 로드, 세대 관리 없음 | 부분 | `hooks/useHomeDashboardData.js:86-156` |
| B3 | `getAll`은 진행 중 요청만 공유 | 맞음 | `lib/db/crud.js:43-72` |
| B4 | 500건을 한 트랜잭션에서 순차 처리 | 맞음 | `lib/server/store-row-sync.js:12,221-276` |
| B5 | 20MB 본문 전체 버퍼링 | 맞음 | `lib/server/request-body-limit.js:1,20-22` |
| B6 | focus 갱신 간격 | 부분 | `components/AppShell.jsx:103-109`, `hooks/useRefreshOnReturn.js:4-28` |
| B7 | 종료 시 beacon 한도, 메모리 큐 | 맞음 | `lib/db/server-sync.js:24,176-224` |
| B8 | 500MB 복원을 메인 스레드에서 파싱 | 부분 | `hooks/useRestoreFile.js:19-28`, `lib/backup/validation.js:13` |
| B9 | Excel 행·열·셀 상한 없음 | 맞음 | `lib/upload-policy.js:28-30`, `lib/excel.js:114-118` |
| B10 | 충돌 분기 행 해결 화면 없음 | 부분 | `lib/server/store-row-sync.js:80-85,175-182`, `app/settings/sync/page.jsx:351,494` |
| B11 | store별 필드 검증 없음 | 맞음 | `lib/server/store-row-sync.js:97-161` |
| B12 | 오프라인 표시가 `navigator.onLine`만 사용 | 맞음 | `components/OfflineIndicator.jsx:13,69` |
| B13 | 첫 행은 응답 상한을 넘어도 반환 | 맞음 | `lib/server/store-row-read.js:39,212-218` |
| B14 | 사진 동시 변환, 예외 미전달 | 맞음 | `lib/image/resize.js:50-81` |
| B15 | DB 업그레이드 차단 시 재시도 없음 | 맞음 | `lib/db/init.js:64-72` |
| B16 | 시작 때 store 행 수 계산 | 부분 | `lib/db/startup-snapshot.js:12-35` |
| B17 | 카드 기울기 효과 | 부분 | `hooks/useVisualEffects.js:82-92`, `app/styles/features/motion.css:320-336` |
| B18 | 전역 CSS 24개 | 맞음 | `app/globals.css:1-24` |
| B19 | 오류 화면 문구·5초 대기 | 부분 | `app/error.jsx:18,58`, `app/global-error.jsx` |
| B20 | 같은 화면 링크에서 진행 막대가 남음 | 맞음 | `components/ProgressBar.jsx:23-54` |
| B21 | 시드 재수출 | 부분 | `lib/ingredient/index.js:89`, `lib/ingredient/master-seed.js` |
| B22 | 로고 약 169KB | 맞음 | `public/logo-taemyeong.png` |
| B23 | 메뉴마스터 조회 전 정규화 3종 | 맞음 | `app/menu-master/page.jsx:93-102` |
| B24 | 단가 알림마다 즉시 reload | 맞음 | `hooks/useDBLoad.js:41-73`, `app/menu-master/page.jsx:135` |
| B25 | 원가 보고서가 갱신 때 결과를 비움 | 맞음 | `app/report/cost/page.jsx:185` |
| B26 | 식자재 표 key에 index | 맞음 | `app/ingredient/manage/IngredientManagePanel.jsx:266-267` |

### 업무 흐름 (C)

| ID | 주장 요약 | 판정 | 근거 |
|---|---|---|---|
| C1 | 로그인 화면의 업무 AppShell | 부분 | 2-2 |
| C2 | 임시저장 실패를 성공으로 표시 | 맞음 | `lib/note/storage.js:40-44`, `app/note/write/useNoteWriteDraftAutosave.js:28-31` |
| C3 | 상태만 바꾼 초안의 복구 안내 누락 | 맞음 | `app/note/[id]/detail/noteDetailUtils.js:8-15`, `app/note/[id]/page.jsx:107-131` |
| C4 | 실행취소의 부분 복원 | 부분 | 2-1 |
| C5 | 이슈 집계 실패를 0으로 표시 | 맞음 | `hooks/usePageStats.js:51-54` |
| C6 | 새로고침이 선택 월 판매 통계를 건너뛰고 성공 안내 | 맞음 | `app/page.jsx:262-267`, `hooks/useHomeDashboardData.js:123,202-205` |
| C7 | DB 상태 실패 시 백업 0개 표시 | 맞음 | `app/settings/backup/useServerBackupStatus.js:17-22`, `panels/ServerBackupStatusCard.jsx:67-123` |
| C8 | 다운로드 요청 즉시 백업 완료 | 맞음 | `lib/download.js:73-80`, `useBackupActions.js:55-64` |
| C9 | 백업 권장 배너가 갱신되지 않음 | 맞음 | `useBackupHistory.js:11-17`, `useBackupActions.js:61-62` |
| C10 | 복원 일지를 읽지 않음 | 부분 | `lib/backup/restore-journal.js:68`, `lib/db/backup.js:288-455` |
| C11 | 통합 검색: 취소해도 최근 방문 기록, 목록 화면으로 연결, 초성 검색 없음 | 맞음 | `components/command-palette/useCommandPaletteState.js:106-107`, `paletteUtils.js:33-34,77-97` |
| C12 | 내보내기의 알레르기 범위·이슈 열·버튼 문구 | 맞음 | `lib/menu-master/allergen-summary.js:36-42`, `app/menu-master/menuMasterExport.js`, `components/menu-master/MenuMasterHeaderActions.jsx:26` |
| C13 | 식자재 삭제 cascade가 단일 트랜잭션 아님 | 맞음 (지금은 영향 없음) | `docs/DEFERRED_WORK.md:322-326` |
| C14 | OPT-EDGE-001·004가 존재 | 맞음 | `lib/menu-master/seed.js:614,660` |

### 19절 추가 대조 (D)

| ID | 주장 요약 | 판정 | 근거 |
|---|---|---|---|
| D1 | 메뉴마스터 한 번 로드에 식자재·레시피를 거듭 조회 | 맞음 | `lib/menu-master/recipe-summary.js:299-306` 다음에 `lib/menu-master/allergen-summary.js:23-28`이 순서대로 다시 읽음 (`app/menu-master/page.jsx:103-122`) |
| D2 | 파생 계산이 메모화되지 않음 | 부분 | `app/menu-master/page.jsx:181-195`, `hooks/useMenuMasterFilters.js:44-50` |
