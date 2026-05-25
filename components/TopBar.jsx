'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from './icons';
import { getProfile, getInitial } from '@/lib/profile';
import { initDB } from '@/lib/db';
import { getIssues } from '@/lib/sales';

export default function TopBar({ onOpenPalette, onToggleSidebar }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [unmatchedCount, setUnmatchedCount] = useState(0);
  const notifRef = useRef(null);
  const router = useRouter();

  useEffect(() => { setProfile(getProfile()); }, []);

  useEffect(() => {
    (async () => {
      try {
        await initDB();
        const issues = await getIssues({ status: 'open' });
        setUnmatchedCount(issues.length);
      } catch { /* ignore */ }
    })();
  }, []);

  useEffect(() => {
    if (!notifOpen) return;
    const h = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false); };
    window.addEventListener('mousedown', h);
    return () => window.removeEventListener('mousedown', h);
  }, [notifOpen]);

  // 실제 알림 (미매칭 발생 시 표시)
  const notifs = unmatchedCount > 0
    ? [
        {
          kind: 'alert',
          title: `미매칭 ${unmatchedCount}건 처리 필요`,
          time: '지금',
          desc: '메뉴 판매량 → 미매칭 관리에서 별칭/규칙/제외로 처리할 수 있어요',
          href: '/menu-sales/unmatched',
        },
      ]
    : [];
  const meta = {
    alert: { bg: 'var(--negative-soft)', color: 'var(--negative)',    ico: <Icon.alert  style={{width:16,height:16}}/> },
    info:  { bg: 'var(--accent-soft)',   color: 'var(--accent-text)', ico: <Icon.upload style={{width:16,height:16}}/> },
    note:  { bg: '#F0EBFF',              color: '#6B3FCB',            ico: <Icon.beaker style={{width:16,height:16}}/> },
    ok:    { bg: 'var(--positive-soft)', color: 'var(--positive)',    ico: <Icon.check  style={{width:16,height:16}}/> },
  };

  return (
    <div className="topbar">
      <button className="icon-btn mobile-only" onClick={onToggleSidebar} title="메뉴">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M4 7h16M4 12h16M4 17h16"/>
        </svg>
      </button>

      <div className="company-pick">
        <img className="company-logo" src="/logo-7thstreet.png" alt="" />
        <div>7번가피자 본사</div>
        <Icon.chevDown className="arrow" style={{width:14, height:14}} />
      </div>

      <button className="search" onClick={onOpenPalette} title="메뉴 · 재료 · 노트 통합 검색">
        <Icon.search style={{width:16, height:16}} />
        <span className="search-placeholder">메뉴, 재료, 보고서 검색</span>
        <kbd>⌘K</kbd>
      </button>

      <button className="icon-btn" title="새 노트">
        <Icon.plus style={{width:18, height:18}} />
      </button>

      <div className="notif-wrap" ref={notifRef}>
        <button className="icon-btn" title="알림" onClick={() => setNotifOpen(v => !v)}>
          <Icon.bell style={{width:18, height:18}} />
          {unmatchedCount > 0 && <span className="dot"></span>}
        </button>
        {notifOpen && (
          <div className="notif-pop">
            <div className="notif-head">
              <div className="notif-title">알림</div>
              <button className="link">모두 읽음</button>
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

      <div className="profile">
        <div className="avatar">{profile ? getInitial(profile.name) : '?'}</div>
        <div className="who">
          <div className="name">{profile?.name || '...'}</div>
          <div className="role">{profile?.team || profile?.role || ''}</div>
        </div>
      </div>
    </div>
  );
}
