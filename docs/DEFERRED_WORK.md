# 보류·정비 작업 단일 출처 (Deferred Work)

> 이 파일이 미루어진 모든 작업 + 정비 이력의 **단일 최종 출처**입니다.
> 새 보류 항목은 위험도에 맞춰 아래 플랜에 추가하고, 완료 시 상태를 `✅ 완료`로 바꾸고 완료일을 기입하세요.
>
> 2026-06-14 감사(구 `docs/BUG_AUDIT_2026-06-14.md`)는 내용 전부 이 문서에 흡수 후 삭제됐습니다.
> 제품·UX 후보는 `docs/SITE_IMPROVEMENT_BACKLOG.md`에 남아 있습니다. 실행 여부·우선순위·완료 판단은
> 이 문서의 정규화된 항목을 기준으로 합니다.

---

## 범례

| 기호 | 의미 |
|------|------|
| 🔴 고위험 | 다중 store 수정 / 집계 결과 변경 → 회귀 위험 큼 |
| 🟡 중위험 | 단일 모듈 구조 변경, 충분한 테스트 필요 |
| 🟢 저위험 | UI 정보·안내 개선, 사이드이펙트 없음 |
| ⏸ 보류 | 아직 시작 안 함 |
| 🚧 진행 중 | 현재 작업 중 |
| ✅ 완료 | 구현·테스트 완료 |

---

## B. 보류 작업 플랜 (미완료 항목만)

> 아래는 **실제로 아직 진행되지 않은** 항목만 기재합니다.
> 완료된 항목은 하단 "완료 이력" 섹션으로 이동됐습니다.

---

### 🐞 버그 우선 처리 색인 (2026-06-14 코드 대조)

> B/N 항목 중 **사용자 영향 버그/결함**만 우선순위순으로 추린 색인.
> 정비(리팩토링)·QA 도구·문서·신기능은 버그가 아니므로 제외. 상세는 각 항목 본문 참조.

| 우선 | 항목 | 버그 내용 | 상태 | 착수 조건 |
|------|------|-----------|------|-----------|
| 1 | **B-9** | 1인피자 알레르기 표시 불일치 — 라벨은 씬바사삭L만 출력(`label/build.js:266`), 알레르기 화면은 크러스트 변형 전부 생성(`allergen/matrix.js:96`). **법적 표기 영향.** | ✅ 완료(2026-06-15) | 도메인 확인 완료 — 1인피자는 씬바사삭 1종 |
| 2 | **B-25** | production 빌드 비결정적 실패 → dev/prod `.next` 섞이면 런타임 500 | ✅ 완료(2026-06-15) | Next 14.2.35 업그레이드로 해결 |
| 3 | **B-26** | route-level `error.jsx` 부재 → 한 화면 런타임 예외가 전체 앱을 다운시킴 | ✅ 완료(2026-06-14) | — |

- **B-21**(silent catch) ✅ **완료(2026-06-15)**: 사용자 액션 실패(저장·삭제·복원·출력)는 모두 toast 노출 처리됨. 남아 있는 optional/background 빈 catch는 `silent-catch-policy.test.mjs` allowlist와 사유로 고정한다.
- **즉시 착수 가능한 버그**: 없음. **게이트 대기 버그**: 없음.
- **버그 아님(정비/도구/문서/신기능)**: B-20·B-23(QA 도구), B-3 Phase 2·B-5·B-6(리팩토링), B-24(문서), N-42·N-43(신기능, 게이트).

---

### 🔴 고위험 — 운영 기준선 / QA 신뢰성

#### B-20. 실업무 fixture 기반 업로드/다운로드/계산 회귀 테스트  🔴 🚧 2차 보강(2026-06-15)
- **파일**: `__tests__/`, `scripts/`, 판매량·제때 단가·메뉴 판매가·원가 기준표 관련 store/builder
- **문제**: 현재 자동 QA는 빈 DB/비파괴 UI 검증 중심이고, 실업무 Excel fixture가 부족하다.
- **해결 방향**: 익명화 fixture로 판매량 업로드, 중복 차단, 필수 컬럼 누락, 다운로드 헤더, 원가 계산 기준값 비교를 자동화한다.
- **진행 완료(2026-06-15)**: `business-fixtures.test.mjs`에 판매량 분류/제외/미매칭 fixture를 추가하고, 기존 판매량 필수 헤더·제때 단가·메뉴 판매가·원가 기준표 fixture와 함께 `test:ci` 회귀 범위에 포함했다.
- **추가 보강(2026-06-15)**: 판매량 같은 연월 중복 저장 차단, 업로드 오류 CSV 헤더, 엣지별 영양성분 표 출력(베이스+엣지 조정값·씬바샤삭 별도 입력값) fixture를 추가했다. 저장 직전 트랜잭션 내부에서도 같은 연월을 다시 확인해 다중 탭 동시 업로드 중복을 차단한다. 실제 `.xlsx` workbook을 생성해 판매량 fixture 파싱/검증까지 통과하는 Excel 입력 회귀 테스트를 추가했다.
- **완료 기준**: fixture 테스트가 `npm run test:ci`에 포함되고, 업로드/중복/다운로드/계산 회귀를 검출한다.

#### B-21. console-only / silent catch 분류  🟡 ✅ 완료(2026-06-15)
- **파일**: `hooks/useKanbanBoard.js`, `hooks/useNoteBatchActions.js`, `hooks/useIngredientPriceData.js`, `app/settings/restore/page.jsx`, `app/settings/backup/page.jsx`, `app/nutrition/allergen/page.jsx`, `app/ingredient/usage/page.jsx`, `lib/ingredient/store.js` 등
- **문제**: 2026-06-14 감사 기준 `.catch(console.error)`, `.catch(() => {})`, `console.error`, `console.warn` 패턴이 154건 확인됐다.
- **해결 방향**: 사용자 액션 실패는 toast/화면 오류로 노출하고, background/optional 실패는 의도 주석 또는 helper로 분리한다.
- **진행 완료(2026-06-14)**:
  - 칸반 보드 초기 로드 실패: `loadError` 상태·실패 카드·`다시 시도` 액션·toast 추가.
  - 칸반 드래그 저장 실패: console-only 처리에서 toast + 재동기화로 변경.
  - 식자재 삭제 실행취소 실패: 단건/일괄 undo의 `restoreRecord` 실패를 숨기지 않고 toast + console context로 노출.
  - 식자재 삭제 cascade 실패: 영양값/알레르기 링크 cascade 실패를 `cascadeErrors`로 반환하고 관리 화면에서 경고 toast 표시.
  - 식자재 일괄 삭제 실패: `bulkDeleteIngredients`가 `{ removed, failures }`를 반환해 부분 실패를 사용자에게 표시.
  - 메뉴마스터 삭제 cascade 실패: 영양 참조 정리 실패를 `cascadeErrors`로 반환하고 화면에서 경고 toast 표시.
  - optional validation/log 실패: `validateCompositeRefs`, `logWork` 실패는 의도된 background 경고로 분류하고 context 있는 `console.warn`으로 정리.
- **추가 테스트**:
  - `__tests__/hooks/kanban-board-guards.test.mjs`
  - `__tests__/lib/ingredient-manage-undo-guards.test.mjs`
  - `__tests__/lib/ingredient-delete-cascade.test.mjs`
- **추가 보강(2026-06-16)**: `showToast(..., 'err')` legacy 호출부를 정식 `error` 타입으로 정규화하고, `toast-type-policy.test.mjs`로 재발을 방지한다. `components/Toast.jsx`의 `err` alias는 외부/구호출 하위호환용으로만 유지한다.
- **추가 보강(2026-06-16)**: 실패/입력 필요 같은 부정 토스트가 타입 생략으로 `ok` 표시되지 않도록 묶음 관리·공급업체 입력 호출부를 보정하고, `toast-type-policy.test.mjs`에 단일 인자 부정 토스트 guard를 추가했다.
- **추가 보강(2026-06-16)**: 남아 있던 `console.error(err)`·`console.warn(err)` 단독 로그에 화면/동작 컨텍스트 라벨을 붙이고, `console-context-policy.test.mjs`로 재발을 방지한다.
- **정책 고정(2026-06-16)**:
  - 사용자 액션 실패는 toast/화면 오류/결과 errors로 노출한다.
  - optional/background 빈 catch는 `silent-catch-policy.test.mjs` allowlist에 파일·맥락·사유를 등록한 위치에만 허용한다.
  - `hooks/useNoteBatchActions.js`·`hooks/useIngredientPriceData.js`·`app/settings/backup/page.jsx`·`app/nutrition/allergen/page.jsx`·`app/ingredient/usage/page.jsx` — silent catch **0건 확인** (이미 정리됨).
  - 테스트 fixture에서 의도적으로 발생시키는 `price-history`, `managed-products` 경고의 사용자 액션/테스트 전용 분리(테스트 한정).
- **완료 기준**: 저장/삭제/복원/출력처럼 사용자가 실행한 작업의 실패가 침묵하지 않는다. → **사용자 액션 측면 충족**.

#### B-23. smoke 미포함 중요 라우트와 동적 라우트 QA 확대  🟡 ✅ 완료(2026-06-15)
- **파일**: `scripts/smoke-qa.mjs`, `scripts/full-rt.mjs`
- **문제**: smoke는 22개 대표 라우트만 확인한다. `qa:runtime`은 주요 정적 라우트 63개를 커버하지만, dynamic edit/detail 라우트와 실데이터 fixture 흐름은 별도 검증이 필요하다.
- **현재 완화**: `scripts/smoke-qa.mjs`는 `/menu-sales/rank` redirect 대신 최종 목적지 `/menu-sales/rank-compare`를 보고, `npm run qa:runtime`은 63/63 통과했다.
- **해결 방향**: fixture 기반 QA에서 dynamic route(`/note/[id]`, `/note/sample/[id]`)와 업로드/출력 흐름을 커버한다. `app/**/page.*` 정적 라우트와 `scripts/full-rt.mjs` 대상 목록을 비교하는 route drift guard를 추가한다.
- **완료 내용**: `/cost/recipe-master` route classification 누락을 보강했고, `route-classification.test.mjs`가 실제 `app/**/page.*` 목록과 분류표를 대조한다. `scripts/full-rt.mjs`는 임시 IndexedDB fixture를 seed한 뒤 `/note/900001`, `/note/sample/900001` 동적 상세 route에 직접 진입해 runtime 오류·hydration·빈 화면 여부를 검사한다.

#### B-25. production 빌드 비결정적 실패 (Node 24 + Next 14.2.3 환경)  🔴 ✅ 완료(2026-06-15)
- **해결**: Next.js `14.2.3` → `14.2.35` 패치 업그레이드 (`package.json` next·eslint-config-next 동시 변경).
- **검증**: Node v24.15.0에서 `npm run build:clean` 2회 연속 58 pages 안정 통과. page-data 수집 단계 포함 정상.
- **lint**: ESLint 0 warnings, **test:ci**: 147 suites / 839 tests 통과.

---

### 🟡 중위험 — 단일 모듈 구조 변경 / 테스트 필요

#### B-3 Phase 2. 알레르기 링크 테이블(legacy) store 정의 제거  🟡 ✅ 완료(2026-06-15)
- **완료(Phase 1, 2026-06-13)**: `lib/nutrition/allergen/store.js` dead code 6종 제거.
- **완료(Phase 2, 2026-06-15)**: DB v20 — `nutrition_allergy_links` store 정의 제거(constants·module-stores·schema), v20 마이그레이션에서 기존 DB의 store를 `deleteObjectStore`로 삭제. `migrate-to-ingredient.js` allergen 파트 제거(origin 파트 유지). 7번가 DB 0/0 확인 후 착수.

#### B-5. useDBLoad 전면 확산  🟡 ⏸
- **파일**: 직접 `getAll()`·`initDB()` 호출하는 페이지 다수
- **문제**: 일부 페이지가 `useDBLoad` 대신 useEffect + 직접 DB 호출 패턴 사용. 에러 핸들링·로딩 상태 누락.
- **해결 방향**: 각 페이지를 `useDBLoad` 패턴으로 통일.
- **왜 보류**: 변경 범위 넓음. 회귀 위험 > 현재 효과. 안전 우선.
- **관련 메모리**: [[deferred-refactors]]

#### B-6 / C-P4. 대형 컴포넌트 분해  🟡 ✅ 완료(2026-06-16)  (C-P4 통합)
- **진행 현황**:
  - `app/report/cost/page.jsx` ✅ 2026-06-14 — 869→407줄. `CostReportView`·`CostTableView` → `components/report/cost/`로 추출. `groupPizzaLR` 이전 완료.
  - `app/report/sales/page.jsx` ✅ 2026-06-15 부분 보강 — Excel export 시트/파일명 조립을 `lib/report/sales-export.js`로 분리하고 fixture 테스트 추가. 938→856줄.
  - `app/report/sales/page.jsx` ✅ 2026-06-15 추가 보강 — 보고서 미리보기 전체를 `components/report/sales/SalesReportPreview.jsx`로 분리. 856→307줄.
  - `app/report/page.jsx` ✅ 2026-06-16 추가 보강 — 새 보고서 종류 선택 모달을 `components/report/NewReportModal.jsx`로 분리. 763→676줄.
  - `app/report/page.jsx` ✅ 2026-06-16 추가 보강 — 보고서 통계 카드 row와 count-up 표시를 `components/report/ReportStatsRow.jsx`로 분리. 676→637줄.
  - `app/report/page.jsx` ✅ 2026-06-16 추가 보강 — 보고서 종류 카드 grid와 최근 건수 표시를 `components/report/ReportKindGrid.jsx`로 분리. 637→610줄.
  - `app/report/page.jsx` ✅ 2026-06-16 추가 보강 — 검색/종류 필터와 즐겨찾기/표시 건수 툴바를 `components/report/ReportFilterToolbar.jsx`로 분리. 610→587줄.
  - `app/report/page.jsx` ✅ 2026-06-16 추가 보강 — 보고서 목록 로딩 skeleton 렌더링을 `components/report/ReportListSkeleton.jsx`로 분리. 587→543줄.
  - `components/report/sales/SalesReportPreview.jsx` ✅ 2026-06-15 추가 보강 — 카테고리 비중·피자 변동·순위표·비교표·제외 리스트 섹션 컴포넌트 분리. 587→94줄.
  - `components/report/sales/SalesRankTableSection.jsx` ✅ 2026-06-15 추가 보강 — 카테고리 막대·순위표·사이즈 variant row 렌더링을 `SalesRankTableRows`로 분리. 197→52줄.
  - `components/report/sales/SalesRankTableRows.jsx` ✅ 2026-06-15 추가 보강 — 카테고리 막대와 순위표 테이블을 `SalesCategoryBarRows`·`SalesRankTable`로 분리하고 기존 묶음 파일 제거. 163→0줄.
  - `components/report/sales/SalesRankTable.jsx` ✅ 2026-06-16 추가 보강 — 순위 row, 사이즈 variant row, 전월 증감 cell 렌더링을 순위표 row 전용 `SalesRankTableRows`로 분리. 80→23줄.
  - `components/report/sales/SalesCategoryBarRows.jsx` ✅ 2026-06-16 추가 보강 — 카테고리 막대 row 렌더링과 수량/비율/opacity 계산을 `SalesCategoryBarRow`·`buildSalesCategoryBarMetrics`로 분리. 87→19줄.
  - `components/report/sales/SalesCategoryBarRow.jsx` ✅ 2026-06-16 추가 보강 — 수량/비율/opacity 계산을 `salesCategoryBarMetrics` helper로 분리하고 단위 테스트 추가. 97→83줄.
  - `app/menu-master/page.jsx` ✅ 2026-06-16 추가 보강 — 레시피/원가 상태 cell과 통계 카드 row를 `MenuRecipeCostCell`·`MenuMasterStatsRow`로 분리. 835→735줄.
  - `app/menu-master/page.jsx` ✅ 2026-06-16 추가 보강 — 메뉴 테이블 row/status/action 렌더링을 `MenuMasterTableRow`로 분리. 735→636줄.
  - `app/menu-master/page.jsx` ✅ 2026-06-16 추가 보강 — 상태/분류/검색 필터 패널을 `MenuMasterFilterPanel`로 분리. 636→556줄.
  - `app/menu-master/page.jsx` ✅ 2026-06-16 추가 보강 — 로딩 skeleton 테이블과 빈 상태 안내를 `MenuMasterLoadingTable`·`MenuMasterEmptyState`로 분리. 556→473줄.
  - `app/menu-master/page.jsx` ✅ 2026-06-16 추가 보강 — 테이블 카드·필터 결과 빈 상태·페이지네이션을 `MenuMasterTablePanel`로 분리. 473→428줄.
  - `app/menu-master/page.jsx` ✅ 2026-06-16 추가 보강 — 상단 CSV/일괄가격/초기화/추가 액션 버튼 묶음을 `MenuMasterHeaderActions`로 분리. 428→405줄.
  - `app/menu-master/page.jsx` ✅ 2026-06-16 추가 보강 — 편집/추가/일괄가격/삭제/초기화 모달 묶음과 삭제 영향 메시지를 `MenuMasterDialogs`로 분리. 405→352줄.
  - `components/menu-master/MenuMasterEditModal.jsx` ✅ 2026-06-16 추가 보강 — 메뉴코드/분류/가격/상태/제외/레시피 입력 필드 묶음을 `MenuMasterEditFields`로 분리하고 `CategoryTags`를 `MenuCategoryTags`로 독립. 391→127줄.
  - `components/menu-master/MenuMasterEditFields.jsx` ✅ 2026-06-16 추가 보강 — 식별/분류 필드, 가격/상태/출력 제외 필드, 공통 라벨/에러 표시를 `MenuMasterIdentityFields`·`MenuMasterCommercialFields`·`MenuMasterFieldPrimitives`로 분리. 277→74줄.
  - `components/menu-master/MenuRecipeSection.jsx` ✅ 2026-06-16 추가 보강 — 레시피 구성품 테이블·식자재 검색 제안·단가 표시 row를 `MenuRecipeComponentsTable`로 분리. 449→286줄.
  - `components/menu-master/MenuRecipeSection.jsx` ✅ 2026-06-16 추가 보강 — 레시피 저장 헤더와 예상 원가/확인 요약 표시를 `MenuRecipeSectionHeader`로 분리. 286→238줄.
  - `lib/menu-master/recipe-summary.js` ✅ 2026-06-16 추가 보강 — 공통 원가 관리의 공통묶음을 메뉴 카테고리/사이즈 기준으로 메뉴마스터 원가 요약에 포함하고, 공통묶음 원산지/알레르기 fixture를 추가.
  - `app/note/_NoteContent.jsx` ✅ 2026-06-15 부분 보강 — `NoteTableRow`·`NoteContextMenu` 렌더링 컴포넌트 분리. 1022→843줄.
  - `app/note/_NoteContent.jsx` ✅ 2026-06-15 추가 보강 — `NoteStatsSummary`·`NoteFilterControls` 렌더링 컴포넌트 분리. 843→642줄.
  - `app/note/_NoteContent.jsx` ✅ 2026-06-15 추가 보강 — `NoteCardGrid`·`NoteTableView` 목록 렌더링 컴포넌트 분리. 642→546줄.
  - `app/note/_NoteContent.jsx` ✅ 2026-06-15 추가 보강 — `NoteListHeader`·`NotePageDialogs`·`NoteListStates` 렌더링 컴포넌트 분리. 546→450줄.
  - `app/note/_NoteContent.jsx` ✅ 2026-06-15 추가 보강 — 단일 노트 삭제·복사·상태변경·새 버전 이동 handler를 `hooks/useNoteItemActions.js`로 분리. 450→359줄.
  - `app/note/_NoteContent.jsx` ✅ 2026-06-15 추가 보강 — 데이터 로드, 목록 필터/view 상태, 보고예정 복사 로직을 `useNoteListData`·`useNoteListState`·`useNoteReportingCopy`로 분리. 359→245줄.
  - `app/note/_NoteContent.jsx` ✅ 2026-06-15 추가 보강 — 카드/테이블/컨텍스트 메뉴/상세 모달 본문 wiring을 `NoteListBody`로 분리. 245→186줄.
  - `app/note/_NoteListBody.jsx` ✅ 2026-06-16 추가 보강 — 컨텍스트 메뉴 좌표 계산과 ESC 닫기 상태를 `useNoteContextMenuState`로 분리. 113→98줄.
  - `app/note/_NoteListBody.jsx` ✅ 2026-06-16 추가 보강 — 컨텍스트 메뉴/카드/테이블/상세 모달 props 조립을 `noteListBodyProps` helper로 분리하고 단위 테스트 추가. 98→40줄.
  - `app/note/noteListBodyProps.js` ✅ 2026-06-16 추가 보강 — 목록 본문 props 조립 helper를 overlay/view 파일로 나누고 기존 파일은 re-export 허브로 축소. 102→2줄.
  - `app/note/_NoteContent.jsx` ✅ 2026-06-16 추가 보강 — 상단 헤더/필터/프리셋/다이얼로그/본문 props 조립을 `useNoteContentController`로 분리. 186→39줄.
  - `hooks/useNoteContentController.js` ✅ 2026-06-16 추가 보강 — 노트 목록 props 조립을 `lib/note/content-props.js` helper로 분리. 174→40줄.
  - `lib/note/content-props.js` ✅ 2026-06-16 추가 보강 — dialogs/header/filter/preset/states/body props 조립을 `content-prop-builders`로 분리. 167→43줄.
  - `lib/note/content-prop-builders.js` ✅ 2026-06-16 추가 보강 — 노트 목록 props builder를 dialog/header/filter/body 파일로 분리하고 기존 파일은 re-export 허브로 축소. 176→11줄.
  - `app/note/sample/page.jsx` ✅ 2026-06-15 추가 보강 — 헤더 액션, 필터/검색, 캘린더, 갤러리/리스트 렌더링을 전용 컴포넌트로 분리. 852→422줄.
  - `app/note/sample/page.jsx` ✅ 2026-06-16 추가 보강 — 데이터 로드/검색·정렬·달력 파생 상태와 삭제·복사·별점 액션을 `useSamplePageState`·`useSampleRecordActions`로 분리. 422→263줄.
  - `app/note/sample/page.jsx` ✅ 2026-06-16 추가 보강 — 비교 하단바와 상세/비교/삭제 확인 다이얼로그를 `SampleCompareBar`·`SamplePageDialogs`로 분리. 263→230줄.
  - `app/note/sample/useSamplePageState.js` ✅ 2026-06-16 추가 보강 — 검색/필터/정렬, 카테고리·별점 집계, 달력 일자/날짜별 묶음을 `samplePageStateUtils`로 분리. 198→160줄.
  - `app/note/sample/useSamplePageState.js` ✅ 2026-06-16 추가 보강 — 검색/카테고리/별점/정렬/view 상태와 URL·검색히스토리 wiring을 `useSamplePageFilterState`로 분리. 160→80줄.
  - `app/note/sample/useSamplePageFilterState.js` ✅ 2026-06-16 추가 보강 — 필터 query/path 생성, URL 초기값, 정렬/view 저장 정책을 `samplePageFilterStateUtils`로 분리하고 단위 테스트 추가. 95→90줄.
  - `app/note/sample/_SampleFilterControls.jsx` ✅ 2026-06-16 추가 보강 — 카테고리 필터, 별점/정렬/view 컨트롤, 검색 히스토리 필드를 하위 컴포넌트로 분리. 192→59줄.
  - `app/note/sample/_SampleRatingViewControls.jsx` ✅ 2026-06-16 추가 보강 — 공통 chip 옵션 그룹과 별점 필터 그룹을 `SampleChipOptionGroup`·`SampleRatingFilterGroup`으로 분리. 88→52줄.
  - `app/note/sample/_SampleRecordsView.jsx` ✅ 2026-06-16 추가 보강 — 로딩 그리드, 빈 상태, 카드 그리드, 리스트 테이블을 하위 컴포넌트로 분리. 179→88줄.
  - `app/note/sample/page.jsx` ✅ 2026-06-16 추가 보강 — header/filter/calendar/records/dialog props wiring을 `useSamplePageController`로 분리. 230→79줄.
  - `app/note/sample/useSamplePageController.js` ✅ 2026-06-16 추가 보강 — 샘플기록 props 조립을 `samplePageControllerProps` helper로 분리. 170→43줄.
  - `app/note/sample/samplePageControllerProps.js` ✅ 2026-06-16 추가 보강 — load/header/actions/filter/calendar/records/dialog props 조립을 `samplePageControllerTopProps`·`samplePageControllerViewProps`·`samplePageControllerDialogProps`로 분리. 148→54줄.
  - `app/note/sample/samplePageControllerViewProps.js` ✅ 2026-06-16 추가 보강 — filter/calendar/records props 조립을 `samplePageControllerFilterProps`·`samplePageControllerCalendarProps`·`samplePageControllerRecordsProps`로 분리. 91→3줄.
  - `app/ingredient/manage/IngredientForm.jsx` ✅ 2026-06-15 추가 보강 — `IngredientNameField`·`BasicIngredientFields`·`IngredientCostFields` 렌더링 컴포넌트 분리. 817→468줄.
  - `app/ingredient/manage/IngredientFormFields.jsx` ✅ 2026-06-15 추가 보강 — 이름·기본정보·단가 필드 파일 분리, 기존 import 호환용 re-export 유지. 410→3줄.
  - `app/ingredient/manage/IngredientCostFields.jsx` ✅ 2026-06-15 추가 보강 — 포장수량, 수동 단가/보관·과세, 전용/범용·비고 필드를 하위 컴포넌트로 분리. 205→19줄.
  - `app/nutrition/allergen/page.jsx` ✅ 2026-06-15 추가 보강 — `AllergenIngredientTable`·`AllergenMenuMatrixTable`·`AllergenDetailModal` 렌더링 컴포넌트 분리. 802→500줄.
  - `app/nutrition/allergen/page.jsx` ✅ 2026-06-15 추가 보강 — `AllergenPageHeader`·`AllergenSummaryPanel`·`AllergenToolbar`·`AllergenTablePanel` 렌더링 컴포넌트 분리. 500→381줄.
  - `app/nutrition/allergen/page.jsx` ✅ 2026-06-15 추가 보강 — 데이터 로드·제외 메뉴 판정·매트릭스·순서·CSV 파생 계산을 `useAllergenPageData`로 분리. 381→113줄.
  - `app/nutrition/allergen/useAllergenPageData.js` ✅ 2026-06-15 추가 보강 — DB 로드·레시피 매핑 생성을 `useAllergenSourceData`로 분리하고, 기존 훅은 매트릭스/정렬/CSV 파생 계산 중심으로 축소. 337→247줄.
  - `app/nutrition/allergen/useAllergenPageData.js` ✅ 2026-06-15 추가 보강 — 검색 필터, 알레르기 정렬, 순서 편집 목록, CSV 행 조립을 `allergenPageDataUtils`로 분리. 247→169줄.
  - `app/nutrition/allergen/useAllergenPageData.js` ✅ 2026-06-15 추가 보강 — 메뉴/알레르기 순서와 메뉴명 override 저장 상태를 `useAllergenOrderState`로 분리. 169→142줄.
  - `app/nutrition/allergen/allergenPageDataUtils.js` ✅ 2026-06-16 추가 보강 — 순서 편집 목록과 CSV 행 조립을 `allergenPageOutputUtils`로 분리. 127→88줄.
  - `app/nutrition/allergen/useAllergenPageData.js` ✅ 2026-06-16 추가 보강 — 상세 모달 행과 요약 카운트 계산을 `allergenPageDetailUtils`로 분리. 144→139줄.
  - `app/nutrition/allergen/useAllergenPageData.js` ✅ 2026-06-16 추가 보강 — 제외 메뉴 판정, 매트릭스, 상세/요약, 순서 편집 목록 파생 계산을 `useAllergenDerivedData`로 분리. 139→58줄.
  - `app/nutrition/allergen/useAllergenDerivedData.js` ✅ 2026-06-16 추가 보강 — 제외 메뉴 판정, 메뉴 매트릭스 생성, 매트릭스 검색, 알레르기 정렬을 `useAllergenMatrixData`로 분리. 118→81줄.
  - `components/nutrition/menu/TabDerived.jsx` ✅ 2026-06-16 추가 보강 — 파생 메뉴 목록, 추가/편집 모달, L/R 식자재 사용량 row, 검색·그룹핑 helper를 `components/nutrition/menu/derived/`로 분리. 437→107줄.
  - `components/sales/UnmatchedTable.jsx` ✅ 2026-06-16 추가 보강 — 선택 일괄 액션, 일괄 분류 패널, 미매칭 테이블, row/해결 폼 연결을 `components/sales/unmatched/`로 분리. 437→210줄.
  - `components/cost/margin/PlatformSettingsModal.jsx` ✅ 2026-06-16 추가 보강 — portal shell, 플랫폼 selector, 플랫폼 editor, reducer/저장 정리 helper를 `components/cost/margin/platform-settings/`로 분리. 433→46줄.
  - `components/note/TempCostCalculator.jsx` ✅ 2026-06-16 추가 보강 — 재료 검색/연동 갱신, 원가 행 테이블, 합계/원가율 요약, parse/filter/refresh helper를 `components/note/temp-cost/`로 분리. 426→60줄.
  - `components/sales/UserRulesSection.jsx` ✅ 2026-06-16 추가 보강 — 사용자 규칙 폼, 규칙 테이블/row, 검색·정렬·검증 helper를 `components/sales/user-rules/`로 분리. 422→185줄.
  - `components/cost/ingredient-price/SuppliersView.jsx` ✅ 2026-06-16 추가 보강 — 공급업체 등록/수정 모달, 검색 툴바, 로딩/빈상태/테이블 패널, 검색 helper를 `components/cost/ingredient-price/suppliers/`로 분리. 413→128줄.
  - `components/cost/ingredient-price/SyncBaseQtyModal.jsx` ✅ 2026-06-16 추가 보강 — 제때 단가 파일 선택, 주의 안내, 프리뷰 요약·변경 테이블, 완료/오류 표시, 표시 helper를 `components/cost/ingredient-price/sync-base-qty/`로 분리. 389→134줄.
  - `components/jette/PriceCompareTable.jsx` ✅ 2026-06-16 추가 보강 — 제때 가격 비교의 분류/변동 필터, 비교 테이블, row/status 표시, CSV·카운트·포맷 helper를 `components/jette/price-compare/`로 분리. 390→121줄.
  - `components/jette/ManagedProductsCard.jsx` ✅ 2026-06-16 추가 보강 — 제때 대상 제품 목록의 헤더 액션, 필터/검색, 테이블/빈상태, CSV·카운트·검색 helper를 `components/jette/managed-products/`로 분리. 385→226줄.
  - `components/cost/recipe-groups/GroupEditor.jsx` ✅ 2026-06-16 추가 보강 — 공통묶음 편집기의 헤더, 기본 필드, 사이즈 입력, 카테고리 chip, 식자재 테이블, 사이즈별 원가 helper를 `components/cost/recipe-groups/editor/`로 분리. 381→121줄.
  - `components/nutrition/menu/TabToppings.jsx` ✅ 2026-06-16 추가 보강 — 추가토핑 영양성분 탭의 헤더/빈상태/목록 테이블, 편집 모달, 식자재 연결·알레르기·저장 payload helper를 `components/nutrition/menu/toppings/`로 분리. 376→123줄.
  - `components/cost/ingredient-price/BulkPriceModal.jsx` ✅ 2026-06-16 추가 보강 — 식자재 일괄 단가 업로드 모달의 포맷 안내, 파일 선택, 파싱 상태, 프리뷰 테이블, 완료/오류 표시, 금액·변동 helper를 `components/cost/ingredient-price/bulk-price/`로 분리. 367→135줄.
  - `components/cost/ingredient-price/UsageView.jsx` ✅ 2026-06-16 추가 보강 — 식자재 사용현황 뷰의 사용행 파생 helper, 요약바, 필터/출력 툴바, 사용 메뉴 테이블을 `components/cost/ingredient-price/usage-view/`로 분리. 360→56줄.
  - `components/jette/PriceLatestView.jsx` ✅ 2026-06-16 추가 보강 — 최신 제때 단가 현황의 파일 없음 상태, 목록 카드, 분류/과세 필터, 단가 테이블/row, CSV·필터·표시 helper를 `components/jette/price-latest/`로 분리. 341→124줄.
  - `components/cost/ingredient-price/IngredientPriceListPanel.jsx` ✅ 2026-06-16 추가 보강 — 식자재 단가 목록 패널의 기준 파일 표시, 통계 카드, 과세/검색/선택 툴바, 목록 테이블/row shell을 `components/cost/ingredient-price/list-panel/`로 분리. 338→51줄.
  - `components/report/ReportPreviewPages.jsx` ✅ 2026-06-16 추가 보강 — 보고서 미리보기의 표지, 옵션 row, 설정 페이지, 요약 페이지, 날짜/object guard helper를 `components/report/preview-pages/`로 분리. 329→29줄.
  - `components/jette/ShipmentTable.jsx` ✅ 2026-06-16 추가 보강 — 제때 출고량 집계의 필터, 테이블 카드, header/body/row, 분류 chip, 검색·정렬·row 값 helper를 `components/jette/shipment-table/`로 분리. 321→56줄.
  - `components/ingredient/usage/IngredientUsageTable.jsx` ✅ 2026-06-16 추가 보강 — 식자재 사용현황 테이블의 header/footer/빈상태, row, 식자재명 cell, 피자·사이드 카운트, 메뉴 chip/제외 액션을 `components/ingredient/usage/table/`로 분리. 349→57줄.
  - `components/report/cost/CostReportView.jsx` ✅ 2026-06-16 추가 보강 — 원가 보고서 미리보기의 summary stats, 카테고리 종합 비교, 카테고리별 메뉴표, 위험 메뉴 부록, 원가 미연결 진단을 `components/report/cost/report-view/`로 분리. 338→55줄.
  - `app/nutrition/export/NutritionLabelTables.jsx` ✅ 2026-06-16 추가 보강 — 영양성분 출력의 피자 150g 표, 피자 조각 표, 단순 영양표, 세트/하프앤하프 표, 공통 셀/빈상태 primitive를 `app/nutrition/export/label-tables/`로 분리. 336→35줄.
  - `components/note/SampleCard.jsx` ✅ 2026-06-16 추가 보강 — 샘플 카드의 view model 정리, 선택/비교 overlay, 썸네일, 헤더/별점, 메타, 태그, 액션 버튼을 `components/note/sample-card/`로 분리. 311→95줄.
  - `components/ingredient/ManageRow.jsx` ✅ 2026-06-16 추가 보강 — 식자재 관리 행의 view model, 선택 cell, 코드/연동 badge, 사진 cell, 이름/원산지/알레르기 badge, scope/가격/분류/태그/action cell을 `components/ingredient/manage-row/`로 분리. 315→105줄.
  - `components/ui/MenuCodePicker.jsx` ✅ 2026-06-16 추가 보강 — 메뉴코드 후보 생성/검색/키보드 이동 helper, 선택 상태 pill, 검색 입력, dropdown/row 렌더링을 `components/ui/menu-code-picker/`로 분리. 314→113줄.
  - `components/home/HomeDashboardRows.jsx` ✅ 2026-06-16 추가 보강 — 홈 대시보드 rowId 렌더링을 renderer map, single row renderer, pair row renderer, 공통 row shell로 `components/home/home-dashboard-rows/`에 분리. 311→5줄.
  - `components/cost/ingredient-price/RegisterModal.jsx` ✅ 2026-06-16 추가 보강 — 식자재 단가 등록 모달의 controller hook, 제품 정보 패널, 기본 필드, 포장/공급업체/단가 필드, footer action, 저장/검증 helper를 `components/cost/ingredient-price/register-modal/`로 분리. 305→66줄.
  - `components/report/ReportListTable.jsx` ✅ 2026-06-16 추가 보강 — 보고서 목록 테이블의 row model, table header, 이름 편집 cell, 활동 cell, row action, 빈 상태, pagination helper를 `components/report/report-list-table/`로 분리. 303→73줄.
  - `app/note/sample/_SampleDetailModal.jsx` ✅ 2026-06-16 추가 보강 — 샘플 상세 모달의 view model, shell/header, 사진 carousel/thumbnail/zoom panel, 본문 section/tag/empty state를 `app/note/sample/detail-modal/`로 분리. 349→71줄.
  - `app/note/calendar/CalendarGrid.jsx` ✅ 2026-06-16 추가 보강 — 달력 주간 헤더, 월 그리드, 날짜 셀/header, 일정·노트·샘플 item, 업무 로그 dot, 표시/overflow helper를 `app/note/calendar/calendar-grid/`로 분리. 331→41줄.
  - `app/note/calendar/page.jsx` ✅ 2026-06-16 추가 보강 — 달력 월별 PDF 출력 builder, 상단 액션, 월 이동/통계/view mode 툴바, 그리드+사이드패널, 일정 모달/삭제 확인 묶음을 `app/note/calendar/` 하위 컴포넌트와 `calendar-print.js`로 분리. 391→209줄.
  - `components/charts/AreaChart.jsx` ✅ 2026-06-16 추가 보강 — area chart의 tick/path/scale/hover helper, Y축 라벨, SVG layer, tooltip, X축 라벨을 `components/charts/area-chart/`로 분리. 350→121줄.
  - `app/cost/all-summary/page.jsx` ✅ 2026-06-16 추가 보강 — 종합전메뉴원가의 data loader/sort, 통계·카테고리·CSV helper, stats/filter/loading/empty/notice/table/error 컴포넌트를 `app/cost/all-summary/` 하위로 분리. 336→92줄.
  - `app/note/[id]/page.jsx` ✅ 2026-06-16 추가 보강 — 노트 수정 화면의 route id/draft 비교/관련 샘플 helper, action/cost menu, draft banner, version timeline, related sample panel을 `app/note/[id]/detail/`로 분리. 458→206줄.
  - `lib/ingredient/manage-print.js` ✅ 2026-06-16 추가 보강 — 식자재관리 목록/사진 PDF 출력의 formatter, 테이블 출력 builder, 사진 카드 출력 builder를 `lib/ingredient/manage-print/`로 분리. 353→8줄.
  - `components/settings/restore/RestoreExecutePanel.jsx` ✅ 2026-06-16 추가 보강 — 복원 실행의 자동 백업 옵션, 확인 요약, 자동백업 실패 재확인, 실행 버튼, 진행률 바, 모듈 chip 표시를 하위 컴포넌트로 분리. 342→105줄.
  - `lib/cost/recipe-groups/apply.js` ✅ 2026-06-16 테스트 회귀 보정 — `defaultCategories` 누락 공통묶음이 전체 메뉴에 자동 적용되지 않도록 안전 처리로 복구하고 `test:ci` 실패를 해소.
- **최종 완료(2026-06-16)**: `app/report/page.jsx` 543→187줄. 헬퍼 함수·exportToExcel → `lib/report/report-list-utils.js`, 테이블·빈상태·페이지네이션 → `ReportListTable`, 스냅샷 안내 카드 → `ReportSnapshotCard`, 모달·ConfirmDialog 묶음 → `ReportPageDialogs`. lint 0 / test 1020 통과.
- **잔여 대상 재스캔(2026-06-16, 300줄 이상 기준)**:
  - 추천 후보로 지정했던 17개(`IngredientUsageTable`, `CostReportView`, `NutritionLabelTables`, `SampleCard`, `ManageRow`, `MenuCodePicker`, `HomeDashboardRows`, `RegisterModal`, `ReportListTable`, `SampleDetailModal`, `CalendarGrid`, `calendar/page`, `AreaChart`, `cost/all-summary`, `note/[id]`, `manage-print`, `RestoreExecutePanel`)는 모두 완료.
  - 2차 재스캔 추천 후보(안전·효과 기준)는 모두 구현 완료.
  - 3차 재스캔 추천 후보(2026-06-16, 안전·효과 기준):
    1. `app/report/sales/page.jsx` (~306줄) — **추천 다음 후보**. 판매량 보고서 page의 option panel/preview/action 조립 잔여 분리. 보고서 출력 회귀 확인 필요.
    2. `app/menu-master/page.jsx` (~353줄) — 메뉴마스터 page 조립부 추가 분리. 메뉴/레시피 연결 영향이 있어 기능 변경과 함께 진행 권장.
  - 단순 줄 수 상위지만 보류: seed/rules 데이터, store, 설정/백업 page, 전역 shell(`TopBar`, `AppShell`), 로그인 page, 빌더 계산 로직은 변경 위험이 커 별도 라운드에서 처리.
- **보류 권장**:
  - `app/settings/system/page.jsx`, `app/settings/account/page.jsx`, `app/settings/brands/page.jsx`, `app/settings/backup/page.jsx` — 설정 화면은 상태·권한·백업 동선 영향이 커서 별도 라운드로 묶어 처리.
  - `app/ingredient/manage/page.jsx`, `app/cost/margin/page.jsx`, `app/report/cost/page.jsx` — 이미 여러 하위 컴포넌트와 연결된 page 조립부라, 다음 기능 변경 때 함께 정리.
  - `components/TopBar.jsx`, `components/AppShell.jsx`, `app/login/page.jsx` — 전역 레이아웃/인증 경계이므로 단순 줄 수 기준으로 먼저 건드리지 않음.
- **중복 정리 후보**:
  - `components/cost/ingredient-price/BulkPriceModal.jsx` — 현재 실제 화면 import 진입점이 없음. 식자재 단가 일괄 업로드 기능으로 살릴지, 보류 코드로 유지할지, 제거할지 별도 결정 필요.
  - `components/cost/ingredient-price/UsageView.jsx` — 현재 실제 화면 import 진입점이 없음. 기존 식자재 단가 뷰와 다시 연결할지, 보류 코드로 유지할지, 제거할지 별도 결정 필요.
  - `ModalFrame` 하단 버튼 영역(`취소`/`저장`/`다시 선택`) 반복 → `ModalActions` 또는 작은 modal footer primitive 후보.
  - `data-table`의 로딩/빈상태/가로 스크롤 wrapper 반복 → 기능별 분리 후 공통화 여부 재평가.
  - `formatNumber`와 직접 `toLocaleString()` 혼용 → 금액/개수/kcal 포맷 helper를 점진 통일.
  - 반복되는 inline flex/gap 스타일 → 전역 CSS화는 위험하므로, 새로 분리하는 컴포넌트 내부에서만 국소 상수화.
- **방향**: page는 조립만 담당, table/panel/modal/hook으로 분리.
- **왜 보류**: 효과 < 회귀 위험. 기능 추가 시점에 함께 진행 예정.
- **검증**: `npm run test:ci` + 주요 화면 수동 확인
- **관련 메모리**: [[deferred-refactors]]

#### B-9. 1인피자 알레르기 표시 기준 정리  🟡 ✅ 완료(2026-06-15)
- **도메인 확인**: 1인피자 크러스트는 씬바사삭 1종만 (사용자 확인).
- **완료**: `lib/nutrition/allergen/matrix.js` — `isPersonalPizzaCategory` 분기 추가, 1인피자는 씬바사삭 크러스트 1행만 생성(도우 계열 제외 + 씬도우 엣지 포함). `logicalMenuKey`도 1인피자 L/R 사이즈를 논리 키로 묶도록 확장. build.js 라벨 기준과 통일.

#### B-24. 문서·README·아키텍처 정합성 최신화  🟢 ✅ 완료(2026-06-15)
- **README.md**: 폰트(CDN→로컬 `next/font/local`), CSS 구조(`components/`·`features/` 분리), 검증 명령(`format:check`·`test:ci`·`build:clean`·`qa:smoke`·`qa:runtime`) 현행화.
- **ARCHITECTURE.md**: 라우트 구조, IndexedDB v20 store 그룹, 멀티브랜드, QA 스크립트 표, 최근 정리 이력 추가.
- **SITE_IMPROVEMENT_BACKLOG.md**: B-9·B-3 Phase 2 완료 반영, 4단계·결정 필요 항목 완료 표시.

#### B-26. 무거운 라우트 route-level loading / error 경계 추가  🟢 ✅ 완료(2026-06-14)
- **파일**: `app/_shared/RouteLoading.jsx`, `app/_shared/RouteError.jsx`(공유 컴포넌트) + 4개 라우트 각각 `loading.jsx`·`error.jsx`
- **완료 내용**: `/nutrition/menu`, `/report/sales`, `/ingredient/usage`, `/settings/restore` 에 route-level `loading.jsx`(스피너) · `error.jsx`(국소 복구) 추가. 공유 컴포넌트를 `app/_shared/`에 두고 각 라우트가 re-export하는 구조.
- **효과**: 특정 화면 런타임 예외가 전체 `app/error.jsx`(앱 전체 리셋)로 전파되지 않고 해당 라우트 세그먼트에서 격리됨.

#### A-1. Route loading/error 경계 확대  🟢 ✅ 완료(2026-06-16)
- **대상**: B-26에서 빠진 9개 라우트 — `ingredient/usage`(error 추가), `settings/restore`(loading 추가), `cost/margin`, `cost/recipe`, `cost/all-summary`, `note/calendar`, `note/board`, `jette/price-compare`, `report/cost`
- **완료 내용**: 각 라우트에 `loading.jsx`·`error.jsx` 파일 18개 추가. 공유 컴포넌트 re-export 패턴 동일.
- **검증**: `npm run lint` ESLint 0 warnings. 총 loading/error 파일 23개 확인.

#### A-2. 인라인 스타일 상수화 확대  🟢 ✅ 완료(2026-06-16)
- **대상**: `settings/account/page.jsx`, `settings/system/page.jsx`, `settings/backup/page.jsx`, `settings/brands/page.jsx`
- **완료 내용**: 2회 이상 반복되는 인라인 스타일을 파일 상단 `const S_XXX = { ... }` 상수로 추출. account 5개, system 4개, backup 4개, brands 3개 상수 추출.
- **검증**: `npm run lint` + `npm run format:check` 통과.

#### A-3. 테스트 갭 보강 (`lib/report/build-*.js`)  🟢 ✅ 완료(2026-06-16)
- **대상**: `lib/report/build-shipment-report.js`, `lib/report/build-compare-report.js`
- **완료 내용**: `__tests__/lib/build-shipment-report.test.mjs`(8 tests), `__tests__/lib/build-compare-report.test.mjs`(6 tests) 신규 작성.
- **검증**: `npm run test:ci` 198 suites / 1041 tests 통과.

#### B-1. 대형 page 분해  🟡 ✅ 완료(2026-06-16)
- **대상 5개 파일**: `report/shipment`, `ingredient/manage`, `cost/margin`, `settings/account`(PIN·PW·FormField 이미 추출됨), `settings/system`
- **완료 내용**:
  - `report/shipment/page.jsx`: 740→209줄. `ShipmentItemTable`, `useShipmentReportData`, `ShipmentReportOptions`, `ShipmentReportPreview` 추출.
  - `ingredient/manage/page.jsx`: 761→684줄. `IngredientJetteIssuesPanel` (newJette/jetteRemoved 테이블) 추출.
  - `cost/margin/page.jsx`: 723→594줄. `MarginCostThresholdBar`, `MarginTableHeader` 추출.
- **신규 파일**: `components/report/shipment/` 3개, `hooks/useShipmentReportData.js`, `components/ingredient/IngredientJetteIssuesPanel.jsx`, `components/cost/margin/MarginCostThresholdBar.jsx`, `components/cost/margin/MarginTableHeader.jsx`
- **검증**: `npm run lint` + `npm run test:ci` 198 suites / 1041 tests 통과.

---

### 🔴 고위험 — 설계 합의 / 외부 조건 대기

#### N-42. 엣지별 알레르기 탭 (신중 점검)  🔴 ✅ 완료(2026-06-15)
- **파일**: `lib/nutrition/allergen/matrix.js:102-150`, `lib/nutrition/allergen/rules.js:19-31`, `lib/nutrition/crust-config.js:49-54`
- **내용**: 표출력에 엣지 선택 시 알레르기 합산. 씬바사삭: 기본 도우(석쇠) 알레르기 **제거(-)** + 씬도우 **추가(+)**, 단 도우에 있던 알레르기값이 다른 식자재에도 있으면 유지.
- **완료 내용**: 씬바샤삭은 기본 도우 알레르기를 제외하고 비도우 식자재 알레르기와 씬도우 구성품 알레르기를 합산한다. 씬도우 구성품의 대두는 제외하되, 대두가 비도우 식자재에도 있으면 유지한다. 치즈크러스트는 우유 보정, 골드스윗은 사이즈별 구성품 알레르기 합산을 fixture로 고정했다.

#### N-43. 재료단가표 과거 식자재 단가 가져오기  🟡 ⏸
- **파일**: `app/cost/ingredient-price/` + `lib/price/`(파일별 이력 존재, `PriceHistoryModal`)
- **내용**: 일시적으로 변경된 납품가를 과거 단가로 소급 조회/적용.
- **왜 보류**: 동작 명세 미확정 — 특정 날짜 단가를 원가계산에 일시 적용하는지, 조회만 하는지.
- **착수 게이트**: 동작 명세 제공 시 착수.

---

## C. 코드 품질 정리 플랜 (2026-06-14 신규 등록)

> 기능 변경 없이 코드 건강도를 높이는 작업. 위험도 낮은 것부터 진행.

### 현재 상태 요약

- `docs/v2-reference/` 삭제 완료. 2026-06-14 감사(`BUG_AUDIT_2026-06-14.md`)는 내용 흡수 후 삭제. 백로그 문서(`SITE_IMPROVEMENT_BACKLOG.md`)는 참고 자료이고, 보류·완료 판단의 최종 출처는 이 `DEFERRED_WORK.md`로 유지한다.
- `.DS_Store`·빈 디렉터리 정리 완료.
- 대형 seed/rule 데이터는 `lib/*/data/*`로 이미 분리됨 — 추가 정리 우선순위 낮음.

---

### 🟢 1순위 — 정책 위반·불안정 key 제거 (즉시 착수 가능)

#### C-P1. `lib/print/window-print.js` raw `alert()` 제거  ✅ 2026-06-14
- `alert()` → 동적 `import('@/components/Toast')` + `showToast('warn')`. 정적 import 시 Jest가 React 의존성 로드로 3 test suite 실패 → dynamic import로 해결.

#### C-P2. `Math.random()` key → 모듈 레벨 카운터  ✅ 2026-06-14
- `MenuRecipeSection.jsx`: `Math.random()` → `let _rowKey = 0; ++_rowKey` 패턴. `newRow()`·useEffect load 2곳.

---

### 🟢 2순위 — 인라인 스타일 축소 (파일별 단독 PR 권장)

#### C-P3. 상위 파일 인라인 스타일 파일 상단 상수화  ✅ 2026-06-14
- `cost/page.jsx`: `S_DOT_LABEL` (4곳)
- `sales/page.jsx`: `S_SECTION_TITLE_FLEX`·`S_EMPTY_STATE`·`S_MOVER_LABEL` (10곳)
- `RestorePreview.jsx`: `S_FIELD_LABEL` (8곳)
- `TabSetCalc.jsx`: `S_CARD_TITLE` (3곳)

---

### 🟡 3순위 — 대형 화면 파일 분리 (중위험, 파일별 단독 PR)

#### C-P4. 대형 page/컴포넌트 분해  → **B-6에 통합**
- `app/report/cost/page.jsx` ✅ 2026-06-14 완료 (869→407줄, CostReportView·CostTableView 추출)
- 잔여 항목은 위 B-6 / C-P4 항목 참조.

---

### 🟢 4순위 — CSS 세부 분리 (저위험)

#### C-P5. CSS 파일 추가 분리  ✅ 2026-06-14
- `components.css`(1715줄) → `components/home-hero.css`(365) · `home-body.css`(399) · `overlay.css`(410) · `palette.css`(239) · `chrome.css`(302)
- `features/report.css`(1696줄) → `features/report/table.css`(601) · `builder.css`(501) · `modal.css`(594)
- `features/motion.css`(906줄) → `motion.css`(320) + `motion-enhanced.css`(587) — ENHANCED 섹션 분리
- `features/motion-note.css`(964줄) → 유지 (이미 독립 파일, 단일 도메인으로 분리 불필요)
- `globals.css` import 순서·cascade 유지. ESLint 0, build 57 pages 성공.

---

### 🟢 5순위 — storage 책임 경계 문서화 (저위험)

#### C-P6. localStorage/sessionStorage 직접 접근 정리  ✅ 2026-06-14
- `lib/note/keys.js`에 sessionStorage 헬퍼 5종 추가: `setNoteFrom`·`consumeNoteFrom`·`setSampleFromNote`·`consumeSampleFromNote`·`setHomeNoteDraft`
- 직접 접근 제거: `app/page.jsx` · `note/write/page.jsx` · `note/[id]/page.jsx` · `note/sample/write/page.jsx` · `note/_NoteContent.jsx` 5개 파일
- `app/layout.jsx` 인라인 테마 스크립트는 하이드레이션 전 실행 필수 → 유지
- ESLint 0, build 성공.

---

### 검증 기준 (C-P 배치 공통)

| 변경 범위 | 검증 명령 |
|-----------|-----------|
| 소규모 정리(lint만 영향) | `npm run lint` |
| 구조 분리(hook/컴포넌트 추출) | `npm run test:ci` |
| UI 영향 있는 변경 | `npm run test:ci` + `npm run qa:smoke` + 주요 화면 수동 확인 |

---

## D. 운영·실데이터 QA 영역

> production 코드를 바꾸지 않는 QA·검증 가이드. 별도 `docs/RELEASE_CHECKLIST.md`·`docs/QA_CHECKLIST.md`는 아직 없으므로, 필요 시 이 섹션을 기준으로 생성한다.

**운영 QA로만 분류(코드 보류 아님)**: 원가/판매가/원가율 기준표 대조, 엑셀 입출력 Excel 앱 확인, 코드 매칭 원장 대조, 대용량(500MB) 복원 freeze·진행률, 공유 DB+브랜드 DB 동시 복원 복구 절차 리허설, usage-counts `menuName` dedupe 규격 누락, 다운로드 파일명/출력 컬럼 정책, 인증·설정 PIN 보안경계 문서화, 성능(1천/1만 행) 측정.

---

## E. 참고 문서 흡수 상태

> 이 섹션은 "다른 md에 있는 내용이 빠졌는지" 확인하기 위한 색인입니다.

| 문서 | 이 파일에 반영된 내용 | 남겨둔 역할 |
|------|----------------------|-------------|
| `docs/BUG_AUDIT_2026-06-14.md` _(삭제됨)_ | clean build/dev 충돌, smoke/runtime QA, format, id/key, console-only, fixture/dynamic QA 항목 → B-20·B-21·B-23·B-25·B-26 및 완료 이력으로 흡수 | 내용 전부 흡수 후 2026-06-14 삭제 |
| `docs/SITE_IMPROVEMENT_BACKLOG.md` | QA 안정화·fixture 확대·성능/운영 QA 후보를 B/D 섹션으로 정규화 | 제품/UX/성능 아이디어 후보 목록 |
| `docs/PROJECT_CODEBASE_AUDIT.md` | 코드 구조, store/route/QA 체계, 책임 큰 파일, 운영 주의점을 B/D 섹션으로 흡수 | 전체 코드베이스 해설 문서 |
| `docs/PROJECT_STRUCTURE_AUDIT_2026-06-14.md` | 문서 정합성, route drift, README/ARCHITECTURE 최신화, 삭제 문구 불일치 항목을 B-23/B-24/B-25로 흡수 | 구조·문서 감사 원본 |
| `docs/DEFERRED_WORK.md` | 보류 항목, 진행 중 항목, 완료 이력, 운영 QA 구분 | 실행 우선순위와 완료 판단의 단일 기준 |

---

## 완료 이력

> 완료된 모든 작업 기록. 라운드 순 → 가장 최근 항목이 위에 있습니다.

---

### QA 기준선 보강 — ✅ 2026-06-14

- **dev 산출물 충돌 완화**: `scripts/prepare-dev.mjs` 추가. `predev`/`predev:lan`에서 dev 시작 전 `.next`를 정리하고, 실행 중인 dev 서버가 있으면 `.next`를 건드리지 않는다.
- **표준 dev 재시작**: `npm run dev:clean`을 `scripts/prepare-dev.mjs --kill && next dev -H 127.0.0.1 -p 3000`로 교체해 꼬인 dev 서버와 `.next`를 같이 정리한다. LAN 접속은 `npm run dev:lan`으로 분리한다.
- **smoke QA 안정화**: `scripts/smoke-qa.mjs` navigation timeout을 90초로 늘리고, 라우트별 console/pageerror/response listener를 격리하며, 대표 판매량 라우트를 redirect 전 `/menu-sales/rank`에서 최종 목적지 `/menu-sales/rank-compare`로 변경했다.
- **runtime QA 안정화**: `scripts/full-rt.mjs` 시작 시 Playwright browser health check를 추가하고, `localhost` 실패 시 `127.0.0.1` fallback을 시도한다. 라우트 navigation 실패는 전체 스크립트 중단 대신 route별 `fatal` 결과로 기록한다.
- **clean build 안정화**: `scripts/clean-build.mjs`가 build 성공/실패와 무관하게 `.next.stale-*`를 `finally`에서 정리한다. 실행 중 dev 서버가 있으면 build 전에 중단한다.
- **format 기준선 복구**: 68개 Prettier 불일치 파일을 format-only로 정리해 `npm run format:check`가 통과한다.
- **데이터 id/key fallback 안정화**: `PlatformSettingsModal` fallback id에서 `Math.random()`을 제거하고, `normalizeChecklistMap`의 체크리스트 fallback id를 날짜+텍스트+순번 기반으로 안정화했다. `ProgressBar`와 `not-found`의 랜덤은 저장 id/key가 아닌 시각 효과로 주석·테스트에서 분리했다.
- **침묵 실패 일부 제거(B-21 진행분)**: 칸반 로드/드롭 실패 UI 노출, 식자재 삭제 undo 실패 노출, 식자재 cascade 실패 경고, 식자재 일괄 삭제 부분 실패 표시, 메뉴마스터 cascade 실패 경고를 추가했다.
- **삭제 안내 문구 정합성**: 메뉴마스터 삭제 ConfirmDialog를 실제 cascade 범위(판매가, 원가 레시피, 영양 참조 데이터 정리)에 맞게 수정했다.
- **문서화**: `README.md`에 dev 서버 실행 중 build 금지, `npm run dev`/`npm run dev:clean` 사용 기준을 추가했다.
- **검증**: `npm run format:check` 통과, `npm run lint` 통과, `npm run test:ci` 145 suites / 816 tests 통과, `npm run build:clean` 통과(57 pages, stale 1개 정리), `npm run qa:smoke` 22/22 통과, `npm run qa:runtime` 63/63 통과, script targeted tests 3 suites / 13 tests 통과, B-21 targeted tests 3 suites / 19 tests 통과(2026-06-14).

---

### N-20~38 중위험 배치 QA — ✅ 2026-06-14

ESLint 0 warnings, 테스트 140 suites / 794 passed, build 57 pages prerender 성공.

**버그 수정 1건**: `_ReportPreviewModal.jsx:120` 판매보고서 미리보기 scope 비교를 구 영문(`'pizza'`) → 한글 직접 표시로 수정.

**ESLint 수정**: `.eslintrc.json`에 `@next/next/no-img-element: "off"` — IndexedDB base64 이미지는 Next.js `<Image />` 사용 불가.

**확인 완료 항목 (코드 기구현)**:
N-20(STATUSES 9개 확장 + NOTE_STATUS·STATUS_COLORS·STATUS_BORDER 전파) · N-21(journal-print.js break-inside) · N-22(SAMPLE_CATEGORIES 독립 enum) · N-23(_DayPanel 자동일지 맨밑 기본 접힘) · N-24(exportMonthPdf) · N-25(CalendarGrid 셀 여백·오늘 강조) · N-26(includeEdge + build-cost-report) · N-27(RecipeEditor sticky 헤더) · N-28(묶음관리 accent 토큰 교정) · N-29(SortableIngredientRow input 70→80px) · N-30(printIngredientPdf 2단 그리드) · N-31(재료단가표 탭 정리) · N-32(scope 한글 카테고리 + 필터 연결) · N-33(임계값 슬라이더 제거) · N-34(costImpact UI + 변동 집계) · N-35(집계기준 삭제) · N-36(PriceSummaryCards 신규/삭제 카드 + onFilter) · N-37(CategoryTags 중복 제거) · N-38(allergen 빈도 내림차순 기본 정렬)

---

### N-07·N-18 잔여 수정 — ✅ 2026-06-14

- N-07: `app/report/page.jsx`·`app/cost/margin/page.jsx` "Excel 내보내기" → "엑셀로 내보내기"
- N-18: `app/styles/features.css` dropzone 패딩 `16px 24px` → `10px 20px`, 아이콘 44→36px

---

### 중위험 리팩토링 잔여 4건 (R-5·R-7·R-13·R-33) — ✅ 2026-06-14

- **R-5 잔여**: `hooks/useIngredientCatalogData.js`(로드+stats 6종 useMemo) · `hooks/useIngredientCatalogView.js`(search·scopeFilter·catFilter·sort+filtered+pagination) 신설. page.jsx 불필요 import 15개 제거.
- **R-7 잔여**: `hooks/useIngredientPriceData.js`(rows·fileInfo·loading·dbError + load + useVisibilityRefresh) 신설. `showToast 'err'→'error'` 수정.
- **R-13 잔여**: `PlatformRow`·`PlatformSelector` 서브컴포넌트 추출 + `useState(plats)` → `useReducer` 전환(8액션). 375→280줄.
- **R-33 잔여**: `hooks/useKanbanBoard.js` 신설(handleDrop/groupedNotes 순환 의존 클로저로 해소). board/page.jsx 401→212줄.

---

### QA 리포트 통합(N-39~44 D배치) — ✅ 2026-06-13

- **N-39**: 원가보고서 미연결 메뉴 진단 + `detailStoreFor` 정책함수 교체. `분류 미매핑`·`메뉴코드 없음`·`레시피 미등록`·`레시피 원가 0` 진단 UI 추가.
- **N-40**: 제때↔식자재 자동연동 — 신규 제때 항목 자동등록, 최신 파일에서 사라진 항목 단종 처리, 뷰어 권한 버튼 비활성화.
- **N-41**: `MenuRecipeSection` 신설, `MenuMasterEditModal` 레시피 입력 통합. 카테고리별 detail store 라우팅, 비동기 race 방지.
- **N-44①**: DB v19 + `ref_accounts` store 추가, 계정 CRUD + 기본 admin seed, 백업 공통 store 포함.
- **N-44②**: 계정 관리 UI — 목록·추가·전환·삭제 ConfirmDialog, 마지막 계정 삭제 방지.
- **N-44③**: 조회자 UI 게이팅 — `menu-master`·`ingredient-price`·`ingredient/manage`·`MasterRow`·`InlineEditCell` readOnly 차단.
- **버그 수정**: `settings/account` 계정 삭제 raw `confirm()` → `ConfirmDialog` 교체. `useCurrentRole` 계정 전환 즉시 반영 — `rnd:account-changed` CustomEvent + storage listener.

---

### QA 리포트 통합(N-45·N-46·B·C배치 기구현 확인) — ✅ 2026-06-13

- **N-45**: 영양성분 시험성적서 기반 입력 — 크러스트 탭 "성적서" 뱃지, `certLinked` 체크박스 추가.
- **N-46**: 원가보고서 제품원가표 탭 — `viewTab`·`groupPizzaLR`, 피자/1인피자 L/R 7컬럼, 사이드/세트/엣지 4컬럼.
- **N-01~19 B배치** · **N-20~38 C배치** 기구현 확인. N-07 누락 2건(settings/backup·note/sample/[id]) 수정.
- ESLint 0, 테스트 140 suites / 794 passed, build 57 pages.

---

### QA 리포트 통합(N-01~19 저위험 배치) — ✅ 2026-06-13

완료 항목: 노트 탭 순서 변경, 노트목록/칸반/달력 불필요 버튼 제거, 메뉴명 필수 해제 + 토핑 카테고리 제거, 원가보고서 제목·집계기간 UI 정리, "CSV 내보내기" → "엑셀로 내보내기", TopBar 정렬, 메뉴마스터 규격 컬럼·피자 기본가 버튼·양식업로드 하단 이동, 재료단가표 초기화·일괄 업로드·사용현황 탭·SortButton 제거, 식자재 사용현황 액션 버튼 상단, 제때 업로드 박스 축소, 샘플기록 placeholder.

버그 수정: N-05 menuName 필수 검증 제거, N-06 Seg 미사용 import 정리.

---

### 리팩토링 배치 완료 — ✅ 2026-06-12~14

**고위험 (R)**:
- R-1: `lib/sales/ms9-rules.js` → rules-pizza·rules-side·rules-edge·rules-set 4파일 분리
- R-2: `app/cost/margin/page.jsx` load() → `lib/cost/margin/build-rows.js` 5 순수함수
- R-3: `app/settings/restore/page.jsx` 1124→366줄 (RestorePreview·RestoreDoneCard·RestoreExecutePanel + useRestoreImpact)
- R-29: `app/page.jsx` 817줄 → `useHomeDashboardData` 훅 추출
- R-30: RecipeEditor `SortableIngredientRow` 파일 분리 + `lib/recipe/calc-costs.js` 순수함수
- R-31: 보고서 4종 데이터 빌더 → `lib/report/build-*.js` 신설
- R-33: `note/board` 597→212줄 (`KanbanCard` 분리 + `useKanbanBoard` 훅)
- R-39: `lib/db/operations.js` → crud.js·upload-log.js·backup.js 책임 분리
- R-40: `lib/nutrition/values/store.js` → calc.js 계산 분리

**중위험 (B·R)**:
- B-3 Phase 1: `allergen/store.js` dead code 6종 제거. `allergenRate` legacy store → cost_ingredients.allergens 교체.
- B-4: `reclassifyAllFiles` 신규 미분류 처리 구현됨 확인 (status 필터 없이 원본 행 포함)
- B-7: localStorage 백업 범위 확대 (`PERSISTENT_LS_KEYS` 29종)
- B-8: 칸반 드래그 순서 원자성 (`bulkUpdateBoardOrder` 단일 트랜잭션)
- B-10: menuCode 중복 사전 검증/안내 (update mode toast)
- B-11: 인쇄 CSS `.chip` 숨김 범위 축소 (전역 → 필터 chip 한정)
- B-12: 연구일지 PDF 페이지 분할 (`break-inside:avoid`, `break-after:avoid`)
- B-13: `build:clean` 프로세스 감지 가드 추가
- B-14: localStorage 키 정책 확정 (영속 설정만, 임시 상태 제외)
- B-16: 메뉴 판매가 업로드 파일 가드 (빈 파일·20MB 초과)
- R-4: `TabBase.jsx` 1153→218줄 (훅3 + 컴포넌트5 + `base-helpers.js`)
- R-5: `ingredient/list` PDF 함수 → `lib/ingredient/print.js` + `useIngredientCatalogData·View` 훅
- R-6: `ingredient/usage` → `hooks/useIngredientUsageRows.js` 7개 memoized 값 통합
- R-7: `ingredient-price` → `lib/cost/ingredient-price/buildRows.js` + `useIngredientPriceFilters` + `useIngredientPriceData`
- R-8: `cost/recipe` → `useRecipeWorkbenchData` + `useRecipeListState` + `RecipeSidebar` (789→344줄)
- R-9: 보고서 4종 `useReportPageState` 공통 state hook
- R-10: `cost/all-summary` buildRows → `lib/cost/shared/buildSummaryRows.js`
- R-11: `TabSetCalc·TabDerived` → `useSetCompositionForm·useDerivedCompositionForm`, `TabDerived` derived UI/helper 분리(437→107줄)
- R-12: BulkPriceModal 통합 미구현 확정 (두 모달 구조 완전히 상이)
- R-13: `PlatformSettingsModal` `FeeRow·PlatformRow·PlatformSelector` 분리 + `useReducer` 전환, 이후 shell/editor/reducer helper까지 추가 분리(433→46줄)
- R-14: `settings/account` → `PinSection·PasswordChangeCard` + `hooks/useDiagnostics`
- R-15: `note/sample/page.jsx` 달력 → `lib/note/calendar-utils.js`(`buildCalendarDays`)
- R-32: `nutrition/origin` 집계 → `lib/nutrition/origin/build.js`(`buildOriginIngredientRows·MenuRows`)
- R-37: `app/styles/features.css` → `features/motion.css`(2462줄) + `features/home.css`(768줄) 분리
- R-41: `report/sales` `buildSalesStats` → `lib/report/build-sales-report.js` + `SalesChartRows.jsx`

**저위험 (B·C·R)**:
- B-1: 메뉴마스터 삭제 cascade (cost_selling_prices·cost_recipes·nutrition_menu_ref)
- B-2: `_isPizzaMenu` → category-policy 헬퍼 위임
- B-15: 식자재 삭제 undo cascade 복구 (영양값 스냅샷·복원)
- C-1: 영양성분·식자재 중복 진단 UI (CL1·CL3)
- C-2: 판매량 업로드 행 단위 중복 시각화 (`issueGroupCount` 배지)
- C-3: 판매 분류 미반영 구간 안내 (localStorage flag + 배너)
- C-4: Prettier 잔여 31개 파일 일괄 정리
- C-5: satFat 레거시 참조 확인 (추가 조치 불필요)
- C-6: 드래그·업로드 키보드 접근성 (`UploadDropzone` role/tabIndex/onKeyDown)
- C-7: 테스트 보강 (`restore-bom-sync.test.mjs` 5케이스)
- C-8: 폼 내부 `<button>` type 점검 (`PinGate.jsx` type="submit" 추가)
- R-16: `lib/print/window-print.js` 공통 헬퍼 추출 (4곳 교체)
- R-17: `menu-master` EditModal + `useMenuMasterFilters` 훅 분리
- R-18: `_NoteFormBody` → `components/note/TempCostCalculator.jsx`
- R-19: `_NoteContent` → `useNotePins·useNotePresets·useNoteBatchActions` 훅
- R-20: `allergen/page` matrix 계산 → `lib/nutrition/allergen/matrix.js`
- R-21: `OriginResult` 빌더 → `lib/nutrition/origin/build.js`
- R-22: `report/page` → `useReportListState·useReportActions`
- R-23: `EdgeEditModal` CompRow → `IngredientSearch` 재사용
- R-24: `useWidgetConfig` sanitize → `lib/home/widget-config-utils.js`
- R-25: `MarginFilterBar` → `DiscountSimulator.Toggle·Panel` 분리
- R-26: `useMounted()` 헬퍼 hook 추출 (10개 파일 교체)
- R-27: detail page 4종 `makeDetailRecipePage` 팩토리
- R-28: `UploadDropzone` 중복 자체 구현 2곳 수렴
- R-34: `journal/page` 출력 → `lib/note/journal-print.js` + `WebJournalCard.jsx`
- R-35: `_ReportPreviewModal` `REPORT_OPTION_RENDERERS` registry화
- R-36: 판매 규칙 섹션 `hooks/useSectionSearch.js` 공통화
- R-38: 제때 테이블 4종 `hooks/useTableSearchSort.js` 수렴

---

### UI 점검 라운드 (42건 — HIGH 14·MEDIUM 18·LOW 10) — ✅ 2026-06-13

**커밋**: 8c1cd00 (즉시 HIGH 4) · cfe0698 (나머지 HIGH 10) · ed7df1b (MEDIUM 18)

HIGH 즉시 4건: `showToast 'err'→'error'`(note/board) · `tokens.css` 다크모드 누락 4토큰 · `IngredientSearch` zIndex 9999→350 · 미구현 Excel 체크박스 제거.

HIGH 나머지 10건: DangerConfirm `role="alert"` · PIN 해제 2단계 ConfirmDialog · 칸반 로딩 스피너 · 식자재 list catch showToast + 버튼 disabled · allergen/usage catch showToast · 보고서 4종 `setDataError()` · MenuMasterEditModal ESC/오버레이 닫기 · RecipeEditor 저장 중 버튼 disabled · 다크 토큰화·셀 클래스.

MEDIUM 18건: 하드코딩 hex → CSS 토큰 · 접근성 `aria-label/scope` 다수 · 클릭 가능 div `role="button"` · `.search/:focus-visible` 포커스 링 · 버튼 disabled `|| loading` · `refreshStats` try-catch · `handleExcelExport` catch · 원가보고서 `no-print` · `formatNumber()` 적용 · PIN `autoComplete="off"` · input `step` 속성 · `.notif-pop` z-index 50→95 · 전역 `scrollbar-width: thin`.

LOW 완료: L-02 border-radius 토큰화 · L-03 비교월 동일 경고 · L-04 업로드 제한 표시 · L-06 중복 실행 방지 · L-07 모바일 overflow 완화 · L-08 menuCode·menuName 인라인 오류 · L-09 `table-wrap` className 통일.

---

### QA 라운드 2~4 + 안정화 + 정합성 감사 — ✅ 2026-06-11~12

- **QA R2**: satFat→fat 변환, BOM 통일, usePagination, useDBLoad 부분 도입, z-index 통일, 보고서 날짜 저장, 단가 이력 정렬.
- **QA R3 (12건)**: export failedStores manifest · 보고서 수동 정리 버튼 · 분류 토글 confirm 게이트 · 복원 공통 store 안내 · edgeSearch 선택 초기화 · useDBLoad error UI · CSV filtered 기반 · 단가 정렬 라벨 · 페이지 리셋 · ModalFrame+ConfirmDialog ARIA · qa-prod 포트 가드.
- **QA R4 (5건)**: `downloadCsvText` 헬퍼 · `if (saving) return` 재진입 가드 · `window.onafterprint` 5곳 · origin-result.css min-width · 삭제 confirm 문구 통일.
- **안정화**: 공유 스토어 main DB 라우팅 · replaceStore 단일 트랜잭션 · 영양 복원 localStorage gate · 파생메뉴 영양·알레르기 집계 · 베이스 메뉴 삭제 confirm · build:clean · CSV/Excel 안전성 · 사진 `contain` · BOM 제거 · fat 라벨 전환 · 추가토핑 알레르기 name fallback.
- **정합성 감사 CL1~CL8**: 영양 중복 방지 · 알레르기 링크 식자재 기준 · 식자재 productCode 중복 가드 · 합산 식자재 가격 공통화 · 원가 detail menuCode 인덱스 · normalizeMenuCodeForModule · 카테고리 판정 공통화 · 제때 productCode dedupe.

---

### 화면/기능 맵 검증 — ✅ 2026-06-12

`app/` 라우트 42개 화면 전량 구현 확인. 추가 구현(미기재): `/note/journal` · `/note/sample/write` · `/note/sample/[id]` · `/cost/manage`.

---

_잔여 보류: **B-5**(useDBLoad 전면, 회귀위험) · **B-6/C-P4**(대형 컴포넌트 추가 분해 재평가) · **B-20**(실업무 fixture 확대 잔여: Excel 앱 수동 확인·다운로드 열람·대용량 케이스) · **N-43**(과거 단가, 동작 명세)._
