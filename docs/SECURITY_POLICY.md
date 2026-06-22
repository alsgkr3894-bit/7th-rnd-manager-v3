# 보안 정책 (Security Policy)

> 이 앱은 단일 사용자 또는 소규모 팀의 **내부 관리 도구**입니다.  
> 외부 네트워크에 노출할 경우 별도의 서버 인증 레이어가 필요합니다.

---

## 1. 인증 모델

- 역할: `admin`(관리자) / `viewer`(조회자) 2종.
- 활성 계정 조회: `getActiveRole()`(`lib/auth/accounts.js`) — IndexedDB `ref_accounts` 조회. 계정 0개이면 `'admin'` 폴백(신규 설치 보호), DB 오류 시 `'viewer'` 폴백(fail-closed).
- 클라이언트 사이드 전용 구현. 서버가 없으므로 JWT/세션 없음.

---

## 2. 권한 가드 정책

### 2-1. defense-in-depth 원칙

UI `disabled`에만 의존하지 않고 **실행함수 레이어에도 viewer 차단**을 두어 프로그래밍적 우회를 방지한다.  
공용 헬퍼: `assertActiveAdmin(actionLabel)` (`lib/auth/guard.js`).

### 2-2. 실행함수 가드 적용 대상

| 영역 | 함수 |
|------|------|
| 계정 | `addAccount` / `updateAccount` / `deleteAccount` |
| 메뉴마스터 | `upsertMenuMaster` / `deleteMenuMaster` / `resetAllMenuMaster` / `seedMenuMaster` / `syncMenuMasterFromPrices` / `pushMasterToPrices` / `importPricesToMaster` |
| 식자재 | `addIngredient` / `updateIngredient` / `upsertIngredientMeta` / `seedMasterIngredients` / `deleteIngredient` / `bulkDeleteIngredients` / `excludeIngredientByCode` / `restoreIngredientByCode` / `bulkSetDiscontinued` / `bulkSetCategory` / `removeCategoryFromAll` / `removeTagFromAll` / `removeManyTagsFromAll` / `renameCategoryInAll` / `renameTagInAll` / `resetAllIngredients` / `repairIngredientProductCodeDuplicates` / `bulkImportIngredients` |
| 원가/판매가 | `addMenuPrice` / `updateMenuPrice` / `deleteMenuPrice` / `resetAllMenuPrices` / `replaceAllMenuPrices` / `saveRecipeGroup` / `deleteRecipeGroup` / `addSupplier` / `updateSupplier` / `deleteSupplier` / `saveSnapshot` / `deleteSnapshot` |
| 엣지/도우 | `upsertEdge` / `deleteEdge` / `seedEdges` / `resetAllEdges` |
| 판매량 | 사용자 alias/rule/excluded CRUD / 판매량 업로드 저장·삭제·재분류 / 미매칭 issue resolve·bulk resolve |
| 영양/원산지 | 영양 values 저장·삭제·수리 / `upsertOrigin` / `deleteOrigin` / `clearAllOrigins` |
| 메뉴 레시피/샘플 | `upsertMenuRecipe` / `deleteMenuRecipe` / `resetAllMenuRecipes` / `addSample` / `updateSample` / `deleteSample` |
| 복원 | `importAllToBrand` |
| 시스템 | `handleReset` / `handleRecreate` (시스템 설정 핸들러) |

### 2-3. 실행함수 가드 제외 대상

| 대상 | 이유 |
|------|------|
| 저수준 DB 프리미티브 (`clearStore` / `deleteDatabase`) | 정상 경로에서도 호출됨 — 상위 함수에서 가드 |
| Export 함수 (`exportAllForBrand` 등) | 비파괴 (읽기전용) |
| `seedDefaultAdminIfEmpty` | 초기화 전용 — 호출 시점에 항상 계정 0개 |

### 2-4. sync 함수 가드 정책

#### §2-4-1 sync 브랜드 메타 함수 — 실행함수 가드 보류

`upsertBrand` / `setBrandHidden` / `setDefaultBrandId` (`lib/brand-master.js`)은 **실행함수 레이어** `assertActiveAdmin` 가드를 두지 않는다.

**사유:**

1. **비파괴적**: localStorage의 브랜드 메타(이름·색상·숨김 여부)만 편집. IndexedDB 데이터 손실 없음.
2. **sync 함수**: `assertActiveAdmin`은 async. sync 함수를 async로 전환하면 모든 호출부 변경 + 광범위 회귀 위험.
3. **UI 가드로 충분**: `app/settings/brands/page.jsx`가 이미 `useCurrentRole`로 viewer의 편집 UI를 완전히 숨긴다. `role-gating-source.test.mjs`가 이를 구조 테스트로 강제.
4. **승격 조건**: 브랜드 편집이 파괴적 작업(DB 삭제 등)으로 확장될 경우 재검토한다.

---

## 3. CSV / 파일 보안

- `rowsToCsv` (`lib/download.js`): `=`, `+`, `-`, `@`, TAB, CR로 시작하는 셀 값에 작은따옴표 접두사 삽입 (수식 인젝션 방지).
- `downloadCsv(rows, fileName)` 경유 시 자동 적용. `downloadCsvText` 직접 호출은 보호 없음 — 내부 사용 금지.

---

## 4. 알려진 제한 사항 (외부 배포 시 필요한 추가 조치)

1. **서버 인증 없음**: 클라이언트 JS 수정으로 역할 우회 가능. 외부 배포 시 서버 세션/JWT 레이어 추가 필요.
2. **IndexedDB 직접 접근**: 브라우저 DevTools로 DB 조작 가능. 내부 도구 전제.
3. **PIN/비밀번호 클라이언트 저장**: bcrypt 없이 단순 해시. 내부 접근 제어 수준.
