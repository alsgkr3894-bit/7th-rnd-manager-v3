'use client';
import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Icon } from './icons';
import { NAV_HOME, NAV_SECTIONS } from '@/lib/menu';

/**
 * 사이드바 컴포넌트
 * 메뉴 데이터는 @/lib/menu.js에 분리 (이 컴포넌트는 렌더링만 담당)
 */
export default function Sidebar({ onClose }) {
  const pathname = usePathname();
  const router = useRouter();
  const sidebarRef = useRef(null);
  const [pillStyle, setPillStyle] = useState({ top: 0, opacity: 0 });

  const isActive = (item) => {
    if (!item.href) return false;
    if (item.href === '/') return pathname === '/';
    return pathname.startsWith(item.href);
  };

  const isGroupActive = (group) => {
    if (group.href) return isActive(group);
    return group.children?.some(c => isActive(c));
  };

  // 초기 펼침 상태 — 현재 활성 그룹만 열린 상태로
  const [openIds, setOpenIds] = useState(() => {
    const opened = {};
    NAV_SECTIONS.forEach(section => {
      section.groups.forEach(g => {
        if (isGroupActive(g)) opened[g.id] = true;
      });
    });
    return opened;
  });

  // 활성 항목 위치로 pill 이동
  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;
    const activeEl = sidebar.querySelector('.nav-item.active, .nav-child.active');
    if (!activeEl) return;
    const sRect = sidebar.getBoundingClientRect();
    const eRect = activeEl.getBoundingClientRect();
    setPillStyle({ top: eRect.top - sRect.top + sidebar.scrollTop, opacity: 1 });
  }, [pathname]);

  const toggle = (id) => setOpenIds(o => ({ ...o, [id]: !o[id] }));

  const navigate = (href) => {
    router.push(href);
    onClose?.();
  };

  /** 단일 그룹(또는 단일 링크) 렌더 */
  const renderGroup = (item) => {
    const hasKids = !!item.children?.length;
    const active = isGroupActive(item);
    const isOpen = openIds[item.id];
    const IconComp = Icon[item.iconKey] || Icon.doc;

    const handle = () => {
      if (hasKids) {
        toggle(item.id);
        if (!isOpen && !active) navigate(item.children[0].href);
      } else if (item.href) {
        navigate(item.href);
      }
    };

    return (
      <div key={item.id}>
        <button className={'nav-item ' + (active ? 'active' : '')} onClick={handle}>
          <IconComp className="ico" />
          <span>{item.label}</span>
          {item.badge && <span className="badge">{item.badge}</span>}
          {hasKids && (
            <Icon.chevDown className="caret" style={{
              width: 14, height: 14,
              marginLeft: item.badge ? 6 : 'auto',
              transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
              transition: 'transform 160ms ease',
              color: 'var(--text-4)',
            }} />
          )}
        </button>
        {hasKids && (
          <div className={'nav-children ' + (isOpen ? 'open' : '')}>
            <div className="nav-children-inner">
              {item.children.map(c => (
                <button key={c.id}
                  className={'nav-child ' + (isActive(c) ? 'active' : '')}
                  onClick={() => navigate(c.href)}>
                  <span className="dot"></span>
                  <span>{c.label}</span>
                  {c.badge && <span className="badge">{c.badge}</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const HomeIcon = Icon[NAV_HOME.iconKey];

  return (
    <aside className="sidebar" ref={sidebarRef}>
      <div className="sidebar-pill" style={{ top: pillStyle.top, opacity: pillStyle.opacity }} />
      <a className="brand" href="/" onClick={e => { e.preventDefault(); navigate('/'); }}>
        <img className="logo-img" src="/logo-7thstreet.png" alt="7th Street Pizza" />
        <div className="brand-text">
          <div className="brand-line1">7번가 R&amp;D</div>
          <div className="brand-line2">플랫폼</div>
        </div>
      </a>

      {/* 홈은 섹션 외 단일 항목 */}
      <button className={'nav-item ' + (isActive(NAV_HOME) ? 'active' : '')}
              onClick={() => navigate(NAV_HOME.href)}>
        <HomeIcon className="ico" />
        <span>{NAV_HOME.label}</span>
      </button>

      {/* 섹션별 렌더 */}
      {NAV_SECTIONS.map(section => (
        <div key={section.sectionLabel}>
          <div className="section-label">{section.sectionLabel}</div>
          {section.groups.map(renderGroup)}
        </div>
      ))}

      <div className="sidebar-footer">
        <div><b>최신 제때 단가</b></div>
        <div style={{ marginTop: 4 }}>2026.05.21 반영 · 정상</div>
      </div>
    </aside>
  );
}
