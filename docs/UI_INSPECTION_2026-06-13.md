# UI 전체 점검 결과 — 2026-06-13

워크플로우 7개 에이전트 병렬 스캔 결과. 총 **42건** (HIGH 14 / MEDIUM 18 / LOW 10).

---

## HIGH — 14건

### H-01 다크모드 토큰 누락
- **위치**: `app/styles/tokens.css` — `[data-theme='dark']` 블록
- **문제**: `--warn`, `--surface-3`, `--surface-4`, `--color-reporting` 미정의 → 라이트 값 상속. `--warn(#c76a00)`은 다크 배경 WCAG AA 미충족
- **수정**: dark 블록에 추가
  ```css
  --warn: #f59e0b;
  --surface-3: #272c35;
  --surface-4: #2d333c;
  --color-reporting: #a78bfa;
  ```

### H-02 파괴적 작업 확인 미흡
- **위치**: `app/settings/system/page.jsx` DangerConfirm, `app/settings/account/page.jsx` PIN 해제
- **문제**: DangerConfirm에 `role=alertdialog`, `aria-modal` 없음. PIN 해제 클릭 한 번으로 즉시 실행
- **수정**: 파괴적 작업에 ConfirmDialog 사용 또는 DangerConfirm에 접근성 속성 추가. PIN 해제도 ConfirmDialog

### H-03 로딩/에러 상태 처리 누락
- **위치**: `app/note/board/page.jsx`, `app/note/journal/page.jsx`, `useCalendarData.js`
- **문제**: board — loading 중 빈 화면(스켈레톤 없음). journal — `.catch` 후 `finally setLoading(false)` 누락. useCalendarData — error state 없음
- **수정**: loading 중 스켈레톤 렌더. journal catch 뒤 `.finally(() => setLoading(false))` 추가

### H-04 에러 catch 후 사용자 알림 없음
- **위치**: `ingredient/list/page.jsx:118-120`, `ingredient/usage/page.jsx:132-134`, `nutrition/allergen`, `ingredient-price`
- **문제**: `.catch(console.error)`만, 화면에 에러 메시지 없어 빈 화면이 DB 오류인지 데이터 없음인지 구분 불가
- **수정**: `.catch(err => { console.error(err); showToast('데이터 로드 실패: ' + err.message, 'error') })`

### H-05 데이터 없을 때 빈 보고서 렌더
- **위치**: `report/cost/page.jsx:184-187`, `report/price/page.jsx:77-79`, `report/shipment/page.jsx`
- **문제**: 데이터 없을 때 `setIsLoading(false)`만 호출, `dataError` 미설정 → KPI 전부 `0`인 빈 보고서 출력
- **수정**: `setDataError('메뉴 가격 데이터가 없어요. 원가계산 → 판매가를 먼저 등록해 주세요.')` 함께 호출

### H-06 엑셀 내보내기 미구현 — 클릭해도 무반응
- **위치**: `report/price/page.jsx`, `report/shipment/page.jsx`, `report/menu-sales-compare/page.jsx`
- **문제**: `onExcelExport` prop 미전달 → Shell 내부 handleExcelExport null → 아무 동작 없음
- **수정**: 각 페이지에 handleExcelExport 구현 후 prop 전달. 단기: excel 체크박스 비활성화 또는 '미지원' 힌트

### H-07 기간 선택 고정 배열 — 미존재 연도 선택 가능
- **위치**: `report/menu-sales-compare/page.jsx:174, 202`
- **문제**: 연도 셀렉트가 `[2024, 2025, 2026]` 하드코딩 → 2027년 업로드 시 선택 불가
- **수정**: sales_rows에서 실제 연도 추출 → availYears 동적 구성. SalesReportControls의 `safeAvailYears` 패턴 참고

### H-08 z-index 충돌 — 드롭다운이 confirm 위에
- **위치**: `components/cost/shared/IngredientSearch.jsx:103` (9999) vs `ConfirmDialog.jsx:30` (600)
- **문제**: 레시피 에디터에서 ConfirmDialog 열면 IngredientSearch 드롭다운이 다이얼로그 위에 렌더
- **수정**: IngredientSearch 드롭다운 zIndex를 300~400으로 낮추거나 body portal로 마운트

### H-09 모달 외부 클릭 닫기 + ESC 처리 누락
- **위치**: `components/menu-master/MenuMasterEditModal.jsx:91-101`
- **문제**: 오버레이 onClick 없음, ESC 없음, 포커스 트랩 없음
- **수정**: `useModalShell(onClose)` 사용 + 오버레이 `onClick={e => e.target === e.currentTarget && onClose()}`

### H-10 저장/삭제 버튼 disabled 누락
- **위치**: `components/cost/recipe/RecipeEditor.jsx:210-215`, `ingredient/list/page.jsx:263-271`
- **문제**: saving=true 중 삭제·취소 활성 상태. 로딩 중 PDF/엑셀 클릭 시 빈 파일 생성
- **수정**: `disabled={saving}` (삭제·취소), `disabled={loading || filtered.length === 0}` (PDF/엑셀)

### H-11 계정 추가 중복 실행 방지 누락
- **위치**: `app/settings/account/page.jsx:459-478`
- **문제**: 빠른 연속 클릭 시 동일 계정 중복 추가 가능
- **수정**: `addingBusy` state 추가, 핸들러 진입 시 `setBusy(true)` / finally에서 false, 버튼 `disabled={addingBusy}`

### H-12 잘못된 toast 타입 — `'err'`
- **위치**: `app/note/board/page.jsx` applyStatusChange catch (line 73-75)
- **문제**: `showToast('상태 변경 실패', 'err')` — 지원 타입은 `'ok'`·`'error'`·`'warn'`뿐. 실패 토스트가 초록색 체크마크로 표시됨
- **수정**: `'err'` → `'error'`. handleDrop도 try/catch 추가

### H-13 하드코딩 인라인 색상 — 테마 토큰 미사용
- **위치**: `components/cost/recipe/SortableIngredientRow.jsx:64`, `RecipeEditor.jsx`
- **문제**: `color: '#f59e0b'`, `background: 'rgba(56,189,248,.15)'`, `color: '#38bdf8'` 하드코딩
- **수정**: `var(--warn)`, `var(--accent-soft)`, `var(--accent)`로 교체

### H-14 메뉴명 overflow ellipsis 누락
- **위치**: `app/menu-master/page.jsx:509-526` 메뉴명 `<td>`
- **문제**: 고정 너비/overflow 없어 긴 메뉴명이 테이블 레이아웃 밀어냄
- **수정**: `<td className="cell-name">` + 내부 `<div className="menu-name">`. `cost.css`에 이미 정의됨

---

## MEDIUM — 18건

### M-01 하드코딩 색상 (노트·샘플·UnmatchedTable)
- **위치**: `note/calendar/page.jsx:255,286`, `note/sample/page.jsx:792,797`, `_NoteFormBody.jsx`, `UnmatchedTable`
- **수정**: `'#7C3AED'` → `var(--color-schedule)`, `'#fff'` → `var(--color-on-accent)`, boxShadow → `var(--shadow-xl)`

### M-02 하드코딩 색상 (원가·전체요약)
- **위치**: `cost/ingredient-price/page.jsx:297,311-312`, `cost/all-summary/page.jsx:178`
- **수정**: `color: '#fff'` → `var(--on-accent)`, fallback hex 제거

### M-03 하드코딩 색상 (출고·판매 보고서)
- **위치**: `report/shipment/page.jsx:70-71,557,564…`, `report/sales/page.jsx:549,93`
- **수정**: SERIES_COLOR 상수를 CSS 변수로 매핑. `'#9CA3AF'`, `'#94A3B8'` → `var(--text-3)`

### M-04 하드코딩 색상 (식자재 사용현황·알레르기)
- **위치**: `ingredient/usage/page.jsx:25-27,46-47`, `ingredient/manage/page.jsx:353`, `nutrition/allergen`
- **수정**: CSS 변수(`--cat-pizza-bg` 등) 또는 `--accent/--positive/--warn` 토큰으로 교체

### M-05 접근성 — 버튼 aria-label 누락
- **위치**: `_NoteContent.jsx:104-113` 수정·삭제 버튼, `_NoteFormBody.jsx` 사진 삭제 버튼
- **수정**: `aria-label={`${note.title} 수정`}`, `aria-label={`${note.title} 삭제`}`

### M-06 접근성 — 테이블 scope/caption 누락
- **위치**: `_NoteContent.jsx:924-974`, `note/sample/page.jsx:741-75`
- **수정**: `<caption>`, `<th scope="col">` 추가. 빈 `<th>`에 `aria-label='선택'`

### M-07 접근성 — 클릭 가능 div에 role/키보드 미지원
- **위치**: `cost/ingredient-price/page.jsx:421-471`, `components/home/HomeWidgets.jsx`
- **수정**: `<button>`으로 교체 또는 `role='button' tabIndex={0} onKeyDown` 추가

### M-08 접근성 — focus-visible 누락
- **위치**: `TopBar.jsx:327-349` 프로필 버튼, `components.css:1415` .search 버튼
- **수정**: `icon-btn` 클래스 추가 또는 `:focus-visible` 선언

### M-09 로딩 상태 처리 누락 (레시피·재료단가표)
- **위치**: `cost/recipe/page.jsx` RecipeContent, `cost/ingredient-price/page.jsx:254-264`
- **수정**: loading 중 skeleton/early-return. 버튼에 `disabled={resetting || isViewer || loading}`

### M-10 에러 상태 표시 누락 (시스템·복원)
- **위치**: `settings/system/page.jsx:91-104` refreshStats, `settings/restore/page.jsx`
- **수정**: refreshStats에 try-catch + `showToast('저장소 상태를 불러오지 못했습니다.', 'error')`

### M-11 성공 후 confirmingRecreate 미초기화
- **위치**: `settings/system/page.jsx:112-125` handleRecreate
- **문제**: setTimeout 전 `setConfirmingRecreate(false)` 누락 → reload 실패 시 UI 비정상
- **수정**: `setTimeout` 직전에 `setConfirmingRecreate(false)` 추가

### M-12 엑셀 내보내기 async 래퍼 문제
- **위치**: `report/cost/page.jsx:273` handleExcelExport
- **문제**: 비동기 완료를 Shell이 await하지 못해 generating 상태가 조기 해제될 수 있음
- **수정**: `async () => exportCostXlsx(...)` 또는 Promise를 그대로 return

### M-13 인쇄/PDF — no-print 클래스 누락
- **위치**: `report/cost/page.jsx:376-391`, `ReportBuilderShell.jsx:168-181`
- **수정**: 탭 전환 버튼과 `.report-preview-head`에 `no-print` 클래스 추가

### M-14 숫자 포맷 — 천단위 콤마 불일치
- **위치**: `report/price/page.jsx:303-315`, `report/menu-sales-compare/page.jsx:298-304`, `report/cost/page.jsx`
- **수정**: catSummary 카운트, 합계 행에 `formatNumber()` 적용. 보고서 용도에 맞게 통일

### M-15 PIN 입력 autocomplete 속성 누락
- **위치**: `components/settings/PinSection.jsx:73-95`
- **수정**: `autoComplete='off'` 또는 `autoComplete='one-time-code'`

### M-16 숫자 입력 step 미설정
- **위치**: `SortableIngredientRow.jsx:89`, `RecipeEditor.jsx`
- **문제**: 기본 `step=1` → 소수점 사용량(0.5g) 브라우저 스피너 입력 불가
- **수정**: 사용량 입력에 `step='any'`. 판매가에 `step='1'` 명시

### M-17 z-index 충돌 — notif-pop vs nav-scrim
- **위치**: `components.css:1188` (.notif-pop: 50) vs AppShell.jsx nav-scrim (90)
- **문제**: 모바일에서 알림 팝업이 사이드바 백드롭에 가려짐
- **수정**: `.notif-pop` z-index를 95 이상으로 올리거나 사이드바 열릴 때 notif 닫기

### M-18 스크롤바 혼용 — 사이드바만 커스텀
- **위치**: `layout.css:24-30` vs `components.css` 나머지 컨테이너
- **수정**: `base.css`에 `* { scrollbar-width: thin; }` 또는 각 스크롤 컨테이너에 동일 규칙 적용

---

## LOW — 10건

### L-01 빈 상태 안내 누락
- `note/board/page.jsx` loading 스켈레톤 (H-03과 동일), `nutrition/menu/page.jsx` menus 없을 때 empty-state

### L-02 반응형 — 고정 px값
- `note/calendar/page.jsx` `minWidth: 108`, `note/board/page.jsx` 칸반 컬럼 `minWidth: 180`
- **수정**: `'6.5em'` 또는 CSS 변수로 통일

### L-03 비교 월 동일 기간 방지 없음
- `SalesReportControls.jsx:121-156` — 기준·비교 월 동일 선택 시 경고 없음
- **수정**: `cmpYear === year && cmpMonth === month`면 인라인 경고 텍스트 표시

### L-04 업로드 파일 크기 표시 불일치
- `jette/shipment/page.jsx` maxSizeMB 미전달(기본 20MB) vs `use-shipment.js` 30MB 검증
- **수정**: `<UploadDropzone maxSizeMB={30}>`

### L-05 페이지네이션 미적용
- `menu-sales/unmatched/page.jsx:165-171` — filtered 전량 렌더
- **수정**: usePagination 대상을 `props.issues`(이미 필터링된)로 변경

### L-06 진단 버튼 중복 실행 방지 누락
- `settings/backup/page.jsx:502-504` — 연속 클릭 시 중복 실행
- **수정**: `collecting` 상태 추가 후 `disabled={collecting}`

### L-07 모바일 고정 width
- `layout.css:308-313` `.company-drop` (768px 미만만), `layout.css:554-559` `.greet h1`
- **수정**: `.company-drop` 규칙을 1024px 이하로 확장, `max-width: calc(100vw - 32px)` 기본값 추가

### L-08 폼 유효성 피드백 누락 (메뉴마스터)
- `MenuMasterEditModal.jsx:69-88` 메뉴코드·메뉴명 오류 메시지 없음
- **수정**: onBlur에서 `errors.menuCode`, `errors.menuName` 설정 → 인라인 오류 표시

### L-09 테이블 가로 스크롤 처리 — overflow-x 미설정
- `ingredient/usage/page.jsx:443`, `nutrition/origin/page.jsx:377,458`, `nutrition/allergen`
- **수정**: `<div style={{ overflowX: 'auto' }}>` 또는 `className='table-wrap'`으로 감싸기

### L-10 폰트 FOUT
- `app/layout.jsx:6-11` — `preload: false` + `display: 'swap'` → FOUT 발생
- **수정**: `preload: true` 또는 `adjustFontFallback` 옵션 활성화

---

## 요약

| 심각도 | 건수 | 주요 범주 |
|--------|------|-----------|
| HIGH | 14 | 기능 버그·무반응·토스트 오류·z-index 충돌 |
| MEDIUM | 18 | 접근성·하드코딩 색상·폼 유효성·로딩 처리 |
| LOW | 10 | 반응형·폰트·빈 상태 UX |

**즉시 수정 권장**: H-12 (`'err'` → `'error'`), H-08 (z-index), H-06 (엑셀 미구현 비활성화), H-01 (다크모드 토큰)
