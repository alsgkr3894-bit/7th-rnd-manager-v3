# 7번가 R&D 플랫폼 아키텍처

작성: 2026-06-12  
상태: 현재 Next.js App Router 구현 기준

## 구조

```text
app/                 Next.js App Router 페이지와 route-level 컴포넌트
app/styles/          전역 CSS 분리(tokens/base/layout/components/features)
components/          재사용 React 컴포넌트
components/ui/       React 기반 공통 UI 컴포넌트
hooks/               클라이언트 상태, 브라우저 이벤트, 화면 공통 hook
lib/                 도메인 store, 계산, 파싱, export, 순수 helper
lib/ui/              React 없는 UI normalizer, prop guard, helper
lib/db/              IndexedDB 초기화, schema, CRUD, 백업 범위
scripts/             QA, smoke, build 정리 스크립트
__tests__/           Jest 단위/회귀 테스트
```

## 원칙

- 페이지 파일은 route 조립과 화면 상태만 맡기고, 반복 로직은 `hooks/` 또는 도메인 `lib/`로 이동한다.
- `components/ui`는 JSX를 렌더링하고, `lib/ui`는 테스트 가능한 순수 함수만 둔다.
- DB schema, IndexedDB store 이름, 백업/복원 wire shape는 기능 요구가 없으면 바꾸지 않는다.
- CSS 선택자 이름은 유지하면서 `app/styles`에 책임별로 분리한다.
- 원가, 식자재, 영양성분처럼 도메인 정책이 강한 로직은 공통 유틸보다 도메인 폴더를 우선한다.

## 최근 정리

- `app/globals.css`를 import 집계로 축소하고 스타일 본문을 `app/styles/*`로 분리했다.
- 보고서 기간/범위/수량 정규화는 `lib/report/period.js`로 통합했다.
- 원가 detail 카드 4종은 `components/cost/shared/CostDetailCardBase.jsx`를 공유한다.
- 노트 달력 날짜/체크리스트 순수 로직은 `app/note/calendar/_calendar-utils.js`로 분리했다.
- 식자재 폼의 사진/원산지/알레르기 UI는 `IngredientFormSections.jsx`로 분리했다.
