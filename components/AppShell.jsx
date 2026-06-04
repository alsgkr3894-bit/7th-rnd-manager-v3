'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import CommandPalette from './CommandPalette';
import { ToastContainer } from './Toast';
import { ScrollToTop } from './ui/ScrollToTop';
import { Icon } from './icons';
import { applyAllSettings, getSetting, setSetting } from '@/lib/settings';
import { KEYS } from '@/lib/note/keys';
import { ensureSession } from '@/lib/session';
import { pruneOldWorkLogs } from '@/lib/work-log';
import { hydratePlatformsFromDB } from '@/lib/cost/margin/platforms';
import { initClickOrigin } from '@/lib/ui/click-origin';
import { OVERLAY_COLOR } from '@/lib/ui/styles';
import { COMPANIES } from '@/lib/companies';
import { getActiveBrandId, setActiveBrandId } from '@/lib/active-brand';
import { MOBILE_TAB_DEFS } from '@/lib/menu';
import ProgressBar from './ProgressBar';
import OfflineIndicator from './OfflineIndicator';
import DbVersionNotice from './DbVersionNotice';
import { ErrorBoundary } from './ErrorBoundary';
import { useVisualEffects } from '@/hooks/useVisualEffects';
import { usePageStats } from '@/hooks/usePageStats';
import { useModalOrigin } from '@/hooks/useModalOrigin';

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
  { key: 'G I', desc: '식자재로 이동' },
  { key: 'G U', desc: '영양성분으로 이동' },
  { key: 'G B', desc: '보고서로 이동' },
  { key: 'G J', desc: '제때로 이동' },
];

const G_NAV = { h: '/', n: '/note', c: '/cost', r: '/report', s: '/note/sample', i: '/ingredient', u: '/nutrition', b: '/report', j: '/jette' };

function ShortcutsHelp({ onClose }) {
  const cardRef = useRef(null);
  useModalOrigin(cardRef);

  return (
    <div
      role="presentation"
      style={{ position:'fixed', inset:0, background:OVERLAY_COLOR, zIndex:600, display:'grid', placeItems:'center', animation:'fade 150ms ease' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div ref={cardRef} className="card modal-anim" role="dialog" aria-label="키보드 단축키" aria-modal="true" style={{ width:'min(380px,92vw)', padding:'24px 28px' }}>
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
  // 활성 브랜드 복원 (localStorage). 전환 시 저장 후 새로고침으로 모든 모듈이 해당 브랜드 DB로 재초기화.
  const [activeCompany, setActiveCompany] = useState(COMPANIES[0]);
  useEffect(() => {
    const id = getActiveBrandId();
    const found = COMPANIES.find(c => c.id === id);
    if (found && found.id !== activeCompany.id) setActiveCompany(found);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const handleCompanyChange = (c) => {
    if (!c || c.id === getActiveBrandId()) return;
    setActiveBrandId(c.id);
    window.location.reload();
  };
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

  // 모달이 클릭 지점에서 펼쳐지도록 포인터 위치 추적 시작
  useEffect(() => { initClickOrigin(); }, []);

  // 새 브라우저 세션이면 마지막 로그인 시각 갱신
  useEffect(() => { ensureSession(); }, []);

  // 오래된 작업 로그 정리 (세션당 1회)
  useEffect(() => {
    const PRUNE_KEY = KEYS.LAST_WL_PRUNE;
    const hasPruned = (() => { try { return !!sessionStorage.getItem(PRUNE_KEY); } catch { return true; } })();
    if (!hasPruned) {
      pruneOldWorkLogs().catch(() => {});
      try { sessionStorage.setItem(PRUNE_KEY, '1'); } catch {}
    }
  }, []);

  // IndexedDB → localStorage 복원: 새 기기/브라우저에서 백업 복원 후 플랫폼 설정 hydrate
  useEffect(() => { hydratePlatformsFromDB().catch(() => {}); }, []);

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
          onCompanyChange={handleCompanyChange}
          unmatchedCount={unmatchedCount}
          reportingCount={reportingCount}
        />
        <ErrorBoundary key={pathname}>
          {/* 페이지 전환: 세로 슬라이드 대신 은은한 페이드만 (본문이 튀어 보이는 현상 제거) */}
          <div id="main-content" style={{ animation: 'fade-in 180ms ease both' }}>
            {children}
          </div>
        </ErrorBoundary>
      </div>

      <ProgressBar />
      <OfflineIndicator />
      <DbVersionNotice />
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
      <ScrollToTop />
    </div>
  );
}
