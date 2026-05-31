'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import CommandPalette from './CommandPalette';
import { ToastContainer } from './Toast';
import { Icon } from './icons';
import { applyAllSettings, getSetting, setSetting } from '@/lib/settings';
import { ensureSession } from '@/lib/session';
import { COMPANIES } from '@/lib/companies';
import { MOBILE_TAB_DEFS } from '@/lib/menu';
import ProgressBar from './ProgressBar';
import OfflineIndicator from './OfflineIndicator';
import { ErrorBoundary } from './ErrorBoundary';
import { useVisualEffects } from '@/hooks/useVisualEffects';
import { usePageStats } from '@/hooks/usePageStats';

const SHORTCUTS = [
  { key: 'N',   desc: '새 테스트 노트 작성' },
  { key: '⌘K', desc: '커맨드 팔레트 열기' },
  { key: '/',   desc: '페이지 내 검색창 포커스' },
  { key: 'D',   desc: '다크모드 토글' },
  { key: '?',   desc: '단축키 도움말 토글' },
  { key: 'Esc', desc: '모달/팔레트 닫기' },
  { key: 'G H', desc: '홈으로 이동' },
  { key: 'G N', desc: '노트 목록으로 이동' },
  { key: 'G C', desc: '원가 계산으로 이동' },
  { key: 'G R', desc: '보고서로 이동' },
  { key: 'G S', desc: '샘플 기록으로 이동' },
];

const G_NAV = { h: '/', n: '/note', c: '/cost', r: '/report', s: '/note/sample' };

function ShortcutsHelp({ onClose }) {
  return (
    <div
      role="presentation"
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:600, display:'grid', placeItems:'center', animation:'fade 150ms ease' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card modal-anim" role="dialog" aria-label="키보드 단축키" aria-modal="true" style={{ width:'min(380px,92vw)', padding:'24px 28px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div style={{ fontWeight:800, fontSize:16, color:'var(--text-1)' }}>키보드 단축키</div>
          <button className="btn" style={{ padding:'4px 8px' }} onClick={onClose}>
            <Icon.close style={{ width:15, height:15 }}/>
          </button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {SHORTCUTS.map(s => (
            <div key={s.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:13, color:'var(--text-2)' }}>{s.desc}</span>
              <kbd style={{
                fontSize:12, fontWeight:700, padding:'3px 10px', borderRadius:7,
                background:'var(--surface-2)', border:'1px solid var(--border-strong)',
                color:'var(--text-1)', fontFamily:'inherit', flexShrink:0,
              }}>{s.key}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AppShell({ children }) {
  const [mobileNav, setMobileNav] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const gPressedRef = useRef(false);
  const gTimerRef = useRef(null);
  const [activeCompany, setActiveCompany] = useState(COMPANIES[0]);
  const pathname = usePathname();
  const router = useRouter();
  const { unmatchedCount, reportingCount } = usePageStats(pathname);

  // 키보드 단축키
  useEffect(() => {
    const unmodified = (e) => !e.metaKey && !e.ctrlKey && !e.altKey;

    // 수정자 없는 단일 키 → 동작 맵
    const PLAIN_KEY_ACTIONS = {
      'n': (e) => { e.preventDefault(); router.push('/note/write'); },
      '/': (e) => {
        e.preventDefault();
        document.querySelector('.filter-search input, [data-search-input], input[placeholder*="검색"]')?.focus();
      },
      'd': (e) => {
        e.preventDefault();
        setSetting('theme', getSetting('theme') === 'dark' ? 'light' : 'dark');
        applyAllSettings();
      },
    };

    const handleKeyDown = (e) => {
      // ⌘K / Ctrl+K → 커맨드 팔레트
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }

      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // G+키 시퀀스 네비게이션
      if (gPressedRef.current) {
        const dest = G_NAV[e.key.toLowerCase()];
        gPressedRef.current = false;
        clearTimeout(gTimerRef.current);
        if (dest) { e.preventDefault(); router.push(dest); }
        return;
      }
      if (e.key === 'g' && unmodified(e)) {
        e.preventDefault();
        gPressedRef.current = true;
        clearTimeout(gTimerRef.current);
        gTimerRef.current = setTimeout(() => { gPressedRef.current = false; }, 800);
        return;
      }

      // 수정자 없는 단일 키
      if (unmodified(e) && PLAIN_KEY_ACTIONS[e.key]) {
        PLAIN_KEY_ACTIONS[e.key](e);
        return;
      }

      if (e.key === '?')      setShortcutsOpen(v => !v);
      if (e.key === 'Escape') { setShortcutsOpen(false); setPaletteOpen(false); }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  // 사용자 설정 (다크모드/밀도/알림) 페이지 진입 시 적용
  useEffect(() => { applyAllSettings(); }, []);

  // 새 브라우저 세션이면 마지막 로그인 시각 갱신
  useEffect(() => { ensureSession(); }, []);

  // 모바일 nav 닫기 on route change
  useEffect(() => { setMobileNav(false); }, [pathname]);

  // 버튼 ripple + 카드 tilt 시각 효과
  useVisualEffects();

  const isTabActive = (href) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href.split('/').slice(0, 2).join('/'));
  };

  return (
    <div className={'app ' + (mobileNav ? 'nav-open' : '')} suppressHydrationWarning>
      {/* 키보드 사용자 Skip Link — 포커스 받을 때만 화면에 나타남 */}
      <a href="#main-content" className="skip-link">콘텐츠로 건너뛰기</a>

      <Sidebar onClose={() => setMobileNav(false)} activeCompany={activeCompany} unmatchedCount={unmatchedCount} reportingCount={reportingCount} />
      {mobileNav && <div className="nav-scrim" onClick={() => setMobileNav(false)}></div>}

      <div>
        <TopBar
          onOpenPalette={() => setPaletteOpen(true)}
          onToggleSidebar={() => setMobileNav(v => !v)}
          activeCompany={activeCompany}
          onCompanyChange={setActiveCompany}
          unmatchedCount={unmatchedCount}
          reportingCount={reportingCount}
        />
        <ErrorBoundary key={pathname}>
          <div id="main-content" style={{ animation: 'slide-up 280ms cubic-bezier(0.2,0.8,0.2,1) both' }}>
            {children}
          </div>
        </ErrorBoundary>
      </div>

      <ProgressBar />
      <OfflineIndicator />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      {shortcutsOpen && <ShortcutsHelp onClose={() => setShortcutsOpen(false)} />}

      {/* 모바일 하단 탭바 */}
      <div className="bottom-tab-bar">
        <div className="tabs-inner">
          {MOBILE_TAB_DEFS.map(tab => {
            const badge = tab.badgeKey === 'unmatched' ? unmatchedCount : 0;
            const TabIcon = Icon[tab.iconKey];
            return (
              <button key={tab.href}
                className={'bottom-tab ' + (isTabActive(tab.href) ? 'active' : '')}
                onClick={() => router.push(tab.href)}>
                {badge > 0 && <span className="tab-badge">{badge}</span>}
                <TabIcon className="tab-ico" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <ToastContainer />
    </div>
  );
}
