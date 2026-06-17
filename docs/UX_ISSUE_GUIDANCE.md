# UX 이슈 중심 안내 현황 (P2)

작성일: 2026-06-17

`SITE_QUALITY_IMPROVEMENT_PLAN.md`의 P2(UX 단순화·이슈 중심 안내) 점검 결과. 대부분 이미 구현돼 있어, 이번 작업은 **유일한 실질 갭(영양성분 미입력 진단) 보강 + 현황 문서화**다.

## 1. 화면별 이슈 패널

| 화면 | 감지 이슈 | 위치 | 상태 |
|---|---|---|---|
| 메뉴 마스터 | 레시피 미작성·수량/단가/판매가 누락 (4종, 탭 필터) | `lib/menu-master/recipe-issues.js` → `MenuMasterIssuesPanel` | ✅ |
| 식자재 관리 | 미분류·포장수량없음·단가미연동·전용범용미지정·단가변동 + 제품코드 중복/참조오류 진단 | `lib/ingredient/index.js:computeIngredientIssues` → `IssuesView`·`IngredientDiagnostics` | ✅ |
| 미매칭 | 미해결/해결 KPI + 규칙변경 미반영 배너 + 일괄 제외/규칙 | `lib/sales/store-issues.js` → `UnmatchedSummary`·`UnmatchedTable` | ✅ |
| 영양성분 메뉴 | 중복 데이터·메뉴마스터 누락(고아) + **미입력 메뉴(이번 추가)** | `NutritionMenuNotices`(`DuplicateNotice`/`MissingMasterNotice`/`MissingValueNotice`) | ✅(보강) |

### 이번 추가 (P2 갭 보강)
- **영양성분 미입력 메뉴 진단** — `lib/nutrition/missing-values.js:buildNutritionMissingValueDiagnostics`. `nutrition_menu_ref`에 등록됐으나 **어떤 크러스트에도 영양값이 전혀 없는 메뉴**를 정보성 알림(`MissingValueNotice`)으로 안내. 출력 전 입력 누락을 사전에 발견. 단위 테스트 `nutrition-missing-values.test.mjs`.

## 2. 홈 대시보드 이슈 요약 — 이미 충족

홈은 운영 위험을 여러 경로로 요약한다(별도 통합 위젯 불필요):
- 인사말 서브라인(`greetSub`): 오늘 할 일·원가율 경보·지난달 미업로드·백업 경과일
- `ModuleHealthWidget`: 판매/제때/원가/노트/시스템 5개 모듈 상태(good/warn/bad)
- `UnmatchedWidget`: 미매칭 "N건 매칭 필요"
- `CostAlertWidget`·`DataFreshnessWidget`: 원가율 위험·업로드 신선도

데이터 소스는 `hooks/useHomeDashboardData.js`(getBackupReminder/getUploadFreshness/getIssues/getCostAlertData/getTodayTodos/buildModuleHealth)에서 일괄 로드.

## 3. 빈 상태 / 오류 상태 — 이미 통일

- `components/ui/EmptyState.jsx`(icon/title/desc/action props) — 55곳 사용, 공통 스타일(`lib/ui/empty-state.js`).
- `components/ui/Skeleton.jsx` + 도메인 파생(NoteCard/SampleCard/SkeletonTableRows/IngredientList 등) — 로딩 상태 표준화.
- 사용자 액션 실패는 `showToast(..., 'error')`(P6 toast-type 정책으로 강제).

## 4. 보류 (의도적)

- **영양성분 "엣지값 부분 누락" / "출력 제외 상태" 진단**: "완전 입력"의 기준(메뉴별 필요한 크러스트 집합)이 제품 정의에 따라 달라져 오탐 위험이 크다. 이번에는 오탐이 없는 "전혀 없음"만 진단했다. 부분 누락 진단은 크러스트 요구사항 정의가 선행돼야 하므로 보류.
- **인라인 빈 상태 일부**(TodoWidget의 "🎉 …끝냈어요!" 등): 의도된 축하/맥락 UX라 공통 EmptyState로 강제 통일하지 않는다.
