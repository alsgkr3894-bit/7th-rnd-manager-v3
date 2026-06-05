'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from './icons';
import { getProfile, getInitial } from '@/lib/profile';
import { clearAuthCookie } from '@/lib/auth';
import { getSetting, setSetting } from '@/lib/settings';
import { COMPANIES } from '@/lib/companies';

export default function TopBar({ onOpenPalette, onToggleSidebar, activeCompany, onCompanyChange, unmatchedCount = 0, reportingCount = 0 }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [dark, setDark] = useState(false);
  const notifRef = useRef(null);
  const companyRef = useRef(null);
  const profileRef = useRef(null);
  const router = useRouter();

  useEffect(() => { setDark(getSetting('theme') === 'dark'); }, []);
  useEffect(() => { setProfile(getProfile()); }, []);

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
    const next = !dark;
    setDark(next);
    setSetting('theme', next ? 'dark' : 'light');
  };

  useEffect(() => {
    if (!notifOpen) return;
    const handleOutsideClick = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false); };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [notifOpen]);

  useEffect(() => {
    if (!companyOpen) return;
    const handleCompanyOutsideClick = (e) => { if (companyRef.current && !companyRef.current.contains(e.target)) setCompanyOpen(false); };
    window.addEventListener('mousedown', handleCompanyOutsideClick);
    return () => window.removeEventListener('mousedown', handleCompanyOutsideClick);
  }, [companyOpen]);

  useEffect(() => {
    if (!profileOpen) return;
    const handler = (e) => { if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false); };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [profileOpen]);

  function handleLogout() {
    clearAuthCookie();
    window.location.href = '/login';
  }

  // 실제 알림 (미매칭 발생 시 표시)
  const notifs = [
    ...(unmatchedCount > 0
      ? [
          {
            kind: 'alert',
            title: `미매칭 ${unmatchedCount}건 처리 필요`,
            time: '지금',
            desc: '메뉴 판매량 → 미매칭 관리에서 별칭/규칙/제외로 처리할 수 있어요',
            href: '/menu-sales/unmatched',
          },
        ]
      : []),
    ...(reportingCount > 0
      ? [
          {
            kind: 'note',
            title: `보고예정 노트 ${reportingCount}건`,
            time: '미보고',
            desc: '메뉴개발노트 → 보고예정 탭에서 확인하세요',
            href: '/note?status=보고예정',
          },
        ]
      : []),
  ];
  const meta = {
    alert: { bg: 'var(--negative-soft)', color: 'var(--negative)',    ico: <Icon.alert  style={{width:16,height:16}}/> },
    info:  { bg: 'var(--accent-soft)',   color: 'var(--accent-text)', ico: <Icon.upload style={{width:16,height:16}}/> },
    note:  { bg: 'var(--note-ico-bg)',    color: 'var(--note-ico-color)', ico: <Icon.beaker style={{width:16,height:16}}/> },
    ok:    { bg: 'var(--positive-soft)', color: 'var(--positive)',    ico: <Icon.check  style={{width:16,height:16}}/> },
  };

  return (
    <header className="topbar">
      <button className="icon-btn mobile-only" onClick={onToggleSidebar} aria-label="메뉴 열기">
        <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M4 7h16M4 12h16M4 17h16"/>
        </svg>
      </button>

      <div className="company-wrap" ref={companyRef}>
        <button className="company-pick" onClick={() => setCompanyOpen(v => !v)} aria-haspopup="menu" aria-expanded={companyOpen} aria-label={`브랜드 선택 (현재: ${activeCompany.name})`}>
          {activeCompany.logo
            ? <img className="company-logo" src={activeCompany.logo} alt=""
                style={{objectFit:'contain', background:'white', padding:2, borderRadius:4}} />
            : <span className="company-avatar" style={{background: activeCompany.color}} aria-hidden="true">
                {activeCompany.name[0]}
              </span>}
          <div aria-hidden="true">{activeCompany.name}</div>
          <Icon.chevDown aria-hidden="true" className="arrow" style={{width:14, height:14, transition:'transform 160ms', transform: companyOpen ? 'rotate(180deg)' : 'rotate(0deg)'}} />
        </button>

        {companyOpen && (
          <div className="company-drop" role="menu" aria-label="브랜드 목록">
            <div className="company-drop-label">브랜드 선택</div>
            {COMPANIES.map(c => (
              <button
                key={c.id}
                role="menuitemcheckbox"
                aria-checked={activeCompany.id === c.id}
                className={'company-drop-item' + (activeCompany.id === c.id ? ' active' : '')}
                onClick={() => { onCompanyChange(c); setCompanyOpen(false); }}
              >
                <span className="cdrop-logo">
                  {c.logo
                    ? <img src={c.logo} alt="" style={{width:36, height:28, objectFit:'contain', borderRadius:4, background:'white', padding:2}} />
                    : <span className="cdrop-avatar" style={{background: c.color}}>{c.name[0]}</span>}
                </span>
                <span className="cdrop-info">
                  <span className="cdrop-name">{c.name}</span>
                  <span className="cdrop-sub">{c.sub}</span>
                </span>
                {activeCompany.id === c.id && <Icon.check style={{width:14, height:14, color:'var(--accent)', flexShrink:0}} />}
              </button>
            ))}
          </div>
        )}
      </div>

      <button className="search" onClick={onOpenPalette} aria-label="통합 검색 열기 (⌘K)">
        <Icon.search aria-hidden="true" style={{width:16, height:16}} />
        <span className="search-placeholder" aria-hidden="true">메뉴, 재료, 보고서 검색</span>
        <kbd aria-hidden="true">⌘K</kbd>
      </button>

      <button className="icon-btn" aria-label="새 노트 작성" onClick={() => router.push('/note/write')}>
        <Icon.plus aria-hidden="true" style={{width:18, height:18}} />
      </button>

      <button className="icon-btn" onClick={toggleDark} aria-label={dark ? '라이트 모드로 전환' : '다크 모드로 전환'}>
        {dark
          ? <Icon.sun  aria-hidden="true" style={{width:18, height:18}} />
          : <Icon.moon aria-hidden="true" style={{width:18, height:18}} />}
      </button>

      <div className="notif-wrap" ref={notifRef}>
        <button className="icon-btn" aria-label={`알림${notifs.length > 0 ? ` (${notifs.length}건)` : ''}`} aria-haspopup="menu" aria-expanded={notifOpen} onClick={() => setNotifOpen(v => !v)} style={{position:'relative'}}>
          <Icon.bell aria-hidden="true" style={{width:18, height:18}} />
          {notifs.length > 0 && <span className="notif-dot" aria-hidden="true"></span>}
        </button>
        {notifOpen && (
          <div className="notif-pop" role="region" aria-label="알림 목록" aria-live="polite">
            <div className="notif-head">
              <div className="notif-title">알림 {notifs.length > 0 && <span className="notif-count">{notifs.length}</span>}</div>
              <button className="link" onClick={() => setNotifOpen(false)}>모두 읽음</button>
            </div>
            <div className="notif-list">
              {notifs.length === 0 ? (
                <div style={{padding:'24px 16px', textAlign:'center', color:'var(--text-3)', fontSize:13}}>
                  새 알림이 없습니다
                </div>
              ) : notifs.map((n, i) => {
                const m = meta[n.kind];
                return (
                  <button className="notif-item" key={i}
                    onClick={() => { if (n.href) { router.push(n.href); setNotifOpen(false); } }}
                  >
                    <div className="notif-ico" style={{background: m.bg, color: m.color}}>{m.ico}</div>
                    <div className="notif-body">
                      <div className="notif-row1">
                        <span className="notif-name">{n.title}</span>
                        <span className="notif-time">{n.time}</span>
                      </div>
                      <div className="notif-desc">{n.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="profile" ref={profileRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setProfileOpen(v => !v)}
          aria-haspopup="menu"
          aria-expanded={profileOpen}
          style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 8, font: 'inherit' }}
        >
          <div className="avatar">{profile ? getInitial(profile.name) : '?'}</div>
          <div className="who">
            <div className="name">{profile?.name || '...'}</div>
            <div className="role">{profile?.team || profile?.role || ''}</div>
          </div>
        </button>

        {profileOpen && (
          <div role="menu" style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            minWidth: 160, background: 'var(--surface)',
            border: '1px solid var(--border)', borderRadius: 10,
            boxShadow: 'var(--shadow-lg)', padding: 6, zIndex: 200,
            animation: 'fade-in 140ms ease both',
          }}>
            <button role="menuitem"
              onClick={() => { setProfileOpen(false); router.push('/settings/account'); }}
              style={{ width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 7, border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-1)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              계정 설정
            </button>
            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
            <button role="menuitem"
              onClick={handleLogout}
              style={{ width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 7, border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--negative)', fontWeight: 600 }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              로그아웃
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
