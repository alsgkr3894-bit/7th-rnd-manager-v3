# SITE_AUDIT_REPORT

감사 기준일: 2026-06-14
감사 범위: Next.js App Router 기반 7번가 R&D 플랫폼 전체 구조, 화면 흐름, IndexedDB 로직, 인증/권한, 백업/복원, 테스트/배포 준비 상태
작업 원칙: 기존 코드와 다른 기존 MD 파일은 수정하지 않았고, 본 리포트 파일만 작성/보강했다.

이번 감사 중 확인한 항목:

| 항목 | 결과 | 비고 |
|---|---|---|
| 파일/구조 분석 | 완료 | `app`, `components`, `hooks`, `lib`, `scripts`, `__tests__`, `docs`, `public`, 루트 설정 파일 확인 |
| `SITE_AUDIT_REPORT.md` | 작성/보강 | 요청된 13개 섹션 기준으로 정리 |
| `npm test`, `npm run lint`, `npm run format:check` | 미실행 | 이번 요청은 코드 비수정 감사 리포트 작성이므로 테스트 재실행은 하지 않음 |
| `npm run build` | 미실행 | `.next` 생성/변경 가능성이 있어 이번 요청의 기존 파일 비수정 원칙을 우선함 |
| CI 워크플로 | 확인되지 않음 | `.github` 디렉터리 없음 |

## 1. 전체 요약

현재 프로젝트는 단순 프로토타입을 넘어, 판매량, 식자재, 제때 가격/출고, 원가, 영양성분, 메뉴개발노트, 보고서, 백업/복원까지 폭넓은 업무 흐름을 한 앱 안에 통합한 내부 운영 도구에 가깝다. App Router 기반 라우팅, 모듈별 IndexedDB store, 백업 범위 분리, ErrorBoundary, skip link, lazy import, Jest 테스트 등 이미 운영 품질을 의식한 흔적이 많다.

가장 큰 문제는 실제 서비스 운영 기준의 인증/권한 경계가 없다시피 하다는 점이다. `middleware.ts:24`는 `v3:auth` 쿠키 존재 여부만 확인하고, `lib/auth.js:99`, `lib/auth.js:121`은 비밀번호 해시와 세션 쿠키를 모두 브라우저가 직접 제어한다. 로컬 단독 도구라면 의도된 설계로 볼 수 있지만, 사내망 또는 외부 접근 가능한 운영 서비스로 배포한다면 P0 보안 리스크다.

두 번째 큰 문제는 데이터 정합성이다. `lib/db/backup.js:154`의 복원은 store별 순차 교체이고 전체 복원 단위의 롤백이 없다. `lib/menu-master/store.js:94`, `lib/ingredient/store.js:474`, `lib/note/store.js:137`도 여러 store 또는 계층 데이터 삭제가 부분 반영될 수 있다. 백업/경고 UX는 잘 되어 있으나, 업무 데이터 손실 가능성을 줄이려면 도메인별 삭제/복원 트랜잭션 정책을 더 명확히 해야 한다.

세 번째 문제는 유지보수 규모다. `app`에 54개 `page.jsx`가 있고, `app/note/_NoteContent.jsx` 1,002라인, `app/report/sales/page.jsx` 938라인, `lib/ingredient/store.js` 839라인, `app/nutrition/allergen/page.jsx` 813라인 등 큰 파일이 많다. 현재 기능을 이해하고 수정할 수는 있지만, 신규 기능이 늘어날수록 화면 상태, IndexedDB 호출, 도메인 계산, 검증, 토스트가 한 파일에 뭉칠 위험이 커진다.

가장 먼저 개선해야 할 부분:

| 우선순위 | 항목 | 이유 | 승인 필요 여부 |
|---|---|---|---|
| P0 | 인증/권한 모델 결정 | 운영 서비스라면 현재 쿠키/로컬 해시 방식은 우회 가능 | 필요 |
| P1 | 복원/삭제 정합성 보강 | 일부 store만 복원/삭제되는 상황이 업무 데이터 손실로 이어질 수 있음 | 필요 |
| P1 | 위험 작업 보호 강화 | 전체 초기화, DB 재생성, 복원 등 파괴적 작업이 클라이언트 권한에 의존 | 필요 |
| P2 | 대형 화면/도메인 파일 분리 | 유지보수와 테스트 난이도 증가 | 필요 |
| P2 | CI에 lint/test/build/QA 편입 | 검증 스크립트는 있으나 자동 게이트가 확인되지 않음 | 필요 |

바로 수정해도 되는 항목은 기능 영향이 낮은 문서/정리/테스트 보강류다. 다만 이번 요청에서는 직접 수정하지 않았다.

| 항목 | 추천 |
|---|---|
| 단축키 설명 중복 | `components/AppShell.jsx:38`, `components/AppShell.jsx:42`의 `G R`, `G B`가 모두 보고서로 표시되므로 의미 재정리 |
| 보고서 홈의 임시/하드코딩 지표 | `app/report/page.jsx`의 자동 생성 수치 등 실제 기능 여부와 UI 문구 정리 |
| CSV 파서 제한 문서화 | `lib/excel.js:64`는 줄 단위 CSV 파서라 quoted multi-line 입력 제한을 문서화하거나 파서 교체 |
| 접근성 라벨 정리 | `title`만 있는 버튼을 `aria-label`로 보강 |

승인 후 수정해야 하는 항목:

| 항목 | 승인 필요한 이유 |
|---|---|
| 인증 서버화, 세션 서명, 권한 강제 | 앱 사용 방식과 배포 아키텍처 결정이 필요 |
| 삭제/복원 로직의 트랜잭션 재설계 | 데이터 마이그레이션과 업무 흐름 영향 가능 |
| 폴더 구조 재편, 대형 컴포넌트 분리 | import 경로, 테스트, QA 범위가 넓음 |
| DB schema/index 변경 | `DB_VERSION` 증가와 마이그레이션 필요 |
| 위험 영역 UI/정책 변경 | 운영자 워크플로와 복구 절차 결정 필요 |

## 2. 프로젝트 구조 요약

| 구분 | 관련 파일/폴더 | 현재 역할 | 평가 | 개선 필요 여부 |
|---|---|---|---|---|
| 앱 라우팅 | `app/**/page.jsx` | 54개 App Router 페이지로 도메인별 화면 제공 | 업무 범위가 명확하나 일부 라우트가 메뉴에 드러나지 않음 | 필요 |
| 루트 레이아웃 | `app/layout.jsx` | 전역 CSS, Pretendard 폰트, metadata, viewport, AppShell, ErrorBoundary 적용 | 기본 구조 양호, 확대 허용과 한국어 lang 설정 좋음 | 일부 필요 |
| 전역 쉘 | `components/AppShell.jsx` | 사이드바, TopBar, 단축키, 팔레트, 브랜드 전환, 세션, 공통 알림, 모바일 탭 | 기능이 집중되어 있어 안정적이나 책임이 큼 | 필요 |
| 내비게이션 정의 | `lib/menu.js` | 사이드바와 모바일 탭 메뉴 정의 | 단일 소스 장점, 모바일 탭과 실제 사이드바 노출 차이 있음 | 필요 |
| 도메인 라이브러리 | `lib/sales`, `lib/ingredient`, `lib/cost`, `lib/nutrition`, `lib/report`, `lib/note` | 데이터 변환, IndexedDB CRUD, 계산 로직 | 도메인별 분리는 양호하나 일부 store 파일이 과대 | 필요 |
| IndexedDB 코어 | `lib/db/*` | DB 초기화, schema, CRUD, 백업/복원, 모듈별 store 그룹 | 모듈화와 버전 마이그레이션 설계 양호 | 일부 필요 |
| 상태 관리 | `hooks/*`, localStorage, sessionStorage, IndexedDB | React hook과 브라우저 저장소 중심 상태 관리 | 서버 없는 앱에는 적합, 권한/보안 상태까지 클라이언트 의존 | 필요 |
| UI 컴포넌트 | `components/*`, `app/**/_*.jsx` | 공통 UI, 모달, 테이블, 도메인 컴포넌트 | 재사용 컴포넌트가 있으나 페이지 내부 로직도 많음 | 필요 |
| 스타일 | `app/styles/**`, `app/globals.css` | 토큰, 레이아웃, 도메인별 CSS | 반응형/포커스/모션 대응이 있으나 스타일 파일도 커짐 | 일부 필요 |
| 인증 | `middleware.ts`, `lib/auth.js`, `app/login/page.jsx` | 로컬 비밀번호와 쿠키 기반 로그인 게이트 | 실제 운영 보안 기준 미달 | 필요 |
| 계정/역할 | `lib/auth/accounts.js`, `hooks/useCurrentRole.js`, `app/settings/account/page.jsx` | 로컬 admin/viewer 계정과 활성 계정 | UX 권한 수준, 보안 경계 아님 | 필요 |
| 백업/복원 | `app/settings/backup`, `app/settings/restore`, `lib/db/backup.js` | JSON 백업, 범위 선택 복원, 자동 백업 | 사용자 보호 UX 좋음, 전체 원자성 부족 | 필요 |
| 테스트 | `__tests__/**` | 도메인/훅/스크립트 Jest 테스트 | 수량과 범위가 좋고 현재 통과 | 일부 필요 |
| 스크립트 | `scripts/*.mjs`, `verify-*.mjs` | dev 준비, clean build, smoke/runtime QA, 과거 검증 스크립트 | QA 자동화 기반 있음, 정리 후보 존재 | 필요 |
| 정적 파일 | `public/*`, `public/manifest.json` | 로고, 아이콘, 폰트, 엑셀 템플릿, PWA manifest | 내부 앱 기준 충분 | 일부 필요 |
| 설정 | `package.json`, `next.config.mjs`, `.eslintrc.json`, `jsconfig.json`, `vercel.json` | Next/Jest/ESLint/Prettier/빌드 설정 | 기본은 단순하고 안정적, 운영 보안 헤더/CI는 부족 | 필요 |

## 3. 사이트 구조 및 사용자 흐름 평가

| 영역 | 현재 구조 | 문제점 | 사용자 영향 | 추천 개선 |
|---|---|---|---|---|
| 홈 대시보드 | `app/page.jsx`, `hooks/useHomeDashboardData.js` 중심으로 주요 업무 현황 제공 | 여러 IndexedDB 데이터를 한 번에 읽는 구조로 데이터 증가 시 초기 렌더 지연 가능 | 첫 화면에서 느림이나 부분 빈 상태가 발생할 수 있음 | 위젯별 lazy load, skeleton, 실패 위젯 독립 처리 |
| 사이드바 흐름 | `lib/menu.js`의 7개 섹션으로 업무별 그룹화 | `app/cost/pizza`, `app/cost/personal`, `app/cost/side`, `app/cost/set`, `app/cost/all-summary` 등 상세 원가 라우트가 사이드바에는 직접 없음 | 모바일 탭의 원가 진입과 데스크톱 사이드바 탐색 경험이 다를 수 있음 | 메뉴 노출 정책을 명시하고 상세 화면은 상위 페이지에서 일관된 탭/링크 제공 |
| 모바일 탭 | `MOBILE_TAB_DEFS`가 홈, 판매량, 원가, 노트, 보고서를 제공 | 원가 탭은 `/cost/pizza`로 가지만 사이드바 원가 기본 흐름은 `/cost/ingredient-price`, `/cost/recipe`, `/cost/margin` | 사용자가 모바일과 데스크톱에서 다른 첫 화면을 경험 | 모바일/데스크톱 정보 구조를 맞추거나 의도된 차이를 문서화 |
| 브랜드 전환 | `components/AppShell.jsx:178`에서 active brand 저장 후 reload | reload는 단순하고 안전하지만 편집 중 상태 손실 가능 | 미저장 입력이 있을 때 데이터 손실 가능 | dirty form 감지 후 확인 또는 전환 전 저장 안내 |
| 검색/팔레트 | `CommandPalette`, TopBar 검색, `/` 포커스 단축키 | 검색 대상과 페이지 내 검색의 경계가 완전히 명확하지 않음 | 고급 사용자는 빠르지만 초보자는 기능 차이를 혼동 가능 | 팔레트 결과 범위와 페이지 검색 입력을 시각적으로 구분 |
| 업로드 흐름 | 판매량/가격/출고량 업로드 후 매칭/보고서로 연결 | 월 중복, 파일 중복, schema 오류 등 일부는 앱 레벨 검사 | 다중 탭 동시 작업 시 중복 삽입 가능성 | DB unique index 또는 업로드 락 도입 검토 |
| 백업/복원 흐름 | 파일 선택, 검증, 범위 선택, 영향 미리보기, 자동 백업 후 복원 | 자동 백업 UX는 좋으나 복원 중 일부 실패 시 DB가 부분 갱신될 수 있음 | 복구 난이도 상승 | 복원 dry-run, 전체 실패 시 중단, store 그룹별 원자 복원 정책 추가 |
| 위험 영역 | `app/settings/system/page.jsx:426`의 전체 초기화/DB 재생성 | 로컬 확인 버튼만으로 모든 데이터 삭제 가능 | 오조작 시 업무 데이터 손실 | 백업 강제, 문구 입력 확인, 운영자 권한 서버 검증 |
| 노트 계층 | `getNotesInChain`은 재귀 체인을 지원하지만 `deleteNote`는 직계 자식만 삭제 | 깊은 계층이 생기면 손자 노트 orphan 가능 | 노트 목록/검색에 연결 끊긴 기록 노출 가능 | 삭제 전에 전체 descendant 수집 후 단일 트랜잭션 삭제 |
| 보고서센터 | 생성/미리보기/공유 UI 구조 존재 | 일부 통계/공유는 실제 외부 공유가 아닌 로컬/추정 흐름으로 보임, 확인 필요 | 사용자가 자동 생성/공유 기능을 실제 운영 기능으로 오해 가능 | 실제 기능과 placeholder를 명확히 분리 |
| 로딩/빈/에러 상태 | Toast, ErrorBoundary, 페이지별 빈 상태 다수 | 대형 페이지마다 처리 방식이 다름 | 실패 메시지와 복구 행동이 화면별로 다를 수 있음 | 공통 AsyncState, EmptyState, ErrorPanel 패턴 정착 |
| 반응형 | 전역 layout media query와 도메인별 CSS 존재 | 대형 테이블/모달은 실제 모바일 QA 필요 | 모바일에서 가로 스크롤 또는 버튼 밀림 가능 | Playwright viewport smoke와 주요 테이블 스크린샷 기준 추가 |

## 4. 전체 로직 점검 결과

| 로직 영역 | 관련 파일 | 현재 구조 | 문제점 | 추천 개선 |
|---|---|---|---|---|
| 데이터 저장소 | `lib/db/init.js`, `lib/db/schema/index.js`, `lib/db/constants.js` | 브랜드별 IndexedDB, main DB 공유 store, DB_VERSION 19 | 서버 저장소가 없으므로 기기/브라우저 종속 | 운영 서비스면 서버 DB 또는 sync 계층 결정 필요 |
| DB schema | `lib/db/schema/*`, `lib/db/constants.js:23` | 43개 store를 도메인별 생성 | 일부 중복 방지가 앱 로직에 머묾 | 업무상 유일해야 하는 key는 schema unique 검토 |
| 공통 CRUD | `lib/db/crud.js` | `getAll`, `getById`, `getByIndex`, `runTransaction`, `bulkPut` 제공 | `getAll()` 사용이 많아 대용량 성능 한계 | index 기반 query helper, pagination helper 추가 |
| 백업 | `lib/db/backup.js:55`, `app/settings/backup` | 선택 store를 JSON으로 export, 실패 store 기록 | 백업 파일 무결성 서명/암호화 없음 | 운영 데이터면 암호화/서명/다운로드 보관 정책 필요 |
| 복원 | `lib/db/backup.js:125`, `app/settings/restore/page.jsx:128` | 자동 백업 후 선택 store만 import | store별 replace라 전체 원자성 없음 | 복원 전 validation 강화, 그룹 단위 transaction 가능 범위 설계 |
| 판매량 업로드 | `lib/sales/store-files.js:52` | `sales_files`, `sales_rows`, `menu_sales_issues`, `upload_log`를 한 트랜잭션 저장 | 월 중복은 앱 레벨 선검사 | `sales_files.year_month` unique 또는 중복 허용 정책 명문화 |
| 판매량 분류 | `lib/sales/data/rules/*`, `lib/sales/*` | 룰 기반 분류와 미매칭 관리 | `rules-pizza.js` 1,110라인 등 룰 데이터가 커짐 | 룰 정의를 데이터 파일/테이블로 분리하고 fixture 테스트 확대 |
| 메뉴 마스터 삭제 | `lib/menu-master/store.js:94` | menu_master 삭제 후 가격/레시피/영양 참조 cascade | 여러 transaction/동적 import로 부분 실패 가능 | 삭제 계획 preview와 원자적 삭제 범위 재설계 |
| 식자재 삭제 | `lib/ingredient/store.js:474` | 식자재 삭제 후 영양값/알레르기 링크 삭제, snapshot 반환 | 식자재 삭제는 먼저 commit되고 cascade 실패는 경고 | 관련 store를 한 transaction으로 묶거나 보정 job 제공 |
| 식자재 참조 검증 | `lib/ingredient/store.js:69` | compositeOf 누락 참조를 best-effort 경고 | 참조 누락이 저장 차단으로 이어지지 않음 | 업무 정책에 따라 오류 차단 또는 repair queue 도입 |
| 노트 삭제 | `lib/note/store.js:137` | 부모와 직계 자식 삭제 | 주석은 parentId 체인 삭제를 말하지만 구현은 1단계 자식만 삭제 | `getNotesInChain` 또는 descendant 수집 함수로 삭제 대상 일치 |
| 계정/역할 | `lib/auth/accounts.js`, `hooks/useCurrentRole.js` | 로컬 ref_accounts와 localStorage active account | 기본 admin fallback, 클라이언트 조작 가능 | 실제 권한이면 서버 검증, 로컬이면 UI 보호라고 명시 |
| 설정 | `lib/settings`, `app/settings/system/page.jsx` | localStorage 기반 즉시 적용 | 설정 유효성/스키마가 약함 | 설정 schema, 기본값, migration, invalid value repair |
| 파일 파싱 | `lib/excel.js` | xlsx lazy import, CSV 직접 파싱 | CSV quoted multi-line 미지원 | PapaParse 등 검증된 CSV parser 검토 또는 제한 명시 |
| 세션/IP | `lib/session.js` | 새 세션 기록, 외부 ipify 조회 | 외부 API 의존과 개인정보 처리 이슈 | IP 기능 opt-in, 개인정보 안내, 프록시/비활성 옵션 |
| 보고서 생성 | `lib/report/*`, `hooks/useReportActions.js` | 도메인별 build 함수와 generated_reports 저장 | 일부 화면에서 생성/공유 기능의 운영 범위 확인 필요 | 보고서 상태 머신과 공유 정책 명확화 |

## 5. 코드 품질 문제

| 우선순위 | 파일 | 문제 유형 | 문제 설명 | 근거 | 추천 조치 |
|---|---|---|---|---|---|
| P0 | `middleware.ts`, `lib/auth.js` | 인증 우회 가능 | 쿠키 존재만으로 보호 라우트 통과, 쿠키와 해시 모두 클라이언트 제어 | `middleware.ts:24`, `lib/auth.js:99`, `lib/auth.js:121` | 운영 서비스라면 서버 세션/JWT 서명/HttpOnly Secure 쿠키 도입 |
| P1 | `lib/db/backup.js` | 복원 부분 반영 | `importAll`이 store별 `replaceStore`를 순차 실행해 중간 실패 시 일부 store만 교체 | `lib/db/backup.js:154` | 복원 단위별 원자성 정책, 사전 검증, 실패 시 복구 절차 추가 |
| P1 | `lib/note/store.js` | 구현과 주석 불일치 | 체인 삭제 주석과 달리 직계 자식만 조회/삭제 | `lib/note/store.js:131`, `lib/note/store.js:142` | descendant 전체 수집 후 삭제, 회귀 테스트 추가 |
| P1 | `lib/menu-master/store.js` | cascade 부분 실패 | menu_master 삭제 후 관련 store를 별도 transaction으로 삭제 | `lib/menu-master/store.js:99`, `lib/menu-master/store.js:111`, `lib/menu-master/store.js:123`, `lib/menu-master/store.js:132` | 삭제 계획 preview, 단일 transaction 가능 store 통합, 실패 시 rollback/repair |
| P1 | `lib/ingredient/store.js` | cascade 부분 실패 | 식자재 삭제가 먼저 commit되고 영양/알레르기 삭제 실패는 경고로 누적 | `lib/ingredient/store.js:495`, `lib/ingredient/store.js:501`, `lib/ingredient/store.js:512` | 삭제 transaction 통합 또는 보정 큐와 UI 재시도 제공 |
| P1 | `app/settings/system/page.jsx` | 파괴적 작업 보호 부족 | 모든 store clear와 DB 삭제가 클라이언트 버튼 확인으로 가능 | `app/settings/system/page.jsx:115`, `app/settings/system/page.jsx:131`, `app/settings/system/page.jsx:426` | 백업 강제, 입력 문구 확인, 운영자 권한 검증 |
| P1 | `lib/auth/accounts.js`, `hooks/useCurrentRole.js` | 권한 경계 불명확 | 계정이 없거나 오류면 admin으로 fallback | `lib/auth/accounts.js:79`, `hooks/useCurrentRole.js:13` | 로컬 UI 보호인지 실제 권한인지 결정, 운영 권한은 서버 강제 |
| P2 | `lib/db/crud.js`, 다수 도메인 | 대용량 성능 | `getAll()` 기반 조회가 122회 이상 검색됨 | `lib/db/crud.js:33` | index query, pagination, selector hook 도입 |
| P2 | `app/note/_NoteContent.jsx` | 과대 컴포넌트 | 단일 파일 1,002라인에 UI/상태/저장 흐름 집중 | `wc -l` 기준 | form, chain, attachments, actions hook으로 분리 |
| P2 | `app/report/sales/page.jsx` | 과대 페이지 | 단일 페이지 938라인 | `wc -l` 기준 | controls, data hook, report table, preview action 분리 |
| P2 | `lib/ingredient/store.js` | 과대 store 모듈 | 839라인에 CRUD, 중복 병합, cascade, 분류 정리 포함 | `wc -l` 기준 | read/write/cascade/diagnostics 모듈 분리 |
| P2 | `app/nutrition/allergen/page.jsx` | 과대 페이지 | 단일 페이지 813라인 | `wc -l` 기준 | master table, import, mapping, validation hook 분리 |
| P2 | `app/ingredient/manage/IngredientForm.jsx` | 과대 폼 | 단일 폼 807라인 | `wc -l` 기준 | section 단위 컴포넌트와 schema validation 분리 |
| P2 | `lib/excel.js` | 직접 CSV 파싱 | 줄 단위 split로 quoted multi-line CSV 미지원 | `lib/excel.js:64`, `lib/excel.js:66` | 입력 제한 명시 또는 검증된 CSV parser 교체 |
| P2 | `next.config.mjs` | 운영 hardening 부족 | dev webpack cache 설정 외 보안 헤더/이미지/분석 설정 없음 | `next.config.mjs:2` | headers, CSP 정책, bundle 분석, production 옵션 검토 |
| P2 | `package.json` | CI 부재 확인 | test/lint/build/QA script는 있으나 `.github` 없음 | `package.json:12`, `.github` 없음 | CI workflow 추가 |
| P3 | `components/AppShell.jsx` | 단축키 설명 중복 | `G R`, `G B`가 모두 보고서로 안내 | `components/AppShell.jsx:38`, `components/AppShell.jsx:42` | 실제 목적에 맞게 하나 수정 또는 제거 |
| P3 | `app/styles/**` | letter-spacing 과다 | 전역/도메인 CSS에 negative letter-spacing 다수 | `app/styles/base.css:38` 등 | 접근성/가독성 기준으로 타이포 토큰 정리 |
| P3 | 다수 파일 | console 사용 | 운영 코드에서 console 호출 167건 확인 | `rg console` 기준 | dev logger와 운영 로그 레벨 정책 도입 |

## 6. 수정 또는 보완이 필요한 항목

| 우선순위 | 항목 | 관련 파일 | 문제 | 추천 수정 방향 | 예상 영향 |
|---|---|---|---|---|---|
| P0 | 운영 인증 체계 | `middleware.ts`, `lib/auth.js`, `app/login/page.jsx` | 클라이언트 쿠키만으로 인증 상태 결정 | 서버 세션, 서명 토큰, HttpOnly/Secure cookie, 비밀번호 서버 검증 | 배포 구조와 로그인 UX 변경 |
| P1 | 권한 정책 | `lib/auth/accounts.js`, `hooks/useCurrentRole.js`, 권한 사용 페이지 | admin/viewer가 실제 보안 경계가 아님 | 로컬 편의 기능으로 명시하거나 서버 ACL 도입 | 메뉴/버튼/라우트 보호 방식 변경 |
| P1 | 복원 원자성 | `lib/db/backup.js`, `app/settings/restore/page.jsx` | store별 복원 중 실패 시 부분 반영 | 복원 전 모든 store 검증, group transaction, 복구 백업 강제 | 복원 안정성 상승, 구현 복잡도 증가 |
| P1 | 삭제 cascade | `lib/menu-master/store.js`, `lib/ingredient/store.js`, `lib/note/store.js` | 관련 데이터 orphan 또는 부분 삭제 가능 | cascade 대상 명세화, 단일 transaction 가능한 범위 통합, repair 유틸 | 데이터 정합성 상승 |
| P1 | 위험 작업 보호 | `app/settings/system/page.jsx` | 전체 초기화/DB 재생성이 쉬움 | 문구 입력, 백업 선행 체크, 운영자 권한, 처리 로그 | 오조작 감소 |
| P2 | 대형 파일 분리 | `app/note/_NoteContent.jsx`, `app/report/sales/page.jsx`, `app/nutrition/allergen/page.jsx` | 테스트와 변경 영향 추적이 어려움 | hook + presentational component + pure builder 계층화 | 유지보수성 상승 |
| P2 | DB 조회 최적화 | `lib/db/crud.js`, 각 도메인 store | 전체 store read 후 filter/sort | index query helper, cursor pagination, memoized selectors | 대용량 성능 개선 |
| P2 | 업로드 중복 보장 | `lib/sales/store-files.js`, `lib/db/schema/sales.js` | year_month 중복 방지가 앱 선검사 | unique index 또는 중복 허용/버전 정책 결정 | 다중 탭 안정성 상승 |
| P2 | 환경/보안 헤더 | `next.config.mjs`, `vercel.json` | 보안 헤더와 환경 검증이 없음 | CSP, frame-ancestors, referrer-policy, env validation | 운영 보안 기본선 상승 |
| P2 | SEO 정책 | `app/layout.jsx`, 페이지들 | 전역 metadata만 있음 | 내부 앱이면 noindex/robots, 외부 페이지면 per-page metadata | 검색 노출 정책 명확화 |
| P2 | 접근성 QA | `app/styles/**`, `components/**` | focus 처리는 있으나 custom tabs/button 라벨 일관성 확인 필요 | axe/manual keyboard smoke, aria pattern 정비 | 접근성 안정성 상승 |
| P2 | CI/CD | `.github` 없음, `package.json` scripts | 자동 게이트 부재 | PR마다 lint, format:check, test:ci, build:clean, smoke/runtime 실행 | 배포 전 회귀 감소 |
| P3 | 스크립트 정리 | `verify-*.mjs`, `scripts/*.mjs` | 과거 검증 스크립트와 공식 QA 스크립트 공존 | 쓰임새 확인 후 README/CI 기준 정리 | 혼동 감소 |
| P3 | 문서 정리 | `README.md`, `ARCHITECTURE.md`, `docs/*.md` | 감사/개선 문서가 여러 개로 분산, 일부 untracked | 단일 최신 운영 문서와 backlog로 통합 | 신규 기여자 온보딩 개선 |

## 7. 성능 / SEO / 접근성 점검

| 영역 | 문제점 | 관련 파일 | 영향도 | 추천 개선 |
|---|---|---|---|---|
| 초기 렌더 성능 | AppShell이 브랜드, 설정, 세션, 로그 정리, 플랫폼 hydrate 등 여러 side effect 수행 | `components/AppShell.jsx:262`, `components/AppShell.jsx:272`, `components/AppShell.jsx:277`, `components/AppShell.jsx:295` | P2 | 우선순위 낮은 작업은 idle callback 또는 페이지별 필요 시점으로 지연 |
| IndexedDB 조회 | `getAll()` 후 filter/sort 패턴이 많음 | `lib/db/crud.js:33`, `lib/menu-master/store.js:23`, `lib/ingredient/store.js:248` | P2 | index 기반 조회 helper와 cursor pagination 도입 |
| 대용량 업로드 | `bulkPut`은 500개 청크로 나누지만 store별 전체 원자성은 제한됨 | `lib/db/crud.js:76` | P2 | 대용량 import 진행률, abort/retry, 검증 단계를 분리 |
| Excel 번들 | xlsx는 dynamic import라 초기 번들 부담을 줄임 | `lib/excel.js:16` | 양호 | 현 구조 유지, 업로드 화면에서만 prefetch 검토 |
| 동적 컴포넌트 | 일부 무거운 모달/탭이 lazy import됨 | `components/cost/recipe/RecipeEditor.jsx`, nutrition menu tabs 등 | 양호 | lazy boundary에 skeleton/error fallback 통일 |
| 스타일 규모 | 도메인별 CSS가 많고 letter-spacing 조정이 넓게 퍼짐 | `app/styles/**` | P3 | 디자인 토큰으로 타이포/간격을 중앙화 |
| SEO | 전역 metadata와 manifest만 있고 sitemap/robots/per-page metadata 없음 | `app/layout.jsx:14`, `public/manifest.json` | 내부 앱이면 낮음, 공개 서비스면 P2 | 내부 앱이면 `noindex` 정책, 공개 페이지면 route metadata 추가 |
| PWA | manifest는 있으나 서비스 워커/offline cache 전략은 확인되지 않음 | `public/manifest.json` | P3 | PWA가 목표인지 결정, 아니면 manifest 범위 단순화 |
| 접근성 기본 | `html lang="ko"`, 확대 허용, skip link, focus-visible, reduced motion 존재 | `app/layout.jsx:21`, `app/styles/base.css:92`, `app/styles/components/chrome.css:29`, `app/styles/features/motion.css:302` | 양호 | 유지 |
| 접근성 라벨 | 일부 버튼은 `title` 중심, custom segmented/tab UI의 ARIA 패턴 일관성 확인 필요 | `components/Toast.jsx:105`, `components/cost/margin/MarginFilterBar.jsx:106`, 다수 `Segmented` | P2 | icon-only button은 `aria-label`, tabs는 `role=tablist/tab` 검토 |
| 반응형 | layout/css media query와 모바일 탭 존재 | `app/styles/layout.css`, `components/AppShell.jsx:351` | P2 | 주요 10개 페이지 Playwright 모바일 screenshot smoke 추가 |
| 에러 상태 | ErrorBoundary와 Toast가 있으나 페이지별 실패 UI 편차 | `app/layout.jsx:45`, `components/AppShell.jsx:337` | P2 | 공통 ErrorPanel/RetryButton 패턴 도입 |

## 8. 보안 / 환경 변수 / 인증 점검

| 항목 | 관련 파일 | 위험도 | 문제 설명 | 추천 조치 |
|---|---|---|---|---|
| 로그인 쿠키 | `middleware.ts:24`, `lib/auth.js:121` | P0 | 쿠키 존재만 확인하고 값 서명/서버 검증이 없음 | HttpOnly/Secure/SameSite cookie와 서버 세션 또는 서명 토큰 도입 |
| 비밀번호 저장 | `lib/auth.js:99`, `lib/auth.js:112` | P0 | 비밀번호 SHA-256 해시가 localStorage에 저장됨 | 서버 저장, salt+KDF, rate limit, reset flow 도입 |
| 클라이언트 권한 | `lib/auth/accounts.js:79`, `hooks/useCurrentRole.js:13` | P1 | 계정과 역할이 localStorage/IndexedDB 기반이고 admin fallback | 운영 권한은 서버에서 강제, 로컬이면 안내 문구 명시 |
| 설정 PIN | `hooks/useSettingsAuth.js`, `components/settings/PinSection.jsx` | P2 | 로컬 PIN은 실수 방지용이지 보안 수단이 아님 | 실제 보안으로 오해하지 않도록 UX/문서 유지, 운영 권한 별도 |
| 파괴적 작업 | `app/settings/system/page.jsx:115`, `app/settings/system/page.jsx:131` | P1 | 전체 초기화/DB 삭제가 클라이언트에서 실행 | 백업 강제, 문구 입력 확인, 관리자 재인증 |
| 백업 파일 | `lib/db/backup.js`, `app/settings/backup` | P1 | JSON 백업에 업무 데이터가 평문 포함될 가능성 | 민감도 분류, 암호화 옵션, 다운로드/보관 정책 |
| 복원 파일 | `app/settings/restore/page.jsx:80`, `lib/backup/validation` | P2 | JSON schema 검증은 있으나 악성/과대 데이터 방어 한계 | size/row count/store별 schema validation 강화 |
| 외부 IP 조회 | `lib/session.js:108` | P2 | 클라이언트가 `api.ipify.org`로 공인 IP를 조회 | opt-in, 개인정보 안내, 운영 환경에서는 비활성 또는 서버 프록시 |
| CSP/보안 헤더 | `next.config.mjs` | P2 | 보안 헤더 설정 없음 | CSP, X-Frame-Options 또는 frame-ancestors, Referrer-Policy, Permissions-Policy |
| 환경 변수 검증 | `.env*`, `next.config.mjs` | P3 | 현재 환경 변수 의존은 적어 보이나 검증 체계 없음 | env schema 추가, 운영/개발 분리 |
| API 경로 | `app/api` | 낮음 | 현재 app API route 없음, `middleware.ts`는 `/api/` 공개 처리 | API 추가 시 인증 정책 재검토 필요 |
| XSS | `app/layout.jsx:35` | 낮음 | inline script는 static theme 적용만 수행 | CSP 도입 시 nonce/hash 정책 필요 |

## 9. 테스트 / 빌드 / 배포 점검

| 영역 | 현재 상태 | 문제점 | 추천 조치 |
|---|---|---|---|
| 단위 테스트 | `__tests__`에 hook/lib/script 중심 테스트가 다수 존재 | 이번 감사 중 재실행하지 않았고 coverage 지표는 없음 | 핵심 도메인 coverage threshold 도입 검토 |
| Lint | `npm run lint` script 존재 | 이번 감사 중 재실행하지 않았고 JS 프로젝트라 타입 기반 검사는 제한적 | ESLint 규칙 점진 강화, no-floating-promise류 대안 검토 |
| Format | `npm run format:check` script 존재 | 이번 감사 중 재실행하지 않았고 `*.md`는 `.prettierignore` 대상 | 문서 포맷 정책 별도 결정 |
| Build | 이번 감사에서 미실행 | build 산출물이 기존 파일을 변경할 수 있어 요청 원칙상 제외 | 승인 후 `npm run build:clean` 또는 CI에서 수행 |
| Typecheck | `jsconfig.json`만 있고 TS strict 없음 | JSDoc 타입은 많지만 컴파일 검증 부족 | 점진적 TypeScript 또는 `tsc --checkJs` 검토 |
| Runtime QA | `qa:smoke`, `qa:runtime`, `qa:prod` script 존재 | dev server/브라우저 상태 의존, CI 연동 확인 안 됨 | seeded fixture와 headless QA를 CI에 연결 |
| CI | `.github` 디렉터리 없음 | PR/배포 게이트가 저장소에 보이지 않음 | GitHub Actions 또는 배포 플랫폼 체크 구성 |
| 배포 설정 | `vercel.json`은 buildCommand만 지정 | 보안 헤더/지역/캐시/환경 정책 부족 | Vercel project settings와 코드 기반 headers 정리 |
| 데이터 마이그레이션 | `DB_VERSION=19`, schema migration 주석 존재 | migration 테스트 범위 확인 필요 | 버전별 fixture DB upgrade 테스트 추가 |
| E2E | Playwright devDependency와 QA 스크립트 존재 | 주요 사용자 flow 전체 E2E는 제한적일 수 있음 | 로그인, 업로드, 복원, 삭제, 보고서 생성 happy path/rollback E2E |
| 회귀 방지 | 삭제 cascade 관련 테스트 일부 존재 | 노트 descendant 삭제, restore partial failure 등 추가 필요 | P1 리스크 중심 테스트 우선 작성 |

## 10. 삭제 후보 / 정리 후보

삭제, 이동, 이름 변경은 모두 승인 필요다. 아래 항목은 후보이며, 실제 삭제 전 사용 여부를 확인해야 한다.

| 파일/코드 | 후보 유형 | 이유 | 확실성 | 삭제 전 확인할 것 |
|---|---|---|---|---|
| `.DS_Store` | 삭제 후보 | macOS 메타 파일이며 `.gitignore`에도 포함 | 높음 | 추적 여부와 사용자 작업 영향 없음 확인 |
| `verify-4th.mjs` | 정리 후보 | 루트에 있는 과거 검증 스크립트로 보이며 공식 `scripts/qa:*`와 역할 중복 가능 | 확인 필요 | package script, README, 최근 사용 여부 |
| `verify-dashboard.mjs` | 정리 후보 | 대시보드 전용 임시 검증 스크립트로 추정 | 확인 필요 | 현재 QA 스크립트로 대체 가능한지 |
| `verify-data-path.mjs` | 정리 후보 | 데이터 경로 검증 임시 스크립트로 추정 | 확인 필요 | CI/문서/운영 체크에서 참조되는지 |
| `docs/PROJECT_CODEBASE_AUDIT.md` | 문서 통합 후보 | 유사 감사 문서가 여러 개 존재 | 확인 필요 | 최신성, 본 리포트와 통합 여부 |
| `docs/PROJECT_STRUCTURE_AUDIT_2026-06-14.md` | 문서 통합 후보 | 구조 감사 문서와 본 리포트 범위 중복 | 확인 필요 | 작성 목적, user-owned 변경 여부 |
| `docs/SITE_IMPROVEMENT_BACKLOG.md` | 문서 통합 후보 | 개선 backlog와 리포트의 개선 계획 중복 가능 | 확인 필요 | 실제 backlog로 계속 운용할지 |
| `docs/BUG_AUDIT_2026-06-14.md` _(삭제됨)_ | 통합 완료 | `DEFERRED_WORK.md`로 흡수 후 삭제 | 완료 | — |
| console 호출 167건 | 정리 후보 | 운영 코드에서 console이 많음 | 중간 | 개발 로그인지 사용자 진단용인지 분류 |
| 하드코딩 보고서/자동 지표 | 정리 후보 | 실제 기능인지 placeholder인지 불명확 | 확인 필요 | 보고서센터 제품 요구사항 |
| negative letter-spacing 토큰 | 정리 후보 | CSS 전반에 분산되어 가독성 편차 가능 | 낮음 | 디자인 의도와 시각 QA |

## 11. 리팩터링 후보

| 우선순위 | 파일/기능 | 현재 문제 | 추천 리팩터링 | 기대 효과 | 승인 필요 여부 |
|---|---|---|---|---|---|
| P1 | 인증/권한 | 로컬 쿠키/해시/역할에 운영 보안을 기대할 수 없음 | auth provider 계층, server session, role guard 도입 | 운영 보안 기준 확보 | 필요 |
| P1 | 백업/복원 | 전체 원자성 부족, 실패 후 복구가 사용자 백업에 의존 | restore planner, validator, executor, recovery log 분리 | 복원 실패 대응 명확화 | 필요 |
| P1 | 삭제 cascade | 도메인별 삭제 정책이 파일마다 다름 | cascade service와 delete preview 표준화 | orphan 데이터 감소 | 필요 |
| P2 | `app/note/_NoteContent.jsx` | UI, 편집 상태, 저장/삭제, chain 표시가 집중 | `useNoteEditor`, `NoteForm`, `NoteChain`, `NoteActions` 분리 | 테스트와 수정 단위 축소 | 필요 |
| P2 | `app/report/sales/page.jsx` | 보고서 생성/필터/미리보기/저장이 한 페이지에 큼 | report state hook, controls, table, preview modal 분리 | 기능 추가 용이 | 필요 |
| P2 | `lib/ingredient/store.js` | CRUD, diagnostics, cascade, 분류 일괄 변경 혼재 | `ingredient-read`, `ingredient-write`, `ingredient-cascade`, `ingredient-diagnostics` 분리 | 영향 범위 명확화 | 필요 |
| P2 | 원가 상세 페이지들 | `/cost/pizza`, `/cost/side`, `/cost/set` 등 유사 패턴 가능 | 공통 cost detail builder/hook 도입 | 중복 제거와 UX 일관성 | 필요 |
| P2 | 영양성분 모듈 | 메뉴/원산지/알레르기/식자재 값 연동이 복잡 | nutrition domain service와 schema validation 분리 | 계산/출력 안정성 | 필요 |
| P2 | IndexedDB query | 전체 읽기 후 필터가 많음 | typed store query helper와 index 기반 selector | 성능과 테스트성 개선 | 필요 |
| P2 | 스타일 시스템 | card/inline style/도메인 CSS 혼합 | UI primitive와 design token 확정 | UI 일관성 개선 | 필요 |
| P3 | QA scripts | 루트 verify 스크립트와 scripts QA 공존 | 공식 QA entrypoint만 남기고 문서화 | 운영 절차 단순화 | 필요 |
| P3 | 문서 | 여러 감사/백로그 문서 중복 | 운영 README, architecture, backlog로 재구성 | 최신성 유지 | 필요 |

## 12. 목표 추진형 개선 계획

| 단계 | 목표 | 작업 내용 | 성공 기준 | 위험도 | 승인 필요 여부 |
|---|---|---|---|---|---|
| 1 | 안전한 정리 | 루트 `verify-*.mjs`, `.DS_Store`, 중복 문서, placeholder UI, 단축키 중복을 조사하고 정리안 작성 | 삭제/유지 목록이 확정되고 QA 영향 없음 | 낮음 | 필요 |
| 1 | 안전한 정리 | console 로그를 개발/운영/사용자 진단용으로 분류 | 운영에 필요한 로그만 남고 logger 정책 문서화 | 낮음 | 필요 |
| 2 | 구조 개선 | 인증이 로컬 도구인지 운영 서비스인지 결정 | 보안 요구사항 문서와 auth target architecture 확정 | 중간 | 필요 |
| 2 | 구조 개선 | 도메인 삭제 cascade 명세 작성 | 메뉴/식자재/노트 삭제 시 삭제 대상 store와 rollback 정책 확정 | 중간 | 필요 |
| 2 | 구조 개선 | DB query helper와 index 사용 기준 수립 | 신규 조회가 `getAll` 남용 없이 작성됨 | 중간 | 필요 |
| 3 | 클린코드 개선 | `app/note/_NoteContent.jsx`, `app/report/sales/page.jsx`, `lib/ingredient/store.js`부터 파일 분리 | 각 파일 300~500라인 이하 또는 명확한 책임 단위로 축소 | 중간 | 필요 |
| 3 | 클린코드 개선 | 공통 Empty/Error/Loading/Confirm 패턴 정리 | 주요 페이지의 상태 처리 UX가 통일됨 | 낮음 | 필요 |
| 4 | 안정성 강화 | 복원 planner/validator/executor 테스트 작성 | 일부 실패, unknown store, missing store, localStorage 복원 케이스 통과 | 중간 | 필요 |
| 4 | 안정성 강화 | 삭제 cascade 회귀 테스트 추가 | descendant note, menu cascade, ingredient cascade 실패 케이스 검증 | 중간 | 필요 |
| 4 | 안정성 강화 | CI 구성 | PR마다 lint, format:check, test:ci, build, smoke QA가 실행됨 | 중간 | 필요 |
| 4 | 안정성 강화 | 환경/보안 헤더 검증 | 운영 배포에서 보안 헤더와 env 검증 통과 | 중간 | 필요 |
| 5 | 서비스 품질 개선 | 주요 페이지 Playwright 모바일/데스크톱 screenshot smoke | 홈, 판매량, 식자재, 원가, 영양, 노트, 보고서, 백업/복원이 깨지지 않음 | 낮음 | 필요 |
| 5 | 서비스 품질 개선 | 접근성 audit | keyboard navigation, focus trap, aria label, reduced motion 기준 통과 | 낮음 | 필요 |
| 5 | 서비스 품질 개선 | 성능 기준 수립 | 대용량 fixture에서 홈/업로드/보고서 응답 시간 기준 충족 | 중간 | 필요 |

## 13. 최종 결정이 필요한 항목

| 결정 항목 | 선택지 | 추천안 | 이유 |
|---|---|---|---|
| 서비스 성격 | 로컬 단독 도구 / 사내망 공유 도구 / 외부 운영 서비스 | 최소 사내망 공유 도구 기준으로 보안 재설계 | 현재 기능 범위는 개인 로컬 도구보다 크고 업무 데이터가 민감할 가능성이 높음 |
| 인증 방식 | 현재 localStorage 유지 / 서버 세션 / 외부 IdP | 운영이면 서버 세션 또는 사내 IdP | 현재 방식은 쿠키 조작으로 우회 가능 |
| 권한 모델 | UI-only role / route guard / 도메인별 ACL | 운영이면 도메인별 ACL | 설정/복원/삭제 권한은 단순 viewer/admin보다 세분화 필요 |
| 데이터 저장 위치 | 브라우저 IndexedDB 유지 / 서버 DB 이전 / hybrid sync | 단기 IndexedDB 유지, 중기 서버 sync 검토 | 현재 구조를 한 번에 서버화하면 위험이 크므로 단계적 전환이 현실적 |
| 백업 보안 | 평문 JSON / 암호화 JSON / 서버 보관 | 운영 데이터면 암호화 JSON 또는 서버 보관 | 백업 파일 유출 시 업무 데이터가 그대로 노출될 수 있음 |
| 복원 정책 | store별 best-effort / 모듈 단위 원자성 / 전체 원자성 | 모듈 단위 원자성부터 | 브라우저 IndexedDB 제약상 전체 원자성은 어렵지만 업무 단위 보호는 필요 |
| 삭제 정책 | 즉시 삭제 / soft delete / 삭제 전 영향 preview | 영향 preview + 중요 데이터 soft delete | 메뉴/식자재/노트는 참조 관계가 많아 복구 가능성이 중요 |
| 메뉴 정보 구조 | 현재 사이드바 유지 / 상세 원가 라우트 노출 / 상위 탭 통합 | 상위 원가 페이지에서 상세 탭 통합 | 모바일/데스크톱 탐색 차이를 줄일 수 있음 |
| SEO 정책 | 검색 노출 / noindex 내부 앱 | 내부 앱이면 noindex | 인증형 업무 앱은 검색 노출보다 보안과 명확한 접근 제한이 중요 |
| CI 범위 | test/lint만 / build 포함 / runtime QA 포함 | lint, format, test:ci, build, smoke QA 포함 | 현재 QA 스크립트가 있어 자동화 효과가 큼 |
| 타입 전략 | JS 유지 / checkJs / 점진 TS 전환 | checkJs 또는 핵심 lib부터 TS | 전체 TS 전환보다 낮은 위험으로 타입 안정성 개선 가능 |
| 리팩터링 우선순위 | UI부터 / DB부터 / 보안부터 | 보안 결정 후 데이터 정합성, 그 다음 대형 파일 분리 | 운영 리스크가 높은 순서가 합리적 |

최종 판단: 이 프로젝트는 내부 업무 플랫폼으로서 기능 밀도와 테스트 기반이 이미 상당히 좋다. 다만 실제 운영 서비스로 간주하는 순간, 인증/권한, 복원/삭제 원자성, CI/배포 게이트가 현재 구조의 가장 큰 병목이다. 기능 추가보다 먼저 “어디까지가 로컬 도구이고 어디부터가 운영 서비스인가”를 결정한 뒤, 보안과 데이터 정합성의 기준선을 정하는 것이 가장 비용 대비 효과가 크다.
