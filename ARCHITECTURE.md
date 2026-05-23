# v3 아키텍처 설계안 (초안 — 사용자 확인 대기)

작성: 2026-05-24
상태: **사용자 검토 대기** — 확정 후 구현 시작

이 문서는 v3의 폴더/파일 구조, 페이지 매핑, 공통 유틸, 데이터 모델, 이식 우선순위를 정리한 뼈대 설계.

---

## 1. 폴더 구조 (제안)

```
7th-rnd-manager-v3/
├── index.html                    ← React mount + babel standalone
├── dev-server.js                 ← 로컬 dev server (포트 4174)
│
├── styles/                       ← CSS 책임별 분리
│   ├── tokens.css                ← CSS 변수 (색/폰트/radius/shadow/gap)
│   ├── base.css                  ← reset, typography
│   ├── layout.css                ← .app, .sidebar, .main
│   ├── animations.css
│   ├── components/
│   │   ├── button.css
│   │   ├── card.css
│   │   ├── input.css
│   │   ├── table.css
│   │   ├── modal.css
│   │   ├── badge.css
│   │   └── sidebar.css
│   └── pages/
│       ├── dashboard.css
│       ├── menu-sales.css
│       ├── cost.css
│       └── ...
│
├── src/
│   ├── config/                   ← 상수
│   │   ├── menu.js               ← 메뉴 구조 (SECTION_TITLES)
│   │   ├── categories.js         ← 분류 카테고리
│   │   └── status.js             ← 상태 라벨/색상
│   │
│   ├── common/                   ← 공통 유틸 (의존성 없음)
│   │   ├── format.js             ← formatNumber, formatPercent, formatWon, formatDate
│   │   ├── escape.js             ← escapeHtml
│   │   ├── normalize.js          ← normalizeMenuName, normalizeProductName
│   │   ├── toast.js
│   │   └── download.js           ← CSV/XLSX/JSON 다운로드
│   │
│   ├── store/                    ← IndexedDB (책임별 분리)
│   │   ├── db.js                 ← initDB, runTransaction (저수준)
│   │   ├── schema.js             ← store 스키마 정의 (v2의 db.js _createStores 분리)
│   │   ├── migrations.js         ← 버전 마이그레이션
│   │   ├── sales-store.js        ← menu-sales 관련
│   │   ├── price-store.js        ← 제때 가격
│   │   ├── shipment-store.js     ← 제때 출고량
│   │   ├── cost-store.js         ← 원가
│   │   ├── ingredient-store.js   ← 식자재 (신규)
│   │   ├── nutrition-store.js    ← 영양성분
│   │   ├── note-store.js         ← 메뉴개발노트
│   │   └── settings-store.js     ← 백업/복원/시스템
│   │
│   ├── logic/                    ← 순수 함수 (parse + calc + classify)
│   │   ├── sales/
│   │   │   ├── parse.js
│   │   │   ├── calc.js           ← rank, comparison
│   │   │   └── classify.js       ← 233 MS9 rules
│   │   ├── price/
│   │   │   ├── parse.js
│   │   │   └── calc.js           ← compareLists
│   │   ├── shipment/
│   │   │   ├── parse.js
│   │   │   └── calc.js
│   │   ├── cost/
│   │   │   ├── parse.js
│   │   │   └── calc.js
│   │   └── nutrition/
│   │       └── calc.js
│   │
│   ├── components/               ← 공통 React 컴포넌트
│   │   ├── Sidebar.jsx
│   │   ├── TopBar.jsx
│   │   ├── CommandPalette.jsx
│   │   ├── Modal.jsx
│   │   ├── Toast.jsx
│   │   ├── Icon.jsx
│   │   ├── DataTable.jsx         ← 검색/정렬/페이징 통합
│   │   ├── FileDrop.jsx
│   │   ├── DateSelect.jsx
│   │   └── ConfirmInline.jsx     ← 인라인 확인 UI
│   │
│   ├── pages/                    ← 페이지별 폴더 (각 폴더 안 또 분리)
│   │   ├── home/
│   │   │   └── DashboardPage.jsx
│   │   ├── menu-sales/
│   │   │   ├── index.jsx
│   │   │   ├── UploadPage.jsx
│   │   │   ├── RankPage.jsx
│   │   │   ├── ComparePage.jsx
│   │   │   ├── UnmatchedPage.jsx
│   │   │   └── SettingsPage.jsx
│   │   ├── jette/                ← 제때상품관리
│   │   ├── cost/                 ← 원가계산 (큰 영역)
│   │   ├── ingredient/           ← 식자재 (신규)
│   │   ├── nutrition/
│   │   ├── note/
│   │   ├── report/
│   │   └── settings/
│   │
│   └── app/                      ← 진입점
│       ├── App.jsx               ← 라우터
│       ├── routes.js             ← 페이지 ↔ section id 매핑
│       └── theme.js              ← 테마/density 토글
│
├── docs/
│   ├── ARCHITECTURE.md           ← 이 문서
│   ├── CHANGELOG.md
│   └── v2-reference/             ← v2 정책 스냅샷 (참고용)
│
└── design_handoff_wonpay_dashboard/  ← 디자인 핸드오프 자료 (참고)
```

---

## 2. 페이지 매핑 (v2 ↔ v3)

### 그대로 이식 (v2 로직 → v3 컴포넌트)

| v3 페이지 | v2 source |
|---------|----------|
| `DashboardPage` | `modules/home/home.js` |
| `MenuSales/UploadPage` | `modules/menu-sales/menu-sales-upload-ui.js` + parse/store |
| `MenuSales/RankPage` | `modules/menu-sales/menu-sales-rank-ui.js` + calc |
| `MenuSales/ComparePage` | `modules/menu-sales/menu-sales-compare-ui.js` + calc |
| `MenuSales/UnmatchedPage` | `modules/menu-sales/menu-sales-unmatched-ui.js` |
| `MenuSales/SettingsPage` | `modules/menu-sales/menu-sales-settings-ui.js` |
| `Jette/PriceComparePage` | `modules/price/price.js` + UI |
| `Jette/ShipmentPage` | `modules/shipment/shipment.js` + UI |
| `Jette/SettingsPage` | `modules/shipment/shipment-settings-ui.js` |
| `Cost/*` (피자, 1인피자, 사이드, 세트박스 등) | `modules/cost/*` |
| `Note/ListPage`, `Note/WritePage` | `modules/menu-dev-note/*` |
| `Report/SalesPage` | `modules/report/report-sales.js` |
| `Report/PricePage` | `modules/report/report-price.js` |
| `Report/ShipmentPage` | `modules/report/report-shipment.js` |
| `Report/MenuSalesComparePage` | `modules/report/report-sales-compare.js` |
| `Settings/*` (백업/복원/시스템/계정) | `modules/settings/*` |

### 신규 작업 (v2엔 없음)

| v3 페이지 | 비고 |
|---------|------|
| `Ingredient/ListPage` | 식자재 리스트 — 디자인에 신규 메뉴 |
| `Ingredient/IssuesPage` | 식자재 이슈 |
| `Ingredient/UsagePage` | 식자재 사용 현황 |
| `Report/CostPage` | 원가 보고서 — 디자인에 신규 |
| `Nutrition/MenuPage` | 메뉴 영양성분 — v2 NUT-1b 진행 중 |
| `Nutrition/AllergenPage` | 알레르기 관리 |
| `Nutrition/ComplianceCheckPage` | 표시 의무 점검 |

### NUT 진행 중 모듈

v2의 NUT-1b 시리즈가 다른 클로드 세션에서 진행 중. v3에서는 다음 중 결정:
- **A**: NUT 작업이 충분히 진행되면 v3로 이식
- **B**: v3에서 nutrition을 처음부터 새로 설계 (디자인에 맞춰서)

권장: **A안** (v2 NUT 결과를 v3로 가져옴) — 작업 효율

---

## 3. 공통 유틸 미리 작성 목록 (feedback 메모리 원칙)

코드 작성하면서 2번째 등장 즉시 추출. 다음은 처음부터 만들 것:

### `src/common/`
- `format.js`: `formatNumber`, `formatPercent`, `formatWon`, `formatDate`, `formatPeriod`
- `escape.js`: `escapeHtml`
- `normalize.js`: `normalizeMenuName`, `normalizeProductName`
- `toast.js`: `showToast(message, type)`
- `download.js`: `downloadJson`, `downloadCsv`, `downloadExcel`

### React hooks 공통
- `src/hooks/useToast.js`
- `src/hooks/useModal.js`
- `src/hooks/useStore.js` (IndexedDB 접근 통합)
- `src/hooks/usePagedRows.js` (검색/페이징)

### `src/components/` 공통
- `DataTable.jsx` — 검색/정렬/페이징/확장 모두 지원 (v2의 table.js + buildDiffTable 통합)
- `FileDrop.jsx`
- `ConfirmInline.jsx` (인라인 삭제 확인)
- `DateSelect.jsx`, `MonthSelect.jsx`

---

## 4. 데이터 모델 (v2 IndexedDB 그대로)

v2의 `db.js` schema 그대로 가져옴 (검증된 구조).
변경 점:
- v3는 store 정의를 **store별로 분리** (`src/store/sales-store.js` 등)
- `src/store/schema.js`에서 store 정의 한 곳에 모음 (initDB는 이 schema 참조)

### IndexedDB store 목록 (v2 db.js 기준)

```
sales_files, sales_rows, ref_sales_aliases, ref_sales_categories,
ref_excluded, ref_discontinued, ref_event_menus, sales_rules,
ref_shipment_products, ref_shipment_rules,
price_files, price_rows,
shipment_files, shipment_rows,
menu_sales_issues,
cost_ingredients, cost_selling_prices, cost_edge_dough,
cost_pizza_detail, cost_personal_detail, cost_side_detail, cost_set_detail,
cost_upload_log,
menu_dev_notes,
nutrition_menu_ref, nutrition_raw_values, nutrition_origin_links, nutrition_allergy_links,
nutrition_pizza_composition, nutrition_set_composition, nutrition_halfhalf_results,
nutrition_origin_master, nutrition_allergy_master, nutrition_topping_master,
nutrition_beverage_master, nutrition_edge_master,
nutrition_versions, nutrition_change_log, nutrition_export_snapshots,
upload_log, settings, migration_flags
```

총 40개 store.

---

## 5. 데이터 마이그레이션 (v2 → v3)

v2와 v3는 별도 도메인(또는 별도 경로) → IndexedDB 분리됨.

**v3 우선 구현 사항**: 백업/복원 기능을 첫 페이지로 구현해서 v2 → v3 데이터 이전 가능하게.

순서:
1. v3 백업/복원 페이지 먼저 구현
2. v2에서 데이터 export (JSON)
3. v3에 import (복원)
4. 그 후 나머지 페이지 구현

---

## 6. 구현 우선순위 (제안)

```
[Phase 1] 인프라 (1주)
  - 폴더 구조 셋업
  - styles/ 분할 (tokens.css 등)
  - src/common/ 공통 유틸
  - src/store/db.js + schema.js
  - src/components/ 공통 컴포넌트 (Sidebar, TopBar, DataTable, Modal 등)
  - src/app/App.jsx 라우터

[Phase 2] 데이터 마이그레이션 (1~2일)
  - Settings/BackupPage (export)
  - Settings/RestorePage (import)
  → v2에서 데이터 이전 가능 시점

[Phase 3] 핵심 기능 (~2주)
  - Home (Dashboard)
  - MenuSales (5개 페이지)
  - Jette (3개 페이지)
  - Cost (큰 영역, 마지막에)

[Phase 4] 부가 기능 (~1주)
  - Note (2개 페이지)
  - Report (5개 페이지)
  - Ingredient (3개 페이지, 신규)
  - Nutrition (3개 페이지, NUT 결과 이식)

[Phase 5] 정리 + 배포
  - 전체 회귀 테스트
  - 성능 최적화 (브라우저 Babel → Vite 전환 검토)
  - git tag v3.0.0
  - GitHub 새 저장소 또는 기존 저장소 활용
```

---

## 7. 빌드/배포

### 개발
- 브라우저 Babel standalone (디자인 파일 그대로) — 빠른 시작
- 로컬: `node dev-server.js` (포트 4174)

### 프로덕션 (v3 완성 후 검토)
- 옵션 a: 그대로 브라우저 Babel (가장 단순)
- 옵션 b: Vite 도입 (성능, 모던 표준)

지금은 옵션 a로 시작 → Phase 5에서 옵션 b 전환 검토.

---

## 8. v3 작업 원칙 (메모리 참조)

`feedback_v3_proactive_maintenance.md` 메모리 무조건 적용:
- 200줄 이상 즉시 분할
- 2번째 중복 즉시 공통화
- 디자인 토큰/컴포넌트/페이지 처음부터 분리
- 책임 한 가지 원칙
- 의존성 그래프 명확

---

## 9. 사용자 확인 사항

이 뼈대에서 확정/수정할 것 알려주세요:

1. **폴더 구조** OK? 또는 변경?
2. **페이지 매핑** v2와 다르게 추가/변경할 것?
3. **신규 페이지** (식자재, 원가 보고서) 디자인 그대로 가져갈지?
4. **NUT 결과 처리** A안(이식) vs B안(새로) 선택?
5. **구현 우선순위** Phase 1~5 순서 OK?
6. **빌드 도구** 브라우저 Babel 시작 OK?

---

작업 시작 전 위 항목 결정해주세요.
