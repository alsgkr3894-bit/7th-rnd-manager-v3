import './fonts/pretendard.css';
import './globals.css';
import AppShell from '@/components/AppShell';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PARENT_COMPANY } from '@/lib/companies';

// 폰트는 글자 조각(unicode-range) 8개로 나뉘어 있어 화면에 쓰인 글자의 조각만 받는다.
// 원본(2MB)은 fonts-src/, 조각 생성은 scripts/build-font-slices.py. --font-pretendard는 pretendard.css가 정의한다.
export const metadata = {
  title: '7번가 R&D 플랫폼',
  description: `${PARENT_COMPANY.name} R&D팀 원가계산 · 식자재 · 메뉴개발 통합 플랫폼`,
  manifest: '/manifest.json',
  icons: { icon: '/favicon.ico' },
};

// WCAG 1.4.4: 저시력 사용자 확대 허용 (user-scalable 제한 없음, maximum-scale=5)
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* FOUC 방지 — 렌더 전 다크모드 즉시 적용
            suppressHydrationWarning: localStorage 접근은 서버에서 실행 불가이므로
            SSR("")과 Client(실제 스크립트) 간 내용이 의도적으로 다름 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('v3:theme');if(t==='dark')document.documentElement.dataset.theme='dark';}catch(e){}`,
          }}
          suppressHydrationWarning
        />
      </head>
      {/* suppressHydrationWarning: Grammarly 등 브라우저 확장이 bis_skin_checked 같은
          속성을 DOM에 주입할 때 React hydration 경고가 발생하는 것을 억제 */}
      <body suppressHydrationWarning>
        <ErrorBoundary>
          <AppShell>{children}</AppShell>
        </ErrorBoundary>
      </body>
    </html>
  );
}
