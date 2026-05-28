import './globals.css';
import localFont from 'next/font/local';
import AppShell from '@/components/AppShell';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const pretendard = localFont({
  src: '../public/fonts/PretendardVariable.woff2',
  display: 'swap',
  variable: '--font-pretendard',
  weight: '100 900',
});

export const metadata = {
  title: '7번가 R&D 플랫폼',
  description: '7번가피자 R&D팀 원가계산 · 식자재 · 메뉴개발 통합 플랫폼',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko" className={pretendard.variable}>
      <head>
        {/* FOUC 방지 — 렌더 전 다크모드 즉시 적용 */}
        <script dangerouslySetInnerHTML={{__html:`
          try{var t=localStorage.getItem('v3:theme');if(t==='dark')document.documentElement.dataset.theme='dark';}catch(e){}
        `}}/>
      </head>
      <body>
        <ErrorBoundary>
          <AppShell>{children}</AppShell>
        </ErrorBoundary>
      </body>
    </html>
  );
}
