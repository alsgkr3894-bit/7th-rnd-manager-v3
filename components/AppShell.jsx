'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import CommandPalette from './CommandPalette';
import { ToastContainer } from './Toast';
import { Icon } from './icons';
import { applyAllSettings } from '@/lib/settings';

const MOBILE_TABS = [
  { href: '/',                    label: '홈',     icon: Icon.home },
  { href: '/menu-sales/rank',     label: '판매량', icon: Icon.chart, badge: 3 },
  { href: '/cost/pizza-summary',  label: '원가',   icon: Icon.calc },
  { href: '/note',                label: '노트',   icon: Icon.note },
  { href: '/report',              label: '보고서', icon: Icon.doc },
];

export default function AppShell({ children }) {
  const [mobileNav, setMobileNav] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // ⌘K
  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // 사용자 설정 (다크모드/밀도/알림) 페이지 진입 시 적용
  useEffect(() => { applyAllSettings(); }, []);

  // 모바일 nav 닫기 on route change
  useEffect(() => { setMobileNav(false); }, [pathname]);

  const isTabActive = (href) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href.split('/').slice(0, 2).join('/'));
  };

  return (
    <div className={'app ' + (mobileNav ? 'nav-open' : '')}>
      <Sidebar onClose={() => setMobileNav(false)} />
      {mobileNav && <div className="nav-scrim" onClick={() => setMobileNav(false)}></div>}

      <div>
        <TopBar
          onOpenPalette={() => setPaletteOpen(true)}
          onToggleSidebar={() => setMobileNav(v => !v)}
        />
        <div key={pathname} style={{ animation: 'slide-up 280ms cubic-bezier(0.2,0.8,0.2,1) both' }}>
          {children}
        </div>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      {/* 모바일 하단 탭바 */}
      <div className="bottom-tab-bar">
        <div className="tabs-inner">
          {MOBILE_TABS.map(tab => (
            <button key={tab.href}
              className={'bottom-tab ' + (isTabActive(tab.href) ? 'active' : '')}
              onClick={() => router.push(tab.href)}>
              {tab.badge && <span className="tab-badge">{tab.badge}</span>}
              <tab.icon className="tab-ico" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <ToastContainer />
    </div>
  );
}
