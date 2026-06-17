# 운영 안정성 현황 (P6)

작성일: 2026-06-17

`SITE_QUALITY_IMPROVEMENT_PLAN.md`의 P6(운영 안정성) 점검 결과. 대부분 이미 견고하게 구현돼 있어, 이번 작업은 **남은 갭 보강 + 정책 문서화**에 집중했다.

## 1. 출력 / 인쇄 / 다운로드 실패 처리 — 완비

| 항목 | 처리 | 위치 |
|---|---|---|
| 팝업 차단(window.open=null) | `false` 반환 + 경고 toast | `lib/print/window-print.js:openPrintWindow` |
| 이미지 로드 실패 | `img.onerror=resolve`로 인쇄 진행(멈춤 없음) | `lib/print/window-print.js:buildAutoPrintScript` |
| XSS(사용자 입력→인쇄 HTML) | 모든 인쇄 모듈에 `esc()` HTML escape | nutrition/origin/usage/note/ingredient print |
| 엑셀 내보내기(xlsx 동적 import) 실패 | try/catch + `showToast(..., 'error')` | nutrition export 핸들러 |
| 빈 데이터 출력 | 사전 검증 후 안내 toast / 빈 상태 HTML | report/print, OriginResult 등 |

회귀 테스트: `__tests__/lib/window-print-guards.test.mjs`(팝업 차단·이미지 실패), `nutrition-label-print`·`ingredient-manage-print`(escape), `nutrition-export-origin-result-structure`(빈 데이터).

## 2. 오류 로그 정책 — 테스트로 강제

| 정책 | 강제 테스트 | 규칙 |
|---|---|---|
| 빈 catch 금지 | `silent-catch-policy.test.mjs` | `catch {}`·`.catch(()=>{})`는 allowlist(사유 명시)만 허용 |
| console 컨텍스트 | `console-context-policy.test.mjs` | `console.error(err)` 금지 → `console.error('[Label]', err)` 필수 |
| toast 타입 | `toast-type-policy.test.mjs` | 부정 문구(실패/없음/권한 등)는 `'error'`/`'warn'` 타입 필수 |

사용자 액션(저장/삭제/업로드) 실패는 `showToast(..., 'error')`로 노출, background 작업(logWork 등)만 allowlist로 silent 허용.

## 3. 진단 화면

| 정보 | 위치 |
|---|---|
| DB 버전 / 이름 / 환경 / **현재 권한(admin/viewer)** | `app/settings/system` 앱 정보 |
| 전체 행 수 / store 수 / store별 row count / 브라우저 용량 | `app/settings/system` 저장소 상태(`StorageUsageBar`) |
| 최근 백업 경과일 | 백업 페이지 · 홈 인사말 · `ModuleHealthWidget` |
| 원가율 위험 / 미매칭 / 모듈 헬스 | 홈 대시보드 위젯 |

이번 추가: 시스템 설정에 현재 권한 표시(`현재 권한` InfoCell).

## 4. 성능 (대량 행)

| 화면 | 대량 행 처리 |
|---|---|
| 종합 원가(all-summary) | pagination 60/page |
| **원가 마진표(margin)** | **pagination 60/page (이번 추가)** + 검색 debounce |
| 출고량(ShipmentTable) | pagination 80/page |
| 단가 비교(PriceCompare) | pagination(동적 size) |
| 메뉴 마스터 | pagination 60/page |
| 식자재 관리 / 보고서 / 미매칭 | 검색 debounce(200ms) |

`Pagination` 컴포넌트는 `totalPages<=1`이면 렌더되지 않아 소량 데이터 UX에 영향 없음.

### 보류 (의도적)

- **식자재 관리(IngredientManagePanel) pagination**: 현재 `filtered.map()` 전체 렌더. 일괄 선택(selected Set)·배치 모드 state가 전체 목록과 강하게 결합돼 있어, pagination 도입 시 "전체 선택" 범위·페이지 이동 시 선택 유지 등 상호작용 재설계가 필요하다. 효과 대비 회귀 위험이 커 보류한다(메모리 `deferred-refactors` 참조). 검색 debounce로 입력 반응성은 이미 확보됨.
- **표 출력(nutrition/export)**: 인쇄/출력 대상이라 전체 행 렌더가 의도된 동작. pagination 부적합.

## 5. 검증

```bash
npm run lint
npm test            # 정책 테스트(silent-catch/console-context/toast-type) 포함
npm run qa:smoke    # 22 라우트
npm run qa:runtime  # 전 라우트(설정/시스템 포함)
npm run audit:docs  # 문서 수치 정합성
```
