import './globals.css';
import localFont from 'next/font/local';
import AppShell from '@/components/AppShell';

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
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
