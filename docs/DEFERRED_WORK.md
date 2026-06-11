# 보류된 작업 목록 (Deferred Work)

> 이 파일이 미루어진 모든 작업의 단일 출처입니다.  
> 구현 완료 시 상태를 `✅ 완료` 로 변경하고 완료일을 기입하세요.

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

## 1. 구조 변경 (고위험)

### 1-1. 메뉴마스터 삭제 cascade  🔴 ⏸
- **파일**: `lib/cost/menu-master.js`, `lib/nutrition/`, `lib/sales/`
- **문제**: `deleteMenuMaster`는 `menu_master` store만 삭제. 원가(`cost_recipes`)·영양(`nutrition_menu_ref`)·판매량(`sales_rows`)에 orphan 레코드가 남음.  
  현재는 삭제 다이얼로그에서 경고 표시만 함.
- **해결 방향**: 삭제 전 관련 store orphan 목록 미리보기 → ConfirmDialog → 동적 import로 각 모듈 cascade 삭제.
- **왜 보류**: 여러 store 동기 삭제는 트랜잭션 범위 조율 필요. 잘못 구현 시 정상 데이터 소실 위험.
- **관련 메모리**: [[db-write-footguns]]

### 1-2. 피자 카테고리 판정 통합  🔴 ⏸
- **파일**: `lib/cost/category-policy.js`, `lib/cost/crust-config.js`, `lib/cost/menu-categories.js`(레거시), `lib/cost/values/store.js`의 `_isPizzaMenu`
- **문제**: `isPizzaCategory` 판정 로직이 4곳에 분산. 1인피자 포함 여부 옵션도 갈림. 단일화하면 집계 결과(원가·판매량)가 달라질 수 있음.
- **해결 방향**: `category-policy.js` 기준으로 단일 `isPizzaCategory(cat, opts)` 함수 통합 → 나머지 3곳은 해당 함수 import로 교체.
- **왜 보류**: 집계 결과 변경 위험. 브랜드별 카테고리 정책 차이 확인 필요.

---

## 2. 데이터 정합성

### 2-1. 알레르기 링크 테이블(legacy) 정리  🟡 ⏸
- **파일**: `lib/db/init.js` store 목록, `lib/nutrition/allergen/`
- **문제**: `nutrition_allergy_links` store가 legacy로 남아 있음. `saveIngredientAllergens`는 **호출처 없음**. 실제 알레르기 입력·집계는 `cost_ingredients.allergens` 기준으로 일관 동작.  
  대시보드 통계 1곳에서 best-effort 읽기 + 식자재 삭제 cascade만 사용.
- **해결 방향**: `nutrition_allergy_links`를 read 경로에서 완전 제거하고 `cost_ingredients.allergens`로 일원화. `saveIngredientAllergens` 및 관련 코드 제거.
- **현재 상태**: 활성 손상 없음. 주석/문서 정정 완료(보류 기록). 테이블은 보존.
- **왜 보류**: 통계 집계 코드 수정 범위 파악 필요. 브랜드별 알레르기 데이터 구조 확인 후 진행.

### 2-2. 영양성분·식자재 중복 진단 UI 노출  🟢 ⏸
- **파일**: `lib/nutrition/diagnostics.js`, `lib/cost/diagnostics.js` (유틸 보유)
- **문제**: `repairNutritionDuplicates`, `buildIngredientDiagnostics` 같은 진단·복구 유틸이 있지만 UI에서 실행할 수 없음. 중복 감지 시 사용자가 직접 해결 불가.
- **해결 방향**: 설정 > 데이터 관리 화면에 "중복 진단" 버튼 추가 → 결과 미리보기 → 수동 정리.
- **왜 보류**: UI 설계 필요. 우선순위 낮음(발생 빈도 낮음).

### 2-3. 업로드 중복 파일 진단 UI  🟢 ⏸
- **파일**: `lib/sales/dedupe.js`, `lib/sales/diagnostics.js`
- **문제**: 같은 날짜 파일 재업로드 시 `dedupeUploadRows` 처리는 되나 사용자가 중복 상태를 확인할 수 없음.
- **해결 방향**: 판매량 업로드 페이지에 중복 파일 배지 또는 경고 표시.

---

## 3. 리팩토링

### 3-1. useDBLoad 전면 확산  🟡 ⏸
- **파일**: 직접 `getAll()`·`initDB()` 호출하는 페이지 다수
- **문제**: 일부 페이지는 `useDBLoad` 대신 useEffect + 직접 DB 호출 패턴 사용. 에러 핸들링·로딩 상태 누락.
- **해결 방향**: 각 페이지를 `useDBLoad` 패턴으로 통일. B2(에러 UI)와 함께 진행.
- **왜 보류**: 변경 범위 넓음. 회귀 위험 > 현재 효과. 안전 우선.
- **관련 메모리**: [[deferred-refactors]]

### 3-2. 대형 컴포넌트 분해  🟡 ⏸
- **파일**: `app/note/calendar/page.jsx`(900줄+), `app/ingredient/list/page.jsx`(800줄+) 등
- **문제**: 단일 파일이 너무 커서 유지보수 어려움.
- **해결 방향**: 기능별 서브컴포넌트 분리. 상태 관리 훅 추출.
- **왜 보류**: 효과 < 회귀 위험. 기능 추가 시점에 함께 진행 예정.
- **관련 메모리**: [[deferred-refactors]]

---

## 4. 분류·재분류

### 4-1. filterTargetRows 신규 대상 재분류 한계  🟡 ⏸
- **파일**: `lib/sales/resolve.js`, `lib/sales/use-unmatched-issues.js`
- **문제**: `filterTargetRows`는 기존 업로드 행의 재분류는 지원하지만, 규칙 추가 후 **신규 대상(이전엔 미분류)**이었던 행은 재업로드해야만 반영됨.
- **해결 방향**: `reclassifyAllFiles` 실행 시 미분류 행도 재시도하도록 로직 확장. 또는 "전체 재처리" 옵션 추가.
- **관련 메모리**: [[classification-staleness]]

---

## 5. 기타

### 5-1. 피자 슬라이스 시트 satFat 레거시 참조 확인  🟢 ⏸
- **파일**: `lib/nutrition/label/build.js`의 `buildPizzaSliceSheet`
- **현황**: QA R2에서 `satFat → fat` 변환 완료. 추가 레거시 참조가 있는지 확인 필요.
- **해결 방향**: 전체 코드베이스 `satFat` grep 후 잔존 참조 정리.

### 5-2. 판매 분류 미반영 구간 안내  🟢 ⏸
- **파일**: `app/menu-sales/unmatched/page.jsx`, `components/sales/UnmatchedTable.jsx`
- **문제**: A3에서 재분류 취소 시 규칙은 저장되었으나 기존 파일은 구버전 분류 유지. 사용자가 이 상태를 모를 수 있음.
- **해결 방향**: 미매칭 페이지 또는 설정 페이지에 "분류 재반영 미실행" 배지/경고 표시.

---

_최종 업데이트: 2026-06-12_
