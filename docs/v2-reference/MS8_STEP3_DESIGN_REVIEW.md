# MS-8 Step 3: 데이터 정합성 검증 — 사전 설계 검토

**검토 일시**: 2026-05-20  
**최종 완료**: 2026-05-20  
**목적**: Step 3 구현 범위 정의 및 안전성 검증  
**상태**: ✅ 구현 완료 (Step 3-1 엔진 + Step 3-2 UI 통합)

---

## 1. 결론 요약

**MS-8 Step 3는 월별 데이터 관리 화면에서 저장된 데이터의 내부 정합성을 빠르게 진단할 수 있는 검증 기능입니다.**

### 핵심 특징
- 👁️ **조회 전용**: 데이터 수정/복구 기능 없음 ✅ 구현 완료
- 🟢 **경량 검증**: 4가지 정합성 항목(A-1, A-2, D-1, E-1) 카드 로드 시 자동 실행 ✅ 구현 완료
- 🔵 **정밀 검증**: 2가지 항목(B-2, C-1) 모달에서 온디맨드 실행 ✅ 구현 완료
- ⚠️ **상태 표시**: 각 월 카드에 "기본 검증 정상/경고/오류" 배지로 표현 ✅ 구현 완료
- 📋 **상세 정보**: 이슈 코드, 메시지, 부가 정보(orphanRowIds, linkedFileId 등) 모달 표시 ✅ 구현 완료
- 🛡️ **비파괴**: 검증 결과가 기존 데이터에 영향 없음 ✅ 검증 완료

---

## 2. Step 3의 정확한 역할 정의

### 2.1 담당 범위

| 항목 | 담당 | 이유 |
|------|------|------|
| 정합성 진단 | ✅ Step 3 | 저장된 데이터가 일관된 상태인지 확인 |
| 문제 표시 | ✅ Step 3 | UI에서 정상/경고/오류 상태 시각화 |
| 상세 검증 정보 | ✅ Step 3 | 클릭 시 어떤 항목이 문제인지 표시 |
| 자동 수정 | ❌ 미포함 | 데이터 손상 복구는 향후 단계 또는 별도 도구 |
| 자동 삭제 | ❌ 미포함 | 깨진 데이터 삭제는 관리자 결정 후 진행 |
| 재분류 | ❌ 미포함 | 월별 자동 재분류는 MS-6과 분리 |

### 2.2 주 사용자

- **데이터 관리자**: 월별 데이터 상태를 주기적으로 확인
- **운영 담당자**: 문제 발생 시 빠르게 인지하고 보고
- **개발팀**: 데이터 무결성 문제 조사 시 참고

---

## 3. 검증 대상 데이터 관계표

### 3.1 주요 스토어 구조

```
sales_files (파일 메타데이터)
  ├─ id (PK)
  ├─ year, month
  ├─ fileName
  ├─ totalRows (선언된 행 수)
  ├─ uploadedAt
  └─ fileId (files 테이블의 참조 ID)

sales_rows (파싱된 판매 행)
  ├─ id (PK)
  ├─ fileId (FK → sales_files.id)
  ├─ status (classified / unclassified / excluded)
  ├─ category
  ├─ normalizedMenuName
  └─ year, month

menu_sales_issues (미매칭 이슈)
  ├─ id (PK)
  ├─ fileId (FK → sales_files.id)
  ├─ issueType (unmatched / ...)
  ├─ status (open / closed)
  ├─ relatedSalesRowIds (배열: 관련 row id 목록)
  └─ year, month

upload_log (업로드 로그)
  ├─ id (PK)
  ├─ linkedFileId (FK → sales_files.id)
  ├─ deleted (soft delete 플래그)
  ├─ deletedAt
  └─ module: 'sales'
```

### 3.2 정합성 검증 포인트

```
[정상 상태]
sales_files (1) → sales_rows (N) ← fileId 기준 연결
                  ↓
                  status 분포: classified + excluded + unclassified = totalRows
                  ↓
menu_sales_issues (0~M) ← fileId 기준, relatedSalesRowIds 유효
                  ↓
upload_log (1) ← linkedFileId, deleted=false
```

---

## 4. 검증 항목 후보와 중요도

### 4.1 최소 구현안 (필수, 위험도 낮음)

| # | 항목 | 검증 내용 | 중요도 | 예상 로직 |
|----|------|---------|--------|---------|
| **A-1** | **파일-행 개수 일치** | sales_files.totalRows = 실제 sales_rows 개수 | 🔴 높음 | fileId 기준으로 sales_rows 카운트 후 비교 |
| **A-2** | **파일 orphan 확인** | fileId로 연결된 sales_rows가 0건인 파일 | 🔴 높음 | getByIndex('sales_rows', 'fileId', fileId) 결과 0 |
| **B-1** | **이슈 수 일치** | 화면의 이슈 count vs menu_sales_issues 실제 개수 | 🟠 중간 | getByIndex('menu_sales_issues', 'year_month', [y,m]) 비교 |
| **B-2** | **orphan 이슈 확인** | sales_rows가 삭제된 row를 이슈로 가리키는 경우 | 🔴 높음 | relatedSalesRowIds 각각을 getById로 확인 |
| **C-1** | **삭제 충돌** | deleted=true인데 sales_files에 존재하는 경우 | 🔴 높음 | linked_fileId로 조회 → sales_files 존재 확인 |
| **C-2** | **중복 삭제 기록** | 동일 linkedFileId로 deleted=true가 2건 이상 | 🟠 중간 | linkedFileId 기준 그룹화 |
| **D-1** | **년월 중복** | 동일 year/month가 sales_files에 2건 이상 | 🔴 높음 | year_month 인덱스 조회 후 count |
| **E-1** | **상태 분포 불일치** | classified+excluded+unclassified ≠ totalRows | 🟡 낮음 | status 기준 groupBy 후 합산 |

### 4.2 확장안 (선택, 위험도 중간 이상)

| # | 항목 | 검증 내용 | 위험도 | 예상 영향 |
|----|------|---------|--------|----------|
| **F-1** | **이슈 상태 추적** | open issue의 relatedSalesRowIds가 모두 unclassified 상태인지 | 중간 | 이슈 상태와 row 상태의 동기화 확인 |
| **F-2** | **분류 규칙 적용** | sales_rows.mappedMenuName이 규칙 데이터와 일관된지 | 높음 | 과거 분류 규칙 변경으로 인한 일관성 이슈 감지 |
| **F-3** | **카테고리 유효성** | category가 ref_sales_categories에 존재하는지 | 낮음 | 참조 데이터와 row 데이터 동기화 |
| **F-4** | **양쪽 orphan 확인** | sales_rows가 존재하지만 sales_files가 없는 경우 | 높음 | fileId 기준 반대 방향 확인 |

---

## 5. 최소 구현안 (즉시 구현 가능)

### 5.1 검증 함수 구조

```javascript
/**
 * 월별 데이터 정합성 검증
 * @param {number} year
 * @param {number} month
 * @returns {Promise<ValidationResult>}
 * 
 * ValidationResult {
 *   status: 'ok' | 'warning' | 'error',
 *   issues: [
 *     { code: 'A-1', message: '..., severity: 'error' },
 *     ...
 *   ]
 * }
 */
export async function validateMonthData(year, month) {
  const results = {
    status: 'ok',
    issues: []
  };

  // A-1: 파일-행 개수 일치
  // A-2: 파일 orphan
  // B-1: 이슈 수 일치
  // B-2: orphan 이슈
  // C-1: 삭제 충돌
  // C-2: 중복 삭제
  // D-1: 년월 중복
  // E-1: 상태 분포

  return results;
}
```

### 5.2 추가 파일 분류

| 기능 | 새 파일 | 기존 파일 수정 | 비고 |
|------|--------|-------------|------|
| 정합성 검증 함수 | `menu-sales-validate.js` (새파일) | - | store.js와 분리 |
| 월별 검증 실행 | - | `menu-sales-monthly-ui.js` | displayUploadedMonths()에서 검증 함수 호출 |
| 배지 렌더링 | - | `menu-sales-monthly-ui.js` | 각 월 카드에 배지 추가 |

---

## 6. 확장안 (향후 고려)

### 6.1 자동 정합성 유지 기능

- 매월 정기적인 자동 검증 실행 (별도 스케줄러)
- 문제 발생 시 관리자 알림 (toast 또는 email)
- 장기 문제 데이터 표시 (30일 이상 미해결)

### 6.2 자동 복구 (별도 도구)

- **복구 미지원**: Step 3는 검증만 제공
- 향후 별도 관리 도구 개발 필요
- 관리자가 UI에서 직접 "수정" 버튼 클릭 시에만 작동

---

## 7. UI 표시 방식 제안

### 7.1 월 카드 내 정합성 배지

```
┌─────────────────────────────────────────┐
│ 2026년 05월              2026-05-20 15:30│
├─────────────────────────────────────────┤
│ 파일명: menu_sales.2026.05.csv          │
│ 행 수: 4건                              │
├─────────────────────────────────────────┤
│ 미매칭 이슈: 2건 (빨강)                  │
├─────────────────────────────────────────┤
│ ✅ 정상 (검증 완료)      [상세 보기]    │  ← 새로 추가
└─────────────────────────────────────────┘
```

또는 경고 상태:
```
│ ⚠️ 경고 (2개 항목)       [상세 보기]    │
```

또는 오류 상태:
```
│ ❌ 오류 (1개 항목)       [상세 보기]    │
```

### 7.2 상세 검증 정보 (모달)

```
┌────────────────────────────────────────┐
│ 2026년 05월 — 정합성 검증 상세         │
├────────────────────────────────────────┤
│ ✅ 파일-행 개수: 일치 (4건)            │
│ ✅ 파일 orphan: 없음                   │
│ ✅ 이슈 수: 일치 (2건)                 │
│ ⚠️ orphan 이슈: 1개 발견                │
│    - 삭제된 row를 가리키는 이슈 1건   │
│ ✅ 삭제 충돌: 없음                     │
│ ✅ 년월 중복: 없음                     │
│ ✅ 상태 분포: 일치                     │
├────────────────────────────────────────┤
│                           [닫기]       │
└────────────────────────────────────────┘
```

### 7.3 배지 색상 정책

| 상태 | 배지 | 색상 | 의미 |
|------|------|------|------|
| ✅ 정상 | ✅ 정상 | 초록 (#090) | 모든 검증 통과 |
| ⚠️ 경고 | ⚠️ 경고 | 주황 (#f90) | 1~2개 경고성 문제 |
| ❌ 오류 | ❌ 오류 | 빨강 (#c00) | 1개 이상 심각 문제 |

---

## 8. 예상 수정 파일 목록

### 8.1 신규 파일
- `src/modules/menu-sales/menu-sales-validate.js` (~150줄)
  - `validateMonthData(year, month)` — 핵심 검증 함수
  - 헬퍼 함수 8개 (각 검증 항목 분담)

### 8.2 수정 파일
- `src/modules/menu-sales/menu-sales-monthly-ui.js` (~30줄 추가)
  - displayUploadedMonths() 함수: 검증 함수 호출 추가
  - 배지 렌더링 추가
  - 상세 보기 모달 UI 추가

### 8.3 미수정
- `src/core/db.js` — 스토어 구조 변경 없음
- `menu-sales-store.js` — 검증 로직은 별도 파일로 분리
- 기존 delete/save 함수 — 미수정

---

## 9. DB 마이그레이션 필요 여부

### 결론: **❌ 불필요**

**이유**:
1. ✅ 필요한 인덱스 이미 존재
   - sales_files: year_month 인덱스 (v6부터)
   - sales_rows: fileId 인덱스
   - menu_sales_issues: year_month, fileId 인덱스
   - upload_log: linkedFileId 인덱스

2. ✅ 필요한 컬럼 이미 존재
   - relatedSalesRowIds (배열로 저장)
   - deleted, deletedAt (upload_log)

3. ✅ 순수 조회 기능
   - 새 데이터 저장 없음
   - 기존 스키마 변경 없음

---

## 10. 가장 안전한 구현 순서

### Phase 1: 검증 함수 개발 (격리된 환경)

```
Step 1. menu-sales-validate.js 작성
  - validateMonthData(year, month) 함수
  - 각 검증 항목별 헬퍼 함수

Step 2. 단위 테스트 (menu-sales-validate 자체만 검증)
  - 정상 데이터 입력
  - 각 오류 케이스별 테스트

Step 3. menu-sales-store.js에 helper 함수 3개 추가
  - getRowCountByFileId(fileId)
  - getIssuesByMonth(year, month)
  - getDeletedLogsByMonth(year, month)
```

### Phase 2: UI 통합 (기존 UI에 배지 추가)

```
Step 4. menu-sales-monthly-ui.js 수정
  - displayUploadedMonths()에서 검증 함수 호출
  - 각 월 카드에 배지 렌더링
  - 상세 보기 모달 추가

Step 5. 브라우저 테스트
  - 배지 정상 표시
  - 상세 보기 모달 정상 작동
  - 검증 성능 (각 월 검증 시간)
```

### Phase 3: 최적화 및 문서화

```
Step 6. 성능 최적화
  - 대량 월 검증 시 병렬화 검토
  - 캐싱 전략 (선택사항)

Step 7. 문서 업데이트
  - MS_MASTER_SPEC.md: Step 3 완료 반영
  - MENU_SALES_DETAILED_POLICY.md: 검증 정책 추가
```

---

## 11. 바로 구현 진행 가능 여부

### ✅ 최소 구현안: **즉시 진행 가능**

**조건**:
1. ✅ 기존 DB 스토어 충분
2. ✅ 필요한 인덱스 모두 존재
3. ✅ 순수 조회 기능만 구성
4. ✅ 기존 데이터 수정 없음

**예상 일정**:
- 검증 함수 개발: ~2시간
- UI 통합 & 테스트: ~2시간
- **총 ~4시간 (단일 단계)**

### ⚠️ 확장안: **별도 설계 필요**

- 자동 복구 기능: 데이터 손상 위험 → 관리자 도구로 분리
- 자동 재분류: MS-6과의 충돌 검토 필요
- 정기 자동 검증: 스케줄러 인프라 필요

---

## 12. 최종 권장사항

### 구현 결정 기준

| 항목 | 최소 구현 | 확장안 |
|------|---------|--------|
| **시작 시기** | 즉시 | Step 3 완료 후 |
| **위험도** | 낮음 | 중간~높음 |
| **필수성** | 높음 | 중간 |
| **데이터 안정성** | 우수 | 검토 필요 |

### 제시 프로세스

1. **즉시 진행**: 최소 구현안 (A, B, C, D, E-1)
2. **Step 3 완료 후**: 확장안 검토 및 우선순위 결정
3. **자동 복구**: 향후 별도 관리자 도구로 개발

---

## 13. 주의사항

### 절대 금지 (이미 검토 완료)

- ❌ 자동 삭제 (깨진 데이터)
- ❌ 자동 덮어쓰기 (삭제 후 재저장)
- ❌ 자동 재분류 (규칙 변경 적용)
- ❌ DB 마이그레이션 (불필요)
- ❌ MS-9 보고서 기능과 혼합

### 안전 원칙

1. **읽기 전용**: Step 3은 조회만 수행
2. **비파괴**: 검증이 기존 데이터 수정 불가
3. **투명성**: 모든 검증 결과를 사용자에게 공개
4. **격리**: 검증 로직을 별도 파일에 독립 구성

---

## 결론

**✅ MS-8 Step 3 구현 완료**

- 🟢 Step 3-1: 정합성 검증 엔진 (6개 항목) 구현 완료
- 🟢 Step 3-2: 검증 UI 통합 (배지 + 모달) 구현 완료
- 🟢 안전성: 높음 (읽기 전용, 비파괴, 자동 복구/삭제 없음)
- 🟢 테스트: 완료 (브라우저 검증 통과)
- 🟢 문서: 완료 (3개 정책 문서 반영)

### MS-8 전체 완료 상태

| Step | 내용 | 상태 |
|------|------|------|
| Step 1 | 월별 업로드 파일 목록 조회 | ✅ 완료 |
| Step 2 | 월별 재업로드 진입 UX | ✅ 완료 |
| Step 3 | 정합성 검증 엔진 + UI | ✅ 완료 |
| **Step 4** | **고급 기능 (자동 복구, 감사 로그, 백업)** | **⏳ 향후 선택 개선 과제** |

### 다음 공식 단계

**MS-9: 보고서센터 판매량 연동** 사전 설계 검토로 진행 가능합니다.
