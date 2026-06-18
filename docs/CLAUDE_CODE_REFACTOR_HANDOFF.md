# Claude Code Refactor Handoff

> 최종 갱신: 2026-06-18  
> 이전 버전은 `9a6ad28f` 커밋에서 dead code로 삭제됐으며, 이 문서가 후속 출처입니다.

---

## 1. 현재 상태 요약

| 지표 | 값 |
|---|---|
| 테스트 | **268 suites / 1411 tests** (모두 통과) |
| qa:smoke | **22/22 라우트** |
| qa:workflow | **9/9 시나리오** (2026-06-18 IDB 블로킹 수정 후 완성) |
| qa:runtime | **63/63 라우트** |
| Next.js | 14.2.35 (Node 24 안정 빌드) |
| IndexedDB | v23 스키마 (DB_VERSION) |
| 브랜드 | 7번가(main) / 차이나X4(china4) / 이천밥썜(ysb) |

리팩토링 플랜(`CLAUDE_CODE_REFACTOR_HANDOFF.md` 이전 버전 + `SITE_REFACTOR_AND_HARDENING_PLAN.md` 1~8단계)의 모든 항목은 완료됐습니다. 보류된 항목의 단일 출처는 `docs/DEFERRED_WORK.md`입니다.

---

## 2. 아키텍처 핵심

### 데이터 레이어
- **IndexedDB 전용** — 서버 DB 없음. `lib/db/init.js`의 `initDB()` 가 활성 브랜드 DB를 싱글톤으로 열어 반환한다.
- **멀티 브랜드**: `dbNameFor(brandId)` 가 브랜드별 DB 이름을 반환. main → `rnd_manager_v3`, china4 → `rnd_manager_v3__china4`. 비-main 브랜드는 빈 DB로 시작하며 별도 가드 필요.
- **DB 로드 패턴**: `useDBLoad` 훅이 표준. `initDB()` + 쿼리 + 상태 관리 일체 처리. 직접 `useEffect`+`initDB()` 조합은 신규 코드에 사용하지 않는다.

### 권한 레이어
- **`assertActiveAdmin(actionLabel)`** (`lib/auth/guard.js`): 파괴적 async 함수 최상단 가드. viewer이면 `PermissionDeniedError` throw.
- 대상 함수: `addAccount`, `updateAccount`, `deleteAccount`, `deleteMenuMaster`, `resetAllMenuMaster`, `seedMenuMaster`, `deleteIngredient`, `bulkDeleteIngredients`, `importAllToBrand`.
- **`useCurrentRole()`**: React 훅. `{ role, isAdmin, ready }` 반환. fail-closed(초기값 `'viewer'`).
- sync 브랜드 메타(`upsertBrand` 등)는 비파괴 localStorage 조작이라 가드 제외(DEFERRED_WORK 참조).

### 컴포넌트/파일 구조
- 대형 page 파일은 page = 조립, hook/lib = 로직, components/ = 렌더링으로 분리됐다.
- `app/**/page.jsx` 각 라우트에 `loading.jsx` + `error.jsx` 경계 추가 완료.
- 아이콘은 `components/icons.jsx` 자체 SVG 세트 (외부 라이브러리 없음).
- CSS: `styles/` 내 역할별 분리 완료(`components/`, `features/`, `motion*.css` 등).

---

## 3. 주요 Footguns

### IDB onblocked 블로킹
- **증상**: `waitForDbStore` 같은 패턴이 버전 없이 `indexedDB.open(name)` 호출 → v1 stub DB 생성 → 이후 `initDB()`의 버전 업그레이드 차단 → `onblocked` → Promise 영원히 미결 → `useCurrentRole` 초기화 안 됨 → 버튼 disabled 유지.
- **현재 상태**: `lib/db/init.js`의 `onblocked`는 즉시 `reject()`로 처리함. `waitForDbStore` 함수는 삭제됨.
- **E2E 대기 패턴**: `scripts/workflow-qa.mjs`의 `goto()`는 `page.addInitScript`로 주입한 `IDBFactory.prototype.open` 인터셉터의 `window.__idbInitDone` 플래그를 `waitForFunction`으로 기다린다. 버전 있는 IDB open 성공 = `initDB()` 완료.

### no-undef 런타임 ReferenceError
- 훅 추출 시 page 컴포넌트의 변수(`page`, `setPage` 등)를 훅 내에서 참조하면 lint/build 단계에서 못 잡히고 런타임에서 터진다.
- 빈 DB 상태로 `npm run qa:runtime`을 돌리면 검출 가능. 새 훅 추출 후 반드시 실행.

### buildMetaOnlyRow 손상
- 화면 행(display row)과 DB 레코드는 다르다. `buildMetaOnlyRow` 반환값을 DB에 직접 쓰면 데이터 손상.
- 삭제 Undo는 반환 레코드(saveResult)로 복원, 임의 재구성 금지.

### 모듈 간 cascade
- 모듈 간 cascade 호출(`ingredient` → `nutrition`, `menu-master` → `nutrition` 등)은 circular import 방지를 위해 **동적 import** 사용.

### Next.js build (Node 24)
- `npm run build` 가 Node 24에서 `_document` 모듈 오류로 실패하는 경우가 있음 — 환경 문제, 코드 이상 아님. 컴파일 단계(`Compiled successfully`) 통과 시 코드 검증은 유효.

---

## 4. QA 명령

```bash
npm run lint          # ESLint 0 warnings 필수
npm run format:check  # Prettier 포맷 확인
npm run test:ci       # 268 suites / 1411 tests
npm run qa:smoke      # 22/22 라우트 (Playwright, dev 서버 필요)
npm run qa:workflow   # 9/9 E2E 시나리오 (Playwright, dev 서버 필요)
npm run qa:runtime    # 63/63 라우트 no-undef/hydration 검사
npm run build:clean   # .next 삭제 후 production 빌드
npm run audit:docs    # docs/ 파일 stale 감사
```

dev 서버: `npm run dev:lan` (LAN 접근용, `0.0.0.0:3000`).  
코드 수정 후 `.next` 삭제 + `dev:lan` 재시작 권장 (캐시 충돌 방지).

---

## 5. 이 세션에서 완료한 작업 (2026-06-18)

| 커밋 | 내용 |
|---|---|
| `1e23179f` | qa:workflow 9/9 통과 — IDB onblocked 블로킹 근본 원인 제거 |
| `9a6ad28f` | dead code 정리 (HANDOFF·BulkPriceModal·UsageView 파일 삭제) |
| `05733683`, `3339aa65` | SITE_STATUS.md stale 수치 보정 |
| `2131efc3` | SITE_SCORE_IMPROVEMENT_ACTION_PLAN.md DEFERRED_WORK 흡수 후 삭제 |
| `11fa7c71`, `981c1f68`, `bfe72c4d` | workflow QA 시나리오 3→5→9개 확장 |
| `225497b5` | BUG-003: 식자재 buildRecord NaN 저장 방어 |
| `45618b4e` | 작업계획 파일 10개 DEFERRED_WORK 흡수 후 삭제 |
| `2a82a4b5`, `71ce73c9` | P4 리팩토링 (nutrition dedup, recipe-print builders) |

### IDB 수정 상세

**문제**: `scripts/workflow-qa.mjs`의 `waitForDbStore()` 함수가 버전 없이 `indexedDB.open(name)`을 호출 → v1 연결 생성 → `initDB()`(v23 업그레이드 시도)에 `onblocked` 발생 → 기존 `onblocked` 핸들러가 CustomEvent 발송만 하고 Promise를 resolve/reject하지 않아 영원히 hang.

**수정 1** (`lib/db/init.js`): `onblocked` 핸들러가 `reject(new Error(...))` 즉시 호출.  
**수정 2** (`scripts/workflow-qa.mjs`): `waitForDbStore` 함수 전체 삭제. `goto()` 내 대기는 `page.addInitScript`로 주입한 IDB 인터셉터의 `window.__idbInitDone` 플래그로 대체.

---

## 6. 보류 작업

`docs/DEFERRED_WORK.md` 참조. 주요 미완 항목:

- **N-43** 재료단가표 과거 단가 조회 (명세 미확정)
- **E2E QA 확장** 4개 시나리오 (레시피·판매량 fixture 설계 선행 필요)
- **외부 배포 보안 강화** (LAN HTTP 내부 환경 → 외부 배포 전환 시)
- 메뉴마스터 레시피 2차 UX 후보
- CSS 디자인 시스템 정리
- 식자재 데이터 정리 도구

---

## 7. Codex 추가 구조 점검 결과 (2026-06-18)

아래 항목은 Claude가 현재 진행 중이라고 보고한 작업과 충돌하지 않도록 정리한 추가 후보입니다.

### 현재 Claude 진행 항목으로 간주

다음 항목은 Claude 쪽 진행표에 이미 포함되어 있으므로, 새 작업을 잡을 때 중복 커밋으로 섞지 않습니다.

| 항목 | 위험도 | 메모 |
|---|---|---|
| CSS·디자인 시스템 정리 | low | motion/home/report 등 대형 CSS 분리 |
| 출력·인쇄·다운로드 파이프라인 점검 | low | PDF/CSV/XLSX 공통 UX·파일명 규칙 |
| localStorage·백업 범위 정합성 점검 | medium | 영속 키 vs 세션 키 분류 |
| 에러·빈상태·권한 상태 UI 통일 | low | EmptyState·다시시도·viewer tooltip |
| 업로드·import 중복 로직 정리 | medium | CSV/XLSX 확장자·크기·파싱 실패 공통화 |
| 모바일·좁은 화면 레이아웃 재검사 | low | 390px 폭 테이블·모달 겹침 |
| B-20 실업무 fixture 2차 보강 | high | test:ci 포함 완료 기준 |

### 작업 전 필수 게이트

1. 현재 구조 스캔 기준 `npm run lint`, `npm run test:ci`, `npm run audit:docs`, `git diff --check`는 통과했다.
2. `npm run format:check`는 162개 파일에서 실패했다. 다음 기능/분리 작업 전에 Prettier 정리를 별도 커밋으로 먼저 처리하는 것을 권장한다.
3. worktree에는 `docs/DEFERRED_WORK.md`, `docs/SITE_STATUS.md` 수정과 `docs/CLAUDE_CODE_REFACTOR_HANDOFF.md`, `docs/INTERNAL_TOOL_POLISH_PLAN.md` untracked가 있다. 문서 커밋 범위를 먼저 확정한다.

### 추가 추천 작업 A: workflow QA 구조 분리

- 대상: `scripts/workflow-qa.mjs` (882줄)
- 이유: 9개 시나리오가 한 파일에 있어 다음 B-20 확장 시 충돌과 회귀 원인 추적 비용이 커진다.
- 권장 구조:
  - `scripts/workflow/runner.mjs`
  - `scripts/workflow/scenarios/*.mjs`
  - `scripts/workflow/db-fixtures.mjs`
  - `scripts/workflow/assertions.mjs`
  - 기존 `scripts/workflow-qa.mjs`는 runner 진입점만 유지
- 추가하면 좋은 시나리오:
  - 메뉴마스터 레시피 저장 -> 닫기/재오픈 -> 원가 셀 반영 확인
  - 식자재 단가 변경 -> 메뉴 레시피 원가 -> 원가마진표 반영
  - 공통원가 체크 -> 메뉴 원가 -> 원산지/알레르기 출력 반영
- 테스트:
  - `npm run qa:workflow`
  - `npm run test:ci`
  - workflow helper를 분리하면 `__tests__/scripts/*` 단위 테스트 추가

### 추가 추천 작업 B: 메뉴마스터 레시피 입력부 2차 분리

- 대상:
  - `components/menu-master/MenuRecipeSection.jsx` (376줄)
  - `components/menu-master/MenuRecipeComponentsTable.jsx` (261줄)
- 현재 역할: DB load, 자동완성, 키보드 이동, 공통원가 선택, 저장, 원가 요약 계산이 한 컴포넌트에 모여 있다.
- 권장 분리:
  - `useMenuRecipeEditor`: 기존 레시피/식자재/단가/공통그룹 load, 저장, reload
  - `useRecipeIngredientSearch`: 검색어, active suggestion, Enter/Arrow/Escape 처리
  - `recipeComponentRows.js`: hydrate/buildSave/blank row/filter invalid row 순수 함수
  - `MenuRecipeSummaryStrip`: 직접원가/공통원가/총원가/원가율 표시 전용 UI
- 보완 포인트:
  - 저장 전 빈 row 제거 또는 경고
  - 수량 0/음수/문자 입력 방어
  - productCode 없는 수동 식자재의 단가 key 정책 테스트
  - 저장 후 `onSaved` reload가 실제 목록 원가 셀까지 반영되는 E2E 추가
- 테스트:
  - `__tests__/lib/menu-recipe-components-keyboard.test.mjs`
  - `__tests__/lib/menu-master-recipe-summary.test.mjs`
  - 신규 순수 helper 테스트
  - `npm run qa:workflow`

### 추가 추천 작업 C: 식자재 store 레이어 분리

- 대상: `lib/ingredient/store.js` (689줄)
- 현재 역할: 조회, add/update/upsert meta, hide/restore, delete/bulk delete, category/tag removal, reset, productCode dedupe repair, bulk import, master seed, normalize가 한 파일에 있다.
- 권장 분리:
  - `lib/ingredient/normalize.js`: `normalizeOrigin`, `normalizeTags`, `readCategory`, `readTags`, `buildRecord`
  - `lib/ingredient/crud.js`: get/add/update/upsert meta
  - `lib/ingredient/destructive.js`: delete/bulkDelete/reset/hide/restore
  - `lib/ingredient/import.js`: bulk import + composite ref validation
  - `lib/ingredient/seed.js`: main 브랜드 시드 전용
  - `lib/ingredient/dedupe-repair.js`: duplicate diagnostics/repair
  - `lib/ingredient/store.js`는 public re-export facade로 유지
- 보완 포인트:
  - `deleteIngredient`, `bulkDeleteIngredients` 외에도 위험 변경 함수에 `assertActiveAdmin` 적용 범위 재검토
  - 삭제 cascade가 현재 nutrition legacy link 중심이라, 실제 recipe/common group 참조 영향 안내가 필요한지 확인
  - import/seed/repair는 실제 운영 데이터 대신 fixture DB에서만 검증
- 테스트:
  - 기존 `ingredient-*` 테스트 전체
  - `npm run test:ci`
  - `/ingredient/manage` smoke/runtime 확인

### 추가 추천 작업 D: useDBLoad 2차 확산

- 기준: 순수 DB load + loading/error/reload 패턴만 교체한다. DOM 이벤트, localStorage 동기화, keyboard/focus effect는 건드리지 않는다.
- 후보:
  - `components/menu-master/MenuRecipeSection.jsx`의 `initDB().then(...)` 로딩
  - `hooks/useHomeDashboardData.js`
  - `hooks/useNoteListData.js`
  - `hooks/useShipmentReportData.js`
  - `lib/price/use-price-upload.js`
  - `lib/shipment/use-shipment.js`
  - `lib/sales/use-sales-upload.js`
- 주의:
  - 업로드 hook은 단순 load만 분리하고, 업로드 진행 상태/이력 삭제/파일 파싱 action은 그대로 둔다.
  - 새 hook 추출 후 `npm run qa:runtime`으로 no-undef/runtime 오류를 확인한다.

### 추가 추천 작업 E: 루트 임시 파일/문서 정리

- 후보:
  - `verify-4th.mjs`
  - `verify-dashboard.mjs`
  - `verify-data-path.mjs`
  - `test-allergen.mjs`
  - 루트 `SITE_AUDIT_REPORT.md`
- 권장 방식:
  - 먼저 `rg`로 package script, README, docs, 테스트 참조 여부 확인
  - 살아 있는 수동 디버그 도구면 `scripts/dev/`로 이동
  - 과거 감사 문서면 `docs/archive/`로 이동
  - 완전 미사용이면 삭제 전 커밋 메시지에 근거 명시

### 추가 추천 작업 F: 영양성분 values/allergen matrix 분리

- 대상:
  - `lib/nutrition/values/store.js` (359줄)
  - `lib/nutrition/values/import.js` (339줄)
  - `lib/nutrition/allergen/matrix.js` (339줄)
- 이유: 엣지, 씬바샤삭, 세트, 토핑, 메뉴 기준 입력 정책이 많아 다음 요구사항에서 회귀 위험이 높다.
- 권장 분리:
  - raw value CRUD, edge CRUD, topping CRUD, composition CRUD 분리
  - import parser와 row matching/helper 분리
  - allergen matrix의 key/edge/source/detail rows helper 분리
- 테스트:
  - 엣지별 영양값 자동/수동 정책
  - 씬바샤삭 L only 정책
  - 메뉴 기준 입력 우선 정책
  - 원산지/알레르기는 식자재 기준 자동 집계 유지

### 추가 추천 작업 G: docs 정합성 정리

- 현재 `docs/DEFERRED_WORK.md`가 길어지고 있으나 단일 출처 역할은 유지한다.
- `docs/SITE_STATUS.md`는 `npm run audit:docs` 수치 검증 대상이므로 구조 변경 후 반드시 업데이트한다.
- `docs/INTERNAL_TOOL_POLISH_PLAN.md`는 현재 untracked다. 유지할 경우 이 handoff 문서와 역할을 나눈다:
  - `CLAUDE_CODE_REFACTOR_HANDOFF.md`: Claude 작업자가 바로 보는 실행 인수인계
  - `INTERNAL_TOOL_POLISH_PLAN.md`: 내부 운영툴 완성도 계획
  - `DEFERRED_WORK.md`: 완료/보류 이력 단일 출처

## 8. 다음 작업 착수 시 권장 순서

1. `docs/DEFERRED_WORK.md` 섹션 B를 열어 미완 항목 확인
2. `npm run test:ci` + `npm run qa:smoke` green 확인 후 착수
3. 새 훅 추출 시 `npm run qa:runtime`으로 no-undef 검증
4. 브랜드 관련 작업 시 7번가 DB 무변경 원칙 준수 (비-main 빈 시작·가드)
