'use client';
import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Icon } from './icons';
import { NAV_HOME, NAV_SECTIONS } from '@/lib/menu';
import { initDB } from '@/lib/db';
import { getPriceFiles } from '@/lib/price';

/**
 * 사이드바 컴포넌트
 * 메뉴 데이터는 @/lib/menu.js에 분리 (이 컴포넌트는 렌더링만 담당)
 */
export default function Sidebar({ onClose, activeCompany, unmatchedCount = 0 }) {
  const pathname = usePathname();
  const router = useRouter();
  const sidebarRef = useRef(null);
  const [pillStyle, setPillStyle] = useState({ top: 0, opacity: 0 });
  const [latestPrice, setLatestPrice] = useState(null);

  // 최신 제때 단가 조회 — 마운트 1회만
  useEffect(() => {
    (async () => {
      try {
        await initDB();
        const files = await getPriceFiles();
        setLatestPrice(files[0] || null);
      } catch { /* ignore */ }
    })();
  }, []);

  // 동적 badge
  const dynamicBadge = (id) => {
    if (id === 'menu-sales' || id === 'menu-sales-unmatched') {
      return unmatchedCount > 0 ? unmatchedCount : null;
    }
    return null;
  };

  const isActive = (item) => {
    if (!item.href) return false;
    if (item.href === '/') return pathname === '/';
    return pathname === item.href;
  };

  const isGroupActive = (group) => {
    if (group.href) return pathname === group.href || pathname.startsWith(group.href + '/');
    return group.children?.some(c => c.href && (pathname === c.href || pathname.startsWith(c.href + '/')));
  };

  const [openIds, setOpenIds] = useState({});

  // 마운트 후 localStorage 복원 (SSR 불일치 방지)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('v3:sidebar-open');
      if (saved) { setOpenIds(JSON.parse(saved)); return; }
    } catch {}
    const opened = {};
    NAV_SECTIONS.forEach(section => {
      section.groups.forEach(g => {
        if (isGroupActive(g)) opened[g.id] = true;
      });
    });
    setOpenIds(opened);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const toggle = (id) => setOpenIds(o => {
    const next = { ...o, [id]: !o[id] };
    try { localStorage.setItem('v3:sidebar-open', JSON.stringify(next)); } catch {}
    return next;
  });

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

    const itemBadge = item.badge ?? dynamicBadge(item.id);

    return (
      <div key={item.id}>
        <button className={'nav-item ' + (active ? 'active' : '')} onClick={handle}>
          <IconComp className="ico" />
          <span>{item.label}</span>
          {itemBadge && <span className="badge">{itemBadge}</span>}
          {hasKids && (
            <Icon.chevDown className="caret" style={{
              width: 14, height: 14,
              marginLeft: itemBadge ? 6 : 'auto',
              transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
              transition: 'transform 160ms ease',
              color: 'var(--text-4)',
            }} />
          )}
        </button>
        {hasKids && (
          <div className={'nav-children ' + (isOpen ? 'open' : '')}>
            <div className="nav-children-inner">
              {item.children.map(c => {
                const childBadge = c.badge ?? dynamicBadge(c.id);
                return (
                  <button key={c.id}
                    className={'nav-child ' + (isActive(c) ? 'active' : '')}
                    onClick={() => navigate(c.href)}>
                    <span className="dot"></span>
                    <span>{c.label}</span>
                    {childBadge && <span className="badge">{childBadge}</span>}
                  </button>
                );
              })}
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
        {activeCompany?.logo
          ? <img className="logo-img" src={activeCompany.logo} alt={activeCompany.name}
              style={{objectFit:'contain', background:'white', padding:2}} />
          : <span className="logo-img" style={{background: activeCompany?.color || '#E1101F',
              display:'grid', placeItems:'center', color:'white', fontWeight:800, fontSize:14}}>
              {activeCompany?.name?.[0] || '7'}
            </span>}
        <div className="brand-text">
          <div className="brand-line1">{activeCompany?.name || '7번가 R&D'}</div>
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

      <button
        className="sidebar-footer"
        onClick={() => navigate('/jette/price-compare')}
        style={{
          background:'transparent', border:'none', textAlign:'left',
          cursor:'pointer', font:'inherit', color:'inherit', width:'100%',
        }}
        title="제때 가격 비교로 이동"
      >
        <div><b>최신 제때 단가</b></div>
        <div style={{ marginTop: 4 }}>
          {latestPrice
            ? `${latestPrice.updateDate} 반영 · 총 ${latestPrice.totalRows ?? 0}개`
            : '업로드된 단가 없음'}
        </div>
      </button>
    </aside>
  );
}
