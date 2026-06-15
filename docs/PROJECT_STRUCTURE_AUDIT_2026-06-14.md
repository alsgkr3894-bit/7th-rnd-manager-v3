# 프로젝트 구조·문서 정합성 집중 점검 리포트

> 기준일: 2026-06-14  
> 기준 경로: `/Users/lmh/Documents/Codex/7th-rnd-manager-v3`  
> 목적: 현재 프로젝트 구조, 문서, 라우트, QA 스크립트, 백로그가 실제 코드와 맞는지 점검하고 정리한다.  
> 범위: 분석 및 문서화. 이 파일 작성 외 기존 코드/문서/설정은 수정하지 않았다.

---

## 1. 전체 요약

- 프로젝트는 Next.js 14 App Router 기반의 7번가 R&D 플랫폼이다.
- 서버 API 라우트는 현재 없다. 데이터 흐름은 브라우저 IndexedDB, localStorage/sessionStorage, 도메인별 `lib/*` store/helper 중심이다.
- 실제 `app/**/page.*` 기준 라우트는 54개다.
  - 정적 라우트: 52개
  - 동적 라우트: 2개 (`/note/[id]`, `/note/sample/[id]`)
- `scripts/full-rt.mjs`는 현재 정적 라우트 누락 없이 전체 정적 라우트를 커버한다.
- 현재 존재하는 프로젝트 MD 파일은 4개다. (`docs/BUG_AUDIT_2026-06-14.md`는 2026-06-14 `DEFERRED_WORK.md` 흡수 후 삭제)
  - `README.md`
  - `ARCHITECTURE.md`
  - `docs/DEFERRED_WORK.md`
  - `docs/SITE_IMPROVEMENT_BACKLOG.md`
- 문서의 가장 큰 문제는 "이미 해결된 항목이 아직 해야 할 일로 남아 있음"과 "일부 경로/구조 설명이 현재 코드와 다름"이다.
- 실제 코드 쪽에서 바로 위험해 보이는 확정 구조 문제보다, 문서와 백로그가 낡아 다음 작업을 잘못 유도할 위험이 더 크다.

---

## 2. 현재 워크트리 상태

`git status --short` 기준으로 이미 많은 수정/미추적 파일이 있다.

| 구분 | 상태 |
|---|---|
| 기존 수정 파일 | `README.md`, `package.json`, 다수 `app/`, `components/`, `hooks/`, `lib/`, `scripts/`, `__tests__/` 파일 |
| 미추적 문서 | `docs/SITE_IMPROVEMENT_BACKLOG.md` (`BUG_AUDIT_2026-06-14.md`는 흡수 후 삭제) |
| 미추적 스크립트/테스트 | `scripts/prepare-dev.mjs`, 여러 신규 Jest 테스트 |
| 이번 리포트 | 이 파일 `docs/PROJECT_STRUCTURE_AUDIT_2026-06-14.md` 신규 작성 |

주의:

- 현재 워크트리는 사용자가 진행 중인 작업물이 섞여 있을 가능성이 높다.
- 문서 정리/커밋을 할 때는 이 리포트만 별도 커밋하거나, 먼저 변경 범위를 확인해야 한다.

---

## 3. 프로젝트 구조

| 구분 | 관련 파일/폴더 | 역할 | 확인 결과 |
|---|---|---|---|
| 앱 라우터 | `app/` | Next.js App Router 페이지와 route-level 파일 | `page.jsx` 기준 54개 라우트 |
| 루트 레이아웃 | `app/layout.jsx` | 전역 CSS, 로컬 폰트, AppShell, ErrorBoundary | `next/font/local` + `public/fonts/PretendardVariable.woff2` 사용 |
| 홈 | `app/page.jsx`, `components/home/*`, `hooks/useHomeDashboardData.js` | 홈 대시보드, KPI, 위젯 | 홈 데이터 로딩은 hook으로 분리됨 |
| 공통 UI | `components/`, `components/ui/` | AppShell, Sidebar, TopBar, Toast, Modal, PageHeader 등 | 재사용 컴포넌트 구조 존재 |
| 스타일 | `app/styles/` | tokens/base/layout/features/components 스타일 | README의 `components.css` 설명은 현재 구조와 불일치 |
| 도메인 로직 | `lib/` | 판매량, 원가, 식자재, 영양성분, 보고서, 설정, DB 유틸 | 주요 업무 로직은 `lib/*`에 위치 |
| DB | `lib/db/` | IndexedDB 초기화, schema, store 그룹, 백업/복원 | `DB_VERSION = 19`, store 목록과 모듈 그룹 존재 |
| 메뉴 구조 | `lib/menu.js` | 사이드바/모바일 탭 메뉴 정의 | 실제 노출 메뉴 기준 소스 |
| hooks | `hooks/` | 상태, DB 로딩, 필터, 페이지네이션, QA 편의 hook | 화면 로직 분리 진행 중 |
| 테스트 | `__tests__/` | Jest 단위/회귀 테스트 | hooks/lib/scripts/business fixture 테스트 다수 |
| QA 스크립트 | `scripts/` | smoke/runtime/prod QA, clean build, dev 준비 | `qa:smoke`, `qa:runtime`, `build:clean`, `prepare-dev` 존재 |
| 정적 파일 | `public/` | 로고, 폰트, manifest, 원산지 템플릿 | 로고 5종, 폰트, `원산지_템플릿.xlsx` |
| 설정 | `package.json`, `next.config.mjs`, `jest.config.mjs`, `.eslintrc.json`, `.prettierrc.json`, `.prettierignore`, `jsconfig.json`, `vercel.json` | 실행/빌드/테스트/배포 설정 | CI workflow는 repo 안에서 확인되지 않음 |
| 미들웨어 | `middleware.ts` | `v3:auth` 쿠키 기반 접근 제어 | `/login`, `_next`, favicon, logo, `/api/` 공개 처리 |

---

## 4. 실행 명령 기준

`package.json` 기준 현재 명령은 다음과 같다.

| 명령 | 실제 script | 역할 | 문서 반영 상태 |
|---|---|---|---|
| `npm run dev` | `next dev` + `predev` | 로컬 개발 서버 | README에 있음 |
| `npm run dev:lan` | `next dev -H 0.0.0.0 -p 3000` + `predev:lan` | LAN 접속용 개발 서버 | README에 간단히 있음 |
| `npm run dev:clean` | `node scripts/prepare-dev.mjs --kill && next dev -H 127.0.0.1 -p 3000` | 꼬인 dev 서버 정리 후 재시작 | README에 있음 |
| `npm run build` | `next build` | production build | README에 있음 |
| `npm run build:clean` | `node scripts/clean-build.mjs` | stale `.next` 정리 포함 clean build | README에 설명 부족 |
| `npm run start` | `next start` | production start | README에 있음 |
| `npm run demo` | `rm -rf .next && next build && next start -H 0.0.0.0 -p 3000` | 데모용 빌드/실행 | README 설명 없음 |
| `npm run lint` | `next lint` | lint | README 설명 없음 |
| `npm run format` | `prettier --write .` | format | README 설명 없음 |
| `npm run format:check` | `prettier --check .` | format 검증 | README 설명 없음 |
| `npm run test` | Jest | 테스트 | README 설명 없음 |
| `npm run test:ci` | Jest runInBand | CI형 테스트 | README 설명 없음 |
| `npm run qa:smoke` | `node scripts/smoke-qa.mjs` | 대표 라우트 smoke QA | README에 있음 |
| `npm run qa:runtime` | `node scripts/full-rt.mjs` | 전체 정적/주요 브랜드 runtime QA | README 설명 없음 |
| `npm run qa:prod` | `node scripts/qa-prod.mjs` | production QA | README 설명 없음 |

추천:

- README에는 빠른 시작 외에 "검증 명령" 표를 추가하는 것이 좋다.
- `qa:runtime`, `build:clean`, `format:check`, `test:ci`는 현재 프로젝트 품질 기준선이므로 README에 반드시 들어가는 편이 좋다.

---

## 5. 라우트 현황

### 5.1 전체 라우트 수

| 구분 | 개수 | 내용 |
|---|---:|---|
| 전체 page route | 54 | `app/**/page.*` 기준 |
| 정적 route | 52 | `[]` 없는 라우트 |
| 동적 route | 2 | `/note/[id]`, `/note/sample/[id]` |
| `full-rt` 정적 route 누락 | 0 | `/login` 제외 기준 |

### 5.2 주요 라우트 목록

| 모듈 | 라우트 |
|---|---|
| 홈 | `/` |
| 로그인 | `/login` |
| 메뉴마스터 | `/menu-master` |
| 메뉴 판매량 | `/menu-sales`, `/menu-sales/upload`, `/menu-sales/rank`, `/menu-sales/rank-compare`, `/menu-sales/compare`, `/menu-sales/unmatched`, `/menu-sales/settings` |
| 제때 | `/jette`, `/jette/price-compare`, `/jette/shipment`, `/jette/settings` |
| 식자재 | `/ingredient`, `/ingredient/manage`, `/ingredient/list`, `/ingredient/usage` |
| 원가 | `/cost`, `/cost/ingredient-price`, `/cost/recipe`, `/cost/margin`, `/cost/manage`, `/cost/pizza`, `/cost/side`, `/cost/set`, `/cost/personal`, `/cost/edge-dough`, `/cost/all-summary` |
| 영양성분 | `/nutrition`, `/nutrition/menu`, `/nutrition/allergen`, `/nutrition/origin`, `/nutrition/export` |
| 노트 | `/note`, `/note/write`, `/note/[id]`, `/note/board`, `/note/calendar`, `/note/journal`, `/note/sample`, `/note/sample/write`, `/note/sample/[id]` |
| 보고서 | `/report`, `/report/sales`, `/report/price`, `/report/shipment`, `/report/cost`, `/report/menu-sales-compare` |
| 설정 | `/settings`, `/settings/system`, `/settings/account`, `/settings/backup`, `/settings/restore` |

### 5.3 사이드바 메뉴에 없는 라우트

`lib/menu.js`의 `href` 기준으로 직접 노출되지 않는 앱 라우트는 19개다.

| 유형 | 라우트 | 판단 |
|---|---|---|
| 허브/랜딩 | `/cost`, `/ingredient`, `/jette`, `/menu-sales`, `/nutrition` | 직접 진입 가능하지만 사이드바는 하위 메뉴 중심 |
| 원가 상세 | `/cost/all-summary`, `/cost/edge-dough`, `/cost/manage`, `/cost/personal`, `/cost/set`, `/cost/side` | 일부는 원가 허브/모바일 탭/화면 내 이동용 |
| 리디렉트 | `/menu-sales/rank`, `/settings` | 각각 `/menu-sales/rank-compare`, `/settings/backup`으로 이동 |
| 동적 상세 | `/note/[id]`, `/note/sample/[id]` | 실제 레코드 ID 필요 |
| 작성 직접 진입 | `/note/sample/write` | 사이드바에는 `/note/sample`까지만 있음 |
| 보고서 비교 | `/report/menu-sales-compare` | 보고서센터 내부 선택 흐름에서 사용 |
| 로그인 | `/login` | 인증 전용 |

추천:

- `ARCHITECTURE.md`에 라우트를 "사이드바 노출 / 허브 / 리디렉트 / 동적 상세 / 내부 흐름"으로 분류해 적으면 좋다.
- `scripts/full-rt.mjs`는 현재 정적 라우트 누락이 없으므로, 다음 단계는 route drift 자동 테스트다.

---

## 6. MD 파일 목록과 역할 분석

| MD 파일 | 현재 목적 | 실제 코드와 일치 여부 | 문제점 | 추천 조치 | 우선순위 |
|---|---|---:|---|---|---|
| `README.md` | 빠른 시작, 프로젝트 구조, 토큰, 사용법 | 부분 일치 | 폴더명/폰트/스타일 구조/검증 명령 일부 불일치 | 빠른 시작과 명령어 중심으로 최신화 | 높음 |
| `ARCHITECTURE.md` | 구조와 설계 원칙 | 대체로 일치 | 실제 라우트/DB/QA 구조 설명이 부족 | 상세 구조 문서로 확장 | 중간 |
| `docs/DEFERRED_WORK.md` | 보류·정비 작업 단일 출처 | 부분 일치 | 일부 파일 경로 오류, 없는 문서 참조, 완료 항목/현재 항목 혼재 | 경로 수정, 완료/보류 재분류 | 높음 |
| `docs/BUG_AUDIT_2026-06-14.md` _(삭제됨)_ | 특정 날짜 버그 감사 기록 | — | `DEFERRED_WORK.md`로 흡수 후 삭제 | 삭제 완료(2026-06-14) | — |
| `docs/SITE_IMPROVEMENT_BACKLOG.md` | 제품/UX/성능 개선 백로그 | 부분 일치 | 이미 완료된 실행 후보가 남아 있음 | 완료/부분완료/미완료 재분류 | 높음 |

---

## 7. 집중 점검에서 추가 발견한 문서 불일치

| 우선순위 | 위치 | 문제 | 근거 | 추천 조치 |
|---|---|---|---|---|
| 높음 | `docs/DEFERRED_WORK.md` | 영양 마이그레이션 파일 경로가 틀림 | 문서: `lib/nutrition/allergen/migrate-to-ingredient.js`, 실제: `lib/nutrition/migrate-to-ingredient.js` | 경로 수정 |
| 높음 | `README.md` | `app/styles/components.css` 설명이 현재 구조와 불일치 | 실제는 `app/styles/components/*`로 분리 | 스타일 구조 갱신 |
| 높음 | `README.md` | 폰트를 CDN 방식으로 설명 | 실제는 `next/font/local` + `public/fonts/PretendardVariable.woff2` | 로컬 폰트 방식으로 수정 |
| 높음 | `docs/DEFERRED_WORK.md` | 없는 문서 참조 | `docs/RELEASE_CHECKLIST.md`, `docs/QA_CHECKLIST.md` 없음 | 생성 후보로 명시하거나 참조 삭제 |
| 중간 | `docs/DEFERRED_WORK.md` | `rules.js`, `crust-config.js` 짧은 경로가 모호함 | 실제는 `lib/nutrition/allergen/rules.js`, `lib/nutrition/crust-config.js` | 전체 경로로 수정 |
| 중간 | `docs/DEFERRED_WORK.md` | 과거 "42개 화면" 기록이 현재 54 route와 혼동 가능 | 현재 `app/**/page`는 54개 | 당시 기준이라고 명시 |
| 완료 | `docs/BUG_AUDIT_2026-06-14.md` _(삭제됨)_ | 감사 당시 FAIL과 후속 PASS가 함께 있음 | `DEFERRED_WORK.md` 흡수 후 삭제로 해소 | 삭제 완료(2026-06-14) |
| 낮음 | `docs/DEFERRED_WORK.md` | CSS 완료 이력 경로가 현재 구조와 짧은 이름 혼재 | `components.css`, `features/report.css`는 현재 파일로는 없음 | 과거 파일명/현재 파일명 구분 |

---

## 8. 이미 해결됐는데 백로그에 남아 있는 후보

아래 항목은 `docs/SITE_IMPROVEMENT_BACKLOG.md`에 "해야 할 일"로 남아 있지만, 현재 코드 기준으로는 이미 구현되었거나 부분 구현된 것으로 보인다.

| 항목 | 문서 위치 | 현재 코드 근거 | 판단 | 추천 조치 |
|---|---|---|---|---|
| 백업 export 실패 처리 | `SITE_IMPROVEMENT_BACKLOG.md` 1순위 | `lib/db/backup.js`의 `failedStores`, `RestorePreview.jsx` 경고 | 부분완료 이상 | 완료/부분완료로 이동 |
| 500건 초과 복원 clear+chunk 위험 | `SITE_IMPROVEMENT_BACKLOG.md` 1순위 | `replaceStore()`는 현재 단일 트랜잭션 | 설명이 현재와 다름 | "store 간 전체 롤백 부재"로 재작성 |
| 부분 복원 공통 store 안내 | `SITE_IMPROVEMENT_BACKLOG.md` 1순위 | `RestorePreview.jsx`에 "항상 포함" 안내 존재 | 부분완료 | 추가 UX 필요 여부만 남김 |
| 보고서 자동 삭제 제거 | `SITE_IMPROVEMENT_BACKLOG.md` 1순위 | `useReportActions.js`는 후보 조회 후 ConfirmDialog | 완료에 가까움 | 완료 처리 |
| 메뉴판매량 자동 재분류 분리 | `SITE_IMPROVEMENT_BACKLOG.md` 1순위 | pending flag + "지금 반영" 버튼 존재 | 완료에 가까움 | 완료 처리 |
| 영양 메뉴/원시값 중복 방지 | `SITE_IMPROVEMENT_BACKLOG.md` 2순위 | `upsertUniqueByIndex`, 중복 진단/정리 UI, 테스트 존재 | 완료/부분완료 | 남은 운영 DB 정리만 분리 |
| 식자재 `productCode` 중복 정리 | `SITE_IMPROVEMENT_BACKLOG.md` 2순위 | 저장 차단, 중복 진단/정리 UI, 테스트 존재 | 완료/부분완료 | 남은 운영 DB 병합 QA만 분리 |
| 합산 식자재 가격 정책 통일 | `SITE_IMPROVEMENT_BACKLOG.md` 2순위 | `lib/cost/composite-price.js`, 테스트 존재 | 완료 | 완료 처리 |
| 원가 detail 인덱스 통일 | `SITE_IMPROVEMENT_BACKLOG.md` 2순위 | DB v19, detail `menuCode` index 테스트 존재 | 완료 | 완료 처리 |
| 피자 카테고리 판정 공통화 | `SITE_IMPROVEMENT_BACKLOG.md` 2순위 | `lib/menu-master/category-policy.js`, 테스트 존재 | 완료 | 완료 처리 |
| 노트 일괄 삭제 실행취소 문구 | `SITE_IMPROVEMENT_BACKLOG.md` 3순위 | `_NoteContent.jsx`는 실행취소 toast와 복원 로직 존재 | 완료/확인 필요 | 문서 항목 재검토 |
| `.prettierignore` 산출물 제외 | `SITE_IMPROVEMENT_BACKLOG.md` 4순위 | `.prettierignore`에 `.next`, `.next.stale-*`, `node_modules`, `public`, `*.md` 존재 | 완료 | 완료 처리 |

---

## 9. 현재도 남아 있는 가능성이 높은 작업

| 우선순위 | 항목 | 이유 | 추천 조치 |
|---|---|---|---|
| 높음 | 문서 단일 출처 정리 | `DEFERRED_WORK`, `BUG_AUDIT`, `SITE_IMPROVEMENT_BACKLOG` 역할이 겹침 | 문서 역할을 명확히 재정의 |
| 높음 | `README.md` 최신화 | 실행 명령/스타일/폰트/구조 설명 일부 틀림 | 빠른 시작 + 검증 명령 중심으로 수정 |
| 높음 | `SITE_IMPROVEMENT_BACKLOG.md` 완료 항목 정리 | 이미 완료된 항목이 실행 후보로 남아 있음 | 완료/부분완료/남은일 재분류 |
| 중간 | `ARCHITECTURE.md` 확장 | 실제 DB/store/라우트/QA 구조를 설명하기엔 짧음 | 아키텍처 기준 문서로 강화 |
| 중간 | 동적 라우트 fixture QA | `/note/[id]`, `/note/sample/[id]`는 실제 ID fixture가 필요 | seed 기반 runtime 케이스 추가 |
| 중간 | route drift 자동 테스트 | 현재 full-rt 누락은 0개지만 자동 비교 테스트는 약함 | `app/**/page.*`와 QA 목록 비교 테스트 추가 |
| 중간 | API 없음 명시 | 문서에 API 구조 설명이 없다 | "현재 서버 API route 없음" 명시 |
| 낮음 | `.DS_Store` 잔여 | 루트와 `.git` 안에 `.DS_Store` 확인됨 | 삭제는 승인 후 별도 처리 |

---

## 10. 코드와 사용자 안내 불일치 후보

| 위치 | 문제 | 실제 코드 | 추천 |
|---|---|---|---|
| `app/menu-master/page.jsx` 삭제 ConfirmDialog | "원가·영양·판매량에서 고아 레코드가 남을 수 있음"이라고 안내 | `lib/menu-master/store.js`는 `cost_selling_prices`, `cost_recipes`, `nutrition_menu_ref`, `nutrition_raw_values` cascade 처리 | 안내 문구를 실제 cascade 기준으로 바꾸기 |
| `docs/SITE_IMPROVEMENT_BACKLOG.md` 백업 실패 처리 | 아직 해야 할 일처럼 남음 | 실패 store manifest와 복원 경고 있음 | 완료/부분완료 처리 |
| `docs/SITE_IMPROVEMENT_BACKLOG.md` 대용량 복원 | clear 후 chunk 저장 설명 | 현재 store 단위는 단일 트랜잭션 | 리스크 설명을 최신화 |

---

## 11. 추천 문서 구조

| 추천 문서 | 필요 여부 | 담아야 할 내용 | 현재 문서와의 관계 | 추천 이유 |
|---|---|---|---|---|
| `README.md` | 필수 | 설치, 실행, 검증 명령, 문서 링크, 최소 구조 | 현재 README 수정 | 첫 진입 문서 |
| `ARCHITECTURE.md` | 필수 | App Router, IndexedDB, store 그룹, 라우트 분류, QA 구조 | 현재 문서 확장 | 개발자가 구조를 빠르게 이해해야 함 |
| `docs/DEFERRED_WORK.md` | 필수 | 미완료 보류 작업만 | 현재 단일 출처 유지 | 실제 해야 할 일의 기준 |
| `docs/SITE_IMPROVEMENT_BACKLOG.md` | 선택 유지 | 제품/UX/성능 아이디어 | 실행 확정 전 후보 목록 | DEFERRED와 성격 분리 필요 |
| `docs/BUG_AUDIT_2026-06-14.md` _(삭제됨)_ | 삭제 완료 | 특정 날짜 감사 기록 | `DEFERRED_WORK.md`로 흡수 | 2026-06-14 삭제 |
| `docs/PROJECT_STRUCTURE_AUDIT_2026-06-14.md` | 이번 리포트 | 현재 구조/문서 점검 결과 | 새로 추가 | 문서 정리 작업의 근거 |
| `docs/QA_CHECKLIST.md` | 선택/추천 | 수동 QA, 출력물 체크리스트 | 현재 참조만 존재 | 운영 QA가 많아 별도 문서 가치 있음 |
| `docs/RELEASE_CHECKLIST.md` | 선택/추천 | 릴리즈 전 build/test/QA/checklist | 현재 참조만 존재 | 반복 릴리즈 품질 기준 |
| `CHANGELOG.md` | 선택 | 완료 이력 | `DEFERRED_WORK.md` 완료 이력 분리 후보 | DEFERRED가 너무 길어질 경우 |

---

## 12. 추천 정리 순서

1. `docs/SITE_IMPROVEMENT_BACKLOG.md`에서 이미 완료된 항목을 완료/부분완료로 정리한다.
2. `docs/DEFERRED_WORK.md`의 잘못된 경로와 없는 문서 참조를 수정한다.
3. `README.md`를 현재 실행 명령, 폰트, 스타일 구조, QA 명령 기준으로 갱신한다.
4. `ARCHITECTURE.md`에 라우트 분류, DB/store 구조, QA 스크립트 역할을 추가한다.
5. `BUG_AUDIT_2026-06-14.md`는 `DEFERRED_WORK.md`로 흡수 후 삭제 완료(2026-06-14).
6. 필요하면 `docs/QA_CHECKLIST.md`, `docs/RELEASE_CHECKLIST.md`를 별도 생성한다.

---

## 13. 최종 확인 질문

| 질문 | 선택지 | 추천 선택 | 이유 |
|---|---|---|---|
| 문서 정리 작업을 바로 진행할까요? | 분석 리포트만 유지 / 실제 문서 수정 진행 | 실제 문서 수정 진행 | 현재 문서가 다음 작업을 잘못 유도할 수 있음 |
| `SITE_IMPROVEMENT_BACKLOG.md`의 완료 후보를 어떻게 처리할까요? | 삭제 / 완료 섹션 이동 / 주석만 추가 | 완료 섹션 이동 | 이력 보존과 혼동 방지를 동시에 만족 |
| `BUG_AUDIT_2026-06-14.md`는 어떻게 둘까요? | 유지 / archive / 삭제 | **삭제 완료** | `DEFERRED_WORK.md` 흡수 후 삭제(2026-06-14) |
| `QA_CHECKLIST.md`, `RELEASE_CHECKLIST.md`를 만들까요? | 둘 다 생성 / 하나만 생성 / 생성 안 함 | 둘 다 생성 | 이미 문서에서 참조하고 운영상 반복 필요 |
| README는 얼마나 자세히 둘까요? | 빠른 시작만 / 상세 구조 포함 | 빠른 시작 + 링크 | README 노후화를 줄이고 상세는 ARCHITECTURE로 분리 |

---

## 14. 결론

현재 프로젝트 구조 자체는 도메인별로 잘 분리되는 방향으로 정리되어 있다. 특히 `lib/db`, `lib/menu-master/category-policy.js`, `lib/cost/composite-price.js`, `lib/nutrition/values/store.js`, `scripts/full-rt.mjs` 등은 이미 여러 정합성 문제를 보완한 흔적이 있다.

다만 문서가 그 속도를 따라가지 못했다. 특히 `SITE_IMPROVEMENT_BACKLOG.md`에는 이미 코드로 해결된 항목이 남아 있고, `README.md`와 `DEFERRED_WORK.md`에는 현재 경로와 맞지 않는 설명이 있다. 다음 작업은 기능 구현보다 문서 단일 출처 정리와 완료 항목 재분류가 먼저다.
