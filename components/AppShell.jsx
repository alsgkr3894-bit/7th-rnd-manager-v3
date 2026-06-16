'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import CommandPalette from './CommandPalette';
import { ToastContainer } from './Toast';
import { ScrollToTop } from './ui/ScrollToTop';
import { applyAllSettings } from '@/lib/settings';
import { KEYS } from '@/lib/note/keys';
import { ensureSession } from '@/lib/session';
import { pruneOldWorkLogs } from '@/lib/work-log';
import { hydratePlatformsFromDB } from '@/lib/cost/margin/platforms';
import { initClickOrigin } from '@/lib/ui/click-origin';
import { MOBILE_TAB_DEFS } from '@/lib/menu';
import { Icon } from './icons';
import ProgressBar from './ProgressBar';
import OfflineIndicator from './OfflineIndicator';
import DbVersionNotice from './DbVersionNotice';
import { ErrorBoundary } from './ErrorBoundary';
import { useVisualEffects } from '@/hooks/useVisualEffects';
import { usePageStats } from '@/hooks/usePageStats';
import { useSettingValue } from '@/hooks/useSettingValue';
import { useAppBrands } from '@/hooks/useAppBrands';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { ShortcutsHelp } from './ShortcutsHelp';

export default function AppShell({ children }) {
  const [mobileNav, setMobileNav] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const { brandOptions, activeCompany, handleCompanyChange } = useAppBrands();
  const { unmatchedCount, reportingCount } = usePageStats(pathname);
  const unmatchedAlertEnabled = useSettingValue('unmatchedAlert') !== 'off';
  const visibleUnmatchedCount = unmatchedAlertEnabled ? unmatchedCount : 0;

  useKeyboardShortcuts({
    router,
    onOpenPalette: () => setPaletteOpen(true),
    onToggleShortcuts: () => setShortcutsOpen(v => !v),
    onClosePalette: () => setPaletteOpen(false),
    onCloseShortcuts: () => setShortcutsOpen(false),
  });

  useEffect(() => {
    applyAllSettings();
  }, []);

  useEffect(() => {
    initClickOrigin();
  }, []);

  useEffect(() => {
    ensureSession();
  }, []);

  useEffect(() => {
    const PRUNE_KEY = KEYS.LAST_WL_PRUNE;
    const hasPruned = (() => {
      try {
        return !!sessionStorage.getItem(PRUNE_KEY);
      } catch {
        return true;
      }
    })();
    if (!hasPruned) {
      pruneOldWorkLogs().catch(() => {});
      try {
        sessionStorage.setItem(PRUNE_KEY, '1');
      } catch {}
    }
  }, []);

  useEffect(() => {
    hydratePlatformsFromDB().catch(() => {});
  }, []);

  useEffect(() => {
    setMobileNav(false);
  }, [pathname]);

  useVisualEffects();

  const isTabActive = href => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href.split('/').slice(0, 2).join('/'));
  };

  return (
    <div className={'app ' + (mobileNav ? 'nav-open' : '')} suppressHydrationWarning>
      <a href="#main-content" className="skip-link">
        콘텐츠로 건너뛰기
      </a>

      <Sidebar
        onClose={() => setMobileNav(false)}
        activeCompany={activeCompany}
        unmatchedCount={visibleUnmatchedCount}
        reportingCount={reportingCount}
      />
      {mobileNav && <div className="nav-scrim" onClick={() => setMobileNav(false)}></div>}

      <div>
        <TopBar
          onOpenPalette={() => setPaletteOpen(true)}
          onToggleSidebar={() => setMobileNav(v => !v)}
          activeCompany={activeCompany}
          companies={brandOptions}
          onCompanyChange={handleCompanyChange}
          unmatchedCount={visibleUnmatchedCount}
          reportingCount={reportingCount}
        />
        <ErrorBoundary key={pathname}>
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

      <div className="bottom-tab-bar">
        <div className="tabs-inner">
          {MOBILE_TAB_DEFS.map(tab => {
            const badge = tab.badgeKey === 'unmatched' ? visibleUnmatchedCount : 0;
            const TabIcon = Icon[tab.iconKey];
            return (
              <button
                key={tab.href}
                className={'bottom-tab ' + (isTabActive(tab.href) ? 'active' : '')}
                onClick={() => router.push(tab.href)}
              >
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
