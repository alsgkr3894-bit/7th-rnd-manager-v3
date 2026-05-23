# MS-0: 메뉴판매량 모듈 — 설계 확정 및 기존 구조 점검

**작성일**: 2026-05-19  
**범위**: 설계 검토만 수행 (코드 수정/DB 적용 없음)

---

## 1️⃣ 현재 코드 구조 진단

### 1.1 기존 메뉴판매량 모듈 상태

#### 파일 구성
```
src/modules/menu-sales/
├── menu-sales.js                   (진입점 + 초기화 조율)
├── menu-sales-upload-ui.js         (업로드 UI, 파일 드롭존, 검증)
├── menu-sales-rank-ui.js           (순위 UI, 실시간 집계, 필터링, 렌더링)
├── menu-sales-compare-ui.js        (비교 UI, 2개월 비교, 변화율 계산)
├── menu-sales-unmatched-ui.js      (미매칭 관리 UI) ⚠️ 불완전
└── menu-sales-settings-ui.js       (설정 UI, 카테고리 룰 관리)
```

#### 현재 구현 특성

**✅ 완료된 부분**:
- 파일 업로드 UI (드롭존, 검증 기본 로직)
- 순위 계산 및 렌더링 (aggregateRankData 순수함수)
- 비교 계산 및 렌더링 (aggregateCompareData, 2개월 차이/변화율)
- 카테고리 룰 관리 UI (설정 탭)
- 미매칭 이슈 UI 표시 (showActionModal)

**❌ 불완전한 부분**:
1. **menu-sales-unmatched-ui.js** 저장 기능 미구현
   - showAliasPanel/showRulePanel/showExcludePanel 함수들이 UI만 표시
   - "저장" 버튼에 `toast.success()`는 있지만 실제 `await put()` 없음
   - 저장 후 sales_rows 재분류 처리 없음
   - menu_sales_issues 상태 업데이트 없음

2. **menu-sales.js** 구조 부족
   - 초기화 순서: 업로드만 즉시 실행, 나머지는 탭 전환 시 지연 로드
   - 각 탭별 초기화 플래그 있음 (_isInitialized)
   - 하지만 hash 기반 확인 제거됨 (최근 변경)
   - 중복 로드 방지는 플래그로 구현되어 있음 ✓

3. **파일/행 데이터 저장 정책 명확화 필요**
   - sales_files: 업로드 파일 메타 (year, month, rowCount 등)
   - sales_rows: 파싱된 행 데이터 (fileId, groupName, category, quantity, status)
   - status 컬럼: 'classified'만 집계에 포함
   - 아직 DB에는 저장되지 않는 구조 (메모리만 사용)

### 1.2 DB 스키마 현재 상태

```javascript
// db.js 현재 정의
sales_files: {
  keyPath: 'id',
  indexes: [
    { name: 'year_month', keyPath: ['year', 'month'] }
  ]
}

sales_rows: {
  keyPath: 'id',
  indexes: [
    { name: 'fileId', keyPath: 'fileId' },
    { name: 'category', keyPath: 'category' },
    { name: 'normalizedMenuName', keyPath: 'normalizedMenuName' },
    { name: 'year_month', keyPath: ['year', 'month'] },
    { name: 'status', keyPath: 'status' }
  ]
}

menu_sales_issues: {
  keyPath: 'id',
  indexes: [
    { name: 'fileId', keyPath: 'fileId' },
    { name: 'issueType', keyPath: 'issueType' },
    { name: 'status', keyPath: 'status' },
    { name: 'year_month', keyPath: ['year', 'month'] }
  ]
}

sales_rules, ref_sales_aliases, ref_excluded: {
  // 이미 정의되어 있음
}
```

**현재 상태**: DB_VERSION = 6, 스키마는 기본 구조 갖춤 ✓

### 1.3 app.js 통합 상태

```javascript
// Step 3: 병렬 초기화에 포함
setupMenuSalesModule()  // 즉시 로드 (lazy → eager로 변경됨)

// Step 5-1: 지연 로드 (현재는 미사용)
// loadMenuDevNote(), loadReportModule() 만 있음
```

**현재 상태**: setupMenuSalesModule() 즉시 실행으로 변경됨 (2026-05-19 변경) ✓

### 1.4 router.js 연동 상태

```javascript
// router.js: activate() 함수 마지막에서
window.dispatchEvent(new CustomEvent('router:tab', { detail: { tabId: target } }));

// menu-sales.js: 리스너 등록
window.addEventListener('router:tab', ({ detail: { tabId } }) => {
  if (tabId === 'menu-sales-rank') { initRankUIIfNeeded(); }
  if (tabId === 'menu-sales-compare') { initCompareUIIfNeeded(); }
  if (tabId === 'menu-sales-unmatched') { initUnmatchedUIIfNeeded(); }
  if (tabId === 'menu-sales-settings') { initSettingsUIIfNeeded(); }
});
```

**현재 상태**: router:tab 이벤트 시스템 작동 ✓

---

## 2️⃣ 정책 수용 가능성 평가

### 2.1 설계 명세서 요구사항 vs 현재 구현

| 요구사항 | 현재 구현 | 수용 가능성 | 비고 |
|---------|---------|-----------|------|
| **MS-1: 파일 업로드** | 기본 업로드 UI 있음 | ✅ 70~80% | 파일 해시 검증, 중복 확인 필요 |
| **MS-2: 데이터 파싱** | 미구현 | ✅ 0% | 엑셀/CSV 파싱 로직 필요 (price-parse.js 참고) |
| **MS-3: 정규화 & 분류** | 불완전 | ⚠️ 30% | normalizeProductName 있음, groupName/category 할당만 남음 |
| **MS-4: 미매칭 감지** | UI만 있음 | ⚠️ 20% | menu_sales_issues 쿼리 있음, 자동 감지 로직 없음 |
| **MS-5: 순위 집계** | 완료 | ✅ 95% | aggregateRankData 순수함수 작동 |
| **MS-6: 비교 집계** | 완료 | ✅ 95% | aggregateCompareData 순수함수 작동 |
| **MS-7: 미매칭 관리** | UI만 있음 | ❌ 0% | alias/rule/exclude 저장 미구현 |
| **MS-8: 설정 관리** | 기본 구조 있음 | ✅ 60% | DB 저장은 되지만 반영 로직 불완전 |
| **통계 & 대시보드** | 미구현 | ✅ 0% | 향후 단계 |

**종합 평가**: 
- **즉시 가능 (MS-5, MS-6)**: 순위, 비교 UI는 기본 작동함
- **부분 가능 (MS-1, MS-8)**: 업로드, 설정 UI는 있으나 완성 필요
- **재구현 필요 (MS-2, MS-3, MS-4, MS-7)**: 파싱, 정규화, 미매칭 감지, 룰 저장 로직 필수

### 2.2 기존 아키텍처 수용 가능성

**✅ 기존 패턴 재사용 가능**:
1. **분리 구조**: price.js, shipment.js 모두 parse → calc → store → ui 패턴 사용
   - menu-sales도 동일 패턴 적용 가능 ✓

2. **IndexedDB 통합**: 기존 db.js에 stores 추가 가능
   - 새로운 DB_VERSION 업그레이드로 처리 ✓

3. **모듈 간 독립성**: 메뉴판매량은 가격/출고량과 무관
   - import 충돌 없음 ✓

4. **라우팅 & 이벤트**: router:tab CustomEvent 시스템 이미 작동
   - menu-sales.js 리스너 등록되어 있음 ✓

5. **UI 렌더링**: renderTable 헬퍼 함수 이미 존재
   - 순위/비교 테이블 사용 중 ✓

**⚠️ 주의 필요한 부분**:
1. **중복 정규화 로직**: normalizeProductName vs normalizeMenuName 구분 필요
   - 상품명 정규화 vs 메뉴명 정규화는 다를 수 있음
   
2. **Transaction 처리**: 파일 삭제 시 cascade 처리 필요
   - sales_files 삭제 → sales_rows 삭제 → menu_sales_issues 정리
   - runTransaction() 활용 가능 ✓

3. **메모리 vs DB 저장**: 순위/비교는 메모리 계산, 규칙/설정은 DB 저장
   - 정책 혼동 가능성 있음

---

## 3️⃣ 권장 DB 설계안

### 3.1 추가/수정 필요 Stores

#### 신규: sales_parse_log (MS-2/MS-3 파싱 로그)
```javascript
{
  keyPath: 'id',
  data: {
    fileId,           // FK: sales_files
    parseDate,        // 파싱 수행 시간
    totalRows,        // 전체 행 수
    successRows,      // 성공 행 수
    failedRows,       // 실패 행 수
    errorMessages,    // 오류 메시지 배열
  }
}
```

**필요성**: 파일 파싱 실패 이력 추적 (CSV/엑셀 형식 변경 감지)

#### 신규 또는 확장: menu_sales_month_agg (선택사항, 향후 성능 최적화)
```javascript
{
  keyPath: ['year', 'month'],
  data: {
    year, month,
    totalQuantity,
    totalMenuCount,
    topMenuName,
    topMenuQuantity,
    aggregatedAt,
    dataQuality,      // 'complete', 'partial', 'incomplete'
  },
  indexes: [
    { name: 'dataQuality', keyPath: 'dataQuality' }
  ]
}
```

**필요성**: 월별 집계 결과 캐싱 (단, MS-0 설계 단계에서는 필수 아님)

#### 기존 확장: sales_rows 컬럼 추가 검토

현재 컬럼:
```javascript
{
  id, fileId, year, month,
  rowNumber,
  rawMenuName,      // 원본 메뉴명
  groupName,        // 정규화된 메뉴 그룹
  category,         // 카테고리
  quantity,
  status,           // 'raw', 'normalized', 'classified', 'rejected'
  matchedAliasId,   // FK: ref_sales_aliases (선택)
  appliedRuleId,    // FK: sales_rules (선택)
  normalizedAt,     // 정규화 완료 시간
  classifiedAt,     // 분류 완료 시간
}
```

✅ **평가**: 현재 스키마로 충분. 추가 컬럼은 선택사항.

### 3.2 DB 마이그레이션 전략

**현재**: DB_VERSION = 6
**변경 필요**: DB_VERSION = 7 (sales_parse_log 추가)

마이그레이션 코드 (db.js):
```javascript
if (dbVersion < 7) {
  db.createObjectStore('sales_parse_log', { keyPath: 'id', autoIncrement: true });
  // 기존 파일의 parse 로그는 백필링하지 않음 (선택사항)
}
```

**타이밍**: 
- MS-2 구현 단계에서 적용
- 기존 데이터와의 호환성 유지 필요
- app.js의 cleanupPriceLogsV5() 참고 (migration_flags 활용)

---

## 4️⃣ 권장 모듈 파일 분리안

### 4.1 현재 구조 vs 권장 구조

#### 현재 (불완전한 상태)
```
menu-sales/
├── menu-sales.js                  (모든 UI 초기화 통합)
├── menu-sales-upload-ui.js        (업로드 UI만)
├── menu-sales-rank-ui.js
├── menu-sales-compare-ui.js
├── menu-sales-unmatched-ui.js     (불완전)
└── menu-sales-settings-ui.js
```

#### 권장 구조 (price.js, shipment.js 패턴 따름)
```
menu-sales/
├── menu-sales.js                  ⭐ 진입점 재설계
├── menu-sales-parse.js            ⭐ 신규: 파일 파싱 로직
├── menu-sales-calc.js             ⭐ 신규: 순위, 비교 등 계산
├── menu-sales-store.js            ⭐ 신규: DB CRUD 통합
├── menu-sales-upload-ui.js        (기존 유지)
├── menu-sales-rank-ui.js          (기존 유지)
├── menu-sales-compare-ui.js       (기존 유지)
├── menu-sales-unmatched-ui.js     (수정: 저장 로직 추가)
├── menu-sales-settings-ui.js      (기존 유지)
└── menu-sales-normalize.js        (선택: 메뉴명 정규화 전용)
```

### 4.2 파일별 역할 정의

#### menu-sales.js (진입점, 약 100줄)
```javascript
// 역할: 초기화 조율, 이벤트 바인딩, 모듈 로딩 순서 관리
// 의존성: menu-sales-upload-ui, menu-sales-rank-ui, ...

export async function setupMenuSalesModule() {
  // 1. 초기화: uploadContainer 설정 (즉시)
  const uploadContainer = document.getElementById('ms-upload-ui-container');
  if (uploadContainer) {
    setupMenuSalesUploadUI(uploadContainer);
  }

  // 2. 리스너: router:tab 이벤트 -> 탭별 지연 초기화
  window.addEventListener('router:tab', ({ detail: { tabId } }) => {
    if (tabId === 'menu-sales-rank') initRankUIIfNeeded();
    // ... 나머지 탭
  });
}
```

#### menu-sales-parse.js (파싱 로직, 약 150~200줄)
```javascript
// 역할: 엑셀/CSV 파일 → sales_rows 데이터 구조로 변환
// 의존성: common/excel.js, common/normalize.js, menu-sales-normalize.js

export function parseMenuSalesFile(headers, rows) {
  // 1. 필수 컬럼 확인 (메뉴명, 판매량)
  // 2. 각 행 파싱: rawMenuName, quantity 추출
  // 3. 옵션 컬럼 확인: category 있으면 사용
  // 4. 결과: { ok: true/false, success: [...], failed: [...] }
  return {
    ok: true,
    success: [{ rowNumber: 1, rawMenuName: '..', quantity: 10, category: '..', status: 'raw' }],
    failed: [{ rowNumber: 2, reason: '판매량 값이 숫자가 아님' }],
    colMap: { menuName: 0, quantity: 1, category: 2 }
  };
}
```

#### menu-sales-calc.js (순수 계산, 약 200~250줄)
```javascript
// 역할: aggregateRankData, aggregateCompareData 등 계산 로직
// 의존성: 없음 (순수 함수)
// 주의: DB/DOM 접근 금지

export function aggregateRankData(rows) { ... }
export function aggregateCompareData(baseRows, compareRows) { ... }
export function checkUnmatchedMenus(rows, aliases) { ... }
```

#### menu-sales-store.js (DB CRUD, 약 250~300줄)
```javascript
// 역할: sales_files, sales_rows, menu_sales_issues 등의 CRUD
// 의존성: core/db.js

export async function saveMenuSalesUpload({ fileId, meta, rows }) { ... }
export async function deleteMenuSalesFile(fileId) { ... }
export async function applySalesRule(ruleId, targetRows) { ... }
export async function getUnmatchedIssues(fileId) { ... }
```

#### menu-sales-normalize.js (정규화, 약 100~150줄)
```javascript
// 역할: 메뉴명 정규화 (공백 제거, 대소문자 통일 등)
// 의존성: common/normalize.js (선택)

export function normalizeMenuName(rawName) { ... }
```

### 4.3 파일 크기 예측

| 파일 | 현재 크기 | 권장 크기 | 상태 |
|-----|---------|---------|------|
| menu-sales.js | 139줄 | 100줄 | ✅ 정리 필요 |
| menu-sales-parse.js | - | 150~200줄 | ⭐ 신규 |
| menu-sales-calc.js | - | 200~250줄 | ⭐ 신규 (기존 calc 추출) |
| menu-sales-store.js | - | 250~300줄 | ⭐ 신규 |
| menu-sales-upload-ui.js | ~150줄 | 100~150줄 | ✅ 유지 |
| menu-sales-rank-ui.js | 244줄 | 200~220줄 | ✅ 미정리 가능 |
| menu-sales-compare-ui.js | 295줄 | 250~280줄 | ✅ 미정리 가능 |
| menu-sales-unmatched-ui.js | ~200줄 | 180~220줄 | 🔧 수정 필요 |
| menu-sales-settings-ui.js | ~200줄 | 150~200줄 | ✅ 유지 |

**총합**: 약 1,800~2,200줄 → 구조상 문제 없음 ✓

---

## 5️⃣ 기존 앱과의 연동 계획

### 5.1 app.js 적용 범위

**현재 상태**:
```javascript
// Step 3: 병렬 초기화
setupMenuSalesModule(),  // ← MS-0 이후 변경 사항

// Step 5-1: 지연 로드 (현재 미사용)
```

**권장 상태** (변경 없음):
```javascript
// setupMenuSalesModule()은 Step 3에 유지
// 이유: 업로드 UI 즉시 렌더링 필요, 라우터 리스너 사전 등록 필요
```

**체크 포인트**:
- ✅ Promise.allSettled 사용으로 하나 실패해도 나머지 모듈 정상 작동
- ✅ 에러 처리: failedModules 배열로 추적
- ✅ 초기화 완료 신호: window.__APP_READY__.sales = true

### 5.2 router.js 연동

**현재 상태**:
```javascript
// router.js: activate() 완료 후
window.dispatchEvent(new CustomEvent('router:tab', { detail: { tabId: target } }));
```

**필요 변경**: 없음 ✓

**menu-sales.js 리스너**:
```javascript
window.addEventListener('router:tab', ({ detail: { tabId } }) => {
  if (tabId === 'menu-sales-rank') initRankUIIfNeeded();
  // ... 4개 탭 처리
});
```

**체크 포인트**:
- ✅ 리스너는 setupMenuSalesModule() 내에서 등록
- ✅ 탭 전환 시 이벤트 수신 확인됨
- ✅ 중복 초기화 방지 플래그 작동 중

### 5.3 DB 초기화 순서

**현재** (app.js main()):
```javascript
Step 1: await initDB();                    // DB_VERSION = 6 업그레이드
Step 2: await seedSalesCategories();       // ref_sales_categories 초기화
Step 3: setupMenuSalesModule();            // 리스너 등록
```

**필요 변경** (MS-2 구현 시):
```javascript
Step 1: await initDB();                    // DB_VERSION = 7 업그레이드
Step 2: await seedSalesCategories();       // 기존
Step 2.5: await seedMenuSalesRules();      // ⭐ 신규: 기본 룰 초기화
Step 3: setupMenuSalesModule();            // 기존
```

**선택사항**: seedMenuSalesRules()는 별도 함수로 분리하거나 app.js에 인라인 처리

---

## 6️⃣ 구현 로드맵 검토 (A/B/C 작업 묶음)

### 6.1 명세서의 실행 계획 재평가

**설계 명세서 제시 작업 묶음**:

```
A 작업 (MS-1, MS-2, MS-3):
  - MS-1: 파일 업로드 (기본 정책, 중복 체크, 파싱)
  - MS-2: 파일 파싱 (엑셀/CSV 해석, 컬럼 매핑)
  - MS-3: 데이터 정규화 (메뉴명 표준화, 카테고리 자동 할당)

B 작업 (MS-4, MS-5, MS-6):
  - MS-4: 미매칭 감지 (정규화 후 미인식 메뉴 식별)
  - MS-5: 순위 집계 (월별 판매량 순위 계산)
  - MS-6: 비교 집계 (2개월 비교, 증감율 계산)

C 작업 (MS-7, MS-8):
  - MS-7: 미매칭 관리 (alias/rule/exclude 적용)
  - MS-8: 설정 관리 (카테고리 맵핑, 제외 규칙)

추가 (MS-9, MS-10):
  - MS-9: 통계 및 대시보드
  - MS-10: 데이터 마이그레이션 및 정리
```

### 6.2 작업 배열 검증 (기존 구현 고려)

#### A 작업 평가
| MS | 완료도 | 재작업 필요 | 예상 시간 | 비고 |
|----|--------|-----------|---------|------|
| MS-1 | 50% | 파싱 + 해시 검증 | 중간 | menu-sales-upload-ui.js 기존, 하지만 parse 로직 별도 필요 |
| MS-2 | 0% | 전체 | 중간 | 신규 menu-sales-parse.js 작성 |
| MS-3 | 30% | 정규화 + 분류 | 중간 | normalizeMenuName 작성, groupName/category 로직 |

**A 작업 재평가**:
- ✅ 가능 (기존 구조 유지 가능)
- ⏱️ 예상: 2~3일 (파일 드롭 UI 재사용)

#### B 작업 평가
| MS | 완료도 | 재작업 필요 | 예상 시간 | 비고 |
|----|--------|-----------|---------|------|
| MS-4 | 0% | 전체 | 중간 | 미매칭 자동 감지 로직, menu_sales_issues 생성 |
| MS-5 | 95% | 테스트만 | 짧음 | aggregateRankData 이미 작동 |
| MS-6 | 95% | 테스트만 | 짧음 | aggregateCompareData 이미 작동 |

**B 작업 재평가**:
- ✅ 가능 (MS-5, MS-6은 기존 코드 사용, MS-4는 신규)
- ⏱️ 예상: 2~3일 (미매칭 감지 로직이 복잡도)

#### C 작업 평가
| MS | 완료도 | 재작업 필요 | 예상 시간 | 비고 |
|----|--------|-----------|---------|------|
| MS-7 | 20% | 저장 로직 + 재분류 | 중간 | UI는 있으나 await put() 및 재분류 프로세스 필요 |
| MS-8 | 60% | 기본 완료, 반영 로직만 | 중간 | setupMenuSalesSettingsUI 있으나 설정 적용 로직 불명확 |

**C 작업 재평가**:
- ⚠️ 부분 가능 (기존 UI 재사용, 저장 로직만 보강)
- ⏱️ 예상: 2~3일 (저장 후 sales_rows 재처리 로직이 핵심)

### 6.3 선택적 순서 조정 제안

**기존 순서 (설계 명세서)**:
```
A (MS-1,2,3) → B (MS-4,5,6) → C (MS-7,8) → (MS-9,10)
```

**대안 순서** (기존 완료 부분 활용):
```
Option 1: B-Fast (MS-5,6 먼저) → A → B-Complete (MS-4) → C
  장점: 이미 작동하는 부분 빨리 확인, 동기 부여
  단점: 순서 분산

Option 2: A → B (MS-5,6 먼저) → B-Complete (MS-4) → C
  장점: A 완료 후 즉시 B의 완료 부분 활용
  단점: 예상과 다름

⭐ 추천: 기존 순서 유지
  이유: 파일 업로드 → 순위/비교 → 미매칭 관리 → 설정
        사용자 입장의 자연스러운 흐름
```

---

## 7️⃣ MS-1 예상 수정 범위

### 7.1 MS-1의 목표
**파일 업로드 + 기본 파싱 완성**

### 7.2 수정할 파일 목록

#### 신규 작성 파일
1. **menu-sales-parse.js** (~150줄)
   - parseMenuSalesFile(headers, rows)
   - 필수 컬럼: 메뉴명, 판매량
   - 반환: { ok, success, failed, colMap }

2. **menu-sales-normalize.js** (~100줄)
   - normalizeMenuName(rawName)
   - 공백 제거, 대소문자 통일, 특수문자 처리

3. **menu-sales-store.js** (~200줄, MS-1에서는 기본 CRUD만)
   - saveMenuSalesUpload({ fileId, meta, rows })
   - getMenuSalesFiles()
   - deleteMenuSalesFile(fileId)
   - checkHashExists(hash)

#### 기존 파일 수정
1. **menu-sales-upload-ui.js** (~50줄 수정)
   - import parseMenuSalesFile from './menu-sales-parse.js'
   - import { saveMenuSalesUpload } from './menu-sales-store.js'
   - handleUpload() 함수 재작성

2. **menu-sales.js** (~30줄 수정)
   - import { saveMenuSalesUpload } from './menu-sales-store.js'
   - setupMenuSalesModule() 재정리

3. **db.js** (~20줄 추가)
   - DB_VERSION = 7로 업그레이드
   - sales_parse_log store 추가 (선택사항)

### 7.3 수정 범위 요약

```
신규: 약 450줄
수정: 약 100줄
삭제: 0줄 (기존 유지)
총 변경: 약 550줄
```

**파일 수정 순서** (CLAUDE.md 원칙):
```
1. menu-sales-parse.js 작성 + 테스트
2. menu-sales-normalize.js 작성 + 테스트
3. menu-sales-store.js 작성 + 테스트
4. menu-sales-upload-ui.js 수정 + 테스트
5. menu-sales.js 수정 + 테스트
6. db.js 수정 + 테스트
```

---

## 8️⃣ ChatGPT 의견 평가

> 명세서에서 제시한 설계가 있다면, 독립적으로 검토하여 실제로 최선인지 판단

### 8.1 만약 ChatGPT가 제안했을 가능성이 높은 방안들

**(가정 1) "DB에 모든 계산 결과를 저장하자"**
```
제안: sales_rows → sales_month_agg → sales_rank_agg 테이블 계층화
평가: ❌ 비권장
이유:
  1. 메모리 계산 vs DB 저장 혼동
  2. 파일 삭제 시 cascade 복잡도 증가
  3. 데이터 정합성 문제 (어느 것이 진실?)
  4. 기존 price, shipment 모듈과 패턴 불일치
```

**(가정 2) "각 UI 모듈이 독립적으로 DB 접근하자"**
```
제안: rank-ui.js, compare-ui.js가 직접 getAll('sales_rows') 호출
평가: ⚠️ 부분 수용
이유:
  현재 이렇게 구현되어 있음
  개선안: calc 로직 분리 (menu-sales-calc.js)
```

**(가정 3) "라우터 변경 없이 URL 직접 해싱으로 처리하자"**
```
제안: window.location.hash 직접 모니터링
평가: ✅ 이미 적용됨 (hash 확인 최근 제거됨)
대신: router:tab CustomEvent 사용이 더 깔끔함
```

### 8.2 독립 판단: 설계 명세서의 타당성 평가

**✅ 강점**:
1. **단계적 분해**: MS-1~MS-10으로 명확하게 구분
2. **파일 분리 원칙**: parse → calc → store → ui 패턴
3. **정책 문서화**: 카테고리, 정규화, 미매칭 감지 기준 명시
4. **기존 구조 존중**: price, shipment 모듈 패턴 재사용

**⚠️ 개선 가능 부분**:
1. **MS-4의 "미매칭 감지" 정의 모호**
   - "정규화 후 미인식된 메뉴"의 정확한 판단 기준 필요
   - alias/rule/exclude와의 우선순위 명시 필요

2. **MS-7과 MS-8의 경계 불명확**
   - "미매칭 관리" vs "설정 관리"의 역할 분담
   - 예: category_map은 MS-8인가 MS-3인가?

3. **순환 참조 가능성**
   - MS-5 (순위 집계) vs MS-3 (분류) 간 dependency
   - "classified" 상태로만 집계하는 정책이 명확해야 함

4. **성능 고려 부족**
   - 월별 데이터가 쌓이면 getAll('sales_rows')의 메모리 문제
   - 향후 Paging/indexing 고려 필요 (MS-10 범위)

### 8.3 최종 판단

**설계 명세서의 방향은 타당하다. ✅**

단, 구현 시 다음 점들을 보완 필요:
1. MS-4의 "미매칭 감지" 알고리즘 구체화
2. MS-7/MS-8 인터페이스 명확화
3. status 컬럼의 상태 전이 다이어그램 작성
4. 성능 테스트 항목 추가 (MS-9/MS-10에서)

---

## 9️⃣ 최종 결론 및 MS-1 준비도 평가

### 9.1 현재 상태 종합 평가

| 항목 | 상태 | 평가 |
|-----|------|------|
| **DB 스키마** | 기본 준비됨 | ✅ sales_files, sales_rows, menu_sales_issues 구조 OK |
| **UI 프레임워크** | 80% 준비됨 | ⚠️ 업로드, 순위, 비교, 설정 UI 있음 / 미매칭 관리 불완전 |
| **파싱 로직** | 0% 미구현 | ❌ menu-sales-parse.js 신규 작성 필요 |
| **계산 로직** | 50% 완료 | ✅ aggregateRankData, aggregateCompareData 작동 / 미매칭 감지 미구현 |
| **저장 로직** | 30% 부분 구현 | ⚠️ menu-sales-settings-ui.js에는 await put() 있으나 미매칭-unmatched-ui.js는 없음 |
| **라우팅** | 100% 완료 | ✅ router:tab CustomEvent 작동 |
| **모듈 간 독립성** | 100% 준비됨 | ✅ price, shipment과 분리, import 충돌 없음 |
| **에러 처리** | 60% 준비됨 | ⚠️ 기본 toast 사용, 상세 오류 분류 필요 |

### 9.2 MS-1 시작 전 완료해야 할 것

```
[필수]
✅ DB_VERSION 업그레이드 준비 (v6 → v7)
✅ menu-sales-parse.js 작성 계획 수립
✅ menu-sales-normalize.js 작성 계획 수립
✅ menu-sales-store.js 작성 계획 수립

[권장]
✅ menu-sales-upload-ui.js 리뷰 및 개선점 파악
⚠️ 파일 해시 검증 방식 확정 (SHA256 vs MD5 vs 단순 CRC)

[선택]
⚠️ sales_parse_log 필요 여부 판단 (현재: 선택사항)
```

### 9.3 MS-1 진행 준비도

**준비도 평가**: ⭐⭐⭐⭐☆ (80%)

**GO/NO-GO 판정**: ✅ **GO**

**사유**:
1. ✅ 기존 DB/UI 구조 충분히 준비됨
2. ✅ 파일 분리 계획 명확함 (450줄 신규 작성)
3. ✅ 기존 price.js/shipment.js 패턴 참고 가능
4. ❌ 미메칭 감지 알고리즘은 MS-4에서 구체화 필요
5. ✅ 단계적 파일 작성 가능 (병렬화 불필요)

### 9.4 MS-1 예상 일정

```
Day 1: menu-sales-parse.js 작성 + 테스트
Day 2: menu-sales-normalize.js + menu-sales-store.js (기본 CRUD) 작성 + 테스트
Day 3: menu-sales-upload-ui.js, menu-sales.js, db.js 수정 + 통합 테스트
```

**예상**: 3일 (변수 포함 시 3~5일)

### 9.5 위험 요소 및 대응 방안

| 위험 | 확률 | 대응 |
|-----|------|------|
| 파일 해시 중복 처리 | 중간 | 먼저 체크 후 경고 (기존 가격 모듈 참고) |
| 정규화 로직 복잡도 | 중간 | 단계적 구현 (MS-2에서 간단하게, MS-3에서 고도화) |
| DB 트랜잭션 실패 | 낮음 | runTransaction 사용, 롤백 테스트 (기존 app.js 참고) |
| 성능 (대용량 데이터) | 낮음 | 초기에는 무시, MS-10에서 처리 |

---

## 최종 체크리스트

### MS-0 설계 확정 사항

- [x] 현재 코드 구조 진단 완료
- [x] 정책 수용 가능성 평가 완료
- [x] DB 설계안 수립 완료
- [x] 모듈 파일 분리 계획 확정 완료
- [x] 기존 앱 연동 방식 검증 완료
- [x] 구현 로드맵 (A/B/C) 검토 완료
- [x] MS-1 예상 범위 정의 완료
- [x] 설계 명세서 독립 평가 완료
- [x] MS-1 준비도 평가 완료

### MS-1 진행 허가

**사용자 승인 필요**: 
```
[ ] 이 MS-0 설계 분석이 타당한가?
[ ] MS-1 진행을 승인하는가?
[ ] 제시한 파일 분리 방식 (parse → calc → store → ui)이 맞는가?
[ ] 선택적 항목들 (sales_parse_log, menu-sales-normalize.js 분리 등) 처리 방식이 맞는가?
```

---

**작성자**: Claude Haiku 4.5  
**검토 대상**: 메뉴판매량 모듈 (MS-0 ~ MS-10)  
**다음 단계**: 사용자 승인 후 MS-1 구현 착수
