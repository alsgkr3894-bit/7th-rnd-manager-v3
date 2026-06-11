# 다음 작업: 원가계산 관리 탭 기능 강화

## 해결 완료: 코드 연결성/정합성 감사 결과 (2026-06-11)

2026-06-10에 정리한 CL1~CL8 연결성/정합성 이슈는 모두 코드 반영과 검증을 완료했습니다.
이 섹션은 재발 방지 기준과 추후 확인용 이력으로 유지합니다.

### 완료 요약

| 코드 | 해결 결과 | 커밋 |
| --- | --- | --- |
| CL1 | 영양 메뉴 참조와 원시 영양값을 `menuCode`, `menuCode+crustType` 기준으로 중복 진단/정리하고, 저장 경로에서 조용한 덮어쓰기를 방지했습니다. | `4ff4941 fix: prevent duplicate nutrition base records` |
| CL2 | 알레르기 링크 기준을 식자재(`ingredientId`, `productCode`) 중심으로 정리하고, 메뉴 삭제가 알레르기 링크를 잘못 cascade 삭제하지 않게 수정했습니다. | `d5a0b9f fix: align allergy links with ingredient data` |
| CL3 | 식자재 `productCode` 중복 진단/복구 UI와 저장/수정/벌크 임포트 방어 로직을 추가했습니다. 기존 씨드/임포트 데이터도 대표 코드 기준으로 정리되게 했습니다. | `5df8e34 fix: guard ingredient product code duplicates` |
| CL4 | 합산 식자재 가격 계산을 `resolveCompositePrice()`로 공통화하고, 엄격 계산과 부분 계산 정책을 명시했습니다. | `3f7b509 fix: unify composite ingredient price policy` |
| CL5 | 원가 상세 레시피 store의 `menuCode` 인덱스 선언을 공통화하고 personal/side/set detail 인덱스 마이그레이션을 추가했습니다. | `fc7063a fix: add menu code indexes to cost detail stores` |
| CL6 | 메뉴코드 base/full 정책을 `normalizeMenuCodeForModule()`과 `MenuCodePicker mode`로 명시해 영양/원가 모듈별 기준이 섞이지 않게 했습니다. | `bdd3cd7 fix: clarify menu code base policy` |
| CL7 | 피자/사이드/음료/토핑/세트 카테고리 판정을 공통 resolver로 통합해 원가, 영양, 식자재 사용처가 같은 기준을 쓰게 했습니다. | `fc90148 fix: centralize menu category policy` |
| CL8 | 제때 가격 업로드와 조회 경로에서 같은 파일 내 `productCode` 중복 행을 진단/정리하고, 가격 lookup이 마지막 행으로 조용히 덮이지 않게 했습니다. | `9c8014e fix: dedupe price rows by product code` |

### 완료 검증

- 관련 테스트 묶음: 21개 suite, 136개 test 통과
- 전체 테스트: 125개 suite, 723개 test 통과
- `npm run lint`: ESLint 경고/오류 없음
- `npm run build`: Next.js production build 성공
- `npm run qa:smoke`: 주요 화면 22개 route 통과, 콘솔 오류 0건

### 후속 유지 기준

- `menuCode`, `productCode`, `category`, `compositeOf`처럼 모듈을 연결하는 기준값은 공통 정책 파일을 먼저 확인합니다.
- `find()` 또는 `Map.set()`으로 한 행만 고르는 저장/조회 경로는 중복 진단 또는 dedupe helper를 먼저 거치게 합니다.
- IndexedDB 스키마 변경은 새 버전 마이그레이션과 관련 read/store 테스트를 같이 추가합니다.
- 화면에서 사용자가 데이터 정리를 실행하는 기능은 자동 삭제 없이 진단 결과와 명시적 정리 액션을 제공합니다.

## 완료 전 조사 원문: 코드 연결성/정합성 감사 결과 (2026-06-10)

식자재코드, 메뉴코드처럼 여러 모듈을 잇는 기준값을 중심으로 확인한 수정 후보입니다.
우선순위는 데이터가 조용히 덮이거나 일부 행만 수정될 가능성이 높은 항목부터 잡습니다.

### 즉시 수정 권장

| 코드 | 항목 | 확인 근거 | 수정 방향 |
| --- | --- | --- | --- |
| CL1 | 영양 메뉴/원시값 중복 방지 | `menu_master.menuCode`는 unique이지만 `nutrition_menu_ref.menuCode`, `nutrition_raw_values.menu_crust`는 일반 인덱스입니다. `upsertMenuRef()`는 그대로 `put`하고, `getRawValueMap()`은 `menuCode__crustType` 키로 마지막 행이 앞 행을 덮습니다. | `menuCode`, `menuCode+crustType` 기준 upsert 헬퍼를 공통화하고 저장 전 중복 진단/정리 UI를 추가합니다. 기존 DB에는 마이그레이션용 중복 스캔을 먼저 둡니다. |
| CL2 | 알레르기 링크 스키마와 실제 사용 기준 불일치 | `nutrition.js` 주석/인덱스는 `menuCode × allergenCode`인데, 현재 `allergen/store.js`와 마이그레이션은 `ingredientId/productCode/allergenCodes[]` 기준입니다. `deleteMenuRef()`는 아직 `menuCode`로 `nutrition_allergy_links`를 cascade 삭제합니다. | `nutrition_allergy_links`를 식자재 기준으로 확정할지, 레거시 store로 제거할지 결정합니다. 스키마 주석/인덱스/삭제 cascade를 실제 기준에 맞추고, 삭제는 식자재 삭제 경로에서만 처리되게 정리합니다. |
| CL3 | 식자재 `productCode` 중복이 실제로 발생 가능 | `cost_ingredients.productCode`는 unique가 아니고, `upsertIngredientMeta()`, 숨김/복원, 벌크 임포트는 `find()` 또는 `Map`으로 한 행만 선택합니다. 씨드에도 `CC310554`, `CC120740`, `CC120754` 중복이 확인됩니다. 반면 `nutrition_ingredient_values.productCode`는 unique입니다. | 식자재 저장/가져오기 단계에 productCode 중복 차단 또는 병합 프리뷰를 추가합니다. 기존 데이터는 중복 진단 카드에서 대표 행/병합 대상/영양값 연결 상태를 보여준 뒤 정리합니다. |
| CL4 | 합산 식자재 가격 정책 중복 구현 | 레시피 계산의 `buildUnitPriceMap()`은 `compositeOf` 구성 코드가 모두 있어야 합산하고 누락 시 수동가로 fallback합니다. 식자재 단가 페이지의 `sumCompositePrice()`는 일부 누락이어도 가능한 가격만 합산합니다. | `resolveCompositePrice()` 같은 순수 유틸로 정책을 하나로 모읍니다. 누락 구성품은 가격을 계속 보여줄지, 계산 제외할지 모드로 명시하고 테스트를 추가합니다. |

### 중간 우선순위

| 코드 | 항목 | 확인 근거 | 수정 방향 |
| --- | --- | --- | --- |
| CL5 | 원가 상세 레시피 store별 `menuCode` 인덱스 불일치 | `createDetailStore()`는 pizza/personal/side/set 모두 `menuCode`로 정렬/중복 upsert/맵 생성합니다. 하지만 스키마에서는 `cost_pizza_detail`만 `menuCode` 인덱스가 있고 personal/side/set detail에는 없습니다. | personal/side/set detail에도 `menuCode` 인덱스를 추가하고 DB 버전 마이그레이션을 작성합니다. detail store 생성 시 기대 인덱스를 한 곳에서 선언해 재발을 막습니다. |
| CL6 | 메뉴코드 base/full 해석이 모듈별로 암묵적 | `MenuCodePicker.getBaseCode()`와 영양 엑셀 import의 `getBaseCode()`가 사이즈 suffix를 제거합니다. 반대로 원가/판매가/상세 레시피는 full menuCode가 필요한 경로가 있습니다. | `normalizeMenuCodeForModule()` 또는 `MenuCodePicker mode="base/full"`로 명시합니다. 영양은 base 기준, 원가 상세는 full 기준처럼 모듈별 정책을 문서화하고 테스트합니다. |
| CL7 | 엣지/피자 카테고리 판정 하드코딩 | `ingredient-menu-map.js`의 `PIZZA_CATS`는 기존 세부 카테고리 문자열을 직접 들고 있습니다. 영양 쪽은 `피자/추가토핑/사이드/음료`로 정규화되어 있어 기준이 갈라질 수 있습니다. | 공통 카테고리 resolver 또는 `isPizzaCategory()`를 만들어 원가/영양/식자재 사용처가 같은 판단을 쓰게 합니다. |
| CL8 | 제때 가격 row 중복 시 마지막 값만 사용 | `price_rows.fileId_productCode`는 일반 인덱스이고, `savePriceUpload()`는 행을 모두 저장합니다. 최신 가격 lookup은 같은 `productCode`가 있으면 `Map.set()`으로 뒤 행이 앞 행을 덮습니다. | 가격 업로드 프리뷰에 같은 파일 내 `productCode` 중복 진단을 추가합니다. productCode가 비어 있는 행은 허용하되, 코드가 있는 중복 행은 사용자가 병합/제외 선택하도록 합니다. |

### 클린코드 정리 방향

- 기준값 정책을 `menuCode`, `productCode`, `category`, `compositeOf`별로 한 파일에 모읍니다.
- DB 스키마 주석, store helper, 화면 import가 같은 용어를 쓰게 맞춥니다.
- `find()`로 첫 행만 고르는 경로는 `getUniqueByCode()`처럼 중복을 감지하는 헬퍼로 바꿉니다.
- 중복이 발견되면 조용히 덮지 않고 UI 진단/토스트/리포트에 노출합니다.
- 스키마 변경은 기존 IndexedDB 데이터 정리 플로우를 먼저 둔 뒤 unique 인덱스 적용 여부를 결정합니다.

### 검증 기준

- 중복 `menuCode`, `menuCode+crustType`, `productCode`, `fileId+productCode` 샘플을 넣었을 때 덮어쓰기 없이 진단 결과가 표시되어야 합니다.
- 영양성분표, 원가율/마진, 식자재 사용처, 제때 단가 페이지가 같은 기준 가격/카테고리 결과를 보여야 합니다.
- 식자재 삭제/메뉴 삭제 시 알레르기/영양값 cascade가 현재 연결 기준에 맞게만 실행되어야 합니다.
- `npm run lint`, `npm test -- --runInBand`, `npm run build`를 통과해야 합니다.

## 작업 범위
**원가계산 모듈의 모든 관리 탭 (B~H)**

관리 탭 목록:
- B: 식자재 단가표 관리
- C: 메뉴 판매가 관리
- D: 엣지 & 도우 원가 관리
- E: 피자 원가 관리
- F: 1인피자 원가 관리
- G: 사이드 원가 관리
- H: 세트박스 원가 관리

## 추가할 기능

### 1. 인라인 수정 기능
**대상 컬럼:**
- 메뉴코드 (또는 항목코드)
- 메뉴명 (또는 항목명)
- 메뉴구분 (또는 카테고리)
- 판매가

**구현 방식:**
- 셀 클릭 시 편집 모드 활성화
- 인라인 입력 필드에서 수정
- Enter 또는 외부 클릭으로 저장
- 수정 후 즉시 DB 업데이트
- 토스트 메시지로 성공/실패 안내

**주의사항:**
- 필수값 검증 (메뉴명, 메뉴코드 등)
- 중복 검사 필요 시 실행
- 수정 취소 기능 (Escape 키)

### 2. 삭제 기능
**구현 방식:**
- 각 행 앞에 체크박스 추가
- "삭제" 버튼 활성화 (체크된 행 있을 때만)
- 클릭 시 인라인 확인 UI (화면 내 확인 메시지)
- "정말 삭제하시겠습니까?" → [취소] [삭제] 버튼
- 삭제 후 테이블에서 행 제거 + DB 업데이트
- 토스트 메시지로 결과 안내

**주의사항:**
- alert/confirm/prompt 사용 금지 (toast 또는 인라인 UI)
- 복구 불가능하므로 명확한 확인 문구

### 3. 컬럼 정렬 기능
**구현 방식:**
- 컬럼 헤더를 클릭 가능하게 설정
- 클릭한 컬럼으로 오름차순 정렬
- 재클릭하면 내림차순으로 변경
- 정렬 상태 표시 (▲ / ▼ 아이콘 또는 하이라이트)
- 정렬은 UI에서만 (DB 순서 변경 X)

**정렬 우선순위:**
- 문자열: 한글 초성순 또는 사전순
- 숫자: 오름차순/내림차순
- 날짜: 최신순/오래된순

## 작업 진행 순서
1. **설계 확정** — 각 기능의 세부 UI/UX 검토
2. **공통 유틸 작성** — 수정, 삭제, 정렬 로직 (한 번만 작성 후 재사용)
3. **각 관리 탭에 적용** — B~H 순서로 적용
4. **테스트** — 각 탭별 기능 검증
5. **병합** — git commit

## 참고사항
- 모든 기능은 toast 메시지로 결과 안내 (alert/confirm 금지)
- 파괴적 작업(삭제)은 화면 내 인라인 확인 UI 필수
- 기존 DB 자동 삭제 금지, 사용자 명시적 확인 후만 삭제
- 모듈 간 import 금지, 원가계산 모듈 내 자체 포함만 허용
