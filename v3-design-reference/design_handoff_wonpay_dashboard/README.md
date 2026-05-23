# Handoff: WONPAY 비즈니스 — 7번가 R&D 플랫폼 대시보드

## 개요

7번가피자 R&D팀을 위한 **내부 운영 플랫폼**의 웹 UI 디자인입니다.
메뉴 원가 계산, 식자재 관리, 판매량 분석, 메뉴 개발 노트, 보고서 생성 등
R&D 업무 전반을 하나의 대시보드에서 처리할 수 있도록 설계되었습니다.

---

## ⚠️ 디자인 파일 안내

이 폴더 안의 HTML/JSX 파일들은 **디자인 레퍼런스(프로토타입)**입니다.
프로덕션 코드로 그대로 사용하지 마시고, 아래 내용을 참고해 **실제 프레임워크(Next.js, React 등) 환경에서 재구현**해주세요.

현재 프로토타입은 브라우저에서 Babel을 실시간으로 트랜스파일하는 방식이므로,
실서비스에서는 Vite 또는 Next.js로 빌드 파이프라인을 구성해야 합니다.

---

## 완성도 (Fidelity)

**High-Fidelity** — 픽셀 수준의 정밀한 목업입니다.
- 색상, 타이포그래피, 간격, 인터랙션이 모두 구현되어 있습니다.
- 다크모드, 반응형(모바일/태블릿/데스크탑), 애니메이션까지 포함됩니다.
- 실제 데이터 연동 없이 더미 데이터로 작동합니다.

---

## 기술 스택 (프로토타입 기준)

| 항목 | 내용 |
|---|---|
| UI 라이브러리 | React 18.3.1 |
| 언어 | JSX (Babel standalone) |
| 폰트 | Pretendard Variable (orioncactus CDN) |
| 아이콘 | 커스텀 SVG (icons.jsx) |
| 차트 | 순수 SVG (외부 라이브러리 없음) |
| 스타일 | 순수 CSS (styles.css, CSS 변수 기반 토큰) |

### 추천 프로덕션 스택
- **Next.js 14+** (App Router) or **Vite + React**
- **Tailwind CSS** or **CSS Modules** (현재 CSS 변수 토큰 그대로 이식 가능)
- **Recharts** or **Nivo** (차트 라이브러리로 교체 권장)

---

## 디자인 토큰

### 색상 (Light Mode)

```css
--bg: #F2F4F6;           /* 페이지 배경 */
--bg-2: #E9ECEF;
--surface: #FFFFFF;      /* 카드 배경 */
--surface-2: #F7F8FA;    /* 서브 배경 */
--text-1: #191F28;       /* 기본 텍스트 */
--text-2: #4E5968;       /* 보조 텍스트 */
--text-3: #8B95A1;       /* 힌트/레이블 */
--text-4: #B0B8C1;       /* 비활성 */
--border: #EBEEF1;
--border-strong: #D1D6DB;
--divider: #F1F3F5;

/* 강조색 */
--accent: #3182F6;
--accent-press: #1B64DA;
--accent-soft: #E8F2FE;
--accent-text: #1B64DA;

/* 상태색 */
--positive: #1A8917;     /* 긍정/증가 */
--positive-soft: #E6F4E6;
--negative: #E03131;     /* 경고/감소 */
--negative-soft: #FCEAEA;
--warn: #C76A00;         /* 주의 */
--warn-soft: #FFF1E0;
```

### 색상 (Dark Mode)

```css
--bg: #0F1217;
--surface: #1B1F26;
--surface-2: #22272F;
--text-1: #F4F6F9;
--text-2: #B0B8C1;
--border: #2A2F37;
```

### 타이포그래피

- **폰트**: Pretendard Variable (한국어 최적화 가변 폰트)
- **기본 크기**: 14px
- **자간**: `-0.01em` (기본), `-0.02em` ~ `-0.04em` (제목)
- **숫자**: `font-feature-settings: "tnum" 1` (tabular numbers)

| 용도 | 크기 | 굵기 |
|---|---|---|
| 페이지 제목 (h1) | 28px | 800 |
| 카드 제목 | 16px | 700 |
| 금액/KPI 대형 | 44px | 800 |
| KPI 중형 | 32px | 800 |
| 본문 | 14px | 400~600 |
| 레이블/메타 | 12px | 600 |
| 소형 태그 | 11px | 600~700 |

### 간격 & 반경

```css
--gap: 24px;          /* 카드 간격 (compact: 16px) */
--pad-card: 28px;     /* 카드 내부 여백 */

--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-xl: 20px;    /* 카드 기본 반경 */
--radius-2xl: 24px;
```

### 그림자

```css
--shadow-sm: 0 1px 2px rgba(20, 24, 35, 0.04);
--shadow-md: 0 1px 3px rgba(20, 24, 35, 0.06), 0 6px 16px rgba(20, 24, 35, 0.04);
--shadow-lg: 0 8px 32px rgba(20, 24, 35, 0.08);
```

---

## 레이아웃 구조

```
┌─────────────────────────────────────────────┐
│  Sidebar (260px, sticky)  │  Content Area    │
│                           │                  │
│  - 브랜드 로고             │  TopBar (sticky) │
│  - 메인 내비게이션         │                  │
│  - 시스템 내비게이션       │  <Page />        │
│  - 푸터 (최신 단가 상태)   │                  │
└─────────────────────────────────────────────┘
```

- **앱 셸**: `display: grid; grid-template-columns: 260px 1fr`
- **최대 너비**: `1320px` (content area)
- **반응형 브레이크포인트**:
  - `≤1100px`: 히어로 카드 2열, 상태 카드 2열
  - `≤768px`: 사이드바 drawer로 전환, 모바일 레이아웃

---

## 화면 목록 및 설명

### 1. 홈 대시보드 (`home`)
**파일**: `dashboard.jsx`

주요 구성 요소:
- **인사 영역**: 이름, 오늘의 알림 요약, 액션 버튼
- **히어로 행** (3열 그리드):
  - 이번 달 누적 판매량 (어두운 배경 카드, 방사형 그라디언트)
  - 평균 원가율 KPI + 스파크라인
  - 진행 중 R&D 노트 KPI + 스파크라인
- **상태 행** (3열):
  - 데이터 정합성 (미매칭/미연동 건수)
  - 이번 주 액션 아이템
  - 원가율 위험 메뉴 리스트
- **빠른 노트 입력**: 인라인 한 줄 메모
- **빠른 작업 버튼** (5개): 업로드, 노트, 보고서, 원가계산, 백업
- **메뉴 총 판매량 추이 차트** + **카테고리별 도넛 차트**
- **메뉴 판매 순위 TOP 5** + **최근 활동 피드**

**애니메이션**:
- 숫자 카운트업 (cubic-bezier ease-out, 900~1400ms)
- 스파크라인 드로우 애니메이션 (stroke-dashoffset, 900ms)
- 도넛 차트 sweep 애니메이션 (560ms per segment)
- 페이지 진입 `slide-up` 트랜지션 (280ms)

---

### 2. 메뉴 판매량 (`menu-sales-*`)
**파일**: `pages-menu-sales.jsx`

하위 페이지:
- **판매량 업로드**: 스텝바 + 드롭존 + 미매칭 매핑 UI
- **판매량 순위**: 필터바 + 데이터 테이블 (순위, 메뉴명, 카테고리, 판매량, 전월비)
- **판매량 비교**: 기간 탭 (주/월/분기/연) + 비교 테이블
- **미매칭 관리**: 좌우 매핑 UI (원본명 → 시스템명, 신뢰도 표시)

---

### 3. 제때상품관리 (`jette-*`)
**파일**: `pages-jette.jsx`

- **상품 가격 비교**: 제때 상품별 단가 테이블
- **범용상품 출고량**: 기간별 출고 데이터

---

### 4. 원가계산 (`cost-*`)
**파일**: `pages-cost.jsx`

- **피자 종합 원가표**: 메뉴별 원가율 요약 (위험 메뉴 하이라이트)
- **피자 세부 원가표**: 재료별 원가 분해
- **식자재 원가표**: g·개당 단가 기준표
- **랜딩 페이지**: 원가계산 카테고리 카드 grid

---

### 5. 식자재 (`ingredient-*`)
**파일**: `pages-ingredient.jsx`

- **식자재 리스트**: 전체 재료 테이블 (단가, 단위, 구매처)
- **식자재 이슈**: 단가 인상/미연동 이슈 피드
- **식자재 사용 현황**: 메뉴별 재료 사용 현황

---

### 6. 영양성분 (`nutrition-*`)
**파일**: `pages-nutrition.jsx`

- **메뉴 영양성분**: 칼로리·나트륨·단백질 등 테이블
- **알레르기 관리**: 알레르겐 매트릭스
- **표시 의무 점검**: 법적 표시 의무 체크리스트

---

### 7. 메뉴개발노트 (`menu-dev-note-*`)
**파일**: `pages-note.jsx`

- **노트 목록**: 카드 그리드 (제목, 메뉴명, 날짜, 태그, 요약)
- **노트 작성**: 2열 폼 (메인 입력 + 사이드 요약카드)
  - 메뉴명, 개발 구분, 테스트 조건, 온도/시간, 평가, 원가 자동 계산

---

### 8. 보고서센터 (`report-*`)
**파일**: `pages-report.jsx`, `pages-report-modals.jsx`

- **랜딩**: 보고서 종류 카드 선택
- **판매량 보고서**: 기간 설정 + 미리보기 + 다운로드
- **원가계산 보고서**: 원가율 추이 + 위험 메뉴
- **가격/출고량 보고서**: 기간별 비교 테이블

---

### 9. 설정 (`settings-*`)
**파일**: `pages-settings.jsx`

- **시스템 설정**: 다크모드, 알림, 언어, 밀도 등
- **데이터 백업**: 수동/자동 백업 설정
- **계정 관리**: 프로필, 비밀번호, 팀 멤버

---

## 공통 컴포넌트

### Sidebar (`components.jsx`)
- 260px 고정폭, sticky
- 그룹별 expand/collapse (grid-template-rows 애니메이션)
- active 상태 강조 (accent-soft 배경)
- 배지 (빨간 알림 숫자)
- 모바일: drawer로 전환 (transform translateX)

### TopBar (`components.jsx`)
- sticky, 스크롤 시 blur 배경
- 회사 선택 pill
- 통합 검색 버튼 → 커맨드 팔레트 열기
- 알림 드롭다운 (4종 알림 타입)
- 프로필 pill

### CommandPalette (`components.jsx`)
- `⌘K` 단축키로 열기
- 전체 메뉴 검색 + 빠른 액션
- 키보드 네비게이션 (↑↓, Enter, Esc)

### 카드 컴포넌트
```css
.card {
  background: var(--surface);
  border-radius: var(--radius-xl);   /* 20px */
  padding: var(--pad-card);          /* 28px */
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border);
}
```

### 버튼 스타일
- `.btn` — 기본 (surface-2 배경)
- `.btn.primary` — 강조 (accent 배경)
- `.btn.ghost` — 투명
- `.btn.dark-onlight` — 어두운 카드 위 밝은 버튼
- `.btn.sm` / `.btn.lg` — 크기 변형

### 데이터 테이블
- thead: surface-2 배경, 11px 대문자 레이블
- tbody: hover 시 surface-2
- 정렬 아이콘 (▲▼)

### 모달
- 반투명 스크림 (`rgba(20,24,35,0.45)`)
- 480px 너비, 24px 반경
- `pop` 진입 애니메이션 (translateY + scale + opacity)

---

## 인터랙션 & 동작

| 인터랙션 | 동작 |
|---|---|
| 사이드바 메뉴 클릭 | 페이지 전환 (slide-up 애니메이션) |
| ⌘K | 커맨드 팔레트 열기 |
| 알림 버튼 | 드롭다운 토글 |
| 차트 호버 | 툴팁 표시 (절대 위치, 좌우 자동 조정) |
| 페이지 진입 | slide-up 애니메이션 (280ms) |
| 버튼 클릭 | scale(0.98) 피드백 |
| 모바일 사이드바 | drawer 슬라이드 (240ms, 백드롭 클릭 닫기) |

---

## 애셋

| 파일 | 용도 |
|---|---|
| `assets/logo-7thstreet.png` | 사이드바/탑바 브랜드 로고 |

---

## 파일 구조

```
index.html          — HTML 진입점
styles.css          — 전체 CSS (토큰 + 컴포넌트 스타일)
icons.jsx           — SVG 아이콘 컴포넌트 모음
components.jsx      — Sidebar, TopBar, CommandPalette, 차트 컴포넌트
dashboard.jsx       — 홈 대시보드 페이지
app.jsx             — 라우터 + 앱 셸 + Tweaks 패널
pages-menu-sales.jsx    — 메뉴 판매량 관련 페이지들
pages-jette.jsx         — 제때상품관리 페이지들
pages-cost.jsx          — 원가계산 페이지들
pages-ingredient.jsx    — 식자재 페이지들
pages-nutrition.jsx     — 영양성분 페이지들
pages-note.jsx          — 메뉴개발노트 페이지들
pages-report.jsx        — 보고서센터 페이지들
pages-report-modals.jsx — 보고서 모달
pages-settings.jsx      — 설정 페이지들
pages-data.jsx          — 공통 더미 데이터
```

---

## Claude Code에게 전달할 프롬프트 (복사해서 사용)

```
이 폴더의 디자인 레퍼런스를 기반으로 Next.js(또는 Vite + React) 프로젝트를 만들어줘.

디자인 파일: design_handoff_wonpay_dashboard/ 폴더 전체
- README.md에 모든 디자인 토큰, 컴포넌트 스펙, 화면 목록이 정리되어 있어
- styles.css에 실제 CSS 토큰과 스타일이 있으니 그대로 이식해줘
- components.jsx, dashboard.jsx 등 JSX 파일들이 실제 UI 구조야

구현 요청:
1. Pretendard 폰트 적용 (orioncactus CDN 또는 로컬)
2. styles.css의 CSS 변수를 global.css로 이식
3. Sidebar + TopBar 공통 레이아웃 컴포넌트 구현
4. 홈 대시보드 페이지부터 구현 시작
5. 차트는 Recharts 또는 순수 SVG로 구현
6. 다크모드: data-theme="dark" 어트리뷰트 방식 유지

우선순위: 홈 대시보드 → 메뉴 판매량 → 원가계산 순으로 진행해줘.
```
