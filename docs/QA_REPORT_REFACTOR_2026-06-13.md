# QA 리포트 — 리팩터링 미커밋 변경사항 (2026-06-13)

> 대상: N-01~N-19 커밋 이후 working tree에 쌓인 미커밋 변경사항 26개 파일 + 미추적 파일 12개
> N-01~N-19 QA는 별도 파일 참조: `docs/QA_REPORT_N01-N19.md`

---

## 1. 검증 환경

| 항목 | 결과 |
|------|------|
| `npm run build` | ✅ Compiled successfully (57 static pages) |
| `npm test` | ✅ 140 suites / 793 tests 전부 통과 |
| `npx eslint --ext .jsx,.js app components hooks lib` | ✅ 0 errors |
| 미커밋 tracked 파일 수 | 26개 |
| 미추적(untracked) 파일 수 | 12개 (컴포넌트 1, 데이터 디렉터리 2, 테스트 7, 기타) |

---

## 2. 미커밋 변경사항 분류

### 2-A. 데이터 분리 (mechanics 추출)

| 파일 | 변경 | 상태 |
|------|------|------|
| `lib/sales/rules-pizza.js` | 1,110줄 데이터 → `lib/sales/data/rules/rules-pizza.js`로 분리, 원본은 1줄 re-export 쉘 | ✅ |
| `lib/sales/rules-side.js` | 동일 패턴 (`lib/sales/data/rules/rules-side.js`) | ✅ |
| `lib/sales/extra-rules.js` | 동일 패턴 (`lib/sales/data/rules/extra-rules.js`) | ✅ |
| `lib/sales/rules-edge.js` | 동일 패턴 (`lib/sales/data/rules/rules-edge.js`) | ✅ |
| `lib/sales/rules-set.js` | 동일 패턴 (`lib/sales/data/rules/rules-set.js`) | ✅ |
| `lib/ingredient/master-seed.js` | 675줄 시드 → `lib/ingredient/data/master-seed.js`로 분리, 3개 named export 포워딩 | ✅ |
| `lib/ingredient/master-import-seed.js` | 동일 패턴 (`lib/ingredient/data/master-import-seed.js`) | ✅ |

> 공개 API 무변경 — 기존 import 경로 모두 유효

---

### 2-B. 인쇄 스크립트 통합

| 파일 | 변경 | 상태 |
|------|------|------|
| `lib/print/window-print.js` | `buildAutoPrintScript({ waitForImages?, closeAfterPrint? })` 헬퍼 추가 | ✅ |
| `lib/cost/usage-print.js` | 인라인 `<script>` → `buildAutoPrintScript()` | ✅ |
| `lib/ingredient/print.js` | 이미지 로드 대기 인라인 스크립트 → `buildAutoPrintScript({ waitForImages: true })` | ✅ |
| `lib/note/journal-print.js` | 인라인 `<script>` → `buildAutoPrintScript()` | ⚠️ 아래 주석 참조 |
| `lib/nutrition/label/print.js` | 인라인 `<script>` → `buildAutoPrintScript()` | ✅ |
| `lib/nutrition/origin/print.js` | 인라인 `<script>` → `buildAutoPrintScript()` | ✅ |

> **⚠️ 코드 스타일 이슈 — journal-print.js**
> `import { buildAutoPrintScript }` 선언이 `function txt()` 함수 선언 **이후**에 위치함.
> ES 모듈에서 `import`는 호이스팅되므로 런타임 오류는 없고 빌드도 통과하나,
> 관례상 `import`는 파일 최상단에 있어야 함. 다음 커밋 시 상단으로 이동 권장.
> 현재 ESLint `import/first` 규칙 없음 → lint 통과.

---

### 2-C. 공유 컴포넌트 도입

| 파일 | 변경 | 상태 |
|------|------|------|
| `app/report/page.jsx` | 인라인 `SortIco` + raw `<th>` → 공유 `SortableTh` 컴포넌트 | ✅ |
| `components/sales/CompareTable.jsx` | 로컬 `Th` → `SortableTh` | ✅ |
| `components/report/_ShareLinkModal.jsx` | modal-scrim/modal-head/modal-body 인라인 → `ReportModalShell` 래퍼 | ✅ |
| `components/report/_ScheduleManagerModal.jsx` | 동일 → `ReportModalShell` 래퍼 | ✅ |
| `components/cost/margin/MarginRow.jsx` | `navigator.clipboard.writeText()` → `copyText()` 유틸 | ✅ |
| `components/note/KanbanCard.jsx` | 동일 → `copyText()` 유틸 | ✅ |
| `components/jette/ShipmentTable.jsx` | 로컬 `toggleSort` 함수 → `useTableSearchSort` 훅 반환값 활용 | ✅ |

---

### 2-D. 훅 개선

| 파일 | 변경 | 상태 |
|------|------|------|
| `hooks/useLocalStorage.js` | `initialValue`·`normalize` stale closure 버그 수정 — `useRef`로 최신값 유지 | ✅ 버그 수정 |
| `hooks/useOutsideClick.js` | `isOutsideClickTarget` 헬퍼 함수 추출 (테스트 가능 단위 분리) | ✅ |
| `hooks/useTableSearchSort.js` | `toggleSort` + `getInitialSortDir` 옵션 추가 — key 변경 시 정렬 방향 커스텀 가능 | ✅ |

---

### 2-E. 기타 수정

| 파일 | 변경 | 상태 |
|------|------|------|
| `app/ingredient/manage/page.jsx` | `useCallback` deps 누락 수정: `setCatFilter`, `setTagFilter` 추가 | ✅ 버그 수정 |
| `lib/sales/export-xlsx.js` | 로컬 `loadXlsx` Promise 패턴 → 공유 `@/lib/excel` import | ✅ |

---

## 3. 미추적(untracked) 신규 파일

| 경로 | 설명 | 상태 |
|------|------|------|
| `components/report/_ReportModalShell.jsx` | 2-C에서 사용하는 공유 modal 래퍼 컴포넌트 | ✅ |
| `lib/sales/data/rules/` | 분리된 판매 분류 규칙 5개 파일 (2-A 대상 원본 데이터) | ✅ |
| `lib/ingredient/data/` | 분리된 식자재 시드 2개 파일 (2-A 대상 원본 데이터) | ✅ |
| `__tests__/lib/calendar-utils.test.mjs` | 달력 유틸 테스트 4건 — `npm test` 통과 ✅ | ✅ |
| `__tests__/lib/report-period.test.mjs` | 보고서 기간 헬퍼 테스트 3건 — `npm test` 통과 ✅ | ✅ |
| `__tests__/hooks/use-outside-click.test.mjs` | useOutsideClick 훅 테스트 — 통과 ✅ | ✅ |
| `__tests__/lib/local-date.test.mjs` | 로컬 날짜 유틸 테스트 — 통과 ✅ | ✅ |
| `__tests__/lib/sales-rule-matcher.test.mjs` | 판매 규칙 매처 테스트 — 통과 ✅ | ✅ |
| `__tests__/lib/sales-seed-data.test.mjs` | 시드 데이터 무결성 테스트 — 통과 ✅ | ✅ |
| `__tests__/lib/ui-browser-helpers.test.mjs` | UI 브라우저 헬퍼 테스트 — 통과 ✅ | ✅ |

> 테스트 파일 발견 방식: `npm test`는 `node --experimental-vm-modules`로 실행 → 모두 정상 포함.
> `npx jest` 직접 실행은 ESM 플래그 없어 파싱 실패 — `npm test`로만 실행할 것.

---

## 4. 발견된 버그 요약

| 항목 | 내용 | 심각도 | 상태 |
|------|------|--------|------|
| `hooks/useLocalStorage.js` | `initialValue`·`normalize` stale closure — 값 복원 시 초기값 기준 틀림 | 🟡 Medium | ✅ 수정됨 (미커밋) |
| `app/ingredient/manage/page.jsx` | `useCallback` deps `setCatFilter`, `setTagFilter` 누락 — React exhaustive-deps 경고 | 🟡 Low | ✅ 수정됨 (미커밋) |
| `lib/note/journal-print.js` | `import` 선언이 함수 선언 이후 위치 | 🟢 Style | ⚠️ 미수정 (런타임 오류 없음) |

---

## 5. 종합 판정

| 영역 | 결과 |
|------|------|
| 빌드 안정성 | ✅ 57페이지 통과 |
| 테스트 | ✅ 140 suites / 793 tests |
| ESLint | ✅ 0 errors |
| 기능 정합성 | ✅ 전체 리팩터링 방향 일관, API 무변경 |
| 잔존 이슈 | journal-print.js import 위치 (style, non-blocking) |

**결론: 모든 미커밋 변경사항 검증 완료. 커밋 가능 상태.**

> **Action 필요**: 26개 수정 파일 + 12개 미추적 파일을 커밋해야 현재 상태가 git에 반영됨.
