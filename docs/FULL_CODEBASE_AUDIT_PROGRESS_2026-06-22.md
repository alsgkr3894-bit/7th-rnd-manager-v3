# 전체 코드 검수 진행 보고서

- 작성일: 2026-06-22
- 목적: 현재 워크트리 기준 전체 코드 검수 진행 상황과 발견 이슈 기록
- 직접 수정 여부: 코드 및 문서 수정 있음
- 완료 판정: 미완료. 전체 코드 검수 목표는 아직 active 상태로 유지해야 한다.

---

## 1. 검수 범위

- 스캔 대상: `app`, `components`, `hooks`, `lib`, `scripts`, `__tests__`
- 파일 수: 코드/CSS/JSON 기준 1,447개
- 총 라인 수: JS/JSX/MJS/CSS 기준 약 153,992줄
- 테스트 파일 수: 295개
- Jest 테스트 수: 1,776개
- 현재 브랜치: `master`

현재 워크트리에는 Claude Code/사용자 작업으로 보이는 미커밋 수정과 신규 파일이 포함되어 있다. 본 검수에서는 확인된 실패 지점만 좁게 수정했고, 기존 미커밋 작업을 되돌리지 않았다.

---

## 2. 이번 검증 결과

| 명령 | 결과 | 메모 |
| --- | --- | --- |
| `node --experimental-vm-modules node_modules/jest/bin/jest.js __tests__/lib/ingredient-impact.test.mjs --runInBand` | PASS | 신규 영향도 계산 테스트 3개 |
| `node --experimental-vm-modules node_modules/jest/bin/jest.js __tests__/lib/menu-readiness-output-coverage.test.mjs __tests__/lib/action-center-build.test.mjs --runInBand` | PASS | 신규 readiness/action-center 테스트 5개 |
| `node --experimental-vm-modules node_modules/jest/bin/jest.js __tests__/lib/operational-state-helpers.test.mjs --runInBand` | PASS | Saved Views/Monthly Close/Change Log/Action Center 테스트 |
| `node --experimental-vm-modules node_modules/jest/bin/jest.js __tests__/lib/output-artifact-builders.test.mjs --runInBand` | PASS | 대표 XLSX 출력 artifact 4종 workbook/파일명/시트 + 실제 `.xlsx` 바이너리 write/read 검증 |
| `node --experimental-vm-modules node_modules/jest/bin/jest.js __tests__/lib/business-fixtures.test.mjs __tests__/lib/upload-policy.test.mjs --runInBand` | PASS | 판매량 빈 CSV/헤더-only, 제때단가·출고량·메뉴판매가 필수 컬럼 누락/헤더-only 업로드 방어 |
| `npm test -- --runTestsByPath __tests__/lib/excel.test.mjs __tests__/lib/upload-policy.test.mjs __tests__/lib/business-fixtures.test.mjs __tests__/lib/sales-upload-guard-structure.test.mjs` | PASS | quoted newline CSV, EUC-KR/CP949 fallback, 탭/세미콜론 구분자, `.tsv`, csv/xlsx buffer 파싱, 출고량 xlsx await 회귀 포함 4 suites, 75 tests |
| `node --experimental-vm-modules node_modules/jest/bin/jest.js __tests__/lib/output-csv-artifacts.test.mjs --runInBand` | PASS | 메뉴마스터·원가마진표·알레르기 CSV rows/파일명 실행 검증 |
| `node --experimental-vm-modules node_modules/jest/bin/jest.js __tests__/lib/ingredient-manage-undo-guards.test.mjs __tests__/lib/palette-recent.test.mjs --runInBand` | PASS | 식자재 팔레트 deep link/highlight 회귀 테스트 |
| `npm run format:check` | PASS | Prettier 위반 해소 |
| `npm run lint` | PASS | React hook dependency 경고 해소 |
| `npm test -- --runTestsByPath __tests__/lib/backup-restore-rehearsal.test.mjs __tests__/lib/db-import-guards.test.mjs __tests__/lib/destructive-action-guard-structure.test.mjs` | PASS | 복원 저널/복원 구조/권한 guard 3 suites, 58 tests |
| `npm run test:ci` | PASS | 295 suites / 1776 tests |
| `npm run audit:docs` | PASS | `SITE_STATUS.md` 수치와 코드 수치 일치 |
| `npm run build:clean` | PASS | compiled successfully, static pages 57/57 |
| `HOST=127.0.0.1 PORT=3101 BASE=http://127.0.0.1:3101 npm run qa:prod` | PASS | prod smoke 22/22, mobile 22/22, runtime 67/67, workflow 21/21 |
| `npm run qa:workflow` | PASS | 최신 dev 재실행: 21/21. 백업 실제 복원 실행, 메뉴마스터 CSV 다운로드 파일 검증, 판매량 잘못된 확장자 UX, 출고량 CSV 실제 업로드 오류/저장 UX, 메뉴판매가 실패행 CSV 다운로드 시나리오 포함 |
| 메뉴마스터 출시 준비 탭 직접 확인 | PASS | 임시 IndexedDB fixture로 `출시 가능` 렌더 확인 후 정리 |
| `git diff --check` | PASS | 공백 오류 없음 |

`qa:runtime`은 일반 sandbox 실행에서 Chromium Mach port 권한 문제로 브라우저가 뜨기 전 실패했다. 같은 명령을 권한 상승으로 재실행해 실제 런타임 라우트 검증은 67/67 통과했다.

---

## 3. 이번에 해결한 확정 이슈

### 해결됨: 식자재 팔레트 deep link가 현재 페이지 밖 행을 보여주지 못함

- 수정 위치:
  - `hooks/usePaletteItems.js`
  - `app/ingredient/manage/page.jsx`
  - `app/ingredient/manage/IngredientManagePanel.jsx`
  - `components/ingredient/ManageRow.jsx`
  - `__tests__/lib/ingredient-manage-undo-guards.test.mjs`
- 이전 문제:
  - 커맨드 팔레트에서 식자재를 선택하면 `query/highlight`는 들어갔지만, 대상 행이 2페이지 이후에 있으면 현재 페이지에서 보이지 않을 수 있었다.
  - `id`가 없는 데이터 변형에 대비한 `productCode` fallback도 부족했다.
- 조치:
  - 팔레트 식자재 href에 `productCode` fallback 파라미터를 추가했다.
  - 식자재관리 화면에서 `highlight` 또는 `productCode`로 대상 행을 찾고, 대상이 있는 페이지로 이동한 뒤 화면 중앙으로 스크롤한다.
  - 강조 대상 행에 `data-ingredient-highlighted` 속성을 추가해 스크롤 대상이 명확해지도록 했다.
- 검증:
  - `ingredient-manage-undo-guards` 구조 테스트로 deep link 파라미터, 페이지 이동, 스크롤 대상 속성을 고정했다.
  - 전체 `npm run test:ci` PASS.

### 해결됨: 식자재 단가 변경 영향도 계산 단위 오류

- 수정 위치:
  - `lib/impact/ingredient-impact.js`
  - `components/impact/ImpactPreviewPanel.jsx`
  - `app/ingredient/manage/IngredientForm.jsx`
  - `__tests__/lib/ingredient-impact.test.mjs`
- 이전 문제:
  - 식자재 포장가(`priceWithTax`)를 레시피 수량과 직접 곱할 수 있어 원가율 preview가 크게 왜곡될 수 있었다.
  - 식자재 폼에서 기준수량(`baseQuantity`)을 영향도 패널로 넘기지 않아 실제 화면 preview가 표시되지 않거나 잘못 계산될 수 있었다.
- 조치:
  - 포장가와 기준수량으로 사이트 공통 정책인 `calcUnitPrice`를 사용해 단위단가를 계산한다.
  - 기존/변경 기준수량을 `ImpactPreviewPanel`로 전달한다.
  - 기준수량이 없으면 잘못된 0원 영향도를 만들지 않고 빈 결과로 종료한다.
  - 포장가 변경, 기준수량 변경, 기준수량 누락 케이스를 단위 테스트로 고정했다.
- 검증:
  - 신규 단독 테스트 PASS
  - 전체 `npm run test:ci` PASS

### 해결됨: 포맷 검증 실패

- 이전 문제:
  - `npm run format:check`가 6개 파일에서 실패했다.
- 조치:
  - Prettier를 적용했다.
- 검증:
  - `npm run format:check` PASS

### 해결됨: 복원 실행 사후 추적 저널 부재

- 수정 위치:
  - `lib/backup/restore-journal.js`
  - `lib/db/backup.js`
  - `__tests__/lib/backup-restore-rehearsal.test.mjs`
  - `__tests__/lib/destructive-action-guard-structure.test.mjs`
- 이전 문제:
  - 전체 복원 결과는 완료 카드와 console 중심으로 남아, 브라우저 새로고침/이탈 후 마지막 복원 시도의 상태를 추적하기 어려웠다.
  - 서버 DB 구축 전 실제 백업 JSON import 리허설에서 “언제, 어느 브랜드에, 어느 store 그룹까지 적용됐는지”를 확인할 경량 기록이 부족했다.
- 조치:
  - `v3:restore-journal:last`에 마지막 복원 시도의 시작/진행/완료/부분 실패 상태를 기록한다.
  - 기존 `importAll()` 반환 계약은 그대로 유지하고, 저널은 별도 best-effort 기록으로만 남긴다.
  - store 목록과 오류 목록은 각각 상한을 둬 localStorage 오염을 막는다.
- 검증:
  - 복원 리허설 테스트에 저널 round-trip/오류 길이 제한/삭제 테스트를 추가했다.
  - 구조 테스트로 `importAllToBrand()`가 `createRestoreJournal`/`updateRestoreJournal`와 실패 상태를 남기는 흐름을 고정했다.

### 해결됨: CSV quoted newline, CP949 디코딩, TSV/세미콜론, 출고량 xlsx 버퍼 파싱 오류

- 수정 위치:
  - `lib/excel.js`
  - `lib/shipment/use-shipment.js`
  - `__tests__/lib/excel.test.mjs`
  - `__tests__/lib/upload-policy.test.mjs`
- 이전 문제:
  - `readCsvFile()`이 quote 처리 전에 `split(/\r?\n/)`로 먼저 줄을 잘라 `"첫 줄\r\n둘째 줄"` 같은 정상 CSV 필드를 여러 행으로 오인할 수 있었다.
  - 판매량·제때단가·메뉴판매가 CSV 업로드가 UTF-8 전용 `file.text()` 또는 `readAsText(..., 'utf-8')` 경로를 사용해 Windows Excel CP949/EUC-KR CSV 한글이 깨질 수 있었다.
  - 외부 시스템이 CSV라고 주지만 실제로는 탭 또는 세미콜론 구분자인 파일과 `.tsv` 파일을 받을 수 없었다.
  - `readSpreadsheetFromBuffer()`가 xlsx에서 Promise를 반환하는데 출고량 업로드가 `await`하지 않아 xlsx 업로드 시 `headers/rows`가 비어 있는 것처럼 처리될 수 있었다.
- 조치:
  - CSV 파서를 문자 단위로 바꿔 quote 안의 CRLF/LF는 필드 내용으로 보존한다.
  - CSV 파일은 `arrayBuffer`로 읽고 `decodeCsvText()`에서 UTF-8 fatal 디코딩 실패 시 EUC-KR로 fallback한다.
  - quote 밖 구분자를 기준으로 쉼표·탭·세미콜론을 자동 감지하고 `.tsv`를 업로드 허용 목록에 추가했다.
  - 판매량·제때단가·출고량·메뉴판매가 CSV/TSV 업로드가 공통 스프레드시트 파서를 쓰도록 정리했다.
  - `readSpreadsheetFromBuffer()`를 async 계약으로 정리하고 출고량 업로드에서 `await`한다.
- 검증:
  - quoted newline CSV, EUC-KR/CP949 CSV, 탭/세미콜론 구분자, `.tsv`, csv/xlsx buffer 파싱, 출고량 xlsx await 구조 테스트를 추가했다.
  - 기존 business fixture 업로드 테스트와 함께 타깃 75개가 통과했다.

### 해결됨: React hook dependency 경고

- 수정 위치:
  - `app/menu-master/page.jsx`
  - `components/ui/SavedViewSelector.jsx`
- 이전 문제:
  - 메뉴마스터의 빈 배열/빈 Map fallback이 매 렌더 새 참조를 만들 수 있었다.
  - 저장된 뷰 컴포넌트의 `refresh` 함수가 effect dependency에 포함되지 않았다.
- 조치:
  - 빈 배열/빈 Map을 컴포넌트 외부 상수로 고정했다.
  - `refresh`를 `useCallback`으로 안정화하고 effect dependency에 포함했다.
- 검증:
  - `npm run lint` PASS, warning 0개

### 해결됨: 출시 준비 탭의 원산지/알레르기 판정 단순화

- 수정 위치:
  - `lib/menu-master/readiness.js`
  - `__tests__/lib/menu-readiness-output-coverage.test.mjs`
- 이전 문제:
  - 원산지/알레르기 준비 상태를 `nutrition_menu_ref` 존재 여부 중심으로 판단했다.
  - 실제 출력 row가 비어 있는데도 “출시 가능”으로 보일 수 있었다.
- 조치:
  - 원산지 페이지의 실제 `buildOriginMenuRows` 결과를 기준으로 원산지 출력 가능 여부를 판단한다.
  - 알레르기 페이지의 실제 `buildMenuMatrix` 결과를 기준으로 알레르기 출력 가능 여부를 판단한다.
  - 식자재, 레시피, 공통원가 묶음, 엣지, 토핑/파생구성까지 포함해 출력 커버리지를 계산한다.
- 검증:
  - 실제 원산지/알레르기 출력 row가 있는 메뉴는 `ok`.
  - 영양값이 있어도 원산지/알레르기 출력 row가 없으면 `missing`.

### 해결됨: Action Center 숨김 ID가 원인 변화와 분리되지 않음

- 수정 위치:
  - `lib/action-center/build.js`
  - `__tests__/lib/action-center-build.test.mjs`
- 이전 문제:
  - `ingredient-no-price`, `backup-recommended` 같은 고정 ID를 숨기면 원인 수나 상태가 바뀌어도 계속 숨겨질 수 있었다.
- 조치:
  - action id에 누락 수, 백업 상태, 업로드 기준월, 원가율 경보 개수/임계값 등 원인 버전을 포함한다.
  - 원인 규모가 바뀌면 기존 숨김 상태가 새 action을 막지 못한다.
- 검증:
  - 단가 없음 수, 백업 상태, 미매칭 수, 원가율 경보 상태별 ID 변화 테스트 추가.

### 해결됨: 운영 상태 helper의 상태 전환 테스트 부족

- 수정 위치:
  - `lib/saved-views.js`
  - `lib/report/package-plan.js`
  - `lib/change-log/index.js`
  - `__tests__/lib/operational-state-helpers.test.mjs`
- 이전 문제:
  - Saved Views는 중복 이름 rename, 기본 뷰 삭제, 손상된 localStorage 값 처리가 테스트로 고정되어 있지 않았다.
  - Monthly Close는 판매량 가용성을 실제 `sales_files`가 아닌 잘못된 `uploaded_files` store명으로 확인했다.
  - Change Log는 손상된 localStorage 값이 있으면 새 기록 저장도 실패할 수 있었다.
- 조치:
  - Saved Views 이름 trim, 손상 데이터 필터링, 삭제 시 기본 뷰 해제, rename 중복 병합, 백업 가능한 screen key 정규화를 보강했다.
  - Monthly Close 판매량 가용성 store를 `sales_files`로 수정하고, 1~12월 밖의 기간, 알 수 없는 완료 항목, 손상된 로그 저장값을 안전하게 복구한다.
  - `monthly_close_log_v1`을 백업/복원 allowlist에 포함해 DB import 원본에서 월마감 이력이 빠지지 않도록 했다.
  - 홈 할 일 완료 상태 `v3:home-todo-done`을 공통 백업 키에 포함해 홈 위젯 복원 범위와 맞췄다.
  - 노트 작성 기본 카테고리 `v3:note_lastCategory`를 notes 스코프 백업 키에 포함했다.
  - Change Log 읽기/쓰기 경로를 sanitize하고 손상된 저장값에서도 새 기록을 남긴다. type/detail/limit 손상값도 UI 안전 형태로 정규화한다.
  - 변경 이력 패널의 현재 브랜드 초기화가 다른 브랜드 이력까지 지우지 않도록 브랜드별 삭제 옵션을 추가했다.
- 검증:
  - 브랜드별 저장 뷰 분리, 기본 뷰 해제, rename 중복 병합 테스트 추가.
  - 월마감 판매량 가용성, 기간/완료 항목 정규화, 최근 12개월 로그 유지 테스트 추가.
  - 백업 localStorage allowlist와 백업/복원 리허설 테스트로 `monthly_close_log_v1` round-trip 확인.
  - 백업 localStorage allowlist 테스트로 `v3:home-todo-done` 공통 포함 확인.
  - 백업 localStorage allowlist 테스트로 `v3:note_lastCategory` notes 스코프 포함 확인.
  - 변경 이력 손상값 복구, 브랜드/타입/limit 필터, 브랜드별 초기화 테스트 추가.

### 해결됨: 식자재 일괄 삭제 확인 단계 누락

- 수정 위치:
  - `components/ingredient/BatchToolbar.jsx`
  - `__tests__/lib/ingredient-manage-undo-guards.test.mjs`
- 이전 문제:
  - 식자재 벌크 툴바에서 단종/분류 변경은 인라인 확인을 거쳤지만, `선택 삭제`는 바로 `onDelete`를 호출했다.
  - 일괄 삭제는 실행취소 토스트가 있어도 파괴적 작업이므로, 연속 클릭이나 실수 클릭에 취약했다.
- 조치:
  - `선택 삭제` 클릭 시 `delete` confirm 상태로 전환하고, 확인 버튼을 눌러야 실제 `onDelete()`가 실행되게 변경했다.
  - 확인 메시지에 삭제 후 토스트 실행취소 가능성을 표시했다.
  - 구조 테스트로 `선택 삭제`가 즉시 실행되지 않고 `setConfirm({ type: 'delete' })`를 거치는 흐름을 고정했다.
- 검증:
  - `__tests__/lib/ingredient-manage-undo-guards.test.mjs` PASS
  - 전체 `npm run test:ci` PASS

### 해결됨: 판매량 설정·업로드 변경 함수의 관리자 가드 누락

- 수정 위치:
  - `lib/sales/store-user-rules.js`
  - `lib/sales/store-files.js`
  - `__tests__/lib/destructive-action-guard-structure.test.mjs`
  - `__tests__/lib/sales-upload-log.test.mjs`
- 이전 문제:
  - 판매량 사용자 별칭/분류 규칙/제외 메뉴 CRUD와 판매량 업로드 저장·삭제 함수가 UI 확인 흐름은 갖고 있었지만, 실행 함수 레이어의 `assertActiveAdmin` 방어 가드는 없었다.
  - viewer 권한이나 우회 호출에 대해서 UI disabled만으로는 충분하지 않다.
- 조치:
  - 사용자 별칭/분류 규칙/제외 메뉴의 추가·수정·삭제 함수에 관리자 가드를 추가했다.
  - 판매량 업로드 저장, 업로드 삭제, 업로드 파일 재분류 함수에도 관리자 가드를 추가했다.
  - 파괴적 액션 구조 테스트에 판매량 설정/업로드 함수군을 포함했다.

### 해결됨: store 관리자 가드와 UI viewer 액션 불일치

- 수정 위치:
  - `components/cost/manage/CommonManageView.jsx`
  - `components/cost/manage/CommonGroupsView.jsx`
  - `components/cost/manage/CommonEdgesView.jsx`
  - `components/cost/menu-price/MenuPriceUploadCard.jsx`
  - `components/menu-master/MenuMasterDialogs.jsx`
  - `components/menu-master/MenuMasterEmptyState.jsx`
  - `components/menu-master/MenuReadinessPanel.jsx`
  - `app/menu-sales/settings/page.jsx`
  - `app/menu-sales/unmatched/page.jsx`
  - `components/sales/*`
  - `components/ui/ComboBox.jsx`
- 이전 문제:
  - store 레이어는 `assertActiveAdmin`으로 viewer 쓰기를 차단하지만 일부 화면에서는 viewer가 버튼을 눌러 실패 toast를 보는 경로가 남아 있었다.
  - 공통 원가 묶음/엣지 관리, 메뉴판매가 업로드, 메뉴마스터 출시 준비/빈상태/다이얼로그, 판매량 미매칭 해결, 판매량 설정 사용자 규칙·별칭·제외 섹션이 대표 후보였다.
- 조치:
  - 해당 화면에서 `useCurrentRole()` 또는 상위 `canEdit/isViewer` prop으로 편집 액션을 비활성화했다.
  - `ComboBox`에 `disabled` prop을 추가해 권한 없는 상태에서 자동완성 입력도 함께 닫았다.
  - 구조 테스트에 권한 prop 전달과 disabled 조건을 추가했다.
- 검증:
  - 관련 구조 테스트 7개 파일 PASS
  - 전체 `npm run test:ci` PASS, 295 suites / 1776 tests
- 검증:
  - `__tests__/lib/destructive-action-guard-structure.test.mjs` PASS
  - `__tests__/lib/sales-upload-log.test.mjs` PASS
  - 전체 `npm run test:ci` PASS

### 해결됨: 보고서 삭제·오래된 보고서 정리 함수의 관리자 가드 누락

- 수정 위치:
  - `lib/report/index.js`
  - `__tests__/lib/report-index-guards.test.mjs`
  - `__tests__/lib/destructive-action-guard-structure.test.mjs`
- 이전 문제:
  - 보고서 목록 UI는 삭제/정리 확인 다이얼로그를 갖고 있었지만, 실행 함수인 `deleteReport`, `pruneOldReports`에는 관리자 가드가 없었다.
  - UI를 우회한 호출이나 viewer 상태에서의 직접 호출을 실행 함수 레벨에서 방어하지 못했다.
- 조치:
  - `deleteReport`에 `assertActiveAdmin('보고서 삭제')`를 추가했다.
  - `pruneOldReports`에 `assertActiveAdmin('오래된 보고서 정리')`를 추가했다.
  - 구조 테스트와 report index 테스트로 가드 호출을 고정했다.
- 검증:
  - `__tests__/lib/report-index-guards.test.mjs` PASS
  - `__tests__/lib/destructive-action-guard-structure.test.mjs` PASS
  - 전체 `npm run test:ci` PASS

### 해결됨: 영양값·원가 보조 마스터·샘플 기록 쓰기 함수의 관리자 가드 누락

- 수정 위치:
  - `lib/nutrition/values/raw-values.js`
  - `lib/nutrition/values/menu-refs.js`
  - `lib/nutrition/values/edge.js`
  - `lib/nutrition/values/topping.js`
  - `lib/nutrition/values/composition.js`
  - `lib/nutrition/values/set-composition.js`
  - `lib/nutrition/origin/store.js`
  - `lib/ingredient/crud.js`
  - `lib/ingredient/seed.js`
  - `lib/menu-master/store.js`
  - `lib/menu-master/index.js`
  - `lib/menu-recipes/store.js`
  - `lib/sales/resolve.js`
  - `lib/cost/menu-price/store.js`
  - `lib/cost/edge-dough/store.js`
  - `lib/cost/recipe-groups/store.js`
  - `lib/cost/suppliers/store.js`
  - `lib/cost/margin/snapshots.js`
  - `lib/sample/store.js`
  - `__tests__/lib/destructive-action-guard-structure.test.mjs`
- 이전 문제:
  - 일부 기준 데이터/보조 마스터 store의 저장·삭제 함수가 UI 흐름에는 묶여 있었지만 실행 함수 레이어의 `assertActiveAdmin` 가드는 없었다.
  - DB API 전환 시 이 함수들이 그대로 서버 mutation의 경계가 될 수 있어 viewer 우회 호출에 취약한 형태였다.
- 조치:
  - 영양 기준값, 메뉴 참조, 엣지, 토핑, 파생/세트 구성의 저장·삭제·수리 함수에 관리자 가드를 추가했다.
  - 원산지 저장/삭제, 식자재 추가/수정/메타 저장/시드, 메뉴마스터 저장/판매가 동기화/가격 반영/역가져오기, 메뉴 판매가 개별 CRUD, 엣지·도우 저장/삭제/시드, 판매량 미매칭 resolve에도 관리자 가드를 추가했다.
  - 메뉴 레시피, 공통 레시피 그룹, 공급사, 원가마진 스냅샷, 샘플 기록 저장/삭제 함수에 관리자 가드를 추가했다.
  - 구조 테스트에 해당 함수군을 고정했다.
- 검증:
  - `destructive-action-guard-structure`, `ingredient-product-code-dedup`, `ingredient-delete-cascade`, `menu-master-price-sync`, `menu-price-store-safety`, `silent-catch-policy`, `suppliers`, `shared-db-init-guards`, `nutrition-values-dedup`, `margin-snapshots` 타깃 테스트 PASS.

### 해결됨: admin store guard와 UI/hook guard 불일치 잔여분

- 수정 위치:
  - `app/menu-sales/upload/page.jsx`
  - `lib/sales/use-sales-upload.js`
  - `components/sales/UploadPreview.jsx`
  - `components/sales/UploadHistory.jsx`
  - `app/menu-master/useMenuMasterActions.js`
  - `app/menu-master/page.jsx`
  - `app/settings/restore/page.jsx`
  - `components/settings/restore/RestoreExecutePanel.jsx`
  - `components/settings/restore/RestoreExecuteActions.jsx`
  - `__tests__/lib/sales-upload-guard-structure.test.mjs`
  - `__tests__/lib/menu-master-page-structure.test.mjs`
  - `__tests__/lib/restore-failed-stores-guard.test.mjs`
  - `__tests__/lib/sample-page-controller-props.test.mjs`
- 이전 문제:
  - 판매량 업로드 저장/삭제는 store 레벨 `assertActiveAdmin`이 있었지만, viewer 화면에서 파일 선택, 미리보기 반영, 업로드 이력 삭제 버튼이 열릴 수 있었다.
  - 메뉴마스터는 버튼/모달이 대부분 viewer 차단 상태였지만, 액션 훅 자체는 store guard에 기대고 있어 defense-in-depth가 약했다.
  - 전체 복원은 `importAll` 실행 함수에서 admin guard가 있었지만, viewer도 백업 파일을 읽고 복원 실행 플로우까지 진입할 수 있었다.
  - 샘플 페이지 props 테스트는 새 `canEdit=false` 기본 계약을 반영하지 못해 전체 테스트에서 실패했다.
- 조치:
  - 판매량 업로드 페이지에 `useCurrentRole` 기반 `canEdit`을 추가하고, dropzone/preview confirm/history delete와 `useSalesUpload`의 file/confirm/delete 핸들러를 모두 잠갔다.
  - 메뉴마스터 액션 훅에 `canEdit`과 `requireEdit()`를 추가해 저장/삭제/초기화/시드/삭제 영향 계산 진입을 훅 레벨에서도 차단했다.
  - 전체 복원 페이지에 `canRestore = roleReady && isAdmin`을 추가하고, 파일 input, 복원 시작/최종 실행 버튼, `handleRestore`를 같은 조건으로 잠갔다.
  - 샘플 페이지 props 테스트 fixture에 `canEdit: true`를 명시하고, viewer 모드에서 route/action callback이 실행되지 않는 회귀 테스트를 추가했다.
  - `SITE_STATUS.md`의 테스트 파일 수를 295개(lib 268) 기준으로 갱신했다.
- 검증:
  - `npm run test:ci` PASS — 295 suites / 1776 tests
  - `npm run lint` PASS
  - `npm run format:check` PASS
  - `npm run audit:docs` PASS
  - `npm run build` PASS — compiled successfully, static pages 57/57
  - `git diff --check` PASS

### 해결됨: 샘플 작성/편집 화면의 viewer read-only UX 불일치

- 수정 위치:
  - `app/note/sample/write/page.jsx`
  - `app/note/sample/[id]/page.jsx`
  - `app/note/sample/_SampleFormBody.jsx`
  - `app/note/sample/_SampleBasicInfoCard.jsx`
  - `app/note/sample/_SampleDetailRecordCard.jsx`
  - `app/note/sample/_SampleLinkedProductsCard.jsx`
  - `app/note/sample/_SamplePhotoCard.jsx`
  - `components/ui/TagInput.jsx`
  - `components/note/FormFields.jsx`
  - `__tests__/lib/sample-form-body-structure.test.mjs`
  - `__tests__/lib/sample-page-structure.test.mjs`
- 이전 문제:
  - 샘플 저장/수정 handler와 store는 viewer를 막았지만, 작성/편집 폼 입력, 사진 선택, 연결 제품 수정은 로컬 상태에서 조작 가능했다.
  - 결과적으로 viewer에게 “작성은 되는 것처럼 보이지만 저장은 안 되는” 혼란스러운 화면이 될 수 있었다.
- 조치:
  - 샘플 작성/수정 페이지에서 `SampleFormBody`에 `readOnly={!canEdit}`를 전달했다.
  - 기본정보, 상세기록, 연결 제품, 사진 카드가 `readOnly`를 받아 입력/버튼/드롭존/file input/캡션 수정/삭제를 비활성화하도록 정리했다.
  - `TagInput`과 `SegGroup`에는 기본값 false의 `disabled` prop을 추가해 기존 사용처 영향 없이 샘플 폼 read-only를 지원하게 했다.
- 검증:
  - `sample-form-body-structure`, `sample-page-structure`, `sample-page-controller-props`, `tag-input`, `note-form-body-structure` 타깃 테스트 PASS — 5 suites / 19 tests
  - `npx next lint --quiet` PASS

### 해결됨: 10차 재확인 권한/원자성 보강

- 수정 위치:
  - `lib/report/index.js`, `hooks/useReportActions.js`, `components/report/report-list-table/*`
  - `components/cost/menu-price/MenuPriceUploadCard.jsx`
  - `lib/nutrition/values/raw-values.js`, `lib/nutrition/values/store.js`, `components/nutrition/menu/ImportBaseModal.jsx`
  - `lib/note/store.js`, `lib/note/schedules.js`, `hooks/useNoteContentController.js`, `hooks/useNoteItemActions.js`, `hooks/useNoteBatchActions.js`, `hooks/useKanbanBoard.js`
  - `app/note/*`, `app/note/calendar/*`, `components/note/KanbanCard.jsx`
  - `lib/cost/margin/platforms.js`, `app/cost/margin/useMarginActions.js`
  - `lib/cost/sync-base-quantity.js`, `lib/cost/bulk-price-update.js`, `lib/shipment/store-migration.js`, `lib/shipment/store-managed.js`, `lib/nutrition/migrate-to-ingredient.js`
  - `components/ui/UploadDropzone.jsx`
- 이전 문제:
  - 보고서 즐겨찾기/이름 변경, 메인 노트/일정, 마진 플랫폼 수수료, 제때 기준수량/관리품목 seed/migration 일부가 UI guard 또는 정책에 의존하고 실행 함수 방어막이 부족했다.
  - 영양 기준데이터 가져오기는 행별 저장 루프라 중간 실패 시 partial commit 가능성이 있었다.
  - 메뉴 판매가 업로드는 실패행이 있어도 전체 교체 버튼을 누를 수 있어 기존 판매가 손실 가능성이 있었다.
- 조치:
  - 실행 함수 레이어 admin guard를 확대하고, 노트/캘린더/칸반 UI에 `canEdit`을 내려 viewer write 진입을 차단했다.
  - 영양 기준데이터 import를 `bulkUpsertBaseData()` 단일 transaction으로 바꿔 menu ref/raw value가 함께 성공하거나 함께 실패하도록 했다.
  - 메뉴 판매가 업로드 실패행이 있으면 전체 교체를 막도록 했다.
  - 조회 중 자동 실행되던 원산지 마이그레이션/제때 seed는 viewer에서 no-op 처리했다.
  - 숨겨진 업로드 input과 식자재 일괄 단가 commit 함수의 우회 가능성을 닫았다.
- 검증:
  - 보고서 권한 타깃 7 suites / 23 tests PASS
  - 메뉴 판매가 업로드 안전화 타깃 4 suites / 68 tests PASS
  - 영양/노트/권한 타깃 7 suites / 51 tests PASS
  - 노트/캘린더 권한 타깃 8 suites / 52 tests PASS
  - 마진/제때 guard 타깃 5 suites / 47 tests PASS

### 해결됨: 11차 재확인 고위험 DOM/API 패턴 축소

- 수정 위치:
  - `app/not-found.jsx`
  - `__tests__/lib/random-id-guards.test.mjs`
- 스캔 대상:
  - `dangerouslySetInnerHTML`
  - `innerHTML =`
  - `eval(` / `new Function(`
  - `localStorage.clear()` / `sessionStorage.clear()`
  - `indexedDB.deleteDatabase`
  - `downloadCsvText(`
  - `URL.createObjectURL`
  - `window.open(` / `target="_blank"`
- 이전 문제:
  - 404 페이지의 장식 particle 컨테이너 초기화가 `innerHTML = ''`로 되어 있어 실제 XSS 경로는 아니지만, 전체 코드 보안 스캔에서 계속 고위험 패턴으로 잡혔다.
- 조치:
  - 404 장식 컨테이너 정리를 `wrap.replaceChildren()`으로 바꿔 DOM 문자열 주입 API 사용을 제거했다.
  - `random-id-guards`에 `innerHTML` 회귀 방지 테스트를 추가했다.
- 남은 패턴 판정:
  - `app/layout.jsx`의 `dangerouslySetInnerHTML`은 고정된 다크모드 초기화 스크립트다.
  - `lib/download.js`와 `lib/image/resize.js`의 `URL.createObjectURL`은 Blob 다운로드/이미지 리사이즈 기능이며 revoke 처리 확인됨.
  - `lib/print/window-print.js`의 `window.open`/`document.write`는 공통 인쇄창 helper이고, 주요 HTML builder는 `esc()` 또는 전용 escape 테스트로 방어한다.
  - `app/settings/system/page.jsx`의 DB 삭제/초기화는 UI 확인 버튼과 `assertActiveAdmin` 실행 함수 guard가 함께 있다.
- 검증:
  - `random-id-guards.test.mjs` PASS — 1 suite / 3 tests
  - `browser-api-policy.test.mjs` PASS — fetch, eval/new Function, 문자열 timer, HTML 주입, object URL 허용 위치 고정
  - 전체 `npm run test:ci` PASS — 295 suites / 1776 tests

### 해결됨: 12차 재확인 권한 정책 잔재 제거

- 수정 위치:
  - `lib/brand-master.js`
  - `__tests__/lib/role-gating-source.test.mjs`
- 이전 문제:
  - 브랜드마스터 화면은 `useCurrentRole()`과 활성 계정 역할을 기준으로 viewer를 차단하지만, `lib/brand-master.js`에는 예전 profile 기반 `isAdminProfile` wrapper가 남아 있었다.
  - 실제 사용처는 없었지만, 권한 기준이 `profile.role`과 활성 계정 역할로 갈라져 보일 수 있어 향후 구현자가 잘못된 API를 재사용할 위험이 있었다.
- 조치:
  - `lib/brand-master.js`의 `@/lib/profile` import와 `isAdminProfile` wrapper export를 제거했다.
  - `role-gating-source.test.mjs`에 브랜드마스터 lib가 legacy profile 관리자 판정을 노출하지 않는다는 구조 테스트를 추가했다.
- 검증:
  - `role-gating-source`, `brand-master-storage-guards`, `eslint-disable-policy`, `destructive-action-guard-structure` 타깃 테스트 PASS — 4 suites / 32 tests
  - 전체 `npm run test:ci` PASS — 295 suites / 1776 tests

### 해결됨: 13차 재확인 대형 seed/rule/CSS 파일군 검토

- 스캔 대상:
  - `lib/ingredient/data/master-import-seed.js`
  - `lib/ingredient/data/master-seed.js`
  - `lib/sales/data/rules/*.js`
  - `app/styles/**/*.css`
- 확인 결과:
  - 대형 seed/rule 데이터 파일 4,496줄을 현재 export 경로 기준으로 검증했다.
  - `INGREDIENT_MASTER_SEED` 80건, `MASTER_IMPORT_SEED` 115건, `SALES_RULES` 255건 모두 필수 필드 누락, 중복 productCode, 중복 ruleId, 중복 rule pattern이 없었다.
  - `__tests__/lib/sales-seed-data.test.mjs`는 현재 seed/rule export의 unique id, 필수 필드, 대표 카테고리 fixture, composite ref를 계속 검증한다.
  - 대형 데이터 디렉터리에서는 `TODO/FIXME/HACK`, `eval`, storage 접근, fetch, clear/delete 같은 런타임 위험 패턴이 잡히지 않았다.
- 발견 문제:
  - `app/styles/features/report/modal.css`와 `app/styles/features/motion-report.css`가 전역 `.preview-shell`, `.preview-body`, `.preview-pager` 레이아웃 클래스를 동시에 정의했다.
  - import 순서상 `motion-report.css`가 뒤에서 report preview 레이아웃을 덮을 수 있었다.
  - `motion-report.css`에 현재 토큰에 없는 `var(--surface-1)` 사용이 남아 있었다.
- 조치:
  - report preview 레이아웃 소유권을 `app/styles/features/report/modal.css`로 고정했다.
  - pager 버튼/카운터 스타일을 `report/modal.css`에 두고, `motion-report.css`에서는 preview 레이아웃 정의를 제거했다.
  - `motion-report.css`의 `var(--surface-1)`을 현재 정의된 `var(--surface)`로 교체했다.
  - `css-primitive-ownership.test.mjs`에 report preview layout ownership과 정의되지 않은 surface token 회귀 테스트를 추가했다.
- 검증:
  - `npm test -- --runTestsByPath __tests__/lib/css-primitive-ownership.test.mjs __tests__/lib/report-preview-modal-structure.test.mjs --runInBand` PASS — 2 suites / 9 tests
  - `npm test -- --runTestsByPath __tests__/lib/sales-seed-data.test.mjs --runInBand` PASS — 1 suite / 3 tests

### 해결됨: 14차 재확인 보고서 preview 실제 브라우저 레이어 QA

- 확인 배경:
  - 3000번 기존 dev 서버는 `_next/static/chunks/*`가 404로 떨어지는 stale 상태라 클라이언트 JS가 실행되지 않았다.
  - 기존 3000번을 건드리지 않고 `http://127.0.0.1:3102`에 깨끗한 dev 서버를 띄워 실제 브라우저 검증을 재시도했다.
- 발견 문제:
  - 보고서 preview modal은 `.modal-scrim`이 `position: fixed; z-index: 1000`이어도 페이지 내부에 렌더되어 모바일 AppShell chrome(topbar/bottom tab)보다 아래 stacking context에 놓일 수 있었다.
  - Playwright 모바일 390px 검사에서 `elementFromPoint(20, 20)`이 `.modal-scrim`이 아니라 `.topbar` 버튼을 반환했다.
- 조치:
  - `components/report/_ReportModalShell.jsx`와 `components/report/_ReportPreviewModal.jsx`를 `createPortal(..., document.body)` 방식으로 변경했다.
  - 공유/예약/preview 보고서 모달이 AppShell 내부가 아니라 body 레이어에서 렌더되어 topbar/bottom tab 위에 뜨도록 했다.
  - SSR/프리렌더 경계 안전을 위해 `typeof document === 'undefined'` 방어를 추가했다.
  - report 공통 모달 닫기 버튼에 `type="button"`과 `aria-label="닫기"`를 추가했다.
  - `report-preview-modal-structure.test.mjs`에 report modal shell/preview modal portal 회귀 테스트를 추가했다.
- 실제 브라우저 검증:
  - Playwright 임시 브라우저 컨텍스트에서 임시 `generated_reports` row 1건을 만들고 preview를 연 뒤 즉시 삭제했다. 실제 사용자 브라우저/DB는 건드리지 않았다.
  - desktop 1440x1000: console error 0, failed resource 0, `portalParent: BODY`, 가로 overflow 없음.
  - mobile 390x844: console error 0, failed resource 0, `portalParent: BODY`, `topAt20: modal-scrim`, `bottomAtEnd: preview-pager`, 가로 overflow 없음.
  - 스크린샷: `/tmp/report-preview-portal-desktop.png`, `/tmp/report-preview-portal-mobile.png`.
- 검증:
  - `npm test -- --runTestsByPath __tests__/lib/report-preview-modal-structure.test.mjs __tests__/lib/css-primitive-ownership.test.mjs --runInBand` PASS — 2 suites / 10 tests

### 해결됨: 15차 재확인 전 파일 고위험 패턴 재스캔

- 재확인 범위:
  - `rg --files app components hooks lib scripts __tests__ docs`: 1,469개
  - JS/JSX/MJS/CSS/JSON 코드 파일: 1,447개
  - JS/JSX/MJS/CSS 라인 수: 약 153,992줄
- 자동 스캔:
  - `TODO/FIXME/HACK/XXX`
  - `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `window.open`
  - `eval`, `new Function`, 문자열 timer
  - `localStorage.clear`, `sessionStorage.clear`, `indexedDB.deleteDatabase`, `.clear()`, `replaceStoreForBrand`
  - `fetch`, `XMLHttpRequest`, `sendBeacon`
  - `eslint-disable`, `@ts-ignore`
  - 정적/dynamic import 경로 누락
  - CSS custom property 미정의 사용
  - 개발용 `console.log/debug`
  - form 내부 button type, img alt 구조 테스트
- 판정:
  - `eval/new Function/문자열 timer`, 개발용 `console.log/debug`, 깨진 import 경로는 발견되지 않았다.
  - `dangerouslySetInnerHTML`은 `app/layout.jsx`의 다크모드 FOUC 방지 bootstrap만 허용 위치로 남아 있고, 인쇄용 `window.open/document.write`는 `lib/print/window-print.js`로 집중되어 있다.
  - 런타임 `fetch`는 `lib/session.js`의 공인 IP 조회 1곳만 남아 있으며, 실패 시 null 처리되는 기존 정책과 일치한다.
  - CSS 미정의처럼 잡힌 `--font-pretendard`는 `next/font/local`이 `html` class로 주입하는 런타임 font variable이라 오류로 보지 않았다.
  - 파괴적 clear/delete 계열은 기존 `destructive-action-guard-structure`와 관련 store guard 테스트가 계속 방어한다.
- 추가 보완:
  - 14차에서 추가한 report modal body portal에 SSR `document` guard를 추가했다.
  - report 공통 모달 닫기 버튼 접근성을 보강했다.
  - `useKanbanBoard`의 unmount/오래된 reload 방어 변경을 점검하고, 오래된 요청이 `finishLoading`을 실행하지 않도록 race를 보강했다.
- 검증:
  - `npm test -- --runTestsByPath __tests__/lib/report-preview-modal-structure.test.mjs __tests__/lib/css-primitive-ownership.test.mjs __tests__/lib/browser-api-policy.test.mjs __tests__/lib/form-button-type-guard.test.mjs --runInBand` PASS — 4 suites / 16 tests
  - `npm test -- --runTestsByPath __tests__/hooks/kanban-board-guards.test.mjs --runInBand` PASS — 1 suite / 5 tests
  - `npm run test:ci` PASS — 295 suites / 1776 tests

---

## 4. 아직 남은 확인/보완 이슈

### P1. 월마감 패키지 기능명이 실제 동작보다 큼

- 위치:
  - `components/report/MonthlyClosePackageModal.jsx`
  - `lib/report/package-plan.js`
- 문제:
  - “패키지 생성”이라고 표시하지만 실제로는 선택 항목 중 마지막 항목의 화면으로 이동하고, 완료 로그를 저장하는 흐름에 가깝다.
  - 여러 보고서/PDF/XLSX를 실제로 생성하지 않는다.
- 추천 조치:
  - 기능명을 “월마감 체크리스트”로 낮추거나, 실제 보고서 생성/다운로드 큐를 구현한다.

## 5. 자동 스캔에서 계속 추적할 위험 패턴

### 대형 파일

- `lib/ingredient/data/master-import-seed.js`: 1,383줄
- `lib/sales/data/rules/rules-pizza.js`: 1,110줄
- `app/styles/features/motion-note.css`: 964줄
- `lib/sales/data/rules/rules-side.js`: 774줄
- `app/styles/features/home.css`: 768줄
- `lib/menu-master/seed.js`: 679줄
- `lib/ingredient/data/master-seed.js`: 675줄
- `app/styles/features/cost.css`: 633줄
- `app/styles/features/report/modal.css`: 620줄
- `app/styles/features/report/builder.css`: 608줄
- `app/styles/features/report/table.css`: 600줄
- `app/styles/layout.css`: 594줄
- `app/styles/features/settings.css`: 590줄
- `app/styles/features/motion-enhanced.css`: 586줄
- `app/styles/features.css`: 564줄
- `app/styles/features/motion-report.css`: 518줄

대형 데이터/규칙/CSS 파일은 13차 재확인에서 중복/위험 패턴 일부를 확인했다. 당장 차단 오류는 아니지만, 장기적으로 fixture/data 분리와 CSS 모듈 정리는 계속 필요하다.

### 파괴적 clear/delete 계열

확인된 주요 위치:

- `lib/ingredient/destructive.js`
- `lib/cost/menu-price/store.js`
- `lib/cost/edge-dough/store.js`
- `lib/menu-recipes/store.js`
- `lib/nutrition/values/raw-values.js`
- `lib/db/crud.js`
- `lib/db/backup.js`
- `lib/menu-master/store.js`

대부분 기존 guard/test가 있지만, 전체 코드 검수 완료 전에는 삭제/초기화 흐름의 UI confirm, 자동 백업, rollback 가능성을 계속 확인해야 한다.

---

## 6. 현재 통과한 항목

- 신규 영향도 계산 단위 테스트 3개 PASS
- readiness/action-center 신규 테스트 5개 PASS
- 운영 상태 helper 신규 테스트 6개 PASS
- 샘플 작성/편집 read-only UX 구조 테스트 PASS
- 대표 XLSX 출력 artifact workbook + 실제 `.xlsx` 바이너리 write/read 테스트 4개 PASS
- CSV 출력 artifact 실행 테스트 3개 PASS
- 전체 Jest: 295 suites / 1776 tests PASS
- `npm run format:check` PASS
- `npm run lint` PASS, warning 0개
- `npm run audit:docs` PASS
- `npm run build:clean` PASS — compiled successfully, static pages 57/57
- `HOST=127.0.0.1 PORT=3101 BASE=http://127.0.0.1:3101 npm run qa:prod` PASS — prod smoke 22/22, mobile 22/22, runtime 67/67, workflow 21/21. 1차 3000번 실행은 외부 `npm run dev:lan` 재기동과 충돌해 14/21에서 서버 연결이 끊겼고, 3101번 격리 포트 재실행으로 green 확인.
- `npm run qa:workflow` PASS — 최신 dev/prod 21/21. 메뉴마스터 CSV 다운로드 파일 검증, 판매량 잘못된 확장자 UX, 메뉴판매가 실패행 CSV 다운로드 시나리오 포함
- 메뉴마스터 출시 준비 탭 직접 확인 PASS
- `git diff --check` PASS

---

## 7. 아직 완료로 볼 수 없는 이유

다음 항목이 남아 있어 “모든 코드 확인 완료”로 판정할 수 없다.

1. 전체 코드 수동 검토는 일부 도메인만 완료되었고, 대형 데이터/규칙/CSS 파일군은 계속 검토해야 한다.
2. 위험 작업(clear/delete/restore/bulk update)의 UI 확인·백업 안내·권한 차이는 전체적으로 더 확인해야 한다.
3. 현재 자동 검증은 green이지만, “모든 코드 확인 완료”를 증명하려면 남은 도메인별 수동 검토와 fixture 보강이 더 필요하다.
4. 서버 DB 구축 전 실제 백업 JSON → import rehearsal, restore recovery journal, 대량 `sales_rows` query 전환 설계는 아직 남아 있다.

---

## 8. 다음 권장 작업 순서

1. 위험 작업(clear/delete/restore/bulk update) UI/권한/백업 안내 재검토
2. 남은 대형 도메인 파일군 수동 검토 계속 진행
