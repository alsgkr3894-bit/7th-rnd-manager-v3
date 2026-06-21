# 남은 작업 통합본 및 협업 실행 계획

기준일: 2026-06-21

이 문서는 `DEFERRED_WORK.md`, `INTERNAL_TOOL_POLISH_PLAN.md`, `SITE_STATUS.md`, `CLAUDE_CODE_REFACTOR_HANDOFF.md`, `SECURITY_POLICY.md`와 2026-06-21 코드 청결도 재점검 결과를 합쳐 남은 작업을 실제 실행 순서로 재정리한 클로드 코드 작업용 통합본이다.

---

## 실행 기록 (2026-06-21)

### ✅ 완료 — 기준선 재확인 (0단계)

| 항목 | 결과 |
|---|---|
| `npm run format:check` | ✅ 통과 |
| `npm run lint` | ✅ 통과 (`No ESLint warnings or errors`) |
| `npm run audit:docs` | ✅ 통과 (SITE_STATUS.md 수치 278/251 갱신 포함) |
| `npm run test:ci` | ✅ **278 suites / 1582 tests** all-pass |

SITE_STATUS.md `testTotal` 276→278, `testLib` 249→251으로 갱신 (백업/복원 리허설·노트 캐시 테스트 파일 추가 반영).

---

### ✅ 완료 — 백업/복원 실데이터 리허설 (4단계 전처리)

`__tests__/lib/backup-restore-rehearsal.test.mjs` 신규 작성. 27개 케이스 전부 green.

| 시나리오 | 내용 | 결과 |
|---|---|---|
| 브랜드별 백업/복원 검증 | main/china4/icheon 메타데이터 정확성, sharedDbName 일치, 교차 복원 mismatch 6종, summary 라운드트립, 구형 brandId 호환 | ✅ 7케이스 |
| localStorage 포함 범위 확인 | 전 스코프 = PERSISTENT_LS_KEYS 완전 커버, COMMON_LS_KEYS 항상 포함, round-trip (write→collect→restore), 미등록 키 필터링, sales 빈 스코프 안전, 중복 키 없음 회귀 | ✅ 6케이스 |
| 대용량 복원 테스트 | 1000행×5(5000행) 통과, 단일 10000행 집계, 30 store×100행, 9999번째 손상 행 감지, 대형 store 손상 예외, 빈 store 혼재 허용 | ✅ 6케이스 |
| 실패 store 복구 시나리오 | IDB timeout 실패 정규화, 유효 3+실패 2 부분 백업 통과, failedStores-only store 제외 확인, malformed 항목 무시, failedStoreCount=0 회귀, UI 차단 가드 코드 확인, 긴 에러 메시지 보존 | ✅ 7케이스 |
| 브라우저 수동 QA | 실제 IndexedDB 데이터로 복원 preview/restore/rollback 확인 | ⏳ 수동 미완료 |

브라우저 수동 QA(실제 IndexedDB 데이터 흐름 확인)는 dev 서버 기동 후 별도 진행 필요.

---

### ✅ 완료 — 7단계 코드 잔여 정리

#### react-hooks/exhaustive-deps 예외 전수 감사

프로젝트 내 모든 `eslint-disable.*exhaustive-deps` 주석 7건을 검토했다. **전부 의도적이고 안전한 예외**로 판정. 수정 불필요.

| 파일 | deps | 판정 | 사유 |
|---|---|---|---|
| `app/ingredient/manage/page.jsx:85` | `[]` | ✅ 안전 | URL param `catFilter` 마운트 1회 읽기·제거. `setCatFilter`는 stable dispatch. |
| `components/sales/UserExcludedSection.jsx:60` | `[query]` | ✅ 안전 | `cancelEdit`은 useCallback 안정 참조. query 변경 시 편집 취소가 목적. |
| `components/sales/UserRulesSection.jsx:94` | `[query]` | ✅ 안전 | 동일 패턴. cancelEdit dep 추가 시 재렌더 루프 위험 있어 의도적 제외. |
| `components/sales/UserAliasesSection.jsx:68` | `[query]` | ✅ 안전 | 동일 패턴. |
| `components/sales/user-rules/UserRuleForm.jsx:39` | `[isMain]` | ✅ 안전 | isMain 변경 시 category 초기화 1회. category를 dep에 추가하면 초기화 루프 발생. |
| `hooks/useSettingsSection.js:49` | `[]` | ✅ 안전 | "마운트 1회 fetch" 표준 패턴. refresh 자체가 안정 함수지만 재렌더마다 새 참조 생성. |
| `components/cost/manage/CommonEdgesView.jsx:77` | `[search]` | ✅ 안전 | search 변경 시 선택 초기화. edgeTable 참조가 안정적이지 않아 dep 추가 시 과도 실행 위험. |

#### XLSX formula injection 방어 검토

`lib/sales/export-xlsx.js`, `lib/report/export-cost-xlsx.js`, `lib/nutrition/origin/export.js`, `lib/nutrition/label/export.js`, `lib/report/sales-export.js` 등 5개 XLSX 출력 경로 전체 검토.

**판정: 방어 불필요 (현재 안전).**

- 모든 경로가 `XLSX.utils.aoa_to_sheet()` 사용
- xlsx@0.18.5에서 문자열 값은 셀 타입 `t: 's'`로 저장됨
- Excel은 `t: 's'` 셀을 formula가 아닌 텍스트로 처리 — `=SUM(...)` 같은 내용도 수식으로 실행되지 않음
- CSV는 타입 정보 없어 `esc()` 방어 필요하고 `rowsToCsv()`에 이미 적용됨 (`lib/download.js`)
- XLSX 셀 직접 조작(`ws['A1'] = {t:'f', ...}`)은 어떤 경로에도 없음

**향후 주의사항**: 수동으로 formula 셀(`t: 'f'`)을 생성하거나 `sheet_from_json`에 `raw: true` 옵션을 쓰는 경우는 injection 검토 필요.

---

### ✅ 완료 — 더 확인 심층 감사

#### 인쇄 모듈 HTML 이스케이프 전수 확인

`lib/print/window-print.js`의 `openPrintWindow(html)` 호출 경로 7개 전부 검토.

| 모듈 | 이스케이프 | 판정 |
|---|---|---|
| `lib/note/journal-print.js` | `esc()` — `&amp;`, `&lt;`, `&gt;`, `&quot;` | ✅ 안전 |
| `app/note/calendar/calendar-print.js` | `escapeCalendarPrintValue()` — `&amp;`, `&lt;`, `&gt;` | ✅ 안전 |
| `lib/nutrition/label/print.js` | `esc()` | ✅ 안전 |
| `lib/cost/usage-print.js` | `esc()` — `&amp;`, `&lt;`, `&gt;`, `&quot;` | ✅ 안전 |
| `lib/nutrition/origin/print.js` | `esc()` | ✅ 안전 |
| `lib/ingredient/manage-print/table-report.js` | 공유 `esc` import | ✅ 안전 |
| `app/note/sample/photo-report.js` | (호출 경로 포함) | ✅ 안전 |

**결론**: 모든 `document.write` 경로에서 사용자 데이터가 `esc()` / `escapeCalendarPrintValue()`를 통과하므로 XSS 위험 없음.

#### dangerouslySetInnerHTML 검토

- `app/layout.jsx:36` — 하드코딩된 다크모드 스크립트 (`try{var t=localStorage...}` 리터럴). 사용자 데이터 포함 없음 → ✅ 안전.
- `app/not-found.jsx` — 내용 초기화 목적, 사용자 데이터 없음 → ✅ 안전.

#### 잔여 인라인 파일 크기 검사 수정 (업로드 정책 완전 통일)

이전 세션에서 발견한 2건의 인라인 검사를 `checkFileSize` / `UPLOAD_MAX_MB`로 교체 완료.

| 파일 | 이전 코드 | 이후 |
|---|---|---|
| `app/note/sample/_SampleFormBody.jsx` | `file.size > 5 * 1024 * 1024` | `checkFileSize(file, UPLOAD_MAX_MB.photo)` |
| `hooks/useRestoreFile.js` | `file.size > 500 * 1024 * 1024` | `checkFileSize(file, UPLOAD_MAX_MB.backup)` |

수정 후 `lint` 통과, `test:ci` **278 suites / 1582 tests** all-pass 확인.

---

### ⏳ 남은 항목 (수동 / 사용자 결정)

| 항목 | 상태 | 비고 |
|---|---|---|
| `npm run qa:prod` 실행 및 결과 기록 | ⏳ 수동 | dev 서버 중지 후 실행 필요 |
| 실제 출력물 열람 (CSV/XLSX/PDF/인쇄) | ⏳ 수동 | 브라우저에서 파일명·컬럼·브랜드명·날짜suffix 확인 |
| 백업/복원 브라우저 수동 QA | ⏳ 수동 | 실제 IndexedDB 데이터로 preview→restore→rollback 확인 |
| upload/import fixture QA | ⏳ 수동 | 빈파일·대용량·확장자오류·컬럼누락·실패행CSV·중복업로드 UX |
| N-43 과거 단가 정책 결정 | ⏳ 사용자 결정 | 조회전용 vs 계산적용 vs 저장형 중 선택 필요 |
| 영양성분 부분 누락 기준 결정 | ⏳ 사용자 결정 | 경고 vs 출력 차단 기준 선택 필요 |
| CSS 반복 패턴 추가 분리 | ⏳ 낮은우선순위 | 실제 화면 문제 없으면 보류 |
| 외부 배포 보안 강화 | ⏳ 보류 | 내부 LAN 유지 결정 유지 |

---

## 0. 최신 통합 판정

### 결론

남은 작업은 있다. 다만 현재 기준으로 사이트 사용을 즉시 막는 치명적 오류는 확인되지 않았고, 대부분은 운영 검수, 명세 확정, 장기 유지보수 정리 항목이다.

| 구분 | 현재 판정 | 메모 |
|---|---|---|
| 즉시 차단 버그 | 없음 | lint, format, 문서 감사, 관련 targeted tests 기준 통과 |
| 현재 점수 | 93/100 | 내부 LAN 운영툴 기준. 구조 분리, QA 오케스트레이션, upload/import 1차 공통화는 강해졌고 실제 운영 데이터 리허설은 남음 |
| 완료된 큰 단계 | 2, 3, 6, 7, 8, 9, 10단계 + 코드 청결도 1차 | E2E 16시나리오, 식자재 정리 도구 1차, 메뉴 UX, 출력 안전, CSS 분리, 업로드 정책, 모바일 QA, 식자재/영양값 store 분리, smoke/mobile runner 공통화, `qa:full`/`qa:prod` 전체 QA 오케스트레이션 완료 |
| 실제 운영 검수 | 일부 남음 | `build:clean` green 보고 완료. `qa:prod` 최신 전체 실행 기록과 실제 CSV/XLSX/PDF/인쇄 파일 열람 확인은 남음 |
| 사용자 결정 필요 | 남음 | N-43 과거 단가, 영양성분 부분 누락 기준 |
| 장기 코드 정리 | 남음 | 백업/복원 리허설, hook dependency 예외 재검토, CSS/design system 잔여 정리, upload/import 실제 fixture QA |
| 외부 배포 보안 | 보류 | 내부 LAN 단일 도구 유지 결정. 외부 배포 전환 시 재착수 |

### 최신 검증 기준선

최근 검증된 기준은 아래와 같다.

- `npm run format:check` 통과
- `npm run lint` 통과
- `npm run audit:docs` 통과
- `npm run test:ci` 최근 전체 기준선 통과: **278 suites / 1582 tests**
- `npm run qa:smoke` 통과: 22/22
- `npm run qa:mobile` 통과: 22/22, 390px viewport
- `npm run qa:workflow` 기준: 16시나리오
- `npm run qa:full` 추가: dev 서버 기준 `smoke → mobile → runtime → workflow`
- `npm run qa:prod` 확장: prod build 기준 `smoke → mobile → runtime → workflow`

`npm run build:clean`은 dev 서버가 떠 있으면 의도적으로 중단될 수 있으므로, 운영 QA 단계에서 서버 상태를 정리한 뒤 별도로 확인한다.

### 남은 작업 실행 플랜

현재 점수 93/100에서 94~95점으로 올리기 위한 실제 실행 순서다. 새 기능보다 **운영 검증 기록, 실제 파일 확인, 백업/복원 리허설**을 먼저 한다.

| 순서 | 단계 | 할 일 | 확인 명령/방법 | 완료 기준 | 점수 영향 |
|---:|---|---|---|---|---|
| 1 | 운영 QA 최신화 | dev 서버 기준 전체 QA 실행 | `npm run qa:full` | smoke/mobile/runtime/workflow 모두 green | 94점 진입 준비 |
| 2 | 프로덕션 QA | clean build 후 prod 전체 QA 실행 | `npm run qa:prod` | build/start/smoke/mobile/runtime/workflow 모두 green | 94점 핵심 |
| 3 | 실제 출력물 열람 | CSV/XLSX/PDF/인쇄 파일을 실제로 열어 확인 | 메뉴마스터 CSV, 원가마진 CSV, 영양성분/원산지/알레르기 엑셀, 식자재 인쇄/PDF | 파일명, 브랜드명, 날짜 suffix, 컬럼, 시트명, 한글, 수식 인젝션 방어 확인 | 94점 핵심 |
| 4 | 백업/복원 리허설 | 샘플 데이터로 백업 생성, 별도 context에서 복원 preview/restore 확인 | 브라우저 수동 QA + 결과 문서 기록 | 복원 범위, 실패 안내, rollback 안내가 확인됨 | 94점 안정화 |
| 5 | upload/import fixture QA | 실제/샘플 CSV·XLSX로 실패 케이스 확인 | 빈 파일, 대용량, 확장자 오류, 컬럼 누락, 실패행 CSV, 중복 업로드 | 공통 정책 메시지와 실패행 다운로드가 화면에서 확인됨 | 94점 마감 |
| 6 | 사용자 결정 2건 | 과거 단가와 영양성분 부분 누락 기준 확정 | 사용자 결정 후 명세 업데이트 | 조회 전용/계산 적용 여부, 경고/차단 기준 확정 | 95점 후보 |
| 7 | 코드 잔여 정리 | hook dependency 예외, CSS 반복 패턴, XLSX formula injection 검토 | `rg`, targeted tests, 필요 시 구조 테스트 | 새 대형 리팩토링 없이 위험 지점만 좁게 정리 | 95점 후보 |
| 8 | 외부 배포 보안 | 내부 LAN 밖으로 배포할 때만 착수 | 별도 threat model | 서버 인증, 세션, API 권한 검증 설계 | 별도 프로젝트 |

#### 이번 주 추천 체크리스트

- [ ] `npm run qa:full` 실행 결과 기록.
- [ ] `npm run qa:prod` 실행 결과 기록.
- [ ] 실제 출력물 5종 열람 결과를 `docs/DEFERRED_WORK.md` 또는 이 문서에 날짜별로 기록.
- [ ] 백업/복원 샘플 리허설 1회 기록.
- [ ] upload/import fixture QA 1회 기록.
- [ ] N-43 과거 단가 정책 결정.
- [ ] 영양성분 부분 누락 정책 결정.

#### 지금 하지 않아도 되는 일

- 외부 배포 보안 전환: 내부 LAN 운영 유지라면 보류.
- 대형 CSS 재분리: 실제 화면 문제나 반복 패턴이 확인된 경우만 좁게 진행.
- 식자재 실제 병합/대량 변경: 운영 데이터 백업과 사용자 승인 전까지 보류.

### 서버 DB 구축 전 사전 체크리스트

현재 앱은 IndexedDB + 일부 localStorage가 source of truth다. 서버 DB를 붙이기 전에 아래 항목을 먼저 확정해야 마이그레이션이 깔끔하다.

| 순서 | 항목 | 현재 상태 | DB 구축 전 결정/작업 |
|---:|---|---|---|
| 1 | DB 대상 | 미정 | PostgreSQL/Supabase/SQLite/자체 API 중 선택. 파일·사진 저장 위치도 같이 결정 |
| 2 | 스키마 기준 | `DB_VERSION=23`, `ALL_STORES=43` | IndexedDB store → 서버 table 매핑표 작성. 복합 index와 unique key를 명시 |
| 3 | 브랜드 스코프 | main DB + 브랜드별 DB + 노트 계열 shared DB | `brandId` 컬럼 전략과 shared note 데이터 범위를 먼저 고정 |
| 4 | localStorage 데이터 | 설정, 프로필, 플랫폼 수수료, 백업 이력 등 일부가 LS 기반 | 서버 테이블로 옮길 키와 브라우저 전용으로 남길 키를 분리 |
| 5 | 권한 모델 | 클라이언트 role/admin guard 중심 | 서버 API에서 admin/viewer 권한을 다시 검증하도록 설계 |
| 6 | 백업 JSON | 현재 가장 좋은 마이그레이션 원본 | 백업 JSON → 서버 DB import 스크립트를 먼저 만든 뒤 실데이터로 리허설 |
| 7 | Repository 경계 | 도메인 store가 `lib/db` facade를 통해 IndexedDB 접근 | 기존 `lib/*/store.js` public API를 유지하고 내부 adapter만 교체하는 전략 권장 |
| 8 | 동기화 방식 | 로컬 단일 source | 한 번에 서버 전환할지, 읽기 서버/쓰기 로컬 병행 기간을 둘지 결정 |
| 9 | QA 기준 | Jest/qa:full/qa:prod 보유 | DB 전환 후 같은 278 suites + workflow QA + backup/restore QA가 통과해야 함 |

#### DB 구축 착수 전 완료 조건

- [ ] `qa:prod` 최신 green 기록.
- [ ] 실제 출력물 열람 기록.
- [ ] 실제 브라우저 백업/복원 수동 QA 기록.
- [ ] 백업 JSON 샘플 1개를 서버 DB 스키마 초안에 매핑.
- [ ] localStorage 키를 “서버 이동 / 브라우저 유지 / 폐기” 3그룹으로 분류.
- [ ] 서버 권한 모델(admin/viewer)과 브랜드 스코프 정책 확정.

### 현재 남은 작업 우선순위

1. **문서·작업트리 정리**
   - `docs/CODE_CLEANLINESS_AUDIT_2026-06-20.md`가 새 감사 결과로 생성된 상태라면, 이 통합본에 흡수했는지 확인한 뒤 추적/보관/삭제 방향을 결정한다.
   - 완료된 7~10단계가 다른 문서에서 아직 보류처럼 보이면 `DEFERRED_WORK.md` 완료 이력 또는 보류 사유를 갱신한다.

2. **운영 QA 실제 실행**
   - dev 서버 상태를 정리한 뒤 `npm run build:clean`, `npm run qa:prod`를 실행한다.
   - 실제로 생성된 CSV/XLSX/PDF/인쇄물을 열어 파일명, 브랜드명, 날짜 suffix, 컬럼 순서, 시트명, 수식 인젝션 방지, 한글 깨짐 여부를 확인한다.

3. **사용자 결정 필요 기능 2건**
   - `N-43` 재료단가표 과거 단가: 조회 전용인지, 특정 날짜 원가계산 적용인지, 저장형인지 화면 계산형인지 결정 필요.
   - 영양성분 부분 누락 기준: 일부 크러스트/엣지 누락 시 경고만 할지, 출력 차단할지 결정 필요.

4. **코드 청결도 후속 정리**
   - 업로드/import 공통화는 1차 완료 상태다. 남은 것은 실제 fixture로 실패행 CSV, 대용량, 컬럼 누락, 중복 업로드 UX를 확인하는 것이다.
   - 백업/복원은 구조/대용량/실패 store 리허설 테스트가 완료됐다. 남은 것은 실제 브라우저 IndexedDB 데이터로 preview, restore, rollback 안내를 확인하는 수동 QA다.
   - `react-hooks/exhaustive-deps` 예외가 남은 파일만 소규모 감사한다.
   - CSS/design system은 큰 파일의 추가 분리보다 실제 반복 패턴과 접근성 상태 정리에 집중한다.

5. **안전성·일관성 후속 점검**
   - `localStorage`와 백업/복원 범위 정합성 문서화.
   - `react-hooks/exhaustive-deps` 예외가 남은 파일만 소규모 감사.
   - 업로드 공통 정책의 `checkFileExt`/`checkFileSize` 적용은 대표 업로드에 반영됐다. 새 업로드 화면 추가 시 같은 정책을 유지한다.
   - XLSX 출력 셀도 CSV와 같은 수준의 formula injection 방어가 필요한지 검토.

## 1. 협업 방식

모든 작업은 아래 4단계 루프를 기본으로 한다.

1. **1차 Claude**
   - 해당 단계의 코드/문서 상태를 먼저 확인한다.
   - 구현 계획을 짧게 보고한 뒤 작업한다.
   - 구현 후 관련 테스트와 수동 확인 결과를 남긴다.
   - 커밋은 단계 범위가 통과된 뒤에만 한다.

2. **2차 Codex**
   - Claude 보고를 그대로 믿지 않고 실제 diff, 코드, 테스트 결과를 재검증한다.
   - 요구사항 누락, 회귀 위험, 테스트 부족, 문서 불일치를 찾는다.
   - `승인 / 조건부 승인 / 수정 필요 / 검증 불가`로 판정한다.

3. **3차 Claude**
   - Codex 지적사항만 좁게 수정한다.
   - 추가 변경은 같은 단계 범위를 벗어나지 않는다.
   - 수정 후 동일 테스트를 다시 실행하고 결과를 보고한다.

4. **4차 Codex**
   - 최종 재검수한다.
   - 문제가 없으면 단계 완료로 판정한다.
   - 남은 위험과 다음 단계 착수 가능 여부를 정리한다.

## 2. 공통 완료 기준

각 단계는 아래 조건을 만족해야 완료로 본다.

- 기능 요구사항이 실제 화면/출력/데이터에 반영된다.
- 실패/빈상태/권한/중복 입력이 사용자에게 이해 가능한 방식으로 처리된다.
- 기존 동작을 깨지 않는다.
- 관련 테스트가 추가 또는 갱신된다.
- `npm run format:check` 통과.
- `npm run lint` 통과.
- 관련 단위 테스트 통과.
- 필요한 경우 `npm run audit:docs` 통과.
- 브라우저 영향이 있으면 `npm run qa:smoke` 또는 `npm run qa:workflow` 중 관련 검증 통과.
- 단계별 커밋 메시지가 작업 범위를 명확히 설명한다.

## 3. 작업 순서

아래 0~11단계는 최초 계획의 상세 실행 항목이다. 2026-06-21 현재 상태 판단은 위 "최신 통합 판정"을 우선한다.

### 0단계. 기준선 재확인 _(완료 — 최신 기준선은 0장 참고)_

목표: 새 작업 전 현재 상태를 고정한다.

Claude 작업:

- `git status --short`
- `npm run format:check`
- `npm run lint`
- `npm run audit:docs`
- 핵심 관련 targeted tests 실행

Codex 검토:

- 작업트리가 깨끗한지 확인.
- 문서 수치와 실제 코드 수치가 일치하는지 확인.
- 이전에 해결된 홈 500, 메뉴마스터 CSV 살균, workflow 15개 순서 테스트가 유지되는지 확인.

완료 기준:

- 기준선 명령 통과.
- 실패가 있으면 1단계로 넘어가지 않고 먼저 수정.

### 1단계. 운영 QA 실제 실행 _(남음 — build/prod/실제 출력 수동 검수)_

목표: 자동 단위 테스트가 아니라 실제 배포/출력 기준으로 사이트를 검증한다.

Claude 작업:

- dev 서버가 떠 있으면 사용자 확인 후 중지하거나 별도 포트 전략을 선택한다.
- `npm run build:clean` 실행.
- `npm run qa:prod` 실행.
- 실제 파일 출력 확인 항목을 체크한다.
  - 메뉴마스터 CSV
  - 원가마진표 CSV
  - 원산지/알레르기/영양성분 엑셀 또는 출력물
  - 식자재 관리 PDF/인쇄
  - 보고서 PDF/엑셀

Codex 검토:

- build/prod QA 결과가 실제 최신 커밋 기준인지 확인.
- 출력 파일명, 컬럼 순서, 브랜드명, 날짜 suffix, 수식 인젝션 방지가 유지되는지 확인.
- 실패 또는 보류 항목을 `DEFERRED_WORK.md`에 정확히 남겼는지 확인.

완료 기준:

- `build:clean` 통과.
- 가능하면 `qa:prod` 통과.
- 출력물 수동 확인 결과가 문서화됨.

### 2단계. E2E QA 깊이 보강 _(완료 + fixture 심화는 선택)_

목표: 현재 16개 workflow를 더 실무에 가깝게 만든다.

Claude 작업:

- 레시피 구성 UI를 실제 클릭/입력으로 저장하는 시나리오 추가.
- 식자재 단가 파일 fixture 업로드 후 원가 보고서에 반영되는지 확인.
- 공통원가가 원가/원산지/알레르기 출력까지 이어지는지 검증.
- 기존 DB 직접 삽입 위주의 시나리오는 필요한 곳만 유지하고, 실제 사용자 흐름을 1개 이상 추가한다.

Codex 검토:

- 시나리오 이름과 실제 검증 내용이 일치하는지 확인.
- 단순 `h1` 확인이 아니라 테스트 데이터가 화면/출력에 반영됐는지 확인.
- 테스트 데이터 정리가 실패해도 다음 실행을 오염시키지 않는지 확인.

완료 기준:

- `npm run qa:workflow` 통과.
- 새 시나리오가 `workflow-qa-utils.test.mjs` 순서 테스트에 반영됨.
- 실패 시 어떤 업무 흐름이 깨졌는지 알 수 있는 step 이름을 가진다.

### 3단계. 식자재 데이터 정리 도구 _(1차 완료 — 병합 wizard/고급 정리는 선택)_

목표: 진단만 보여주는 상태에서 안전한 정리 실행 도구로 확장한다.

Claude 작업:

- 유사 식자재 병합 wizard 설계 및 구현.
- 분류/태그 이름 변경 기능.
- 미사용 태그 일괄 삭제 기능.
- 분류/태그/전용범용/단종 상태 대량 변경 기능.
- 모든 파괴적 작업에 preview, confirm, admin guard, 결과 요약을 둔다.
- 실행 전 백업 권장 또는 자동 백업 정책을 명확히 한다.

Codex 검토:

- 데이터 손실 가능성, 되돌리기 어려운 변경, 권한 우회 가능성을 집중 검토.
- 병합 시 원산지/알레르기/레시피/영양/원가 참조가 깨지지 않는지 확인.
- 삭제/이름변경 후 기존 필터와 출력물이 정상인지 확인.

완료 기준:

- preview와 실제 적용 결과가 일치.
- viewer는 실행 불가.
- 관련 store/action 테스트 추가.
- 식자재 관리 화면에서 빈상태/부분 실패 상태가 표시됨.

### 4단계. 과거 단가 가져오기 명세 확정 및 구현 _(결정 필요)_

목표: `N-43` 재료단가표 과거 단가 기능의 동작 범위를 확정하고 구현한다.

사전 결정 필요:

- 과거 단가는 조회만 할 것인지.
- 특정 날짜 단가를 현재 원가계산에 일시 적용할 것인지.
- 원가마진표/원가보고서/메뉴마스터 원가 요약까지 반영할 것인지.
- 적용 결과를 저장할 것인지, 화면 계산에만 사용할 것인지.

Claude 작업:

- 선택 가능한 2~3개 설계안을 제시한다.
- 사용자가 선택한 방식만 구현한다.
- 가격 이력 조회, 날짜 선택, 적용 범위 표시, 원복 방법을 제공한다.

Codex 검토:

- 과거 단가와 최신 단가가 섞일 때 사용자가 혼동하지 않는지 확인.
- 저장형이면 백업/복원 범위와 충돌하지 않는지 확인.
- 계산형이면 보고서/다운로드에 적용 기준 날짜가 표시되는지 확인.

완료 기준:

- 동작 명세가 문서화됨.
- 같은 날짜/없는 날짜/제때 없는 품목/수동 단가 품목을 처리.
- 관련 계산 테스트 통과.

### 5단계. 영양성분 부분 누락 기준 확정 _(결정 필요)_

목표: 영양값 일부 누락 시 출력 허용 기준을 정한다.

사전 결정 필요:

- 크러스트별 값이 일부만 있어도 출력할지.
- 전체 크러스트 입력을 필수로 볼지.
- 씬바샤삭처럼 예외 규격이 있는 항목의 완성 기준.
- 엣지/기본 메뉴 조합에서 누락을 경고로 둘지 차단할지.

Claude 작업:

- 현재 누락 진단 로직과 출력 로직을 대조한다.
- 기준안을 2~3개로 정리한다.
- 사용자가 선택한 기준으로 진단 패널과 출력 차단/경고를 구현한다.

Codex 검토:

- 법적 표기 영향이 있는 원산지/알레르기와 영양성분 경고 수준이 섞이지 않는지 확인.
- 출력 제외와 경고 표시가 화면/엑셀/PDF에서 일관적인지 확인.

완료 기준:

- 누락 진단 기준 문서화.
- 메뉴/엣지/크러스트 조합 테스트 추가.
- 출력 화면에서 누락 상태를 명확히 표시.

### 6단계. 메뉴마스터 레시피 UX 잔여 보완 _(완료 — 추가 UX는 선택)_

목표: 레시피 입력 편의성과 누락 예방을 강화한다.

Claude 작업:

- 공통원가 묶음 상세 구성품 접힘 표시.
- 구성품 행 복사.
- 단가 없는 식자재 빠른 보정 버튼.
- 레시피 저장 전 누락 항목 확인 모달.
- 이슈 탭 빠른 액션: 바로 수정, 레시피 섹션 이동, 단가 보정 이동.
- 원산지/알레르기 영향 미리보기.

Codex 검토:

- 단일 저장 버튼 흐름이 다시 분리되지 않는지 확인.
- 레시피 저장 후 원가마진표/원가보고서/원산지/알레르기 출력이 갱신되는지 확인.
- 키보드 입력과 드롭다운 사용성이 유지되는지 확인.

완료 기준:

- 메뉴마스터에서 레시피를 빠르게 입력하고 오류를 바로 고칠 수 있음.
- 관련 workflow 또는 targeted tests 추가.

### 7단계. 출력·인쇄·다운로드 파이프라인 점검 _(완료 — 실제 파일 열람 QA는 1단계에서 확인)_

목표: CSV/XLSX/PDF/인쇄 UX와 보안을 통일한다.

Claude 작업:

- 파일명 규칙 `브랜드명_업무명_날짜` 재점검.
- CSV/XLSX 컬럼 순서 테스트 보강.
- `downloadCsvText` 직접 사용 금지 유지.
- `document.write` 기반 출력 HTML escaping 재확인.
- 출력 실패 toast와 팝업 차단 안내 통일.
- 대용량 출력 progress/취소 가능성 검토.

Codex 검토:

- 메뉴명/식자재명/원산지/알레르기 입력값이 출력 HTML에서 안전한지 확인.
- CSV 수식 인젝션 방지가 모든 CSV 경로에 적용되는지 확인.
- 실제 다운로드 파일을 열어 컬럼/시트명/파일명 확인.

완료 기준:

- 주요 출력 경로별 테스트 또는 수동 검증표 작성.
- 보안 우회 경로 없음.

### 8단계. CSS·디자인 시스템 정리 _(1차 완료 — 큰 CSS 추가 분리는 선택)_

목표: 시각 회귀를 최소화하면서 반복 스타일을 줄인다.

Claude 작업:

- 큰 CSS 파일을 기능별로 작게 분리한다.
- 반복 inline style은 화면 단위로만 class/helper화한다.
- 테이블/모달/카드/경고 배너 primitive를 점진 정리한다.

Codex 검토:

- 모바일/데스크톱에서 레이아웃 깨짐이 없는지 확인.
- 색상/spacing이 한쪽 화면만 다른 느낌이 되지 않는지 확인.
- 카드 중첩, 과한 radius, 텍스트 겹침 여부 확인.

완료 기준:

- `format:check`, `lint`, 주요 화면 smoke 통과.
- 변경 화면 스크린샷 또는 수동 확인 기록.

### 9단계. 업로드/import 공통화 _(1차 완료 — 실제 fixture QA는 후속 점검)_

목표: CSV/XLSX 업로드 실패 처리와 검증을 일관되게 만든다.

Claude 작업:

- 파일 확장자 검사 공통 helper. ✅
- 파일 크기 제한 정책. ✅
- 파싱 실패 메시지 통일. ✅
- 업로드 실패 row 다운로드 형식 통일. ✅
- 업로드 history/hash 중복 검사 정책 문서화. ✅

Codex 검토:

- 기존 업로드 모듈별 특수 조건이 사라지지 않았는지 확인.
- 잘못된 파일, 빈 파일, 컬럼 누락, 중복 파일, 대용량 파일을 검증.

완료 기준:

- 대표 업로드 3개 이상에 공통 helper 적용. ✅
- 실패 메시지가 사용자 기준으로 이해 가능. ✅
- 후속 확인: 실제 CSV/XLSX fixture로 실패행 다운로드와 대용량/컬럼 누락 UX를 운영 QA에 기록.

### 10단계. 모바일·좁은 화면 재검사 _(완료)_

목표: 390px 폭 기준 주요 업무 화면이 겹치지 않게 한다.

Claude 작업 (완료):

- **코드 분석**: ModalFrame은 이미 `min(px, vw)` 패턴으로 모바일 OK. `.modal` CSS 클래스는 미사용.
  `page-head-row`·`page-actions`는 768px에서 세로 쌓기+버튼 stretch. `table-wrap` overflow-x:auto 확인.
- **overlay.css**: `@media (max-width: 540px)` 추가 — `.modal` 너비 `calc(100vw-24px)`, `.status-row` 1열.
- **features.css**: `@media (max-width: 480px)` 추가 — `stat-value` 22px→18px (좁은 2열 카드 잘림 방지).
- **`scripts/mobile-qa.mjs`**: 390px viewport Playwright 스모크 22라우트 — 가로 스크롤 자동 감지.
- **`package.json`**: `qa:mobile` 명령어 추가.
- **`__tests__/lib/mobile-viewport.test.mjs`**: 구조 테스트 11개 추가.
- 테스트: **278 suites / 1546 tests** all-pass.

Codex 검토:

- `npm run qa:mobile` (dev 서버 필요) — 22/22 통과 확인.
- 실제 브라우저 390px에서 메뉴마스터·식자재·원가마진표·보고서미리보기·백업 화면 수동 확인.
- 버튼 텍스트, 테이블, 드롭다운, 모달 footer가 겹치지 않는지 확인.

완료 기준:

- 390px, 702px, 1440px 주요 화면 확인.
- 필요한 CSS 수정은 화면별로 작게 커밋.

### 11단계. 외부 배포 보안 강화 _(보류 — 내부 LAN 단일 도구 유지 결정)_

목표: 외부 인터넷 또는 HTTPS LAN 다중 사용자 환경으로 전환할 때 필요한 보안 계층을 추가한다.

착수 게이트:

- **2026-06-20 결정: 내부 LAN 단일 도구 유지 → 이 단계 보류.**
- 외부 배포 또는 다중 사용자 전환을 결정하는 시점에 재착수한다.

Claude 작업:

- 서버 세션/JWT.
- HttpOnly/Secure 쿠키.
- 비밀번호 salt + bcrypt/argon2.
- API route 서버 권한 검증.
- CSRF/CSP/CORS 정책.

Codex 검토:

- 클라이언트 role 우회 가능성이 서버에서 차단되는지 확인.
- 기존 로컬 IndexedDB 모델과 충돌하지 않는지 확인.
- 마이그레이션/로그아웃/세션 만료 UX 확인.

완료 기준:

- 보안 정책 문서 업데이트.
- 서버 권한 테스트 추가.
- 외부 배포 threat model 작성.

## 3-A. 추가 병렬 탐색 결과 (2026-06-21)

검증 결과:

- `npm run format:check` ✅
- `npx next lint --quiet` ✅
- `npm run audit:docs` ✅
- `npm run test:ci` ✅ 278 suites / 1582 tests
- import cycle 간이 탐색: 실제 상호참조 cycle 없음. barrel/index 자기 참조성 노이즈만 탐지.

### P0. 즉시 막아야 할 항목

현재 기준 P0는 없음. 빌드/포맷/린트/문서 감사/전체 Jest가 모두 green이고, `dangerouslySetInnerHTML`/`document.write` 사용도 기존 정책 범위 안에 있다.

### P1. DB 구축 전 반드시 확정할 항목

| 항목 | 발견 내용 | 해야 할 일 |
| --- | --- | --- |
| localStorage 키 분류 | `v3:brand-master`, `v3:active-brand`, `v3:backup-history`, `v3:last-ip`, 검색/필터/draft/session 키가 혼재 | 서버 DB로 옮길 키, 백업만 유지할 키, 버릴 키를 표로 확정 |
| 브랜드 마스터 | 브랜드 CRUD는 `localStorage('v3:brand-master')` 기반이고 백업 영속 키에는 포함되지 않음 | 서버 DB 구축 시 `brands`/`brand_settings` 테이블로 승격할지 결정 |
| 권한 모델 | 현재 내부 LAN 단일 도구 기준으로 일부 sync 메타는 UI 가드 중심 | 서버 전환 시 모든 write/delete/restore API에 서버 권한 검증 필요 |
| 복원 리허설 | 구조 테스트는 충분하나 실제 브라우저 IndexedDB 백업/복원 QA 기록은 별도 필요 | 백업 파일 생성 -> 전체 삭제/복원 -> 주요 화면 데이터 확인 리허설 |
| 실제 출력 QA | 보고서/CSV/XLSX/print 구조 테스트는 있으나 운영 파일 열람 기록 필요 | 대표 출력물을 실제 앱에서 생성 후 Excel/PDF/print 미리보기 확인 |
| 업로드 fixture QA | 공통 helper는 적용됐지만 실제 실패행 다운로드/대용량/컬럼 누락 UX 기록 필요 | 가격/판매량/영양 베이스 업로드 fixture로 수동 QA 기록 |

### P2. 안정화/충돌 가능성 보완

| 항목 | 발견 내용 | 추천 조치 |
| --- | --- | --- |
| hook dependency 예외 | `react-hooks/exhaustive-deps` 예외 11건 존재 | 기존 의도가 맞는지 1회 재감사하고 allowlist/테스트로 고정 |
| 외부 IP 조회 | `lib/session.js`가 버튼 실행 시 `api.ipify.org`를 호출 | 서버 DB 이후에는 서버 세션 IP로 대체하거나 기능 제거/옵션화 |
| fetch timeout 정리 | 재확인 결과 `fetchClientIP()`는 `finally`에서 `clearTimeout(timer)` 처리됨 | 추가 작업 없음 |
| silent catch | 빈 catch 42건은 대부분 allowlist 정책 안에 있음 | 신규 빈 catch가 늘지 않도록 `silent-catch-policy.test.mjs` 유지 |
| 파일 업로드 정책 | 브랜드 복원 JSON 크기 제한이 빠져 있었음 | `checkFileSize(file, UPLOAD_MAX_MB.backup)` 추가 완료. 사진은 `resizePhoto()`의 5MB 가드 유지 |

### P3. 분리작업 후보

| 파일 | 현재 성격 | 판단 |
| --- | --- | --- |
| `app/ingredient/manage/page.jsx` | 상태 12개, effect 3개, 460줄 | 기능은 안정적이나 view state/hook 추가 분리 여지 있음 |
| `hooks/useHomeDashboardData.js` | 홈 대시보드 데이터 fan-out, 267줄이나 상태 많음 | 서버 DB 이후 query 단위로 자연 분리 추천 |
| `app/nutrition/export/NutritionLabelResult.jsx` | 출력 UI와 데이터 조립이 함께 있음 | 출력 QA 후 표/출력 액션 단위로 선택 분리 |
| `app/nutrition/origin/page.jsx` | 원산지 화면 데이터 조립+UI | DB 전환 후 adapter 기준으로 분리 |
| `app/settings/restore/page.jsx` | 복원 흐름 orchestration | 백업/복원 리허설 후 단계 hook으로 분리 가능 |
| `app/login/page.jsx` | 로컬 인증 UX 중심 401줄 | 서버 인증 전환 시 전면 교체 예정이라 지금 분리 우선순위 낮음 |
| `IngredientDiagnostics.jsx`, `MenuRecipeComponentsTable.jsx`, `_SystemSettingsUI.jsx`, `_BackupPagePanels.jsx` | 최근 분리 후 400줄대 유지 | 당장 버그 위험보다는 가독성 개선 후보 |

### 반응속도 후보

- 큰 데이터에서 반복 계산이 생길 수 있는 후보는 식자재 관리의 `existingProductCodes={rows.filter(...).map(...)}`와 진단/레시피 테이블의 렌더 중 `map/filter/sort`이다.
- 이미 `perf-large-dataset`, 드롭다운 성능, QA 스크립트가 존재하므로 급한 병목은 없다.
- 서버 DB 전환 후에는 `getAll()` 전체 로드 페이지를 우선적으로 pagination/query 방식으로 바꾸는 것이 가장 효과가 크다.

## 3-B. 첨부 P0/P1/P2 백로그 재검증 (2026-06-22)

첨부 백로그 기준으로 다시 코드 확인했다. 대부분 이미 구현되어 있었고, 남은 저위험 성능 보완 1건만 추가 적용했다.

### P0 데이터 손상/충돌

| 항목 | 상태 | 확인 내용 |
| --- | --- | --- |
| P0-1 업로드 중복 TOCTOU | ✅ 완료 | `savePriceUpload`, `saveShipmentUpload`가 트랜잭션 내부에서 날짜/해시 중복 재확인 후 중복이면 abort |
| P0-2 replaceStores put 실패 롤백 | ✅ 완료 | `replaceStoresInDbTransaction`의 `clear()`/`put()` 요청에 `onerror -> tx.abort()` 연결 |
| P0-3 복원 부분 실패 | ✅ 완료 | 그룹 실패 시 이후 그룹 중단, `__partial__` 오류 반환, restore UI에서 강한 경고 toast 노출 |
| P0-4 식자재 일괄 삭제 부분 실패 | ✅ 완료 | `{ removed, failures }` 반환, `buildBulkDeleteToast`로 실패 건수 노출 |
| P0-5 메뉴마스터 삭제 cascade gap | ✅ 완료 | cascade 대상 store를 같은 transaction에 포함하고 transaction 내부에서 menuCode 재조회/삭제 |
| P0-6 마진 edge 필터 | ✅ 완료 | `derived||` id prefix 가드 후 edge id 비교 |
| P0-7 브랜드 복원 JSON 에러 | ✅ 완료 | `JSON.parse` 별도 try/catch와 브랜드 복원 JSON 크기 제한 적용 |

### P1 반응속도

| 항목 | 상태 | 확인 내용 |
| --- | --- | --- |
| P1-1 식자재 관리 페이지네이션 | ✅ 완료 | `IngredientManagePanel`에 `usePagination`, `PAGE_SIZE=60`, `Pagination` 적용 |
| P1-2 영양 결과 페이지네이션 | ✅ 완료 | `TabResults`에 `usePagination`, `PAGE_SIZE=100`, 페이지 단위 그룹 헤더 적용 |
| P1-3 원산지 페이지 | ✅ 추가 보완 | `OriginTablePanel` 페이지네이션 완료 상태 확인. 추가로 visibility 복귀 시 60초 이내 중복 reload를 스킵하는 freshness 가드 적용 |
| P1-4 note 전체 스캔 중복 | ⏳ 보류 | 전역 캐시/무효화 복잡도가 있어 서버 DB query 전환 시 재검토 |

### P2 분리

| 항목 | 상태 | 확인 내용 |
| --- | --- | --- |
| P2-1 IngredientDiagnostics 배너 분리 | ✅ 완료 | `app/ingredient/manage/diagnostics/*`로 배너와 `CleanupChip` 분리 |
| P2-2 MenuRecipeComponentsTable 행/셀 분리 | ✅ 완료 | `components/menu-master/recipe/*`로 row/suggestion/unit price cell 분리 |
| P2-3 그 외 400줄+ 파일 | ⏳ 보류 | 서버 DB 전환/인증 전환 뒤 query·adapter 기준으로 자연 분리 권장 |

### 이번 재검증 결과

| 검사 | 결과 | 메모 |
| --- | --- | --- |
| `npm run format:check` | ✅ 통과 | 전체 Prettier 스타일 일치 |
| `npx next lint --quiet` | ✅ 통과 | ESLint warning/error 없음 |
| `npm run audit:docs` | ✅ 통과 | `SITE_STATUS.md` 수치와 코드 수치 일치 |
| `git diff --check` | ✅ 통과 | whitespace error 없음 |
| targeted Jest | ✅ 통과 | origin/visibility/restore/brand restore 관련 5 suites, 22 tests |
| `npm run test:ci` | ✅ 통과 | 278 suites / 1582 tests |
| `npm run qa:full` | ✅ 통과 | smoke 22/22, mobile 22/22, runtime 67/67, workflow 16/16 |
| `npm run build:clean` | ⏸ 보류 | 포트 3000 dev 서버 실행 중이라 스크립트 안전장치가 빌드를 중단. 서버 종료 후 재실행 필요 |

## 4. 권장 커밋 단위

- 한 단계당 최소 1커밋, 위험한 단계는 세부 기능별 커밋.
- 문서-only 변경과 코드 변경은 가능한 분리.
- QA 실패 수정 커밋은 `fix:`로 별도 분리.
- 커밋 전 `git status --short`와 `git diff --check` 확인.

## 5. 현재 즉시 추천 순서

1. 1단계 운영 QA 실제 실행 기록: `qa:full`, `qa:prod`, 실제 출력물 열람.
2. `docs/CODE_CLEANLINESS_AUDIT_2026-06-20.md`가 다시 생기면 이 문서에 흡수 후 중복 문서로 남기지 않는다.
3. 4단계 N-43 과거 단가 명세 결정 후 구현 여부 선택.
4. 5단계 영양성분 부분 누락 기준 결정 후 구현 여부 선택.
5. 코드 청결도 후속 정리: 백업/복원 리허설, CSS/design system 반복 패턴 정리, upload/import fixture QA.
6. 안전성·일관성 후속 점검: 백업 범위, hook dependency 예외, 신규 업로드 화면 정책 유지, XLSX formula injection 방어 검토.
7. 11단계 외부 배포 보안은 외부 배포 결정 전까지 보류.
