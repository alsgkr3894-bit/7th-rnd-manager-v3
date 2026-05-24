'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from './icons';

export default function TopBar({ onOpenPalette, onToggleSidebar }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    if (!notifOpen) return;
    const h = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false); };
    window.addEventListener('mousedown', h);
    return () => window.removeEventListener('mousedown', h);
  }, [notifOpen]);

  const notifs = [
    { kind: 'alert', title: '모짜렌라치즈 단가 +3.8%', time: '방금 전', desc: '7,400원 → 7,680원 · 영향 메뉴 23개' },
    { kind: 'info',  title: '4월 메뉴판매량 업로드 완료', time: '1시간 전', desc: '12,840건 처리 · 미매칭 4건 확인 필요' },
    { kind: 'note',  title: '황성한우셰림프 테스트 노트 추가', time: '3시간 전', desc: '와사비마요 조합 · 재테스트 예정' },
    { kind: 'ok',    title: '4월 판매량 보고서 생성 완료', time: '어제', desc: '전월 대비 +6.8%' },
  ];
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
          <span className="dot"></span>
        </button>
        {notifOpen && (
          <div className="notif-pop">
            <div className="notif-head">
              <div className="notif-title">알림</div>
              <button className="link">모두 읽음</button>
            </div>
            <div className="notif-list">
              {notifs.map((n, i) => {
                const m = meta[n.kind];
                return (
                  <button className="notif-item" key={i}>
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
            <div className="notif-foot">
              <button className="btn ghost" style={{width:'100%'}}>전체 알림 보기</button>
            </div>
          </div>
        )}
      </div>

      <div className="profile">
        <div className="avatar">민</div>
        <div className="who">
          <div className="name">민혁 책임</div>
          <div className="role">R&amp;D팀</div>
        </div>
      </div>
    </div>
  );
}
