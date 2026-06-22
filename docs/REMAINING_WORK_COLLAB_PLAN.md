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
| `npm run audit:docs` | ✅ 통과 (SITE_STATUS.md 수치 295/268 확인) |
| `npm run test:ci` | ✅ **295 suites / 1771 tests** all-pass |

SITE_STATUS.md `testTotal` 295, `testLib` 268 기준으로 문서 수치와 코드 수치가 일치한다.

---

### ✅ 완료 — 백업/복원 실데이터 리허설 (4단계 전처리)

`__tests__/lib/backup-restore-rehearsal.test.mjs` 신규 작성. 현재 28개 케이스 전부 green.

| 시나리오 | 내용 | 결과 |
|---|---|---|
| 브랜드별 백업/복원 검증 | main/china4/icheon 메타데이터 정확성, sharedDbName 일치, 교차 복원 mismatch 6종, summary 라운드트립, 구형 brandId 호환 | ✅ 7케이스 |
| localStorage 포함 범위 확인 | 전 스코프 = PERSISTENT_LS_KEYS 완전 커버, COMMON_LS_KEYS 항상 포함, round-trip (write→collect→restore), 미등록 키 필터링, sales 빈 스코프 안전, 중복 키 없음 회귀, 복원 저널 round-trip/상한/삭제 | ✅ 7케이스 |
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

수정 후 `lint` 통과, `test:ci` **295 suites / 1771 tests** all-pass 확인.

---

### ⏳ 남은 항목 (수동 / 사용자 결정)

| 항목 | 상태 | 비고 |
|---|---|---|
| `HOST=127.0.0.1 PORT=3101 BASE=http://127.0.0.1:3101 npm run qa:prod` 실행 및 결과 기록 | ✅ 완료 | prod 기준 smoke 22/22, mobile 22/22, runtime 67/67, workflow 21/21 통과. 1차 3000번 실행은 외부 dev 서버 재기동과 충돌해 실패했고, 3101번 격리 포트 재실행으로 green 확인 |
| 실제 출력물 열람 (CSV/XLSX/PDF/인쇄) | ⏳ 일부 자동화 | 대표 XLSX 4종은 workbook/파일명/시트 검증에 더해 실제 `.xlsx` 바이너리 write/read까지 자동 검증 완료. 메뉴마스터 CSV는 브라우저 다운로드 파일명/헤더/행/수식 방어를 workflow로 검증 완료. 남은 것은 XLSX/PDF/인쇄 실제 열람 |
| 백업/복원 브라우저 QA | ⏳ 일부 자동화 | 실제 IndexedDB 데이터로 preview→restore 실행은 `qa:workflow`에 포함 완료. rollback 안내/운영 수동 리허설 기록은 남음 |
| upload/import fixture QA | ⏳ 일부 자동화 | 출고량 CSV 실제 업로드의 오류/저장 UX, 메뉴판매가 실패행 CSV 다운로드, 판매량 잘못된 확장자 UX는 `qa:workflow`에 포함 완료. 판매량 빈 CSV/헤더-only, 제때단가·출고량·메뉴판매가 필수 컬럼 누락/헤더-only 파서 테스트 완료. 남은 것은 대용량·중복업로드 UX 실제 화면 확인 |
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
| 완료된 큰 단계 | 2, 3, 6, 7, 8, 9, 10단계 + 코드 청결도 1차 | E2E 21시나리오, 식자재 정리 도구 1차, 메뉴 UX, 출력 안전, CSS 분리, 업로드 정책, 모바일 QA, 식자재/영양값 store 분리, smoke/mobile runner 공통화 완료 |
| 실제 운영 검수 | 일부 남음 | 최신 prod 기준 smoke 22/22, mobile 22/22, runtime 67/67, workflow 21/21 green 확인. XLSX/PDF/인쇄 실제 열람 확인은 남음 |
| 사용자 결정 필요 | 남음 | N-43 과거 단가, 영양성분 부분 누락 기준 |
| 장기 코드 정리 | 남음 | 백업/복원 리허설, hook dependency 예외 재검토, CSS/design system 잔여 정리, upload/import 실제 fixture QA |
| 외부 배포 보안 | 보류 | 내부 LAN 단일 도구 유지 결정. 외부 배포 전환 시 재착수 |

### 최신 검증 기준선

최근 검증된 기준은 아래와 같다.

- `npm run format:check` 통과
- `npm run lint` 통과
- `npm run audit:docs` 통과
- `npm run test:ci` 최근 전체 기준선 통과: **295 suites / 1771 tests**
- `npm run qa:smoke` 통과: 22/22
- `npm run qa:mobile` 통과: 22/22, 390px viewport
- `npm run qa:workflow` 기준: 21시나리오
- `npm run qa:full` 추가: dev 서버 기준 `smoke → mobile → runtime → workflow`
- `HOST=127.0.0.1 PORT=3101 BASE=http://127.0.0.1:3101 npm run qa:prod`: prod 서버 기준 `smoke → mobile → runtime → workflow` 전체 통과.

### 남은 작업 실행 플랜

현재 점수 93/100에서 94~95점으로 올리기 위한 실제 실행 순서다. 새 기능보다 **운영 검증 기록, 실제 파일 확인, 백업/복원 리허설**을 먼저 한다.

| 순서 | 단계 | 할 일 | 확인 명령/방법 | 완료 기준 | 점수 영향 |
|---:|---|---|---|---|---|
| 1 | 운영 QA 최신화 | dev 서버 기준 전체 QA 실행 | `npm run qa:full` | smoke/mobile/runtime/workflow 모두 green | 94점 진입 준비 |
| 2 | 프로덕션 QA | clean build 후 prod 전체 QA 실행 | `HOST=127.0.0.1 PORT=3101 BASE=http://127.0.0.1:3101 npm run qa:prod` | 21시나리오 기준 green | 완료 |
| 3 | 실제 출력물 열람 | CSV/XLSX/PDF/인쇄 파일을 실제로 열어 확인 | 대표 XLSX 4종은 `output-artifact-builders.test.mjs`로 workbook과 실제 `.xlsx` 바이너리 write/read까지 자동 검증. 메뉴마스터 CSV 브라우저 다운로드는 workflow 검증 완료. 남은 것은 XLSX/PDF/인쇄 브라우저 파일 열람 | 파일명, 브랜드명, 날짜 suffix, 컬럼, 시트명, 한글, 수식 인젝션 방어 확인 | 94점 핵심 |
| 4 | 백업/복원 리허설 | 샘플 데이터로 백업 생성, 별도 context에서 복원 preview/restore 확인 | `qa:workflow` 자동화 + 운영 수동 QA 결과 문서 기록 | preview/restore 실행 자동화 완료. 남은 것은 rollback 안내와 운영 수동 리허설 기록 | 94점 안정화 |
| 5 | upload/import fixture QA | 실제/샘플 CSV·XLSX로 실패 케이스 확인 | 출고량 CSV 실제 업로드, 메뉴판매가 실패행 CSV 다운로드, 빈 CSV/헤더-only, 주요 파서 필수 컬럼 누락은 자동화 완료. 남은 것은 대용량, 확장자 오류, 중복 업로드 실제 화면 확인 | 공통 정책 메시지와 실패행 다운로드가 화면에서 확인됨 | 94점 마감 |
| 6 | 사용자 결정 2건 | 과거 단가와 영양성분 부분 누락 기준 확정 | 사용자 결정 후 명세 업데이트 | 조회 전용/계산 적용 여부, 경고/차단 기준 확정 | 95점 후보 |
| 7 | 코드 잔여 정리 | hook dependency 예외, CSS 반복 패턴, XLSX formula injection 검토 | `rg`, targeted tests, 필요 시 구조 테스트 | 새 대형 리팩토링 없이 위험 지점만 좁게 정리 | 95점 후보 |
| 8 | 외부 배포 보안 | 내부 LAN 밖으로 배포할 때만 착수 | 별도 threat model | 서버 인증, 세션, API 권한 검증 설계 | 별도 프로젝트 |

#### 이번 주 추천 체크리스트

- [ ] `npm run qa:full` 실행 결과 기록.
- [x] `HOST=127.0.0.1 PORT=3101 BASE=http://127.0.0.1:3101 npm run qa:prod` 21시나리오 기준 전체 green 재확인.
- [ ] 실제 출력물 중 XLSX/PDF/인쇄 열람 결과를 `docs/DEFERRED_WORK.md` 또는 이 문서에 날짜별로 기록.
- [x] 백업/복원 preview/restore 실행 자동 리허설 1회 기록. 운영 수동 rollback 안내 확인은 남음.
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
| 9 | QA 기준 | Jest/qa:full/qa:prod 보유 | DB 전환 후 같은 295 suites + workflow QA + backup/restore QA가 통과해야 함 |

#### DB 구축 착수 전 완료 조건

- [x] `qa:prod` 최신 green 기록.
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
   - `npm run build:clean`과 `PORT=3101 QA_STEP_TIMEOUT_MS=30000 npm run qa:prod`는 통과했다.
   - 남은 것은 실제로 생성된 XLSX/PDF/인쇄물을 열어 파일명, 브랜드명, 날짜 suffix, 컬럼 순서, 시트명, 수식 인젝션 방지, 한글 깨짐 여부를 확인하는 것이다. 메뉴마스터 CSV는 브라우저 다운로드 파일 검증을 workflow로 추가 완료했다.

3. **사용자 결정 필요 기능 2건**
   - `N-43` 재료단가표 과거 단가: 조회 전용인지, 특정 날짜 원가계산 적용인지, 저장형인지 화면 계산형인지 결정 필요.
   - 영양성분 부분 누락 기준: 일부 크러스트/엣지 누락 시 경고만 할지, 출력 차단할지 결정 필요.

4. **코드 청결도 후속 정리**
   - 업로드/import 공통화는 1차 완료 상태다. 빈 CSV/헤더-only/필수 컬럼 누락은 대표 파서 테스트로 고정했고, 메뉴판매가 실패행 CSV 다운로드는 workflow로 고정했다. 남은 것은 실제 화면에서 대용량, 확장자 오류, 중복 업로드 UX를 확인하는 것이다.
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
- 이전에 해결된 홈 500, 메뉴마스터 CSV 살균, workflow 21개 순서 테스트가 유지되는지 확인.

완료 기준:

- 기준선 명령 통과.
- 실패가 있으면 1단계로 넘어가지 않고 먼저 수정.

### 1단계. 운영 QA 실제 실행 _(부분 완료 — build/prod QA 완료, 실제 출력 수동 검수 남음)_

목표: 자동 단위 테스트가 아니라 실제 배포/출력 기준으로 사이트를 검증한다.

Claude 작업:

- dev 서버가 떠 있으면 사용자 확인 후 중지하거나 별도 포트 전략을 선택한다.
- `npm run build:clean` 실행. ✅ 완료
- `PORT=3101 QA_STEP_TIMEOUT_MS=30000 npm run qa:prod` 실행. ✅ 완료
- 실제 파일 출력 확인 항목을 체크한다.
  - 메뉴마스터 CSV
  - 원가마진표 CSV
  - 원산지/알레르기/영양성분 엑셀 또는 출력물
  - 식자재 관리 PDF/인쇄
  - 보고서 PDF/엑셀

Codex 검토:

- build/prod QA 결과가 실제 최신 워크트리 기준인지 확인.
- 출력 파일명, 컬럼 순서, 브랜드명, 날짜 suffix, 수식 인젝션 방지가 유지되는지 확인.
- 실패 또는 보류 항목을 `DEFERRED_WORK.md`에 정확히 남겼는지 확인.

완료 기준:

- `build:clean` 통과. ✅ 완료
- `qa:prod` 통과. ✅ 완료
- 출력물 수동 확인 결과가 문서화됨.

### 2단계. E2E QA 깊이 보강 _(완료 + fixture 심화는 선택)_

목표: 현재 20개 workflow를 더 실무에 가깝게 유지하고, 신규 실무 fixture가 생기면 같은 구조로 확장한다.

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
- 잘못된 파일, 빈 파일, 컬럼 누락, 중복 파일, 대용량 파일을 검증. 빈 CSV/헤더-only/대표 필수 컬럼 누락은 자동 테스트 완료.

완료 기준:

- 대표 업로드 3개 이상에 공통 helper 적용. ✅
- 실패 메시지가 사용자 기준으로 이해 가능. ✅
- 후속 확인: 실제 CSV/XLSX fixture로 실패행 다운로드, 대용량, 확장자 오류, 중복 업로드 UX를 운영 QA에 기록.

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
- 당시 테스트: **278 suites / 1546 tests** all-pass. 현재 기준선은 295 suites / 1771 tests.

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
- `npm run test:ci` ✅ 295 suites / 1771 tests
- `output-artifact-builders.test.mjs` ✅ 원산지/영양성분/판매량/원가 보고서 XLSX workbook + 실제 `.xlsx` 파일 write/read 검증
- import cycle 간이 탐색: 실제 상호참조 cycle 없음. barrel/index 자기 참조성 노이즈만 탐지.

### P0. 즉시 막아야 할 항목

현재 기준 P0는 없음. 빌드/포맷/린트/문서 감사/전체 Jest가 모두 green이고, `dangerouslySetInnerHTML`/`document.write` 사용도 기존 정책 범위 안에 있다.

### P1. DB 구축 전 반드시 확정할 항목

| 항목 | 발견 내용 | 해야 할 일 |
| --- | --- | --- |
| localStorage 키 분류 | `v3:brand-master`, `v3:active-brand`, `v3:backup-history`, `v3:last-ip`, 검색/필터/draft/session 키가 혼재 | `LOCAL_DB_DEPLOY_PLAN.md` 9장에 서버 이동/브라우저 유지/폐기 표로 정리 완료. DB 스키마 작성 시 확정 |
| 브랜드 마스터 | 브랜드 CRUD는 `localStorage('v3:brand-master')` 기반이고 백업 영속 키에 포함됨 | 서버 DB 구축 시 `brands`/`brand_settings` 테이블로 승격 |
| 권한 모델 | 현재 내부 LAN 단일 도구 기준으로 일부 sync 메타는 UI 가드 중심 | 서버 전환 시 모든 write/delete/restore API에 서버 권한 검증 필요 |
| 복원 리허설 | 구조 테스트는 충분하나 실제 브라우저 IndexedDB 백업/복원 QA 기록은 별도 필요 | 백업 파일 생성 -> 전체 삭제/복원 -> 주요 화면 데이터 확인 리허설 |
| 실제 출력 QA | 보고서/CSV/XLSX/print 구조 테스트는 있으나 운영 파일 열람 기록 필요 | 대표 출력물을 실제 앱에서 생성 후 Excel/PDF/print 미리보기 확인 |
| 업로드 fixture QA | 공통 helper는 적용됐고 빈 CSV/헤더-only/필수 컬럼 누락 자동 테스트가 보강됨. 실제 실패행 다운로드/대용량/확장자오류/중복 업로드 UX 기록은 필요 | 가격/판매량/영양 베이스 업로드 fixture로 수동 QA 기록 |

### P2. 안정화/충돌 가능성 보완

| 항목 | 발견 내용 | 추천 조치 |
| --- | --- | --- |
| hook dependency 예외 | 현재 `react-hooks/exhaustive-deps` 예외 20건 + `no-img-element`/`no-unescaped-entities` 파일 예외가 존재 | `eslint-disable-policy.test.mjs`로 현재 허용 위치·카운트·사유를 고정 완료. 신규 예외가 생기면 테스트 실패 |
| 외부 IP 조회 | `lib/session.js`가 버튼 실행 시 `api.ipify.org`를 호출 | 서버 DB 이후에는 서버 세션 IP로 대체하거나 기능 제거/옵션화 |
| fetch timeout 정리 | 재확인 결과 `fetchClientIP()`는 `finally`에서 `clearTimeout(timer)` 처리됨 | 추가 작업 없음 |
| silent catch | 빈 catch 42건은 대부분 allowlist 정책 안에 있음 | 신규 빈 catch가 늘지 않도록 `silent-catch-policy.test.mjs` 유지 |
| 파일 업로드 정책 | 브랜드 복원 JSON 크기 제한이 빠져 있었음 | `checkFileSize(file, UPLOAD_MAX_MB.backup)` 추가 완료. 사진은 `resizePhoto()`의 5MB 가드 유지 |

### P3. 분리작업 후보

| 파일 | 현재 성격 | 판단 |
| --- | --- | --- |
| seed/rule 데이터 파일 | `lib/ingredient/data/master-import-seed.js` 1,383줄, `lib/sales/data/rules/rules-pizza.js` 1,110줄, `rules-side.js` 774줄, `lib/menu-master/seed.js` 679줄 | 코드 복잡도보다는 데이터 크기. 서버 DB 구축 전 seed JSON/CSV artifact와 loader 분리 후보 |
| CSS feature 파일 | `motion-note.css` 964줄, `home.css` 768줄, `cost.css` 633줄, report CSS 600줄대 | 화면 문제가 없다면 보류. 디자인 토큰/section 단위로 나누되 DB 전환 전 대형 churn은 피함 |
| `app/ingredient/manage/page.jsx` | 486줄, 관리 화면 상태·URL highlight·필터·권한 조립 | 기능은 안정적. 서버 DB 전환 시 page state/controller hook 분리 후보 |
| `lib/db/backup.js` | 383줄, 백업 export/import/복원 실행 orchestration | DB 구축 전 restore planner/executor/rollback journal로 분리하면 좋음 |
| `app/settings/restore/page.jsx` | 353줄, 복원 파일/미리보기/실행 상태 orchestration | 실제 복원 수동 QA 후 file/preview/execute controller hook 분리 후보 |
| `components/cost/manage/table-utils.js` | 347줄, 순수 util·cell view model·테이블 helper 혼재 | table helpers, cell components, controller hook으로 분리 후보 |
| `lib/price/use-price-upload.js`, `lib/shipment/use-shipment.js` | React hook이 `lib`에 위치 | 서버 DB 전환 전후 `hooks/` 또는 route-local hook으로 이동하고 upload service와 분리 |
| `app/nutrition/origin/page.jsx` | 311줄, 원산지 화면 데이터 조립+UI | DB 전환 후 adapter/query 기준으로 분리 |

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
| P1-4 note 전체 스캔 중복 | ✅ 완료 | `getAllNotes()`는 fresh read로 유지하고, 표시 전용 `getAllNotesCached()`를 신설해 짧은 TTL/in-flight 공유/쓰기 무효화/브랜드 필터 안전장치로 홈·저널·칸반·캘린더·검색 팔레트 중복 스캔을 줄임 |

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
| output artifact Jest | ✅ 통과 | 원산지·영양성분·판매량·원가 보고서 XLSX workbook/파일명/시트와 실제 `.xlsx` 바이너리 write/read 검증 4 tests |
| `npm run test:ci` | ✅ 통과 | 295 suites / 1771 tests |
| `npm run qa:full` | ⏳ 부분 확인 | 이번 재검증에서 dev smoke 22/22, mobile 22/22, runtime 67/67, workflow 21/21 개별 통과. prod 전체 QA는 별도 완료 |
| `npm run build:clean` | ✅ 통과 | compiled successfully, static pages 57/57 |

## 3-C. 현재 worktree 추가 스캔 결과 (2026-06-22)

목표: 현재 코드 기준으로 버그, 안정화, 반응속도, 편의 기능, 추가 기능 후보를 다시 넓게 훑고, 실제로 의미 있는 항목만 남긴다.

### 이번 스캔에서 직접 보완한 항목

| 항목 | 조치 | 검증 |
| --- | --- | --- |
| 노트 캐시 in-flight 무효화 race | 무효화 시 기존 in-flight를 끊고, 읽는 중 세대가 바뀌면 최신 세대 읽기를 다시 따르도록 보강 | `note-cache.test.mjs` 캐시 8케이스 |
| 노트 캐시 브랜드 필터 | raw cache는 공유하되 브랜드 필터는 호출 시점 기준임을 테스트로 고정 | `note-cache.test.mjs` |
| 검색 팔레트 노트 로드 | 표시 전용 팔레트에서 `getAllNotes()` 대신 `getAllNotesCached()` 사용 | `sales-navigation.test.mjs` |
| Saved Views import 오류 | `activeBrandId` 잘못된 import를 `getActiveBrandId`로 수정 | `settings-guards.test.mjs`, `qa:full` |
| 식자재 관리 highlight TDZ | `highlightId` state 선언을 참조 effect보다 위로 이동 | `ingredient-manage-undo-guards.test.mjs`, `/ingredient/manage` 200 |
| 숫자 저장 경계 NaN/음수 방지 | 식자재 벌크 import, 레시피 구성품, 판매가, 메뉴마스터 price sync/레시피 편집/인라인 숫자 편집에서 잘못된 숫자를 `NaN` 대신 `null` 저장 또는 저장 차단. 판매가·메뉴마스터 price와 원가 레시피 수량/단가는 음수도 `null` 처리 | `ingredient-product-code-dedup`, `recipe-master-sync`, `menu-recipe-components-keyboard`, `cost-manage-table-utils`, `menu-recipes`, `menu-price-store-safety`, `menu-master-price-sync` 테스트 |
| 제때 단가/출고량 write 권한 | 판매량 업로드와 동일하게 제때 단가 업로드/삭제, 출고량 업로드/삭제, 관리품목 추가/수정/삭제를 store 레벨 `assertActiveAdmin`으로 방어 | `destructive-action-guard-structure`, `price-store-read-guards`, `shipment-store-read-guards` 테스트 |
| 출고량 중복 업로드 race 회귀 | `saveShipmentUpload()`가 사전 중복 해시 검사뿐 아니라 트랜잭션 내부 `upload_log.fileHash` 재검사에서도 `DUPLICATE_HASH`로 중단되는지 테스트 추가 | `shipment-store-read-guards.test.mjs` 8케이스, 전체 `test:ci` 295 suites / 1771 tests |
| 노트 체인 브랜드 스코프 | 공유 DB의 `getNotesInChain()`도 `getAllNotes/getNoteById/deleteNote`와 동일하게 현재 브랜드 노트만 반환하도록 보강 | `note-sample-store-read-guards`, `note-shared-brand-scope`, `note-cache` 테스트 |
| 대표 XLSX 출력 artifact 검증 | 원산지·영양성분·판매량·원가 보고서 XLSX를 workbook으로 캡처하고 실제 `.xlsx` 파일로 저장 후 다시 읽어 시트명, 헤더, 브랜드/날짜 파일명, formula 셀 미생성을 고정 | `output-artifact-builders.test.mjs` 4케이스 |

### 자동 스캔 범위

| 스캔 | 확인한 신호 |
| --- | --- |
| 보류/TODO 문서 | `TODO`, `FIXME`, `보류`, `추후`, `임시`, deferred |
| 런타임 위험 패턴 | `dangerouslySetInnerHTML`, `document.write`, 직접 `innerHTML`, 직접 storage 접근 |
| 오류 처리 | `console.warn/error`, broad/empty `catch` |
| 데이터 성능 | `getAll*`, `clear()`, `runTransaction`, 대량 클라이언트 스캔 |
| 구조 크기 | 300줄 이상 JS/JSX/MJS/CSS/MD 파일 |

### 남은 보완 후보

| 우선순위 | 항목 | 현재 판단 | 다음 조치 |
| --- | --- | --- | --- |
| P0 | 문서 기준선 정합성 | 현재 진행 감사 문서의 최신 검증 기준은 295 suites / 1771 tests로 맞췄다 | 이후 테스트 수가 바뀌면 감사 문서와 함께 갱신 |
| P0 | production build gate | `build:clean` 통과, 3101번 격리 포트 `qa:prod` 통과 | 3000번 dev 서버와 충돌하지 않게 prod QA는 별도 포트 사용 |
| P0 | 외부 배포 인증 모델 | 현재 인증은 내부 LAN 클라이언트 쿠키/localStorage 전제 | 외부 접속 전 서버 세션, HttpOnly/Secure cookie, 서버 권한 체크로 전환 |
| P0 | 판매가 전체 교체 정책 | `previewMenuPriceReplacement()`와 업로드 UI에 기존/반영/유지·갱신/신규/삭제 예정 수량을 추가했다 | 추후 필요 시 병합/전체교체 모드 분리 |
| P1 | 판매가 교체 후 메뉴마스터 동기화 실패 | `_syncAfter()`가 동기화 실패를 결과 객체의 `sync.error`로 반환하고 UI에서 경고 toast로 노출한다 | 재시도 버튼은 운영 필요 확인 후 추가 |
| P1 | 원가 스냅샷 정책 | 원가마진/보고서가 최신 단가 기준으로 재계산될 수 있다 | 현재 원가와 저장 당시 원가 snapshot을 분리 |
| P1 | 숫자 파싱 정책 | 공통 원가 계산에서 잘못된 숫자를 `invalid-qty`/`invalid-price`로 진단하고 계산은 0으로 안전 처리하도록 보완했다. 레시피 구성품/판매가/메뉴마스터 저장 경계도 `NaN` 대신 `null` 저장으로 보강했다 | 다른 도메인 계산 경로도 동일 정책을 쓰는지 계속 확장 |
| P1 | 엣지 판매가 매칭 | 이름 문자열 매칭 의존도가 남아 있다 | 엣지 master와 판매가 menuCode/displayKey 명시 연결 |
| P1 | 대량 getAll 스캔 | 서버 DB 전환 전에는 IndexedDB 전체 스캔이 많다 | 서버 DB 구축 후 query/pagination API로 우선 전환 |
| P2 | localStorage 백업 범위 | 설정/임시/dismissed 상태가 섞일 여지가 있다 | 영속 설정, 임시 draft, UI 상태, 보안 상태 키를 문서와 테스트로 분류 |
| P2 | 출력/인쇄 HTML 정책 | `document.write`는 print helper로 한 곳에 모여 있으나 입력 HTML 생성자가 많다 | 출력 HTML builder별 escape 테스트 유지/확대 |
| P2 | error/empty 상태 통일 | 일부 화면은 console + toast, 일부는 배너/빈상태로 다르다 | `ErrorState`, `PartialFailureBanner` 공통 컴포넌트 적용 범위 확대 |
| P3 | CSS/대형 파일 정리 | CSS feature 파일과 seed/rule 데이터가 여전히 크다 | 기능 변경 시점에 data 파일/토큰/CSS 섹션 단위 분리 |

### 편의 기능·추가 기능 후보

| 우선순위 | 후보 | 기대 효과 |
| --- | --- | --- |
| P1 | 월마감 패키지 실제 생성 | 현재 체크리스트 성격을 실제 보고서/PDF/XLSX 묶음 생성으로 확장 |
| P1 | 업로드 전 변경 diff preview | 판매가/출고량/영양/원산지 업로드 전 추가·수정·삭제 수를 명확히 표시 |
| P1 | DB 전환 리허설 모드 | IndexedDB 백업 → 서버 DB import → 검산 → 롤백 rehearsal 명령 제공 |
| P2 | 전역 작업 이력/실행취소 센터 | 삭제/일괄변경/복원 등 위험 작업을 한곳에서 추적 |
| P2 | 저장된 뷰 확대 | 식자재 외 판매/영양/원산지/보고서 테이블에도 Saved Views 제공 |
| P2 | 데이터 신선도 배너 확대 | 단가/출고량/판매량/백업 오래됨을 화면 상단에서 일관 표시 |
| P2 | 운영 QA 체크리스트 화면 | DB 구축 전/후 사람이 확인해야 하는 Excel, 출력, 실제 데이터 검산 항목 관리 |
| P3 | 단축키 도움말 | 현재 단축키 사용 화면이 늘었으므로 `?` 또는 Cmd+/ 도움말 제공 |

### 거짓양성으로 제외한 항목

| 신호 | 제외 사유 |
| --- | --- |
| `dangerouslySetInnerHTML` in `app/layout.jsx` | 다크모드 FOUC 방지용 고정 스크립트, 사용자 입력 없음 |
| `document.write` in `lib/print/window-print.js` | 인쇄 팝업 공통 helper로 격리됨. HTML escape 테스트 확대 대상이지 즉시 금지는 아님 |
| `innerHTML` in `app/not-found.jsx` | 404 장식 DOM 초기화 전용, 사용자 입력 없음 |
| `console.*` in QA scripts | CLI 출력/검증 리포트 목적 |
| 다수 localStorage 접근 | 내부 LAN/IndexedDB 앱 구조상 의도된 영속 상태. 단, 백업 범위 분류는 남은 과제 |

## 3-D. 전체 기능/모듈 커버리지 매트릭스 (2026-06-22 현재)

이 표는 “어떤 영역을 확인했는지”를 추적하기 위한 현재 기준 인벤토리다. 숫자는 현재 worktree에서 재산출했다.

### 전체 수치

| 구분 | 현재 수 |
| --- | ---: |
| 전체 파일 | 1,481 |
| `app/**/page.*` | 56 |
| 실제 화면/리다이렉트 분류 기준 | 44 화면 / 12 리다이렉트 |
| `lib` 도메인 | 27 |
| `components` 도메인 | 17 |
| hooks 파일 | 59 |
| Jest 테스트 파일 | 295 |
| Jest 테스트 케이스 | 1,771 |
| runtime QA route | 67 |
| workflow QA 시나리오 | 21 |

### 화면 도메인별 확인 범위

| 화면 도메인 | page 수 | 주요 남은 관찰 포인트 |
| --- | ---: | --- |
| 홈 `/` | 1 | 액션센터/데이터 신선도/팔레트 캐시 기준 유지 |
| 로그인 `/login` | 1 | 외부 배포 전 서버 세션 전환 |
| 메뉴마스터 | 1 | 출시 준비 판정, 레시피 UX 잔여, 엣지/판매가 명시 연결 |
| 판매 `/menu-sales` | 7 | 업로드 diff preview, 분류 규칙 실행 함수 가드 유지, 대용량 판매량 query 전환 |
| 제때 `/jette` | 4 | 단가/출고량 동기화 실패 표시, 관리품목 migration 상태 표시 |
| 식자재 `/ingredient` | 4 | 영향도 preview, 삭제 cascade 재시도 UI, 대량 관리 UX |
| 원가 `/cost` | 12 | 원가 snapshot, 숫자 파싱 엄격화, margin/report 기준 분리 |
| 영양 `/nutrition` | 5 | 부분 누락 진단 기준, 출력 row 기준 테스트 유지 |
| 노트 `/note` | 9 | 캐시 무효화/브랜드 필터, draft/localStorage 백업 범위 |
| 보고서 `/report` | 6 | 월마감 패키지 실제 생성, 출력물 escape/인쇄 QA |
| 설정 `/settings` | 6 | 백업/복원 rehearsal, 권한/계정/브랜드 복원 경고 유지 |

### lib 도메인별 파일 수와 후속 포인트

| lib 도메인 | 파일 수 | 후속 포인트 |
| --- | ---: | --- |
| `nutrition` | 44 | 출력 기준/부분 누락/대량 import 정책 |
| `sales` | 43 | 업로드 diff, 분류 규칙, 대량 query |
| `cost` | 42 | 숫자 파싱, snapshot, 판매가 교체 정책 |
| `ingredient` | 24 | 삭제 cascade, 정리 도구, master seed data 분리 |
| `db` | 21 | 서버 DB migration adapter, 부분 복원 rollback |
| `ui` | 20 | 공통 error/empty/loading 상태 확대 |
| `note` | 17 | 캐시/임시저장/localStorage 범위 |
| `report` | 16 | 월마감 패키지, 출력/다운로드 파이프라인 |
| `stats` | 12 | 대량 데이터 getAll 축소 |
| `menu-master` | 9 | readiness와 판매가/레시피 연결 정책 |
| `shipment` | 9 | 출고량 집계 stale/관리품목 migration 표시 |
| `price` | 8 | 단가 upload 실패행/자동등록 결과 UX |
| `jette` | 5 | 가격/출고량 허브 상태 통합 |
| `backup` | 4 | localStorage key 분류, 리허설 |
| `sample` | 4 | 사진/샘플 E2E fixture 확대 |
| `auth` | 3 | 외부 배포 인증 모델 |
| 기타 11개 | 19 | 변경 시 구조 테스트 유지 |

### components 도메인별 파일 수와 후속 포인트

| components 도메인 | 파일 수 | 후속 포인트 |
| --- | ---: | --- |
| `cost` | 80 | 복잡 테이블/모달 성능, 숫자 오류 표시 |
| `report` | 63 | 월마감/출력/공유 UX |
| `nutrition` | 34 | 결과 row/toolbar 분리 유지, 출력 preview |
| `sales` | 34 | 업로드/미매칭 처리 UX 통일 |
| `jette` | 33 | 단가·출고량 상태/실패 표시 |
| `home` | 30 | 위젯 설정/액션센터/데이터 신선도 |
| `ui` | 29 | Saved Views, pagination, common state |
| `menu-master` | 28 | readiness/recipe UX |
| `ingredient` | 26 | batch confirm, impact preview, diagnostics |
| `note` | 20 | temp cost, draft, journal/kanban |
| `settings` | 17 | 복원/계정/권한 경고 |
| 기타 | 15 | 변경 시 구조 테스트 유지 |

### 다음 스캔 우선순위

1. 실제 CSV/XLSX/PDF/인쇄 출력물을 열어 파일명·컬럼·브랜드명·한글·수식 인젝션 방어를 확인한다.
2. P0 데이터 정책 3종: 판매가 전체교체 후속 모드, 복원 부분 실패 리허설, 인증 모델.
3. P1 계산 정책 3종: 숫자 파싱 확장, 원가 snapshot, 엣지 판매가 연결.
4. 편의 기능 3종: 업로드 diff preview, 월마감 실제 패키지, 운영 QA 체크리스트 화면.

## 3-E. 4차 추가 스캔 — storage/숫자/복원 상태/ID 충돌 보완

목표: 이미 green인 상태를 다시 처음 보는 기준으로 보고, 작은 footgun과 편의성 저하 지점을 추가로 줄인다.

### 이번 스캔에서 직접 보완한 항목

| 항목 | 조치 | 검증 |
| --- | --- | --- |
| 노트 작성/편집 폼 제안 로드 | `NoteFormBody`의 태그·메뉴명 제안 로드를 `getAllNotes()`에서 표시 전용 `getAllNotesCached()`로 변경해 홈/저널/폼 이동 시 중복 shared DB 스캔을 줄임 | `note-form-body-structure`, `note-cache` |
| Action Center storage 부재/손상 | `localStorage`가 없거나 차단된 환경에서도 dismiss/snooze 상태가 기본값으로 안전하게 동작하고, 빈 id·손상된 dismissed/snoozed 값을 읽을 때 정규화하도록 가드 추가 | `operational-state-helpers` |
| Change Log 손상값 정규화 | 저장된 이력의 `type/detail/limit`가 손상돼도 UI가 깨지지 않도록 type allowlist, detail 문자열화, limit clamp를 적용. 알 수 없는 type은 기록하지 않음 | `operational-state-helpers` |
| 로그인 비밀번호 storage 실패 | `verifyPassword/isAuthSetup/savePassword`에서 storage read 실패는 안전 실패, write 실패는 명확한 한국어 오류로 처리 | `auth-storage-safety` 신규 |
| 활성 계정 storage 실패 | 브랜드별 active account read/write가 storage 차단으로 앱을 깨뜨리지 않고 fail-closed/null 처리 | `accounts-active-key` |
| 복원 파일 재선택 상태 누수 | 자동백업 실패 후 다른 백업 파일을 선택할 때 이전 `backupFailed` 프롬프트가 남지 않도록 reset에 포함 | `restore-failed-stores-guard` |
| 임시 원가 행 ID 충돌 | `Date.now()` 단독 ID를 `timestamp-seq`로 바꿔 같은 밀리초에 여러 행 추가 시 key 충돌 방지 | `temp-cost-calculator-structure` |
| 엣지·도우 구성품 수량 음수 | 구성품 수량도 단가와 동일하게 0 이상 숫자만 저장되도록 검증 강화 | `edge-edit-modal-structure` |
| 인라인 판매가/수동단가 음수 UX | `InlineEditCell`에 `nonNegative` 옵션을 추가하고 판매가·식자재 수동단가 셀에서 음수 입력 저장을 UI 단계에서 차단 | `cost-manage-table-utils` |
| 인라인 숫자 입력 오류 표시 | invalid 숫자/필수값 누락을 조용히 무시하지 않고 셀 안에 오류 문구와 `aria-invalid`를 표시 | `cost-manage-table-utils` |

### 이번 스캔에서 확인한 남은 후보

| 우선순위 | 후보 | 판단 | 다음 조치 |
| --- | --- | --- | --- |
| P1 | 실제 브라우저 storage 차단 QA | 단위 테스트로는 가드 확인 완료, 실제 Safari private/기업 보안 브라우저 수동 확인은 미완료 | DB 구축 전 운영 QA 체크리스트에 포함 |
| P1 | 엣지·판매가 명시 연결 | 여전히 이름 기반 매칭 의존 영역이 남음 | 서버 DB 스키마 설계 시 `edgeCode/menuCode/displayKey` 외래키성 컬럼 확정 |
| P2 | `app/ingredient/manage/page.jsx` 추가 분리 | 470줄대지만 현재 페이지 orchestration 성격이 강하고 기능 분해는 상당히 완료 | DB adapter/query 전환 시 actions/tabs/dialogs 추가 분리 |
| P2 | `app/settings/restore/page.jsx` 추가 분리 | 300줄대지만 복원 흐름 상태가 한곳에 있어 추적은 쉬움 | 실제 복원 QA 후 file/execute state controller hook 분리 검토 |
| P2 | 공인 IP 조회 정책 | 자동 실행은 아니고 계정 화면 버튼 클릭 시만 `api.ipify.org` 호출 | 외부 배포 시 서버 프록시/비활성 옵션 결정 |

## 3-F. 5차 추가 스캔 — 출력/다운로드 파일명 안전성

목표: CSV/XLSX 수식 인젝션 방어와 대표 workbook 검증은 이미 되어 있으므로, 실제 운영 다운로드에서 남을 수 있는 파일명 footgun을 줄인다.

### 이번 스캔에서 직접 보완한 항목

| 항목 | 조치 | 검증 |
| --- | --- | --- |
| 다운로드 파일명 위험 문자 | 브랜드명·업무명·직접 파일명에 `/`, `\\`, `:`, `*`, `?`, 제어문자 등이 들어가도 경로처럼 해석되거나 OS 예약 문자로 깨지지 않도록 `makeFileName`, `withDownloadDateSuffix`에서 안전 치환 | `download-filename`, `output-artifact-builders`, `print-export-safety` |
| 브랜드별 업무 CSV 파일명 | 식자재 사용현황, 판매량 업로드 오류 목록, 제때 대상제품목록, 제때 최신단가, 제때 가격비교 CSV가 `makeFileNameWithBrand()`를 사용하도록 통일 | `download-filename`, `sales-upload-error-banner`, 전체 `test:ci` 295 suites / 1771 tests |

### 이번 스캔에서 확인한 남은 후보

| 우선순위 | 후보 | 판단 | 다음 조치 |
| --- | --- | --- | --- |
| P1 | 실제 다운로드 파일 열람 QA | XLSX 바이너리 read와 CSV 문자열 단위 테스트는 보강됐지만 실제 브라우저 다운로드 파일을 Excel/Numbers에서 여는 수동 검증은 아직 문서상 미완료 | DB 구축 전 운영 QA 체크리스트에서 대표 CSV/XLSX/PDF/인쇄 1회 기록 |
| P2 | 공유/템플릿 CSV 파일명 정책 | 브랜드별 업무 CSV 5개는 보완 완료. 샘플기록은 공유 DB 성격이라 active brand prefix가 오히려 오해를 만들 수 있고, 업로드 양식/백업 이력은 전역·템플릿 성격이라 예외 정책이 필요하다 | 샘플기록/백업이력/업로드양식은 별도 정책 결정 후 유지 또는 `makeFileName()` 적용. 예외 목록을 구조 테스트로 고정 |
| P2 | raw CSV 문자열 다운로드 API | `downloadCsvText`는 외부 호출 금지 테스트가 있으나 raw text라 셀 단위 sanitize가 불가능 | 신규 export는 계속 `downloadCsv(rows)` 경유 유지, 필요 시 `downloadCsvText` 내부 전용화 검토 |

## 3-G. 6차 재확인 — 노트 캐시/보류 항목 정합성

목표: 노트 캐시 구현 완료 보고 이후 실제 코드와 문서가 같은 상태를 가리키는지 다시 확인한다.

### 이번 재확인에서 확정한 내용

| 항목 | 판정 | 확인 내용 |
| --- | --- | --- |
| 노트 캐시 적용 범위 | ✅ 정상 | `getAllNotesCached()`가 홈 대시보드, 저널, 노트 목록, 칸반, 캘린더, 검색 팔레트, 노트 폼 제안 로드에 적용됨 |
| fresh read 경로 | ✅ 정상 | `getAllNotes()`, `deleteNote()` 자식 수집, `getNotesInChain()` 등 정합성 우선 경로는 직접 DB 읽기를 유지 |
| 쓰기 후 무효화 | ✅ 정상 | `addNote`, `updateNote`, `bulkUpdateBoardOrder`, `deleteNote`, `duplicateNote`가 커밋 후 `invalidateNotesCache()`를 호출. 삭제 실행취소의 `restoreRecord('menu_dev_notes', ...)` 직접 복원도 성공분이 있으면 `load()` 전에 캐시를 무효화 |
| in-flight race | ✅ 정상 | 읽는 중 무효화가 발생하면 오래된 응답을 캐시에 저장하지 않고 최신 세대 읽기를 따르도록 테스트로 고정 |
| 브랜드 전환 | ✅ 정상 | raw cache만 공유하고 브랜드 필터는 호출 시점에 적용해 main/china 등 멀티브랜드 표시가 섞이지 않음 |
| `setView` 보류 항목 | ✅ 보류 해소 | `app/ingredient/manage/page.jsx`의 초기 URL view 처리 effect는 `[setView, setCatFilter]` 의존성으로 정리되어 남은 `setView` 수정 대상이 아님 |

### 현재 남은 것은 코드 구현보다 운영 확인에 가까움

| 우선순위 | 남은 확인 | 이유 |
| --- | --- | --- |
| P1 | 실제 브라우저 데이터로 노트 화면 왕복 확인 | 자동 테스트는 통과 기준을 고정했지만, 실제 IndexedDB 데이터 양에서 홈→저널→칸반 이동 체감은 수동 확인이 가장 정확 |
| P1 | 대표 출력물 실제 열람 QA | XLSX 파일 write/read와 CSV 문자열 테스트는 충분하지만 Excel/Numbers/브라우저 다운로드 결과 열람 기록은 별도 운영 체크 |
| P1 | 백업/복원 실제 데이터 리허설 | DB 구축 전 백업 JSON을 마이그레이션 원본으로 쓸 가능성이 높아 실제 데이터 preview/restore/rollback 기록 필요 |

## 3-H. 7차 재확인 — DB 구축 전 localStorage/브랜드 설정 안전화

목표: 서버 DB 구축 전 브라우저 storage에 남아 있는 실제 업무 설정을 분류하고, 백업/복원 원본에서 빠지면 안 되는 키를 보강한다.

### 이번 스캔에서 직접 보완한 항목

| 항목 | 조치 | 검증 |
| --- | --- | --- |
| 브랜드 마스터 백업 누락 | `v3:brand-master`를 `PERSISTENT_LS_KEYS`와 `COMMON_LS_KEYS`에 포함해 백업 JSON과 복원 스코프에 브랜드 정의가 들어가도록 보강 | `backup-local-storage-keys`, `backup-restore-rehearsal` |
| 브랜드 설정 저장 실패 | `localStorage.setItem('v3:brand-master')` 실패 시 raw storage 오류 대신 한국어 오류를 던져 설정 UI toast가 이해 가능한 메시지를 표시하도록 변경 | `brand-master-storage-guards` |
| 브랜드 변경 이벤트 | 저장은 성공했는데 `CustomEvent`/`dispatchEvent`가 실패하는 특수 환경에서도 저장 결과가 깨지지 않도록 이벤트 발행을 best-effort로 분리 | `brand-master-storage-guards` |
| 저장뷰 백업 누락/키 정규화 | `saved_views_v1__{brand}__{screen}`와 `saved_views_v1_default__{brand}__{screen}` 패턴만 동적 백업/복원 허용. `screen` 이름도 저장 시 백업 가능한 문자 패턴으로 정규화해 저장은 됐지만 백업에서 빠지는 불일치를 방지 | `backup-local-storage-keys`, `backup-restore-rehearsal`, `operational-state-helpers` |
| 동적 storage 수집 실패 격리 | `localStorage.length` 또는 `localStorage.key(index)`가 실패해도 정적 영속 키 백업은 계속하고, 실패한 동적 키만 건너뜀 | `backup-local-storage-keys` |
| 과대 localStorage 복원 입력 제한 | 백업 JSON의 `localStorage` 맵이 비정상적으로 커도 정적 허용 키는 순서와 무관하게 직접 복원하고, 동적 키 탐색만 2000개로 제한. getter 실패 키는 건너뛰며, 잘림은 복원 오류 목록에 보고 | `backup-local-storage-keys` |
| 복원 전 localStorage 미리보기 | `validateBackupPayload`가 `localStorageSummary`로 복원 가능 키/무시 키/형식 오류/과대 입력을 요약. 전체 복원 미리보기와 브랜드 복원 confirm에서 설정값 적용 여부를 표시 | `backup-validation`, `restore-preview-structure`, `brand-restore-preview` |
| 설정 PIN 세션 저장소 fail-closed | PIN이 설정된 상태에서 `sessionStorage`가 차단되면 인증 성공처럼 처리하지 않도록 `readAuth()`와 `verify()`를 닫힌 방향으로 변경 | `settings-guards` |
| 공인 IP 응답 검증 | `fetchClientIP()`가 공백 IP를 캐시에 저장하지 않도록 trim/빈값 검증을 추가하고, 네트워크 실패·비정상 응답은 `null`로 안전하게 처리 | `session-storage-guards` |
| 월마감 기록 정규화 | `monthly_close_log_v1` 조회/저장 시 1~12월 밖의 기간, 알 수 없는 완료 항목, 손상된 완료 시각을 걸러 화면 최근 기록과 내부 조회가 깨지지 않도록 보강 | `operational-state-helpers`, `report-period` |
| 월마감 기록 백업 포함 | `monthly_close_log_v1`을 `PERSISTENT_LS_KEYS`와 `COMMON_LS_KEYS`에 포함해 백업/복원과 DB import 원본에서 월마감 이력이 빠지지 않도록 보강 | `backup-local-storage-keys`, `backup-restore-rehearsal` |
| 변경 이력 브랜드 삭제 범위 | 변경 이력 패널이 현재 브랜드 필터 상태에서 초기화할 때 다른 브랜드 이력까지 지우지 않도록 `clearChangeLogs({ brand })` 옵션과 테스트를 추가 | `operational-state-helpers` |
| 홈 할 일 완료 상태 백업 포함 | `v3:home-todo-done`을 공통 백업 키에 포함해 홈 위젯 설정은 복원되는데 완료 체크만 빠지는 비대칭을 해소 | `backup-local-storage-keys`, `backup-restore-rehearsal` |
| 노트 작성 기본 카테고리 백업 포함 | `v3:note_lastCategory`를 notes 스코프 백업 키에 포함해 새 노트 작성 기본값이 복원 후에도 유지되도록 보강 | `backup-local-storage-keys`, `backup-restore-rehearsal` |
| 보안/임시 storage 분류 보강 | `v3:auth-hash`, `v3:settings-pin`, `action_center_state_v1`, `recipe_recent_ingredients`, `v3:sales-pending-reclassify`의 백업 제외 사유를 DB 구축 문서에 명시 | 문서 검토 |
| 파괴적/업무 데이터 쓰기 가드 확대 | 영양 values(raw/menu-ref/edge/topping/composition/set), 원산지, 식자재 추가/수정/시드, 메뉴마스터 저장/동기화, 메뉴 판매가 CRUD, 엣지·도우 CRUD/시드, 판매량 미매칭 resolve, 메뉴 레시피, 공통 레시피 그룹, 공급사, 원가마진 스냅샷, 샘플 기록 쓰기/삭제 함수에 `assertActiveAdmin`을 추가 | `destructive-action-guard-structure`, 관련 타깃 테스트 |
| viewer UI 액션 정합성 | store 레벨 admin 가드가 있는 공통 원가 관리, 메뉴판매가 업로드, 메뉴마스터 출시 준비/빈상태/다이얼로그, 판매량 미매칭 해결, 판매량 설정 사용자 규칙·별칭·제외 섹션에서 viewer 편집 버튼·체크박스·자동완성·모달 진입을 비활성화 | `common-manage-view-structure`, `menu-master-p0-audit`, `unmatched-table-structure`, `role-gating-source`, `user-rules-section-structure`, `upload-policy`, `p5-dropdown-perf-guards` |
| 자동 보존기간 정리 guard | 작업 로그와 원가 업로드 로그 보존일에 음수·비정상 값이 들어와도 과도 삭제로 이어지지 않도록 기본 보존기간으로 정규화 | `work-log-prune`, `cost-upload-log-retention` |
| DB 구축용 storage 분류 | `LOCAL_DB_DEPLOY_PLAN.md` 9장에 서버 이동/브라우저 유지/폐기·세션 키 표를 현재 코드 기준으로 정리 | 문서 검토 + `audit:docs` |
| 보고서 draft storage 분류 | `report_draft_sales/cost/price/shipment/compare`는 보고서 빌더 임시 복원용 키라 백업 JSON·서버 import 원본에서 제외하는 것으로 문서화하고 회귀 테스트에 포함 | `backup-local-storage-keys` |
| 사진 업로드 정책 잠금 | 노트/샘플/식자재 사진 입력이 지원 이미지 필터, 5MB photo size guard, resize 전 검증, read-only/file input reset을 유지하도록 구조 테스트 보강 | `note-form-body-structure`, `sample-form-body-structure`, `ingredient-photos`, `image-resize-guards`, `upload-policy` |
| 드롭다운 지연 타이머 cleanup | 메뉴 레시피 식자재 검색과 식자재 제때 단가 가져오기 필드의 blur/focus 지연 타이머를 unmount 시 정리하도록 보강 | `menu-recipe-components-keyboard`, `ingredient-form-structure` |
| 설정 지연 작업 cleanup | 시스템 DB 재생성 reload 타이머와 브랜드 복원 file picker/reload 지연 작업을 unmount 시 정리하도록 보강. 남은 no-clear 타이머는 toast/download/print/reclassify 같은 전역 일회성 helper로 분류 | `settings-guards`, `brand-restore-preview` |

### 현재 남은 판단

| 우선순위 | 항목 | 판단 |
| --- | --- | --- |
| P1 | `saved_views_v1__{brand}__{screen}` | 백업/복원에는 포함 완료. 여러 PC 공유가 필요하면 서버 `saved_views` table로 승격 |
| P1 | `monthly_close_log_v1` | 백업/복원에는 포함 완료. 여러 PC에서 같은 월마감 이력을 공유해야 하면 서버 `monthly_close_runs` 또는 `report_jobs` table로 승격 |
| P1 | `change_log_v1` | 백업/복원 대상에서는 제외 유지. 운영 감사 로그가 필요하면 clear 가능한 localStorage가 아니라 서버 `change_logs` table로 승격 |
| P2 | `action_center_state_v1`, `recipe_recent_ingredients`, `v3:sales-pending-reclassify` | 개인 편의/일시 플래그라 백업 제외 유지. DB 전환 후에도 재계산 또는 클라이언트 캐시로 처리 |
| P0 | `v3:auth-hash`, `v3:settings-pin` | 백업 제외 유지. 서버 DB 구축 시 서버 인증/세션으로 대체하고 JSON 백업에는 포함하지 않음 |
| P1 | `v3:backup-history` | 백업 파일 자체가 아니라 로컬 이력 표시용. 서버 DB 도입 후 서버 작업 로그/백업 로그로 대체 |
| P2 | `v3:active-brand` | 현재 브라우저 선택값이라 백업/DB 원본에서 제외 유지. 서버 전환 후 session/user preference로 대체 가능 |
| P1 | 노트/일정 쓰기 권한 정책 | 10차 재확인에서 admin-only로 결정·구현. 서버 DB mutation도 같은 정책으로 admin 검증 필요 |

## 3-I. 8차 재확인 — admin UI/hook guard 잔여분 마감

목표: store 레벨 `assertActiveAdmin`은 있으나 화면/훅 레벨에서 viewer가 쓰기 플로우에 들어갈 수 있는 잔여 지점을 닫는다.

### 이번 스캔에서 직접 보완한 항목

| 항목 | 조치 | 검증 |
| --- | --- | --- |
| 판매량 업로드 viewer 진입 | `app/menu-sales/upload/page.jsx`에서 `useCurrentRole` 기반 `canEdit`을 계산하고 dropzone, 미리보기 반영, 이력 삭제에 전달. `useSalesUpload({ canEdit })`도 file/confirm/delete 핸들러 입구에서 return | `sales-upload-guard-structure`, `sales-upload-log`, `sales-navigation` |
| 메뉴마스터 액션 훅 guard | `useMenuMasterActions`에 `canEdit`/`requireEdit()`를 추가해 저장, 삭제, 삭제 영향 계산, 시드, 초기화가 훅 레벨에서도 viewer를 막도록 보강 | `menu-master-page-structure`, `menu-master-p0-audit`, `menu-master-price-sync` |
| 전체 복원 viewer 진입 | `app/settings/restore/page.jsx`에 `canRestore = roleReady && isAdmin`을 추가하고 파일 input, 실행 버튼, `handleRestore`를 모두 잠금 | `restore-failed-stores-guard`, `restore-execute-panel-structure`, `backup-restore-rehearsal`, `use-db-load` |
| 샘플 props 권한 계약 | 샘플 페이지 props 테스트 fixture에 `canEdit: true`를 명시하고, viewer 모드에서 route/action callback이 막히는 테스트를 추가 | `sample-page-controller-props`, `sample-page-structure` |
| 문서 수치 | 새 테스트 파일 추가에 맞춰 `SITE_STATUS.md` 테스트 파일 수를 295개(lib 268)로 갱신 | `audit:docs` |

### 최신 검증 기준선

| 명령 | 결과 |
| --- | --- |
| `npm run test:ci` | ✅ 295 suites / 1771 tests |
| `npm run lint` | ✅ No ESLint warnings or errors |
| `npm run format:check` | ✅ All matched files use Prettier code style |
| `npm run audit:docs` | ✅ SITE_STATUS.md 수치 일치 |
| `npm run build` | ✅ Compiled successfully, static pages 57/57 |
| `git diff --check` | ✅ 통과 |

### 이번 패스 후 남은 판단

| 우선순위 | 항목 | 판단 |
| --- | --- | --- |
| P1 | 노트/일정 쓰기 권한 정책 | 10차 재확인에서 regular notes/kanban/calendar write를 admin-only로 변경 완료. 서버 DB API에서도 동일 정책 적용 필요 |
| P1 | 실제 브라우저 권한 QA | 자동 구조 테스트는 통과. 실제 admin/viewer 계정 전환 후 판매량 업로드, 메뉴마스터, 전체 복원 버튼 상태를 브라우저에서 한 번 확인하면 더 좋음 |
| P1 | 서버 DB 전환 권한 모델 | 클라이언트 UI guard와 별개로 서버 API mutation은 반드시 admin 검증을 다시 해야 함 |

## 3-J. 9차 재확인 — 샘플 작성/편집 read-only UX 마감

목표: store/저장 handler는 viewer를 막지만, 화면 입력이 살아 있어 “작성은 되는 것처럼 보이나 저장은 안 되는” UX 불일치가 남았는지 확인한다.

### 이번 스캔에서 직접 보완한 항목

| 항목 | 조치 | 검증 |
| --- | --- | --- |
| 샘플 작성/편집 폼 read-only | `SampleFormBody`에 `readOnly`를 추가하고 새 샘플/샘플 수정 페이지에서 `readOnly={!canEdit}` 전달. viewer에서는 기본정보, 상세기록, 연결 제품, 사진 추가/삭제/캡션 변경이 모두 비활성화됨 | `sample-form-body-structure`, `sample-page-structure`, `sample-page-controller-props` |
| 샘플 사진 입력 | `SamplePhotoCard`에서 read-only일 때 dropzone/추가 버튼을 숨기고 file input, 삭제, 캡션 입력을 disabled 처리 | `sample-form-body-structure` |
| 샘플 연결 제품 입력 | `SampleLinkedProductsCard`에서 read-only일 때 검색 input, 후보 선택, 연결 제거를 비활성화 | `sample-form-body-structure` |
| 공통 입력 컴포넌트 disabled 지원 | `TagInput`과 `SegGroup`에 기본값 false의 `disabled` prop을 추가해 기존 노트 폼은 유지하고 샘플 폼만 read-only로 잠글 수 있게 함 | `tag-input`, `note-form-body-structure` |

### 검증

| 명령 | 결과 |
| --- | --- |
| `npm test -- --runTestsByPath __tests__/lib/sample-form-body-structure.test.mjs __tests__/lib/sample-page-structure.test.mjs __tests__/lib/sample-page-controller-props.test.mjs __tests__/lib/tag-input.test.mjs __tests__/lib/note-form-body-structure.test.mjs` | ✅ 5 suites / 19 tests |
| `npx next lint --quiet` | ✅ No ESLint warnings or errors |
| `npm run test:ci` | ✅ 295 suites / 1771 tests |
| `npm run lint` | ✅ No ESLint warnings or errors |
| `npm run format:check` | ✅ All matched files use Prettier code style |
| `npm run audit:docs` | ✅ SITE_STATUS.md 수치 일치 |
| `git diff --check` | ✅ 통과 |
| `npm run build` | ✅ Compiled successfully, static pages 57/57 |

빌드 참고: 포트 3000의 dev 서버가 떠 있는 상태에서는 `.next` dev 산출물과 production build가 섞일 수 있어 첫 빌드에서 stale chunk 오류가 날 수 있다. 최종 확인은 dev 서버를 종료한 뒤 production runtime이 새로 생성된 상태에서 `npm run build`를 재실행해 통과했다.

## 3-K. 10차 재확인 — 권한/원자성/성능/분리 후보 적대적 재검토

목표: 노트 캐시 완료 이후 “처음 보는 사람” 기준으로 안전장치, 분리작업, 안정화, 반응속도, 버그, 충돌 가능성을 다시 훑고, 데이터 손실 가능성이 있는 항목은 즉시 보강한다.

### 이번 스캔에서 직접 보완한 항목

| 항목 | 조치 | 검증 |
| --- | --- | --- |
| 보고서 저장/즐겨찾기 권한 | `saveReport`, `toggleReportFav`에 `assertActiveAdmin`을 추가하고 보고서 목록 UI에서도 viewer의 즐겨찾기/이름 수정 진입을 차단 | `report-index-guards`, `report-list-table-structure` |
| 메뉴 판매가 업로드 실패행 | 실패행이 1건이라도 있으면 “최신본으로 반영”을 막아 전체 판매가 교체 중 기존 데이터가 지워지는 위험을 차단. 실패행 CSV 다운로드 안내 유지 | `upload-policy`, `menu-price-store-safety` |
| 영양 기준데이터 전체 삭제 | `clearAllBaseData()`가 `nutrition_raw_values`와 `nutrition_menu_ref`를 단일 transaction으로 함께 clear하도록 변경 | `destructive-action-guard-structure`, `nutrition-values-dedup` |
| 영양 기준데이터 가져오기 저장 | `ImportBaseModal`의 행별 `upsertMenuRef`/`upsertRawValue` 루프를 `bulkUpsertBaseData()` 단일 transaction으로 교체. 중복 row 정리도 같은 transaction에서 수행 | `nutrition-allergen-links`, `nutrition-import-base-modal-structure` |
| 메인 노트 쓰기 권한 | `addNote`, `updateNote`, `bulkUpdateBoardOrder`, `deleteNote`, `duplicateNote`에 `assertActiveAdmin` 추가. 노트 목록/상세/작성/칸반 UI와 훅에 `canEdit` guard를 내려 viewer write 진입 차단 | `note-list-structure`, `note-cache`, `note-sample-store-read-guards`, `shared-db-init-guards` |
| 일정/체크리스트 쓰기 권한 | `addSchedule`, `updateSchedule`, `deleteSchedule`에 `assertActiveAdmin` 추가. 캘린더 일정 추가/수정, 오늘 체크리스트 연구일지 동기화, 날짜 셀/우측 패널 추가 버튼을 viewer에서 비활성화 | `note-shared-brand-scope`, `destructive-action-guard-structure` |
| 마진 플랫폼 수수료 저장 | `savePlatforms()`를 async admin-guard 함수로 바꾸고, localStorage/IndexedDB mirror 저장 전에 권한 확인. UI 저장 handler도 `canEdit` 확인 및 실패 toast 처리 | `platforms-mirror`, `destructive-action-guard-structure`, `margin-snapshots` |
| 제때 기준수량/관리품목 guard | `applySyncPlan`, `migrateExclusiveFromPriceList`, `seedManagedProductsIfEmpty`에 실행 함수 guard 추가. 자동 seed는 viewer에서 no-op | `sync-base-quantity`, `sync-base-qty-modal-structure`, `shipment-store-read-guards`, `jette-dashboard-guards` |
| 원산지 자동 마이그레이션 | 조회 화면 진입 중 실행되는 `migrateNutritionToIngredients()`가 viewer에서는 DB를 쓰지 않고 no-op하도록 변경 | `destructive-action-guard-structure` |
| 숨겨진 업로드 input disabled | `UploadDropzone`의 hidden file input에 `disabled`를 실제로 전달하고, change 이벤트에서도 disabled 상태를 재확인해 우회 파일 선택을 차단 | `upload-policy` |
| 식자재 일괄 단가 commit guard | exported DB write 함수 `commitBulkPrice()`에 `assertActiveAdmin` 추가 | `destructive-action-guard-structure`, `bulk-price-update` |
| 복원 실행 저널 | 전체 복원 시작/그룹 진행/완료/부분 실패/사전 검증 차단 상태를 `v3:restore-journal:last`에 best-effort로 기록. `importAll()` 반환 계약은 유지하고 store/error 목록은 상한을 둠 | `backup-restore-rehearsal`, `db-import-guards`, `destructive-action-guard-structure` |
| CSV quoted newline / CP949 디코딩 / TSV·세미콜론 / 출고량 xlsx 버퍼 파싱 | 공통 `readCsvFile()`이 quote 안 줄바꿈을 같은 필드로 유지하도록 문자 단위 파서로 교체. CSV 파일은 `arrayBuffer` 기반 `decodeCsvText()`로 읽어 UTF-8 실패 시 EUC-KR/CP949 fallback. 구분자도 쉼표·탭·세미콜론을 자동 감지하고 `.tsv` 확장자를 허용. 판매량·제때단가·출고량·메뉴판매가 CSV/TSV 업로드가 공통 경로를 사용. `readSpreadsheetFromBuffer()`를 async 계약으로 정리하고 출고량 업로드에서 `await`해 xlsx 파일이 Promise 상태로 넘어가는 버그를 차단 | `excel`, `upload-policy`, `business-fixtures`, `sales-upload-guard-structure` |
| 노트 viewer 빈 상태 CTA | 연구일지와 칸반 빈 상태의 “노트 작성” 버튼도 `useCurrentRole` 기반 `canEdit`으로 막아, viewer가 작성 화면까지 이동했다가 저장에서 차단되는 헛동선을 제거 | `use-db-load`, `kanban-board-guards` |
| 쓰기 화면 우회 진입 경로 | 커맨드 팔레트 정적/최근 항목, 전역 `n` 단축키, TopBar 플러스 버튼, 홈 빠른 버튼/빠른 메모가 viewer를 `/note/write`, `/note/sample/write`, `/menu-sales/upload`로 보내지 않도록 `canEdit` 필터와 disabled 상태를 적용 | `sales-navigation`, `topbar-structure`, `home-page-structure` |
| viewer 쓰기/복원 잔여 내비게이션 | 사이드바, 판매량 허브, 판매량 비교 빈 상태, 홈 액션센터/데이터 신선도/헬스체크/최근 활동/차트 빈 상태, 단축키 도움말까지 `requiresEdit`/`canEdit` 기반으로 재정렬. viewer는 `/note/write`, `/note/sample/write`, `/menu-sales/upload`, `/settings/restore` 직접 진입 CTA를 보지 않거나 판매량 분석 같은 읽기 화면으로 fallback | `sidebar-state`, `sales-navigation`, `action-center-build`, `module-health`, `home-page-structure` |
| 샘플 작성/편집 navigation self guard | 샘플 페이지 controller의 `openWrite`, `openSampleEditor`, `editDetail` 자체에도 `canEdit` 및 손상 id guard를 추가. 호출 props에서 막는 기존 계약에 더해 내부 함수 재사용 시 `/note/sample/write` 또는 `/note/sample/undefined`로 이동하는 위험을 차단 | `sample-page-controller-props`, `sample-page-structure` |
| 노트/샘플 handoff·draft key viewer 보호 | `/note/write`가 role 확인 전 `consumeNoteFrom`/`consumeHomeNoteDraft`를 실행하지 않도록 `roleReady && canEdit` 이후에만 draft/source key를 소비. `/note/sample/write`의 `consumeSampleFromNote`도 같은 방식으로 보호. viewer의 작성/상세 취소·임시저장 배너 무시가 `NOTE_DRAFT_WRITE` 또는 note detail draft를 clear하지 않도록 guard 추가. draft 배너와 autosave도 `canEdit`에 맞춰 숨김/중단 | `note-form-body-structure`, `note-detail-page-structure`, `sample-page-structure` |
| 자동 prune/direct helper guard | `AppShell` mount와 캘린더 데이터 로더에서 실행되는 `pruneOldWorkLogs()`를 `canEdit` 뒤로 이동하고, 직접 호출 방어를 위해 `pruneOldWorkLogs`, `pruneOldCostUploadLogs`, `replaceStoreForBrand`, `deleteFileWithLog`에도 `assertActiveAdmin`을 추가. 영양 values 내부 shared helper는 facade로 노출하지 않는 구조 테스트로 고정 | `app-shell-hydration`, `note-calendar-page-structure`, `destructive-action-guard-structure`, `silent-catch-policy` |
| UI 마크업 회귀 안전망 | 폼 안 버튼은 반드시 명시적 `type`을 갖고, 모든 `<img>`는 `alt`를 갖도록 전역 정적 테스트를 추가. 저장/취소/삭제 버튼이 기본 submit으로 오작동하거나 이미지 접근성 라벨이 빠지는 회귀를 차단 | `form-button-type-guard` |
| ESLint 예외 회귀 안전망 | 현재 코드의 `eslint-disable` 예외를 파일·rule·count·사유 allowlist로 고정. `react-hooks/exhaustive-deps` 20건, IndexedDB/base64 이미지용 `no-img-element` 3건, 한글 문구용 `no-unescaped-entities` 8건만 허용 | `eslint-disable-policy` |
| IndexedDB 접근 경계 안전망 | 앱 소스의 직접 `indexedDB.open()`은 `lib/db/init.js`, 직접 `indexedDB.deleteDatabase()`는 `lib/db/crud.js` wrapper에만 남도록 정책 테스트를 추가. 서버 DB adapter 전환 전까지 DB 접근 경계를 보존 | `storage-access-policy` |
| 외부 통신/위험 브라우저 API 안전망 | 앱 런타임 `fetch()`는 수동 공인 IP 조회용 `lib/session.js`만 허용하고, `eval`/`new Function`/문자열 timer는 금지. `dangerouslySetInnerHTML`, `window.open`/`document.write`, object URL 생성·해제도 지정 helper에만 남도록 정책 테스트 추가 | `browser-api-policy` |
| 식자재 undo/legacy cascade 직접 호출 guard | `restoreDeletedIngredientBackup`, `syncManagedScope`, `deleteAllergenLinksByIngredient`에 실행 함수 레벨 admin guard를 추가해 UI가 아닌 경로에서 직접 호출돼도 viewer DB mutation을 차단 | `ingredient-manage-undo-guards`, `nutrition-allergen-links` |
| 샘플 기록 대량 렌더 페이지네이션 | 샘플 grid/list가 필터 결과 전체를 한 번에 렌더링하던 구조를 `usePagination` + `Pagination`으로 24개씩 렌더링하도록 변경. 사진 data URL이 많은 환경에서 초기 렌더/스크롤 비용을 낮춤 | `sample-page-structure` |
| 연구일지 로드 실패 로그 컨텍스트 | `onError: console.error` raw 패턴을 제거하고 `[note/journal] load failed` 컨텍스트를 붙여 런타임 QA/브라우저 로그 원인 추적성을 개선 | `use-db-load` |
| 404 `innerHTML` 제거 | 404 장식 particle 컨테이너 정리를 `innerHTML = ''`에서 `replaceChildren()`으로 바꿔 전체 보안 스캔의 불필요한 고위험 DOM 패턴을 제거 | `random-id-guards` |
| 브랜드마스터 legacy profile 권한 wrapper 제거 | `lib/brand-master.js`에 남아 있던 예전 `isAdminProfile` wrapper를 제거해 브랜드 권한 기준을 활성 계정 역할(`useCurrentRole`)로 일원화 | `role-gating-source`, `brand-master-storage-guards` |

### 3-L. 11차 재확인 — 고위험 DOM/API 패턴 재스캔

목표: 전체 코드에서 문자열 DOM 주입, raw CSV helper, 팝업/인쇄, object URL, DB 삭제 같은 보안·데이터 위험 패턴을 다시 훑고, 실제 위험과 의도된 기능을 분리한다.

### 이번 스캔에서 직접 보완한 항목

| 항목 | 조치 | 검증 |
| --- | --- | --- |
| 404 페이지 `innerHTML` | 장식 particle 컨테이너 비우기를 `wrap.replaceChildren()`으로 변경. XSS 경로는 아니었지만 고위험 패턴 검색 결과에서 제거 | `random-id-guards.test.mjs` 3 tests |

### 남은 패턴 판정

| 패턴 | 위치 | 판정 |
| --- | --- | --- |
| `dangerouslySetInnerHTML` | `app/layout.jsx` | 고정 다크모드 초기화 스크립트. 사용자 입력 없음 |
| `URL.createObjectURL` | `lib/download.js`, `lib/image/resize.js` | 다운로드/이미지 리사이즈 기능. revoke 처리 있음 |
| `downloadCsvText` | `lib/download.js` | helper 선언만 남음. 실제 앱 호출 없음 |
| `window.open` / `document.write` | `lib/print/window-print.js` | 공통 인쇄창 helper. HTML builder escape 테스트 유지 |
| `indexedDB.deleteDatabase` | `lib/db/crud.js`, `app/settings/system/page.jsx` | 시스템 위험 영역 전용. UI 확인 버튼 + `assertActiveAdmin` guard 존재 |

### 검증

| 명령 | 결과 |
| --- | --- |
| `npm test -- --runTestsByPath __tests__/lib/random-id-guards.test.mjs --runInBand` | ✅ 1 suite / 3 tests |
| `npm run test:ci` | ✅ 295 suites / 1771 tests |

### 3-M. 12차 재확인 — 권한 정책 잔재 제거

목표: 활성 계정 역할 기반 권한 정책과 어긋나는 legacy profile 권한 API가 남아 있는지 확인한다.

### 이번 스캔에서 직접 보완한 항목

| 항목 | 조치 | 검증 |
| --- | --- | --- |
| 브랜드마스터 profile 권한 wrapper | `lib/brand-master.js`의 `@/lib/profile` import와 `isAdminProfile` re-export 제거. 브랜드마스터 lib는 localStorage 메타 함수만 제공하고, UI 권한은 `app/settings/brands/page.jsx`의 `useCurrentRole`이 담당하도록 기준 통일 | `role-gating-source`, `brand-master-storage-guards` |

### 검증

| 명령 | 결과 |
| --- | --- |
| `npm test -- --runTestsByPath __tests__/lib/role-gating-source.test.mjs __tests__/lib/brand-master-storage-guards.test.mjs __tests__/lib/eslint-disable-policy.test.mjs __tests__/lib/destructive-action-guard-structure.test.mjs --runInBand` | ✅ 4 suites / 32 tests |
| `npm run test:ci` | ✅ 295 suites / 1771 tests |

### 3-N. 13차 재확인 — 대형 seed/rule/CSS 파일군 검토

목표: 남은 대형 파일군 중 데이터성 파일과 CSS 파일이 실제 런타임 위험 또는 레이아웃 충돌을 만들고 있는지 확인한다.

### 이번 스캔에서 직접 보완한 항목

| 항목 | 조치 | 검증 |
| --- | --- | --- |
| seed/rule 데이터 구조 | `INGREDIENT_MASTER_SEED` 80건, `MASTER_IMPORT_SEED` 115건, `SALES_RULES` 255건 기준으로 중복 productCode, 중복 ruleId, 필수 필드 누락, rule pattern 중복이 없는지 확인. 대형 데이터 디렉터리에서 storage/fetch/clear/delete/eval 같은 런타임 위험 패턴 없음 | `sales-seed-data.test.mjs` 3 tests + one-off export 검증 |
| report preview CSS 소유권 충돌 | `motion-report.css`가 `.preview-shell`, `.preview-body`, `.preview-pager` 레이아웃을 뒤에서 덮던 구조를 제거하고, report preview 레이아웃은 `report/modal.css`가 소유하도록 정리. pager 버튼/카운터 스타일은 `report/modal.css`로 이동 | `css-primitive-ownership`, `report-preview-modal-structure` |
| 정의되지 않은 CSS 토큰 | `motion-report.css`의 `var(--surface-1)`을 정의된 `var(--surface)`로 교체하고 회귀 테스트 추가 | `css-primitive-ownership` |

### 검증

| 명령 | 결과 |
| --- | --- |
| `npm test -- --runTestsByPath __tests__/lib/sales-seed-data.test.mjs --runInBand` | ✅ 1 suite / 3 tests |
| `npm test -- --runTestsByPath __tests__/lib/css-primitive-ownership.test.mjs __tests__/lib/report-preview-modal-structure.test.mjs --runInBand` | ✅ 2 suites / 9 tests |

### 이번 패스 후 남은 판단

| 우선순위 | 항목 | 판단/작업 방향 |
| --- | --- | --- |
| P1 | report preview 실제 화면 확인 | CSS ownership 충돌은 정적 테스트로 막았지만, 실제 보고서 preview modal을 390px/desktop에서 한 번 열어 스크린샷 확인 권장 |
| P2 | 대형 seed/rule 데이터 파일 분리 | 현재 중복/필드 오류는 없지만 파일 크기는 큼. 서버 DB 전환 전 JSON/CSV artifact + loader 형태로 분리 후보 |
| P2 | motion CSS 책임 축소 | `motion-report.css`, `motion-note.css`에는 아직 print/mobile/상태 스타일이 섞여 있다. 실제 화면 문제가 확인되는 구간만 좁게 분리 |

### 이번 재탐색에서 남긴 후속 후보

| 우선순위 | 항목 | 판단/작업 방향 |
| --- | --- | --- |
| P1 | 백업/복원 planner/executor/rollback 분리 | 경량 execution journal은 `v3:restore-journal:last`로 완료. 남은 것은 서버 DB 구축 전 restore plan, 실패 store 재시도, rollback 안내/기록을 별도 모듈로 분리하는 작업 |
| P1 | 실제 데이터 백업 JSON → 서버 DB import 리허설 | 서버 DB를 다른 컴퓨터에 구축할 예정이면 현재 PC에서 백업 JSON 샘플을 만들고, 대상 PC에서 import rehearsal/검산 로그를 남겨야 한다 |
| P1 | 홈/판매량 `sales_rows` 전체 스캔 | 홈 대시보드와 판매 리포트/비교가 기간 변경마다 큰 `sales_rows`를 읽는다. 서버 DB 전환 시 `year_month`, `menuCode`, `fileId` 기준 query/index API로 우선 교체 |
| P1 | 영양 메뉴 중복 진단 재스캔 | nutrition menu initial load에서 raw/menu ref를 읽고 duplicate diagnostics가 다시 읽는 구조. 이미 로드한 rows를 diagnostics에 넘기거나 lazy diagnostics로 전환 |
| P1 | sample grid/list 대량 렌더 | 샘플 사진 data URL과 전체 필터 row가 많아질수록 느려질 수 있다. pagination/thumbnail projection/virtual list 후보 |
| P2 | `lib/ingredient/index.js` UI coupling | facade가 component constants/row builder와 엮인 냄새가 있다. TYPE_LABEL 등 domain constants를 lib로 내리고 UI row builder는 component 영역에 둔다 |
| P2 | `lib/price/use-price-upload.js`, `lib/shipment/use-shipment.js` | React hook이 `lib`에 있어 계층이 흐리다. 서버 DB 전환 전후 `hooks/` 또는 route-local hook으로 이동하고 upload service와 분리 |
| P2 | `components/cost/manage/table-utils.js` | 순수 util, hook, JSX cell, toolbar가 섞여 있다. table helpers/cell components/controller hook으로 분리 |
| P2 | system reset/restore 부분 실패 | 전체 초기화/복원 계열은 실패 store 표시와 recovery log가 더 필요하다. 현재 green이지만 운영 데이터 기준 리허설 전까지 P1/P2로 추적 |
| P2 | 외부 특수 CSV fixture 확대 | quoted newline, EUC-KR/CP949 fallback, 탭/세미콜론 구분, `.tsv`, 출고량 xlsx buffer await는 완료. 남은 것은 실제 협력사/매장 원본 CSV에서 깨진 따옴표, 고정폭 텍스트, 특수 구분자 같은 샘플을 더 모으는 일 |
| P3 | README/SITE_AUDIT_REPORT 오래된 수치 | `package.json`과 문서의 Next 버전/대형 파일 통계가 어긋난 문서가 있다면 정리 필요 |

### 최신 검증 기준선

| 명령 | 결과 |
| --- | --- |
| 보고서 권한 타깃 테스트 | ✅ 7 suites / 23 tests |
| 메뉴 판매가 업로드 안전화 타깃 테스트 | ✅ 4 suites / 68 tests |
| 영양 기준데이터/노트/권한 타깃 테스트 | ✅ 7 suites / 51 tests |
| 노트/캘린더 권한 타깃 테스트 | ✅ 8 suites / 52 tests |
| 마진/제때/권한 guard 타깃 테스트 | ✅ 5 suites / 47 tests |
| 복원/권한 저널 타깃 테스트 | ✅ 3 suites / 58 tests |
| CSV/xlsx 파서 타깃 테스트 | ✅ 4 suites / 75 tests |
| 노트 빈 상태 viewer CTA 타깃 테스트 | ✅ 2 suites / 34 tests |
| 팔레트/단축키/홈 CTA 타깃 테스트 | ✅ 3 suites / 18 tests |
| viewer 내비게이션 잔여 타깃 테스트 | ✅ 5 suites / 35 tests |
| 식자재 undo/cascade guard 타깃 테스트 | ✅ 2 suites / 17 tests |
| 샘플 페이지네이션 타깃 테스트 | ✅ 1 suite / 4 tests |
| 연구일지 로그 컨텍스트 타깃 테스트 | ✅ 1 suite / 30 tests |
| 샘플 navigation/draft viewer 보호 타깃 테스트 | ✅ 4 suites / 16 tests |
| 자동 prune/handoff viewer 보호 타깃 테스트 | ✅ 3 suites / 8 tests |
| ESLint 예외 정책 타깃 테스트 | ✅ 1 suite / 2 tests |
| IndexedDB 접근 정책 타깃 테스트 | ✅ 1 suite / 2 tests |
| 위험 브라우저 API 정책 타깃 테스트 | ✅ 1 suite / 4 tests |
| `npm run test:ci` | ✅ 295 suites / 1771 tests |
| `npm run lint` | ✅ No ESLint warnings or errors |
| `npm run format:check` | ✅ All matched files use Prettier code style |
| `npm run audit:docs` | ✅ SITE_STATUS.md 수치 일치 |
| `git diff --check` | ✅ 통과 |
| `npm run build:clean` | ✅ Compiled successfully, static pages 57/57 |
| dev SSR smoke | ✅ `/`, `/note`, `/note/board`, `/menu-sales/upload` 모두 200 |

## 4. 권장 커밋 단위

- 한 단계당 최소 1커밋, 위험한 단계는 세부 기능별 커밋.
- 문서-only 변경과 코드 변경은 가능한 분리.
- QA 실패 수정 커밋은 `fix:`로 별도 분리.
- 커밋 전 `git status --short`와 `git diff --check` 확인.

## 5. 현재 즉시 추천 순서

1. 1단계 운영 QA 후속: 실제 출력물 열람, 백업/복원 브라우저 리허설, 업로드 fixture QA.
2. `docs/CODE_CLEANLINESS_AUDIT_2026-06-20.md`가 다시 생기면 이 문서에 흡수 후 중복 문서로 남기지 않는다.
3. 4단계 N-43 과거 단가 명세 결정 후 구현 여부 선택.
4. 5단계 영양성분 부분 누락 기준 결정 후 구현 여부 선택.
5. 코드 청결도 후속 정리: 백업/복원 리허설, CSS/design system 반복 패턴 정리, upload/import fixture QA.
6. 안전성·일관성 후속 점검: 백업 범위, hook dependency 예외, 신규 업로드 화면 정책 유지, XLSX formula injection 방어 검토.
7. 11단계 외부 배포 보안은 외부 배포 결정 전까지 보류.
