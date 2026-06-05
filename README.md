# 7번가 R&D 플랫폼 — Next.js 프로젝트

## 빠른 시작

```bash
# 1. 의존성 설치
npm install

# 2. 개발 서버 실행
npm run dev

# 3. 브라우저에서 열기
http://localhost:3000
```

## 프로덕션 빌드

```bash
npm run build
npm run start
```

> ⚠️ **개발 중 주의**
> - `next dev` 서버가 떠 있는 상태에서 `npm run build`를 돌리면 `.next` 청크가 꼬여
>   기존 dev 서버가 500(`Cannot find module './xxxx.js'`)을 낼 수 있습니다.
>   **dev 서버 실행 중에는 build를 돌리지 마세요.**
> - 청크가 꼬였거나 QA 직전 깨끗한 상태가 필요하면 `npm run dev:clean`을 쓰세요
>   (`.next` 삭제 후 dev 재시작 표준 경로).

## 스모크 QA

```bash
# dev 서버(localhost:3000)가 떠 있는 상태에서 실행
npm run qa:smoke
```

대표 라우트를 순회하며 각 페이지의 제목(h1)·`main`·콘솔 에러·가로 스크롤(`scrollWidth > innerWidth`)·
에러 문구를 검사해 표로 출력합니다. 데이터 변경(업로드·저장·복원·초기화)은 실행하지 않습니다.

---

## 프로젝트 구조

```
nextjs-wonpay/
├── app/                        # Next.js App Router
│   ├── layout.jsx              # 루트 레이아웃 (AppShell 포함)
│   ├── globals.css             # 전역 스타일 (CSS 변수 토큰)
│   ├── page.jsx                # 홈 대시보드
│   ├── menu-sales/             # 메뉴 판매량
│   │   ├── upload/page.jsx     # 파일 업로드
│   │   ├── rank/page.jsx       # 판매량 순위
│   │   ├── compare/page.jsx    # 판매량 비교
│   │   └── unmatched/page.jsx  # 미매칭 관리
│   ├── jette/                  # 제때상품관리
│   ├── cost/                   # 원가계산 (11개 하위 페이지)
│   ├── ingredient/             # 식자재 관리
│   ├── nutrition/              # 영양성분
│   ├── note/                   # 메뉴개발노트
│   ├── report/                 # 보고서센터
│   └── settings/               # 설정 / 백업
│
├── components/
│   ├── AppShell.jsx            # 사이드바 + 탑바 + 커맨드팔레트 + 토스트
│   ├── Sidebar.jsx             # 사이드바 (usePathname 기반 active 상태)
│   ├── TopBar.jsx              # 상단 바 (알림, 프로필)
│   ├── CommandPalette.jsx      # ⌘K 커맨드 팔레트
│   ├── Toast.jsx               # 토스트 알림 시스템
│   ├── icons.jsx               # SVG 아이콘 세트
│   ├── charts/
│   │   ├── Sparkline.jsx       # 스파크라인 + 드로우 애니메이션
│   │   ├── AreaChart.jsx       # 영역 차트 + hover 크로스헤어
│   │   └── Donut.jsx           # 도넛 차트 + hover 효과
│   └── ui/
│       └── PageHeader.jsx      # PageHeader + FilterBar 공통 컴포넌트
│
├── lib/
│   ├── data.js                 # 더미 데이터 (메뉴, 식자재, 차트)
│   ├── fmt.js                  # 숫자 포맷 유틸 (fmtKRW, fmtShort)
│   └── useCountUp.js           # 숫자 카운트업 훅
│
├── public/
│   └── logo-7thstreet.png      # 브랜드 로고
│
├── package.json
├── next.config.mjs
└── jsconfig.json
```

---

## 주요 디자인 토큰

`app/globals.css` 에 모든 CSS 변수가 정의되어 있어요.

```css
--accent: #3182F6;        /* 강조색 */
--positive: #1A8917;      /* 성공/증가 */
--negative: #E03131;      /* 경고/감소 */
--warn: #C76A00;          /* 주의 */
--surface: #FFFFFF;       /* 카드 배경 */
--bg: #F2F4F6;            /* 페이지 배경 */
--text-1: #191F28;        /* 기본 텍스트 */
--text-2: #4E5968;        /* 보조 텍스트 */
--radius-xl: 20px;        /* 카드 반경 */
```

다크모드는 `<html data-theme="dark">` 로 전환해요.

---

## 토스트 알림 사용법

```jsx
import { showToast } from '@/components/Toast';

// 사용 예시
showToast('저장됐어요', 'ok');      // ✓ 초록
showToast('파일을 선택하세요', 'info'); // ℹ 파란색
showToast('오류가 발생했어요', 'error'); // ✗ 빨간색
showToast('확인이 필요해요', 'warn');    // ⚠ 주황색
```

---

## 실제 API 연동 방법

현재 모든 데이터는 `lib/data.js` 의 더미 데이터를 사용해요.

실제 API 연동 시:
1. `lib/data.js` → API 호출 함수로 교체
2. 각 페이지에서 `useEffect` + `fetch` 또는 `SWR` / `React Query` 사용
3. Next.js API Routes: `app/api/` 폴더에 엔드포인트 추가

```js
// 예시: app/api/menus/route.js
export async function GET() {
  const data = await db.menus.findMany();
  return Response.json(data);
}
```

---

## 폰트

Pretendard Variable (CDN 방식, `app/layout.jsx` 에 포함)

로컬 폰트로 변경하려면:
```bash
npm install @fontsource-variable/pretendard
```

---

## 기술 스택

| 항목 | 버전 |
|---|---|
| Next.js | 14.2.3 |
| React | 18.3.1 |
| 언어 | JavaScript (JSX) |
| 스타일 | CSS Variables (globals.css) |
| 라우터 | App Router |
| 차트 | 순수 SVG (외부 라이브러리 없음) |
| 상태관리 | React useState (로컬) |
