'use client';
import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Icon } from './icons';
import { NAV_HOME, NAV_SECTIONS } from '@/lib/menu';
import { initDB } from '@/lib/db';
import { getIssues } from '@/lib/sales';
import { getPriceFiles } from '@/lib/price';

/**
 * 사이드바 컴포넌트
 * 메뉴 데이터는 @/lib/menu.js에 분리 (이 컴포넌트는 렌더링만 담당)
 */
export default function Sidebar({ onClose }) {
  const pathname = usePathname();
  const router = useRouter();
  const sidebarRef = useRef(null);
  const [pillStyle, setPillStyle] = useState({ top: 0, opacity: 0 });
  const [unmatchedCount, setUnmatchedCount] = useState(0);
  const [latestPrice, setLatestPrice] = useState(null);

  // 미매칭 + 최신 제때 단가 — pathname 변경 시 재조회
  useEffect(() => {
    (async () => {
      try {
        await initDB();
        const [issues, files] = await Promise.all([
          getIssues({ status: 'open' }),
          getPriceFiles(),
        ]);
        setUnmatchedCount(issues.length);
        setLatestPrice(files[0] || null);
      } catch { /* ignore */ }
    })();
  }, [pathname]);

  // 동적 badge — 그룹/항목 id별 매핑
  const dynamicBadge = (id) => {
    if (id === 'menu-sales' || id === 'menu-sales-unmatched') {
      return unmatchedCount > 0 ? unmatchedCount : null;
    }
    return null;
  };

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
