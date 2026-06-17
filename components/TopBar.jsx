'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from './icons';
import { getProfile } from '@/lib/profile';
import { getSetting, setSetting } from '@/lib/settings';
import { useOutsideClick } from '@/hooks/useOutsideClick';
import { CompanyPicker } from './topbar/CompanyPicker';
import { ThemeToggle } from './topbar/ThemeToggle';
import { NotificationPopover } from './topbar/NotificationPopover';
import { ProfileMenu } from './topbar/ProfileMenu';

export default function TopBar({
  onOpenPalette,
  onToggleSidebar,
  activeCompany,
  companies = [],
  onCompanyChange,
  unmatchedCount = 0,
  reportingCount = 0,
}) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [dark, setDark] = useState(false);
  const notifRef = useRef(null);
  const companyRef = useRef(null);
  const profileRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const syncTheme = () => {
      setDark(document.documentElement.dataset.theme === 'dark' || getSetting('theme') === 'dark');
    };
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    setProfile(getProfile());
  }, []);
  useEffect(() => {
    const el = document.querySelector('.topbar');
    if (!el) return;
    const onScroll = () => {
      if (window.scrollY > 40) el.classList.add('scrolled');
      else el.classList.remove('scrolled');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toggleDark = () => {
    setDark(prev => {
      const next = !prev;
      setSetting('theme', next ? 'dark' : 'light');
      return next;
    });
  };

  useOutsideClick({ refs: notifRef, enabled: notifOpen, onOutside: () => setNotifOpen(false) });
  useOutsideClick({ refs: companyRef, enabled: companyOpen, onOutside: () => setCompanyOpen(false) });
  useOutsideClick({ refs: profileRef, enabled: profileOpen, onOutside: () => setProfileOpen(false) });

  const notifs = [
    ...(unmatchedCount > 0
      ? [{ kind: 'alert', title: `미매칭 ${unmatchedCount}건 처리 필요`, time: '지금', desc: '메뉴 판매량 → 미매칭 관리에서 별칭/규칙/제외로 처리할 수 있어요', href: '/menu-sales/unmatched' }]
      : []),
    ...(reportingCount > 0
      ? [{ kind: 'note', title: `보고예정 노트 ${reportingCount}건`, time: '미보고', desc: '메뉴개발노트 → 보고예정 탭에서 확인하세요', href: '/note?status=보고예정' }]
      : []),
  ];

  return (
    <header className="topbar">
      <button className="icon-btn mobile-only" onClick={onToggleSidebar} aria-label="메뉴 열기">
        <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      <CompanyPicker
        companyRef={companyRef}
        companyOpen={companyOpen}
        onToggle={() => setCompanyOpen(v => !v)}
        activeCompany={activeCompany}
        companies={companies}
        onCompanyChange={onCompanyChange}
      />

      <button className="search" onClick={onOpenPalette} aria-label="통합 검색 열기 (⌘K)">
        <Icon.search aria-hidden="true" style={{ width: 16, height: 16 }} />
        <span className="search-placeholder" aria-hidden="true">메뉴, 재료, 보고서 검색</span>
        <kbd aria-hidden="true">⌘K</kbd>
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
        <button className="icon-btn" aria-label="새 노트 작성" onClick={() => router.push('/note/write')}>
          <Icon.plus aria-hidden="true" style={{ width: 18, height: 18 }} />
        </button>

        <ThemeToggle dark={dark} onToggle={toggleDark} />

        <NotificationPopover
          notifRef={notifRef}
          notifOpen={notifOpen}
          onToggle={() => setNotifOpen(v => !v)}
          notifs={notifs}
        />

        <ProfileMenu
          profileRef={profileRef}
          profileOpen={profileOpen}
          onToggle={() => setProfileOpen(v => !v)}
          profile={profile}
        />
      </div>
    </header>
  );
}
