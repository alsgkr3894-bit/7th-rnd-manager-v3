# 7번가피자 R&D 관리 플랫폼 v2 — 개발 원칙

## 최종 메뉴 구조
1. 홈
2. 메뉴 판매량
   - 메뉴판매량 업로드 (`#menu-sales-upload`)
   - 메뉴판매량 순위 (`#menu-sales-rank`)
   - 메뉴판매량 비교 (`#menu-sales-compare`)
   - 메뉴미매칭 관리 (`#menu-sales-unmatched`)
   - 메뉴판매량 설정 (`#menu-sales-settings`)
   
   **→ 상세 정책: [MENU_SALES_DETAILED_POLICY.md](MENU_SALES_DETAILED_POLICY.md)**
3. 제때상품관리
   - 제때 상품 가격 비교 (`#jette-price-compare`)
   - 제때 범용상품 출고량 (`#jette-shipment`)
   - 제때 상품 관리 설정 (`#jette-settings`)
4. 보고서센터
   - 판매량 보고서 (`#report-sales`)
   - 제때 상품가격 보고서 (`#report-price`)
   - 제때 출고량 보고서 (`#report-shipment`)
   - 메뉴판매량 비교 보고서 (`#report-menu-sales-compare`)
5. 영양성분
   - 마스터 업로드 (`#nutrition-master-seed-upload`)
   - 마스터 확정 (`#nutrition-master-confirm`)

   **→ 목적: 원산지/알레르기/토핑/음료/엣지 마스터 데이터를 CSV로 업로드(draft 등록) → changeGroup 단위로 confirmed 전환 (append-only 교체 / 출력물 생성 / 배민용 엑셀은 별도 단계)**
6. 설정 / 백업
   - 데이터 백업 (`#settings-backup`)
   - 데이터 복원 (`#settings-restore`)
   - 시스템 설정 (`#settings-system`)
   - 계정 관리 (`#settings-account`)

## Section ID 전체 목록
| section id | 설명 |
|------------|------|
| home | 홈 |
| menu-sales | 메뉴 판매량 (상위 랜딩) |
| menu-sales-upload | 메뉴판매량 업로드 |
| menu-sales-rank | 메뉴판매량 순위 |
| menu-sales-compare | 메뉴판매량 비교 |
| menu-sales-unmatched | 메뉴미매칭 관리 |
| menu-sales-settings | 메뉴판매량 설정 |
| jette | 제때상품관리 (상위 랜딩) |
| jette-price-compare | 제때 상품 가격 비교 |
| jette-shipment | 제때 범용상품 출고량 |
| jette-settings | 제때 상품 관리 설정 |
| report | 보고서센터 (상위 랜딩) |
| report-sales | 판매량 보고서 |
| report-price | 제때 상품가격 보고서 |
| report-shipment | 제때 출고량 보고서 |
| report-menu-sales-compare | 메뉴판매량 비교 보고서 |
| nutrition | 영양성분 관리 (상위 랜딩) |
| nutrition-master-seed-upload | 영양성분 마스터 업로드 |
| nutrition-master-confirm | 영양성분 마스터 확정 |
| settings | 설정 / 백업 (상위 랜딩) |
| settings-backup | 데이터 백업 |
| settings-restore | 데이터 복원 |
| settings-system | 시스템 설정 |
| settings-account | 계정 관리 |

## 코드 구조 원칙
- `index.html`에 모든 코드를 넣지 않는다.
- 기능별 JS 파일로 분리한다. 파일 하나는 한 가지 역할만 담당한다.
- 파일 1개당 200줄 이하 유지를 목표로 한다.

## UI / 알림 원칙
- `alert()`, `confirm()`, `prompt()` 사용 금지.
- 모든 안내 메시지는 `toast.success / error / warn / info`를 사용한다.
- 파괴적 작업은 화면 내 인라인 확인 UI로 처리한다.

## 데이터 저장 원칙
- 엑셀 원본 바이너리를 IndexedDB에 저장하지 않는다.
- 파싱된 행 데이터(rows)와 파일 메타데이터(files)만 저장한다.
- 집계 결과는 저장하지 않고 필요할 때 계산한다.
- 파일의 카테고리 열은 판매량 집계에 사용하지 않는다.

## 제때 범용상품 출고량 저장 정책
- 지정한 70개 대상 제품에 해당하는 행만 `shipment_rows`에 저장하고 집계한다.
- 대상 외 제품 행은 DB 저장·집계·CSV 다운로드에서 제외하며 오류로 보지 않는다.
- 필터 기준: 제품코드 정확일치 우선, 코드가 없으면 정규화된 제품명 정확일치 사용.
- 70개 대상 목록은 `shipment-products.js`에 상수로 관리하며, 앱 시작 시 `ref_shipment_products`가 비어 있을 때만 시드한다.
- 관리품목 / 범용상품 분류는 3-2단계에서 진행한다.

## 모듈 분리 원칙
- 메뉴판매량, 제때상품가격, 제때출고량 모듈은 서로 import하지 않는다.
- `parse` 함수는 순수 함수. DB·DOM·전역 변수 접근 금지.
- `calc` 함수는 순수 함수. 인자만 받아 결과만 반환한다.
- `ui` 함수는 DOM만 조작한다.

## 개발 단계 원칙
- 각 단계 완료 후 테스트 결과를 요약한다.
- 다음 단계는 사용자 승인 후 진행한다.
- 자동으로 다음 단계를 진행하지 않는다.
- 데이터 백업/복원/초기화 기능은 별도 단계에서 구현한다.
- 1단계에서는 메뉴와 준비중 화면만 만든다.
- 계정 관리는 실제 로그인 기능 없이 준비중 화면만 만든다.
- 데이터 삭제나 복원 기능은 사용자 승인 전 구현하지 않는다.

## 주요 파일 역할
| 경로 | 역할 |
|------|------|
| `src/core/db.js` | IndexedDB 초기화 및 CRUD |
| `src/core/router.js` | 탭 전환 (서브 네비 바 포함) |
| `src/core/constants.js` | 카테고리, 도우 목록 등 상수 |
| `src/common/toast.js` | 토스트 메시지 |
| `src/common/excel.js` | xlsx/csv 읽기 |
| `src/common/normalize.js` | 메뉴명/제품명 정규화 |
| `src/common/number.js` | 숫자 파싱 |
| `src/common/table.js` | 테이블 렌더링 헬퍼 |
| `src/common/download.js` | JSON/CSV 다운로드 |
| `src/components/file-drop.js` | 파일 드롭존 UI |
| `src/app.js` | 앱 진입점, 초기화 조율 |
| `src/modules/` | 각 기능 모듈 (2단계~) |

---

## 영양성분 컴플라이언스 (NUT-1c 완료, NUT-1b-8 master 확정 UI 완료)

### NUT 진행 현황 (NUT-1b / NUT-1c 묶음 누적)
- NUT-1a: 정책/타입/검증/헬퍼 뼈대 완료
- NUT-1b-1: IndexedDB store 15개 추가 완료
- NUT-1b-2: 공통 + 도메인 store access layer 완료
- NUT-1b-3: 사전 설계 / Confirm / Patch 완료
- NUT-1b-4: add/update/retire + integrity 검증 연결 완료
- NUT-1b-5: master seed 모듈 5종 + 공통 helper 완료
- NUT-1b-6: seed upload UI (CSV 파서 / controller / preview state / render / UI + 이벤트 / router·index·app 연결) 완료
  - NUT-1b-6-A: seed CSV 파서 완료
  - NUT-1b-6-B: seed upload controller 완료
  - NUT-1b-6-C: seed preview state builder 완료
  - NUT-1b-6-D: seed upload UI render/event 연결 완료
  - NUT-1b-6-E: router / index.html / app.js 연결 완료
- NUT-1b-7: changeGroup 발행 / master confirmed 전환 / append-only / batch / 중복 검사 helper 완료
  - NUT-1b-7-A: changeGroup 발행 helper 완료
  - NUT-1b-7-B: master 단건 confirmed 전환 helper 완료
  - NUT-1b-7-C: append-only replace helper 완료
  - NUT-1b-7-D: master 일괄 confirmed 전환 helper 완료
  - NUT-1b-7-E: active confirmed code 유일성 integrity helper 완료 (E-1 추가 / E-2 B·C 연결)
  - NUT-1b-7-F: 통합 점검 완료
- **NUT-1b-7 완료 처리** (UI 연결은 NUT-1b-8 이후 별도 단계)
- NUT-1b-8: master 5종 확정 UI (state / render / controller / ui / 라우터 연결 / 통합 점검) 완료
  - NUT-1b-8-1: master confirm state helper 완료
  - NUT-1b-8-2: master confirm render helper 완료
  - NUT-1b-8-3: master confirm controller helper 완료
  - NUT-1b-8-4: master confirm UI setup 진입점 완료
  - NUT-1b-8-5: router / index.html / app.js 연결 완료
  - NUT-1b-8-6: 통합 점검 완료
- **NUT-1b-8 완료 처리** (append-only 교체 UI는 NUT-1b-9로 분리)
- NUT-1c: confirmed 데이터 기반 payload builder 완료
  - NUT-1c-1: active confirmed filter helper 완료
  - NUT-1c-2: master lookup builder 완료
  - NUT-1c-3: raw value lookup builder 완료
  - NUT-1c-4: origin/allergy link lookup builder 완료
  - NUT-1c-5: payload issues helper 완료
  - NUT-1c-6: menu payload row builder 완료
  - NUT-1c-7: composition payload helper 완료
  - NUT-1c-8: halfhalf payload helper 완료
  - NUT-1c-9: additional topping payload helper 완료
  - NUT-1c-10: export type filter helper 완료
  - NUT-1c-11: 최상위 nutrition payload builder 완료
  - NUT-1c-12: 통합 점검 완료
- **NUT-1c 완료 처리** (실제 엑셀 생성은 NUT-1d 출력 단계 책임)

### seed upload 운영 정책
- 입력 형식: CSV 우선. xlsx 업로드는 후순위
- master type 선택: 수동 선택만 허용 (파일명 자동 추정 없음)
- 지원 master type 5종: `origin`, `allergy`, `topping`, `beverage`, `edge`
- 필수 헤더 사전 검증 (master type 미스매치 시 preview 진입 차단)
- row 선택 기본값:
  - 정상 row: 기본 선택 (checked)
  - warning row: 기본 미선택 (사용자가 직접 체크해야 저장 대상)
  - error row: 저장 불가 (체크박스 disabled)
- 저장 흐름: 저장 직전 revalidate 1회 → selected row만 commit
- 저장 상태: **draft 등록까지만** (confirmed 전환은 NUT-1b-7 이후 별도 단계)
- 부분 실패 허용: 일부 row 실패해도 성공 row는 저장 (전체 rollback 없음, transaction wrapper 없음)
- 실패 row 재시도: 개별 재시도 미지원 → CSV 수정 후 다시 업로드 안내
- confirmed 자동 전환 / changeGroup 자동 발행 0건

### changeGroup 정책 (NUT-1b-7)
- changeGroup 저장: `nutrition_versions` store 사용 (신규 store 없음)
- row별 변경 이력: `nutrition_change_log` store 사용
- DB_VERSION 변경 없음
- `changeGroupCode` 형식: `NUT-YYYYMMDD-NNN`
- 발행된 changeGroup status는 항상 `confirmed`
- master confirmed 전환 / append-only replace 호출 시 `changeGroupId` 필수
- 자동 발행 금지: `issueChangeGroup`은 사용자 명시 액션에서만 호출

### confirmed 전환 정책 (NUT-1b-7)
- NUT-1b-7 1차 대상: master 5종 (`origin`, `allergy`, `topping`, `beverage`, `edge`)
- draft → confirmed는 `runTransaction`으로 처리
- master record put + `nutrition_change_log` add (action=`confirm`)를 같은 transaction에서 원자 처리
- 이미 confirmed + active record는 `ALREADY_CONFIRMED`로 skipped 반환 (오류 아님)
- retired record(`retiredAt` 있음)는 confirmed 전환 불가 → `RETIRED_RECORD_CANNOT_CONFIRM`
- status가 `draft`가 아니면 차단 → `INVALID_STATUS_FOR_CONFIRM`
- `appliedAt` 비어 있으면 차단 → `APPLIED_AT_REQUIRED`
- 일괄 confirmed 전환은 record별 독립 transaction (`batchConfirmMasterRecords`)
- 부분 실패 허용: 일부 record 실패해도 나머지는 진행, summary로 confirmed / skipped / failed 집계

### append-only 정책 (NUT-1b-7)
- confirmed record 직접 수정 금지 (필드 변경 불가)
- 변경 시 흐름: 신규 confirmed record add + 기존 confirmed record retire (한 transaction)
- `retiredAt = newRecord.appliedAt`
- `nutrition_change_log` 2건 기록: action=`append_replace_add` (신규), action=`append_replace_retire` (기존)
- master code 일치 필수: `MASTER_CODE_MISMATCH` 차단
- `newRecord.appliedAt < oldRecord.appliedAt`이면 차단 → `APPLIED_AT_BEFORE_OLD_RECORD`
- transaction 외부 검증 + transaction 내부 IDB native put/add만 사용 (work 내부 `await` 금지)

### active confirmed 중복 정책 (NUT-1b-7)
- 같은 master 안에서 같은 code의 active confirmed record는 1개만 허용 (status=`confirmed` ∧ retiredAt 빈값)
- 위반 시 reason: `ACTIVE_CONFIRMED_DUPLICATE`
- 정식 helper: `checkMasterActiveConfirmedCodeUnique` + master별 wrapper 5종 (origin/allergy/topping/beverage/edge)을 `nutrition-integrity.js`에 추가 완료
- B(`nutrition-confirm-transition.js`) / C(`nutrition-append-only-replace.js`) 파일의 로컬 duplicate 검사는 정식 integrity helper로 위임 완료
- 순수 함수: 인자로 받은 records 배열 read-only iteration, DB 접근 0건

### NUT-1b-8 master 확정 UI 정책

#### NUT-1b-8 역할
NUT-1b-7에서 만든 helper(`issueChangeGroup` / `confirmMasterRecord` / `batchConfirmMasterRecords`)에 화면을 연결한다. master 5종 확정 흐름을 UI에서 사용할 수 있도록 한다.

금지:
- append-only 교체 UI (NUT-1b-9로 분리)
- confirmed record 수정 / retired record 복구 UI
- raw_values / links / composition / halfhalf confirmed 전환 UI
- 배민용 엑셀 / xlsx / FileReader

#### UI 위치
- 신규 sub-section `#nutrition-master-confirm` 추가 (메뉴명: **마스터 확정**)
- 영양성분 메뉴 하위, 기존 `#nutrition-master-seed-upload`와 별도 화면
- lazy-load (`./modules/nutrition-compliance/nutrition-master-confirm-ui.js`)로 dynamic import — static import 0건

#### 화면 구성
- master type 탭 5종 (origin / allergy / topping / beverage / edge)
- changeGroup 발행 영역 (코드 자동 제안 + 재제안 + 설명 + 발행 + 활성 표시)
- 필터 4종 (all / draft / confirmed / retired, 기본 `all` + retired 자동 숨김)
- master record table (체크박스 + id + code + name + status + appliedAt + retiredAt + action)
- 선택 일괄 확정 버튼 + 인라인 확인 토글
- 마지막 작업 결과 영역 (total / confirmed / skipped / failed)

#### 확정 단위
- 단건 [확정] 버튼 → 인라인 [예/취소] → `confirmMasterRecord`
- 체크박스 + [선택 일괄 확정] → 인라인 [예/취소] → `batchConfirmMasterRecords`
- draft status row만 체크박스/액션 활성 / confirmed·retired는 disabled

#### changeGroup 운영
- 페이지 세션 동안 발행된 `changeGroupId` 유지 (타입 전환에도 동일 id)
- 재발행 시 새 코드 + 새 id로 교체
- 자동 발행 금지 — 사용자 명시 클릭만 트리거
- description은 선택 입력 (빈값 허용)
- `createdBy` 기본값 `'system'` (로그인 도입 시 후속 단계 교체)

#### 파일 구조
- `nutrition-master-confirm-state.js` (NUT-1b-8-1): 순수 state helper (DOM/DB/async 0건)
- `nutrition-master-confirm-render.js` (NUT-1b-8-2): HTML 문자열 렌더 (DOM/이벤트/state mutation 0건, XSS escape 적용)
- `nutrition-master-confirm-controller.js` (NUT-1b-8-3): helper 호출 조율 (DOM/DB 직접 접근 0건, helper 경유)
- `nutrition-master-confirm-ui.js` (NUT-1b-8-4): setup 진입점 (이벤트 위임 1회, toast / inline 확인)

#### data-role 마크업 (10종)
`master-confirm-type-tab` / `master-confirm-propose-button` / `master-confirm-description` / `master-confirm-issue-button` / `master-confirm-filter` / `master-confirm-row-checkbox` / `master-confirm-confirm-button` / `master-confirm-batch-button` / `master-confirm-inline-yes` / `master-confirm-inline-cancel`

### NUT-1b-7 후속 보류 항목
아래 항목은 별도 후속 단계로 분리한다.
- raw_values confirmed 전환
- origin/allergy links confirmed 전환
- composition (pizza/set) confirmed 전환
- halfhalf_results confirmed 전환
- menu_ref confirmed 전환
- ~~confirmed 관리 UI (master 확정 / changeGroup 발행 / append-only 교체)~~ → **master 확정 + changeGroup 발행 = NUT-1b-8 완료** / append-only 교체 = NUT-1b-9 보류
- ~~payload builder (NUT-1c)~~ → **NUT-1c 완료** (실제 confirmed 전환 흐름이 갖춰지면 NUT-1d 출력 단계에서 사용)
- 배민용 엑셀 출력 (NUT-1d 이후)

### NUT-1c payload builder 정책

#### NUT-1c 역할
NUT-1c는 출력 파일을 생성하지 않는다. 아래 역할까지만 담당한다.
- confirmed 데이터만 사용
- 출력용 payload 조립
- blockers / warnings 수집
- exportType별 필터 적용
- 배민용 엑셀 출력에 필요한 데이터 구조 준비

금지:
- 엑셀 생성 / xlsx import
- 배민용 템플릿 조작 / 시트·셀 좌표 처리
- UI 구현 / DB 수정 / confirmed 전환

#### confirmed 데이터 기준
모든 lookup / payload row 빌더는 단일 진실 소스 `pickActiveConfirmedAt` (NUT-1c-1)을 통해 다음 조건만 통과시킨다.
- `status === 'confirmed'`
- `appliedAt <= asOf`
- `retiredAt`이 비어 있거나 `retiredAt > asOf` (strict `>`)
- draft / reviewing / retired 데이터는 payload에서 제외
- 미확정 데이터는 row를 만들지 않고 `blockers`에 기록

#### payload 최상위 구조
`buildNutritionPayload({ exportType?, asOf?, menuRefIds? })` 반환:
```js
{
  exportType,
  asOf,
  generatedAt,
  menus: [],
  beverages: [],
  toppings: [],
  sets: [],
  halfhalf: [],
  additionalToppings: [],
  blockers: [],
  warnings: [],
  meta: {}
}
```

#### blockers / warnings 정책
- `blockers.length > 0`이면 **NUT-1d 출력 단계에서 파일 생성 차단**
- 주요 blocker code:
  - `MISSING_CONFIRMED_MENU_REF`
  - `MISSING_CONFIRMED_RAW_VALUE`
  - `MISSING_CONFIRMED_ORIGIN_LINK`
  - `MISSING_PIZZA_COMPOSITION`
  - `MISSING_SET_COMPOSITION`
  - `MISSING_HALFHALF_RESULT`
  - `MISSING_MASTER_REF`
  - `ACTIVE_CONFIRMED_DUPLICATE`
  - `INVALID_UNIT_BASIS`
  - `MISSING_SERVING_WEIGHT`
- 알레르기 0건은 정상 케이스: `allergies: []` 그대로, blocker/warning 0건. NUT-1d 배민 엑셀 출력 시 공란 처리.
- 하프앤하프: `confirmedMinCalories`/`confirmedMaxCalories`/`confirmedWeightPerServing` 중 1개라도 누락 → `MISSING_HALFHALF_RESULT`. auto값은 payload에 포함하지 않음. L/R만 처리, G 차단.
- 추가토핑: 본체 메뉴 nutrients에 합산 0건. `additionalToppings` root 배열에 분리 보유. 문제 있는 토핑은 해당 토핑만 제외 + warning (전체 차단 0건).
- 배민 특례 warning: `BAEMIN_EXCLUDED` (G 사이즈 / R 씬바샤삭), `BAEMIN_FIXED_EDGE` (1인피자 씬바샤삭 고정).

#### NUT-1c helper 파일 목록
- `src/modules/nutrition-compliance/nutrition-active-confirmed-filter.js`
- `src/modules/nutrition-compliance/nutrition-master-lookup.js`
- `src/modules/nutrition-compliance/nutrition-raw-value-lookup.js`
- `src/modules/nutrition-compliance/nutrition-link-lookup.js`
- `src/modules/nutrition-compliance/nutrition-payload-issues.js`
- `src/modules/nutrition-compliance/nutrition-menu-payload-row.js`
- `src/modules/nutrition-compliance/nutrition-composition-payload.js`
- `src/modules/nutrition-compliance/nutrition-halfhalf-payload.js`
- `src/modules/nutrition-compliance/nutrition-additional-topping-payload.js`
- `src/modules/nutrition-compliance/nutrition-export-type-filter.js`
- `src/modules/nutrition-compliance/nutrition-payload-builder.js`

### NUT-1c 후속 보류 항목 (NUT-1d 이후)
- 배민용 엑셀 실제 생성
- xlsx 템플릿 로드
- 시트 / 셀 좌표 매핑
- 고구마 조각수 계산 (L 16 / R 12, 1회 제공량 100g 초과 조건)
- 알레르기 텍스트 조립 (대두 표준명 / 계란 표준명 적용)
- 추가토핑 반복 영역 실제 반영
- 생성 차단 UI / 보고서 화면
- payload 결과 화면 표시 (관리자 검토용)

### 배민용 엑셀 정책 분리 (출력 단계 참고 메모)
**배민용 엑셀은 NUT-1d 출력 단계에서 구현한다.** 배민용 영양성분/알레르기 엑셀은 **출력 단계(NUT-1d 이후)에서 별도 구현**. 현재 seed upload / NUT-1b-7 confirmed 전환 / NUT-1c payload builder 단계와 분리.

출력 단계 원칙:
- 원본 배민용 엑셀 템플릿 그대로 유지 (값만 자동 갱신)
- 확정된(`confirmed`) 영양성분 / 알레르기 / 메뉴 마스터 값만 반영 (NUT-1c payload의 `blockers.length === 0` 조건 통과 시에만 생성)
- 미확정 데이터가 포함되면 엑셀 생성 차단

배민 정책서 기준 출력 규칙:
- G사이즈 시트 생성 안 함 (NUT-1c에서 `BAEMIN_EXCLUDED` warning + payload 제외 완료)
- R사이즈 씬바샤삭 제외 (NUT-1c에서 동일 처리)
- 1인피자 씬바샤삭 고정 (NUT-1c에서 `BAEMIN_FIXED_EDGE` warning + 씬바샤삭 row만 유지)
- 고구마 특례 시트 유지
- 고구마 L 16조각 / R 12조각 기준, 1회 제공량이 100g을 넘도록 조각수 산정은 **NUT-1d에서 처리** (NUT-1c는 sliceInfo 자리만, 채움은 NUT-1d)
- 추가토핑은 본체 기준값을 반복 구간에 자동 반영 (NUT-1c의 `additionalToppings` 배열 활용)
- 알레르기 없음은 공란 유지

출력 단계 진입 전 재확인 필요:
- 대두 표준명 반영 여부 (현재 normalize는 `콩/대두/대두류 → 대두`, 배민 정책서는 `달걀 → 계란`만 명시 → 정합성 재확인)
- 음료 "마스터 확정값" 표현과 `raw_values subjectType='beverage'` 구조 정합성
- 세트박스 "계산 결과값 또는 템플릿 기준값" 표현 통일

→ 상세 계산/조립 로직은 출력 단계 명세에서 정의 (이 문서에서는 메모만). 실제 구현은 NUT-1d 이후 출력 단계에서 진행.

---

## 향후 구현 예정 기능 — 메뉴개발노트

> **이번 작업에서는 코드·DB·라우터·메뉴를 일절 수정하지 않는다.**
> 아래 내용은 향후 구현 시 기준이 흔들리지 않도록 정책을 문서화한 것이다.

### 목적
메뉴 아이디어, 테스트 기록, 개선 방향, 보고 예정 사항을 정리·검색·관리하는 내부 R&D 기록 공간.
단순 메모장이 아니라 메뉴개발 업무의 테스트 히스토리와 다음 액션을 남기는 기능으로 설계한다.

### 핵심 정책: 기본 단위
**"테스트 1회 = 노트 1개"**

예:
- 횡성한우쉬림프 테스트 / 2026-05-12 / 와사비마요 조합 테스트 / 235도·4분 50초 / 결과 및 다음 액션 기록

이 기준을 사용하는 이유:
- 테스트 이력 관리가 쉽다
- 날짜별 비교가 쉽다
- 보고용 정리가 쉽다
- 하나의 메뉴 노트가 너무 길어지는 것을 막는다
- 데이터 구조가 단순하다

### 메뉴 구조 예정안
향후 상단 메뉴에 독립 메뉴로 추가하는 방향을 우선 검토한다.
```
메뉴개발노트
  ├── 노트 작성   (#menu-dev-note-write)
  └── 노트 목록   (#menu-dev-note-list)
```
1차 구현은 위 2개 하위 메뉴까지만 권장한다.
추후 확장 가능 후보: 보고예정 / 보류·폐기 / 테스트 기록 / 아이디어 보관함 (1차 미포함).
단, 1차 구현에서는 과도하게 세분화하지 않는다.

### 노트 유형
| 유형 | 설명 |
|------|------|
| 아이디어 | 테스트 전 구상 |
| 테스트 기록 | 실제 샘플 테스트 내용 |
| 개선 기록 | 기존 메뉴 리뉴얼/수정 |
| 원가 검토 | 재료 변경, 단가 영향 기록 |
| 출시 후보 | 보고 또는 최종 검토 대상 |
| 보류/폐기 | 중단된 메뉴 기록 |

### 상태값
`아이디어` / `테스트중` / `재테스트` / `보고예정` / `보류` / `출시` / `폐기`
- **보고예정**: 상무님 보고 전 또는 내부 공유 예정 항목만 따로 모아보기 위해 사용.
- **폐기**: 완전 삭제 대신 상태 전환으로 과거 실패 테스트·보류 사유를 보존.

### 개발 구분
`피자` / `사이드` / `소스` / `도우(엣지)` / `토핑` / `기타`

### 노트 입력 항목
**필수**: 제목 / 메뉴명 / 개발 구분 / 상태 / 핵심 테스트 내용
**선택**: 테스트 날짜 / 사용 재료 / 맛 평가 / 상무님·실장님 평가 / 원가 / 개선점 / 다음 액션 / 보고용 요약 / 태그

### 검색 및 필터
- 검색 대상: 메뉴명 / 제목 / 내용 / 상태 / 개발 구분
- 필터: 년·월 / 상태 / 개발 구분 / 태그
- 기록이 쌓이면 검색성과 필터가 매우 중요해지므로 1차 구현부터 최소한의 검색·필터 포함 권장.

### 태그 정책
쉼표 구분 문자열 방식 (예: `매운맛,치즈강화,프리미엄`).
1차에서 제외: 자동 태그 / 색상 태그 / AI 추천 / 복잡한 태그 관리 UI.

### 삭제 정책
완전 삭제보다 **"폐기" 상태 전환을 우선 권장**.
이유: 실패한 메뉴 테스트도 나중에 참고 가치가 있고, 과거 단종·보류 사유를 재확인할 수 있으며, R&D 히스토리 보존에 유리하다.
완전 삭제 버튼을 넣는 경우에도 인라인 확인 방식으로 안전하게 처리한다.

### 보고용 복사 기능 (핵심)
버튼 1개로 아래 형식의 텍스트를 클립보드에 복사한다.
```
[메뉴개발노트 보고용]
메뉴명:
개발 구분:
테스트 날짜:
테스트 내용:
결과:
다음 액션:
```
카톡·단톡 보고, 상무님 보고, 회의 공유에 바로 활용할 수 있도록 설계한다.

### 이미지·첨부 정책
1차 구현에서 이미지 첨부·파일 첨부 제외.
이유: IndexedDB 용량 증가 / 브라우저 성능 저하 / 백업 비대화 / 구조 복잡도 증가.
향후 필요 시 이미지 자체 저장이 아니라 "이미지 경로 참조" 또는 별도 첨부 구조를 검토한다.

### 자동 저장 정책
1차 구현에서 자동 저장 미사용. **명시적 저장 버튼** 사용.
이유: 실수 저장 방지 / 상태 꼬임 방지 / 버그 감소 / 구조 단순화.

### 향후 원가계산과의 연동 방향
메뉴개발노트는 테스트 기록 중심, 원가계산은 정식 원가 관리 중심으로 역할을 분리한다.

향후 메뉴개발노트에서는 사용자가 재료명과 사용량을 입력하면
원가계산의 식자재 단가표에서 g·개당 단가를 가져와 간이 재료 원가를 계산해 보여주는 방향을 검토한다.

예:
```
피자소스 50g 입력 → 피자소스 g당 단가 × 50 → 해당 재료 원가 표시
```

이 기능은 테스트 단계의 간이 원가 확인용이며, 정식 메뉴 원가표를 대체하지 않는다.
향후 필요 시 메뉴개발노트 1건에 원가표 1개 이상을 연결하는 방향도 확장 검토할 수 있으나,
초기 구현에서는 원가표 직접 연결을 구현하지 않는다.

### 1차 구현 포함 기능
노트 작성 / 노트 목록 / 검색 / 필터 / 수정 / 삭제(또는 폐기 상태 전환) / 상태 관리 / 보고용 복사

### 1차 구현 제외 기능
이미지·파일 첨부 / 원가표 직접 연결 / 차트 / 보고서 자동 생성 / AI 요약 / 자동 저장 / 복잡한 태그 시스템

### 안정성 우선 원칙
1. 안정성 → 2. 버그 최소화 → 3. 용량 최소화 → 4. 기능 확장
- 메뉴개발노트 1차 구현에서는 원가계산·가격비교·출고량·판매량 모듈과 직접 연동하거나 불필요하게 import하지 않는다.
- 향후 원가계산과의 연동이 필요한 경우에도, 기존 모듈을 직접 얽히게 하지 말고 안정적인 읽기 전용 참조 구조 또는 별도 공통 조회 계층을 검토한 뒤 구현한다.
- 기존 정상 기능 불필요 수정 금지.
- 텍스트 중심의 경량 구조 우선.
- 대용량 첨부 기능은 후순위.
- 자동 처리보다 명시적 저장과 명확한 상태 관리 우선.

---

## 향후 구현 예정 기능 — 원가계산

> **이번 작업에서는 코드·DB·라우터·메뉴를 일절 수정하지 않는다.**
> 아래 내용은 향후 구현 시 기준이 흔들리지 않도록 정책을 문서화한 것이다.

### 목적
메뉴별 종합 원가, 세부 품목 원가, 식자재 단가 기준을 관리하는 내부 R&D 원가 계산 공간.

핵심 목적:
- 메뉴별 판매가 / 원가 / 원가율 관리
- 식자재별 부가세포함단가와 g·개당 단가 관리
- 세부 원가표를 기반으로 종합 원가표 자동 계산
- 최신 제때 단가 반영에 따른 원가 재계산
- 향후 메뉴개발노트와 연결하여 간이 원가 확인까지 확장 가능하도록 설계

원가계산은 메뉴개발노트 안에 직접 포함하지 않고,
별도의 독립 모듈 또는 독립 상단 메뉴로 분리하는 방향을 기준으로 한다.

### 전체 메뉴 구조 예정안
```
원가계산
  ├── 피자메뉴 원가
  │     ├── 피자 원가
  │     │     ├── 피자 종합 원가표    (#cost-pizza-summary)
  │     │     └── 피자 세부 원가표    (#cost-pizza-detail)
  │     ├── 1인피자 원가
  │     │     ├── 1인피자 종합 원가표  (#cost-personal-summary)
  │     │     └── 1인피자 세부 원가표  (#cost-personal-detail)
  │     ├── 사이드 메뉴 원가
  │     │     ├── 사이드 종합 원가표   (#cost-side-summary)
  │     │     └── 사이드 세부 원가표   (#cost-side-detail)
  │     └── 세트박스 원가
  │           ├── 세트박스 종합 원가표  (#cost-set-summary)
  │           └── 세트박스 세부 원가표  (#cost-set-detail)
  ├── 공통 원가 기준
  │     └── 엣지 & 도우 원가표        (#cost-edge-dough)
  └── 식자재 단가표
        ├── 재료별 단가계산 기준       (#cost-ingredient-price)
        └── 식자재 사용 메뉴 현황      (#cost-ingredient-usage)
```

### 피자 원가 정책

#### 피자 종합 원가표
피자 종합 원가표는 메뉴별 최종 원가 결과만 보여주는 요약 페이지다.
세부 재료 구성은 종합표에 직접 펼치지 않는다.
종합표는 세부 원가표에서 계산된 최종값을 보여주는 페이지다.

피자 종합 원가표는 엣지별 4개로 구분한다.
- 석쇠 (기본 바탕값)
- 치즈크러스트
- 골드스윗크러스트
- 씬 도우

각 피자 메뉴는 L / R 규격으로 구분한다.

표시값: 메뉴명 / 엣지 구분 / 규격(L·R) / 판매가 / 원가 / 원가율

계산 기준:
- 원가 = 피자 세부 원가표에서 계산된 최종 총 원가
- 판매가 = 사용자가 별도 판매가 양식으로 업로드한 값
- 원가율 = 원가 ÷ 판매가 × 100

#### 피자 세부 원가표
피자 세부 원가표는 각 피자 메뉴의 실제 레시피 원가 근거표다.
메뉴별 L / R 규격과 엣지 구분을 함께 관리한다.

포함 항목: 메뉴명 / 규격(L·R) / 엣지 유형 / 세부 구성품명 / 사용량 / 사용 단위 / 연결된 식자재 또는 공통 원가 기준 항목 / 세부 품목 원가 / 메뉴 최종 총 원가

세부 구성품에 포함 가능한 원가 요소: 도우 / 박스 / 피클 / 치즈 / 소스 / 토핑 / 실제 메뉴 제조·판매에 포함되는 기타 구성품

계산 기준:
- 세부 원가 = 사용량 × g·개당 단가
- 세부 품목 원가는 소수점 1자리까지 표시 가능
- 메뉴 최종 총 원가는 원본 소수값을 모두 합산한 뒤 마지막에 반올림
- 최종 총 원가가 피자 종합 원가표에 반영된다.

### 1인피자 원가 정책

#### 1인피자 종합 원가표
1인피자 종합 원가표는 1인피자 메뉴별 최종값만 보여주는 요약 페이지다.
- 엣지 4종 분리 없음, 엣지 구분 없는 단일 메뉴 기준
- 표시값: 메뉴명 / 판매가 / 원가 / 원가율
- 원가율 = 원가 ÷ 판매가 × 100

#### 1인피자 세부 원가표
1인피자 세부 원가표는 1인피자 메뉴별 실제 세부 구성품과 원가 근거를 관리한다.

포함 항목: 메뉴명 / 세부 구성품명 / 사용량 / 사용 단위 / 세부 원가 / 메뉴 최종 총 원가

예시 구성품: 씬도우1 / 박스1인 / 피클1입 / 치즈 / 피자소스 / 토핑류

세부 원가표의 합산값이 1인피자 종합 원가표의 원가값으로 반영된다.

현재 정책상 1인피자 원가표가 엣지 & 도우 공통 원가표를 자동 참조하는 구조는 확정하지 않는다.
1인피자는 별도 세부 원가표 구조를 기준으로 본다.

### 사이드 메뉴 원가 정책

#### 사이드 메뉴 종합 원가표
사이드 메뉴 종합 원가표는 사이드 메뉴별 최종 판매가 / 원가 / 원가율을 보여주는 요약 페이지다.
표시값: 메뉴명 / 판매가 / 원가 / 원가율

#### 사이드 메뉴 세부 원가표
사이드 메뉴 세부 원가표는 사이드 메뉴별 실제 구성 재료와 포장 부자재 원가를 계산하는 상세 원가표다.

포함 항목: 메뉴명 / 세부 구성품명 / 사용량 / 사용 단위 / 세부 원가 / 최종 총 원가

포함 가능한 구성: 식재료 / 용기 / 박스 / 스티커 / 포장 요소 / 실제 판매 시 포함되는 구성품

세부 원가표의 최종 총 원가가 사이드 메뉴 종합 원가표에 반영된다.

### 세트박스 원가 정책

#### 세트박스 종합 원가표
세트박스 종합 원가표는 세트박스별 최종 판매가 / 원가 / 원가율을 보여주는 요약 페이지다.
표시값: 세트박스명 / 판매가 / 원가 / 원가율

#### 세트박스 세부 원가표
세트박스 세부 원가표는 세트박스 구성품별 원가를 계산하는 상세 원가표다.
세트박스 세부 원가표는 식자재뿐 아니라 기존 메뉴 원가표의 최종 원가를 구성품으로 참조할 수 있어야 한다.

예:
```
패밀리박스 L = 슈퍼콤비네이션 L 원가 + 오븐스파게티 원가 + 박스 원가 + 기타 구성품 원가
```

세트박스 구성품 유형: 식자재 / 포장재 / 기존 메뉴 원가표의 최종 원가 참조

세트박스 세부 원가표의 합산값이 세트박스 종합 원가표의 원가값으로 반영된다.

### 공통 원가 기준 — 엣지 & 도우 원가표
엣지 & 도우 원가표는 피자 세부 원가표에서 재사용하는 공통 기준 원가표다.

관리 대상 예시:
- 치즈크러스트 L / R
- 골드스윗크러스트 L / R
- 씬도우 L

각 항목은 별도 세부 구성품과 최종 원가를 가진다.

예:
```
치즈크러스트 L = 도우L + 박스L + 피클1입 + 스트링치즈L + 치즈(CH)
```

정책:
- 엣지 & 도우 원가표의 최종 원가는 피자 세부 원가표에서 참조 가능하다.
- 1인피자는 이 공통 원가표 자동 참조 구조를 현재 확정하지 않는다.

### 식자재 단가표 정책

#### 컬럼 구성
식자재 단가표 화면은 아래 컬럼을 기준으로 검토한다.
- 재료명
- 부가세포함단가
- 포장단위
- g·개당 단가
- 비고
- 제때 제품명

#### 내부 연결 키
식자재 단가표는 화면 표시상 제품명과 재료명을 중심으로 보여주되,
최신 제때 단가 연동의 안정성을 위해 내부 연결 키로 **제품코드를 반드시 보유**하는 방향을 기준으로 한다.

최신 제때 단가 연동 기준:
- 제품코드 우선
- 제품명은 화면 표시와 검색 편의를 위한 정보로 사용

#### 단가 계산식
```
g·개당 단가 = 부가세포함단가 ÷ 포장단위
예: 부가세포함단가 7,400원 / 포장단위 2,000g → g당 단가 3.7원
```

### 최신 제때 단가 연동 정책
원가계산 모듈은 이미 구현된 "제때 상품 가격 비교" 모듈의 최신 가격 데이터를 참조하는 방향을 기준으로 한다.

안전성 우선 정책:
- 원가계산 탭에서 동일 가격 파일을 다시 별도로 업로드하지 않는다.
- 단가 기준의 이중화를 만들지 않는다.
- 제때 상품 가격 비교 모듈의 최신 업데이트 데이터를 단일 기준으로 사용한다.

기준 금액:
- 과세: 단가 × 1.1
- 면세: 단가 그대로

최신 단가 반영 정책:
- 원가표는 최신 단가 기준으로 항상 현재 원가를 다시 계산한다.
- 원가계산 관련 주요 화면에는 현재 적용 중인 최신 제때 단가 업데이트 날짜를 표시한다.

### 단가 인상/인하 표시 정책
단가 업데이트가 발생했을 때 아래 범위에서 인상/인하를 확인할 수 있도록 설계한다.

- **식자재 단가표**: 부가세포함단가 인상/인하, g·개당 단가 인상/인하 표시
- **각 메뉴 세부 원가표**: 해당 재료 원가가 최신 단가 업데이트로 인해 인상/인하되었는지 표시
- **종합 원가표 총 원가 비교**: 이전 기준 대비 인상/인하 비교 기능은 **후순위 확장**으로 둔다.

### 단가 미연동 처리 정책
최신 단가와 연동되지 않은 제품은 0원으로 자동 계산하지 않는다.

정책:
- "단가 미연동" 상태로 표시
- 사용자가 직접 확인 가능하게 한다.
- 단가 미연동 품목이 포함된 계산은 정상 계산처럼 오인되지 않게 한다.

### 단위 불일치 처리 정책
세부 원가표의 사용 단위와 식자재 단가표의 환산 단위가 다르면 자동 계산을 확정하지 않는다.

예: 식자재 단가표가 g 기준인데 세부 원가표가 개 기준인 경우

처리:
- "단위 확인 필요" 또는 이에 준하는 경고 표시
- 반영 자체는 가능할 수 있으나, 해당 행의 자동 계산값을 정상 확정값으로 처리하지 않는다.

### 원가계산 양식 다운로드 / 업로드 정책
원가계산 모듈은 초기 데이터 입력과 대량 관리를 위해
"양식 다운로드 → 사용자가 작성 → 업로드" 방식을 기본으로 한다.

#### 유형별 개별 양식 제공
| 양식 | 설명 |
|------|------|
| 식자재 단가표 양식 | 재료명, 부가세포함단가, 포장단위, 제품코드 등 |
| 메뉴 판매가 양식 | 메뉴명, 규격, 판매가 |
| 엣지 & 도우 원가 양식 | 엣지/도우별 세부 구성품과 사용량 |
| 피자 세부 원가 양식 | 피자 메뉴별 세부 구성품과 사용량 |
| 1인피자 세부 원가 양식 | 1인피자 메뉴별 세부 구성품과 사용량 |
| 사이드 메뉴 세부 원가 양식 | 사이드 메뉴별 세부 구성품과 사용량 |
| 세트박스 세부 원가 양식 | 세트박스별 구성품 (식자재, 포장재, 메뉴 원가 참조 포함) |

#### 종합 원가표는 업로드하지 않음
아래 종합 원가표는 직접 업로드받지 않고,
세부 원가표와 판매가 데이터를 기준으로 시스템이 자동 생성한다.
- 피자 종합 원가표
- 1인피자 종합 원가표
- 사이드 메뉴 종합 원가표
- 세트박스 종합 원가표

### 업로드 반영 정책 — 최신본 1세트 유지
각 양식 유형별 활성 데이터는 최신본 1세트만 유지하는 방향을 기준으로 한다.
단, 안전성 때문에 자동 덮어쓰기는 금지한다.

업로드 흐름:
1. 파일 업로드
2. 컬럼 및 필수값 검증
3. 오류 / 경고 확인
4. 업로드 미리보기
5. 사용자가 "최신본으로 반영" 실행
6. 기존 활성 데이터를 새 최신본으로 교체

보존 정책:
- 실제 계산에는 최신 활성 데이터만 사용
- 과거 세부 데이터는 활성 계산에서 제외
- 업로드 기록은 최소 정보만 보관 (파일명 / 업로드·반영일 / 처리 건수 / 오류·경고 건수)

### 업로드 오류 / 경고 정책

#### 오류 — 반영 차단
아래는 반영 차단 오류다.
- 필수 컬럼 누락
- 메뉴명 누락
- 사용량 누락
- 제품코드가 필수인 양식 또는 행에서 제품코드 누락

주의: "제품코드 누락"은 모든 양식에 무조건 적용하지 않는다.
제품코드가 본질적으로 필요한 식자재 단가표 또는 식자재 연동 행에 한해 반영 차단한다.
메뉴 판매가 양식, 기존 메뉴 원가 참조 행 등 제품코드가 필요하지 않은 구조에까지 잘못 적용하지 않는다.

#### 경고 — 반영 가능하되 확인 표시
아래는 경고다.
- 단가 미연동
- 판매가 미입력
- 단위 불일치 의심

단, 단위 불일치 의심 행은 업로드 반영이 가능하더라도
자동 계산을 확정값으로 처리하지 않고 "단위 확인 필요" 상태로 표시한다.

### 메뉴 판매가 정책
종합 원가표에서 사용하는 판매가는 사용자가 별도 "메뉴 판매가 양식"으로 업로드한다.
원가율은 시스템이 자동 계산한다.

원가율 계산식:
```
원가율 = 원가 ÷ 판매가 × 100
```

### 식자재 사용 메뉴 현황 정책
식자재 단가표 하위에 "식자재 사용 메뉴 현황" 기능을 둔다.

목적: 식자재별로 어떤 메뉴에 사용되는지, 총 몇 개 메뉴에 사용되는지 확인하기 위한 분석표.

구분: 토핑 / 소스 / 사이드 (3개 구분으로 관리)

표시 항목: 구분 / 재료명 / 사용 메뉴 수 / 사용 메뉴명 목록

집계 기준:
- 같은 메뉴의 L / R은 별도로 세지 않고 하나의 메뉴로 집계한다.
  예: 새우파티 L + 새우파티 R → 사용 메뉴 수 "1"

엣지 & 도우 경유 재료 처리:
- 엣지 & 도우 원가표를 통해 간접적으로 사용되는 재료는 최종 피자 메뉴 전체로 확장 집계하지 않는다.
- 해당 재료가 실제 들어가는 엣지 또는 도우 자체를 1개 사용처로 본다.
  예: 스트링치즈 → 치즈크러스트 1 / 씬도우 관련 재료 → 씬도우 1

포장재·부자재 제외: 박스 / 용기 / 스티커 / 포장 비닐 / 기타 부자재는 현황에서 제외.
표시 대상은 토핑 / 소스 / 사이드 재료만 해당.

### 메뉴개발노트와 원가계산 연동 방향
메뉴개발노트는 테스트 기록 중심, 원가계산은 정식 원가 관리 중심으로 역할을 분리한다.

향후 메뉴개발노트에서는 사용자가 재료명과 사용량을 입력하면
식자재 단가표의 g·개당 단가를 불러와 간이 재료 원가를 계산해 보여주는 방향을 검토한다.

예:
```
피자소스 50g 입력 → 식자재 단가표의 피자소스 g당 단가 조회 → g당 단가 × 50 → 해당 재료 원가 표시
```

이 기능은 테스트 단계의 간이 원가 확인용이며, 정식 메뉴 원가표를 대체하지 않는다.

### 안정성 우선 원칙
1. 안정성 → 2. 버그 최소화 → 3. 용량 최소화 → 4. 기능 확장

구현 원칙:
- 기존 제때 상품 가격 비교 모듈과 충돌 금지
- 가격 데이터 이중 저장 금지
- 기존 정상 기능 불필요 수정 금지
- 계산 로직과 UI 분리
- 자동 계산보다 검증 우선
- 단가 미연동, 단위 불일치 발생 시 오계산 방지 우선
- 업로드 시 즉시 반영 금지, 미리보기 후 반영
- 종합 원가표는 세부 원가표 기반 자동 산출
- 입력 데이터가 최신본으로 교체될 때도 사용자 확인 절차를 반드시 둔다.
- 메뉴판매량, 제때상품가격, 제때출고량, 메뉴개발노트 모듈과 서로 import하지 않는다.

### 원가 계산 정밀도 규칙

원가 계산에서 부동소수점 오차를 방지하기 위한 표준 규칙이다. 모든 계산 함수는 다음 원칙을 따른다.

#### 기본 원칙
1. **모든 금액은 원(₩) 단위 정수**: 소수점 이하는 존재하지 않음
2. **중간 계산값은 반올림하지 않음**: 오차 누적 방지
3. **최종 결과만 반올림**: Math.round() 사용

#### 계산 함수 표준
```javascript
// ❌ 나쁜 예: 중간 계산값을 반올림하면 오차 누적
const price = 1000;
const tax = Math.round(price * 1.1);      // 1100
const totalWithExtra = Math.round(tax * 1.05); // 1155 (누적 오차 가능)

// ✅ 좋은 예: 최종 결과만 반올림
const price = 1000;
const totalWithExtra = Math.round(price * 1.1 * 1.05); // 1157.5 → 1158
```

#### 부가세 계산
```javascript
function calculateWithTax(price, taxType) {
  if (taxType === '과세') {
    return Math.round(price * 1.1);
  }
  return price; // 면세
}
```

#### 단가 계산
```javascript
function calculateUnitPrice(totalAmount, quantity) {
  if (quantity === 0) throw new Error('수량은 0이 될 수 없습니다');
  // 나눗셈 결과는 소수이므로 반올림 필요
  return Math.round(totalAmount / quantity * 100) / 100; // 소수점 2자리 유지
}
```

#### 합계 계산
```javascript
function sumItems(items) {
  // 모든 중간값을 합산 후 마지막에 한 번만 반올림
  const sum = items.reduce((acc, item) => acc + item.price, 0);
  return Math.round(sum);
}
```

#### 소수점 자릿수 정책
- **금액 전시**: 정수만 표시 (예: 1,234원)
- **계산 중간값**: 필요시 소수점 2~3자리 유지 (내부 계산용)
- **DB 저장**: 원 단위 정수만 저장
- **CSV 다운로드**: 원 단위 정수로 표시

#### 반올림 규칙
- **표준 반올림** (0.5 이상 올림): `Math.round()`
- **절사** (소수점 이하 버림): `Math.floor()`
- **올림** (소수점 이상 올림): `Math.ceil()`

회계상 표준은 반올림(Math.round)이므로, 별도 지시 없으면 Math.round 사용.

#### 검증 및 알림
- 계산 결과가 이상 범위(예: 음수, 매우 큰 값)이면 UI에 경고 표시
- 소수점 이하가 발생한 계산은 로그 남기기 (디버깅용)

---

## 개발 실수 방지 체크리스트 (우선순위: 필수)

> Phase 9 CSV 다운로드 구현 중 발생한 실수들을 정리. 모든 작업에서 아래 원칙을 1순위로 적용.

### ❌ 금지: 동시에 여러 파일 수정
**과거 문제**:
- 7개 파일을 동시에 수정 및 적용 → JavaScript 실행 오류 → 전체 사이트 "로딩중" 상태 → 모든 버튼 동작 불가
- 원인: 동시 수정으로 인한 import 경로 오류 또는 syntax 오류 발생

**해결 규칙**:
1. **1개 파일씩만 수정**. 절대 동시에 여러 파일 수정 금지.
2. 수정 후 **반드시 테스트 확인** 후 다음 파일로 진행.
3. 테스트 패턴을 먼저 1개 파일에서 검증 후 나머지 파일에 적용.

**구체적 절차** (Phase 9 예시):
```
[성공하는 패턴]
1. cost-manage-ingredient-ui.js 수정 → 테스트 ✓ 확인
2. cost-manage-price-ui.js 수정 → 테스트 ✓ 확인  
3. cost-manage-pizza-detail-ui.js 수정 → 테스트 ✓ 확인
... (이런 식으로 순차 진행)

[실패했던 패턴]
7개 파일 동시 import 추가 + 동시 버튼 코드 추가 → 테스트 ✗ 사이트 전체 충돌
```

### ❌ 금지: 테스트 없이 진행
**과거 문제**:
- 여러 파일 수정 후 마지막에 한 번만 테스트 → 이미 문제 발생한 상태에서 원인 파악 어려움
- 어느 파일에서 오류가 났는지 추적 불가

**해결 규칙**:
1. **파일 수정 직후 즉시 테스트**. 다음 파일로 넘어가기 전 확인 필수.
2. 사용자에게 테스트 확인 요청 후 OK 받을 때까지 다음 단계 진행 금지.
3. 테스트 항목:
   - 해당 기능 정상 작동 여부
   - 기존 기능 영향 (회귀 테스트) — 특히 사이트 로딩 상태 정상 여부
   - import 경로 오류 없는지 (Console 오류 확인)

### ❌ 금지: 신중함 없이 빠른 진행
**과거 문제**:
- 사용자가 "앞으로 신중하게 진행해줘"라고 명시했음에도 이전 속도 유지 시도
- 여러 파일을 빠르게 한 번에 수정하려고 함

**해결 규칙**:
1. **"신중하게 진행"은 최우선 지시사항**. 속도가 아니라 안정성을 우선.
2. 한 번에 1개 파일만 수정.
3. 각 단계마다 사용자 확인 대기.
4. 서두르지 말 것. 이전 실패 경험이 있으면 추가로 신중하게.

### ✅ 필수: 단일 파일 단위 작업 흐름
**올바른 진행 순서**:
```
Step 1. 첫 번째 파일(A) 수정
        └─ import 추가 + 기능 코드 추가

Step 2. A 파일 테스트
        └─ 사용자 확인: "작동하나?"

Step 3. A 확인 완료 후 → B 파일 수정 진행
        └─ 위와 동일 패턴 반복

...계속 C, D, E... 파일도 동일 방식
```

### ✅ 필수: import 경로 검증
**주의 항목**:
- import 문법: `import { func } from '../../common/download.js';` (따옴표, 경로 정확성)
- 파일 확장자 포함: `.js` 반드시 포함
- 상대 경로: `../` 단계 정확히 확인 (ui 파일 기준 common은 `../../common/`)

### ✅ 필수: 사이트 정상 작동 확인
**테스트 항목**:
1. 전체 사이트 로딩 (준비중 화면 → "로딩중" 상태에서 벗어나는지)
2. 해당 탭 버튼 클릭 가능 여부
3. 새로 추가한 기능 (예: CSV 버튼) 작동 여부
4. 브라우저 Console 오류 확인 (F12 → Console 탭)

---

**요약**: 
- 🚫 여러 파일 동시 수정 절대 금지
- 🚫 테스트 없이 진행 절대 금지  
- 🚫 신중하라는 지시 무시 절대 금지
- ✅ 1파일 → 테스트 ✓ → 다음파일 반복
- ✅ 매 단계마다 사용자 확인 대기
