import './globals.css';
import { Pretendard } from 'next/font/local';
import AppShell from '@/components/AppShell';

export const metadata = {
  title: '7번가 R&D 플랫폼',
  description: '7번가피자 R&D팀 원가계산 · 식자재 · 메뉴개발 통합 플랫폼',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
