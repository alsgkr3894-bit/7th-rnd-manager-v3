# 보안 정책 (Security Policy)

> 이 앱은 단일 사용자 또는 소규모 팀의 **내부 관리 도구**입니다.  
> 인터넷에 노출하지 않습니다. 이 PC에서의 사용을 기준으로 합니다.

---

## 1. 인증 모델

### 1-1. 서버 로그인 (2026-11-27 기준)

| 항목 | 동작 | 코드 |
|---|---|---|
| 확인 방식 | 일회용 challenge에 대한 응답. 비밀번호는 최초 설정·변경 때만 보낸다 | `lib/server/session-auth.js` |
| 비밀번호 규칙 | 4~128자, 서버가 검사 | `lib/auth/password-policy.js` |
| 최초 설정 | 운영 PC + 설치 토큰(`.runtime-auth.json.setup-token`), 한 번만 | 〃 |
| 실패 제한 | 5회 연속 실패 시 15분, `429`. 서버를 다시 시작해도 유지 | `lib/server/login-guard.js` |
| 세션 | 서명한 HttpOnly·SameSite=Strict 쿠키. 12시간, "30일 유지"는 30일 | `session-auth.js` |
| 세션 해제 | 비밀번호 변경 또는 [모든 로그인 해제]에서 전부 무효 | 〃 |
| 화면 보호 | `proxy.ts`가 서명·만료·세션 버전을 확인 | `proxy.ts` |
| API 보호 | 모든 DB API가 출처(`request-guard.js`)와 세션을 확인 | `app/api/db/*` |
| 상태 파일 | `.runtime-auth.json` + 같은 내용의 `.bak`. 손상되면 새로 만들지 않고 안내 | `lib/server/auth-state.js` |

**비밀번호를 잊었거나 파일이 손상된 경우** (운영 PC):

1. 손상: `.runtime-auth.json.bak`을 `.runtime-auth.json`으로 복사한다.
2. 잊음: `.runtime-auth.json`과 `.runtime-auth.json.bak`을 모두 지우고 사이트를 연 뒤,
   `.runtime-auth.json.setup-token`의 값으로 새로 설정한다. 업무 데이터는 그대로다.

### 1-2. 화면 안의 역할 (`admin` / `viewer`)

- 활성 계정 조회: `getActiveRole()`(`lib/auth/accounts.js`) — IndexedDB `ref_accounts` 조회. 계정 0개이면
  `'admin'` 폴백(신규 설치 보호), DB 오류 시 `'viewer'` 폴백(fail-closed).
- **서버는 역할을 모른다.** 로그인한 사람은 한 명(공용 비밀번호)이고, 역할은 실수를 줄이는 화면 장치다.
  두 번째 사용자를 추가하기 전에 서버 계정·역할이 필요하다(점검 8단계).

### 1-3. 응답 헤더 (`next.config.mjs`)

- CSP: 같은 출처만 허용(스크립트·연결·폼). 인라인 스크립트·스타일은 허용하며, 외부 연결은
  `api.ipify.org`([IP 조회] 버튼) 하나다.
- API 응답 `Cache-Control: no-store`, `X-Powered-By` 없음, 프레임 삽입 차단.

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
| Export 함수 (`exportAllForBrand` 등) | 비파괴 (읽기전용). 단 민감 store가 포함될 수 있는 `exportSelectedForBrand`(`lib/db/backup.js`)는 마지막 방어선으로 `assertActiveAdmin`을 둔다(2026-10-08 정정) |
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

## 4. 알려진 제한 사항

1. **HTTPS 없음**: 이 PC에서만 접속한다. 다른 PC에 열기 전에 `docs/LAN_HTTPS_SETUP_2026-11-27.md`를 따른다.
2. **서버 역할 인증 없음**: 위 1-2.
3. **외부 로그인정보·법인카드는 평문**: 브라우저와, 직접 켜서 받은 백업 파일에 남는다.
   계획: `docs/SENSITIVE_DATA_ENCRYPTION_PLAN_2026-11-27.md`.
4. **IndexedDB 직접 접근**: 브라우저 개발자 도구로 읽고 바꿀 수 있다.
5. **파일 권한**: 사이트 폴더의 파일(`.env`, `.runtime-auth.json`, `.db-backups`)은 상위 폴더 권한을 물려받는다.
   Windows 계정과 그 폴더 권한을 가진 프로그램은 읽고 바꿀 수 있다.
6. **다른 드라이브의 백업 사본**은 암호화하지 않은 DB 덤프다. USB를 분실에 대비하려면 BitLocker를 켠다.
7. 인라인 스크립트를 허용하므로 CSP는 화면에 주입된 인라인 코드까지는 막지 못한다.
