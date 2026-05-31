'use client';
import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Icon } from './icons';
import { NAV_HOME, NAV_SECTIONS } from '@/lib/menu';
import { initDB } from '@/lib/db';
import { getPriceFiles } from '@/lib/price';
import { getJSONLS, setJSONLS } from '@/lib/note/storage';
import { KEYS } from '@/lib/note/keys';

/**
 * 사이드바 컴포넌트
 * 메뉴 데이터는 @/lib/menu.js에 분리 (이 컴포넌트는 렌더링만 담당)
 */
export default function Sidebar({ onClose, activeCompany, unmatchedCount = 0, reportingCount = 0 }) {
  const pathname = usePathname();
  const router = useRouter();
  const sidebarRef = useRef(null);
  const [pillStyle, setPillStyle] = useState({ top: 0, height: 40, opacity: 0 });
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
    if (id === 'note' || id === 'note-list') {
      return reportingCount > 0 ? reportingCount : null;
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
    const saved = getJSONLS(KEYS.SIDEBAR_OPEN);
    if (saved) { setOpenIds(saved); return; }
    const opened = {};
    NAV_SECTIONS.forEach(section => {
      section.groups.forEach(g => {
        if (isGroupActive(g)) opened[g.id] = true;
      });
    });
    setOpenIds(opened);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // pathname 변경 시 active 그룹 자동 열기 (클라이언트 라우팅 대응)
  useEffect(() => {
    setOpenIds(o => {
      const updates = {};
      NAV_SECTIONS.forEach(section => {
        section.groups.forEach(g => {
          if (isGroupActive(g) && !o[g.id]) updates[g.id] = true;
        });
      });
      if (!Object.keys(updates).length) return o;
      return { ...o, ...updates };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // 활성 항목 위치로 pill 이동 — DOM 트랜지션 완료 후 1프레임 뒤 계산
  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;
    const rafId = requestAnimationFrame(() => {
      // 열린 아코디언 안의 active child만 사용 (닫힌 상태면 부모 nav-item으로 fallback)
      const activeEl =
        sidebar.querySelector('.nav-children.open .nav-child.active') ||
        sidebar.querySelector('.nav-item.active');
      if (!activeEl) {
        setPillStyle(s => ({ ...s, opacity: 0 }));
        return;
      }
      const sRect = sidebar.getBoundingClientRect();
      const eRect = activeEl.getBoundingClientRect();
      setPillStyle({ top: eRect.top - sRect.top + sidebar.scrollTop, height: eRect.height, opacity: 1 });
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    });
    return () => cancelAnimationFrame(rafId);
  }, [pathname, openIds]);

  // openIds 변경 시 localStorage 동기화 (toggle/pathname 변경 모두 포함)
  useEffect(() => {
    if (Object.keys(openIds).length > 0) setJSONLS(KEYS.SIDEBAR_OPEN, openIds);
  }, [openIds]);

  const toggle = (id, forceOpen = false) =>
    setOpenIds(o => ({ ...o, [id]: forceOpen ? true : !o[id] }));

  // Escape 키로 열린 아코디언 닫기 (active 그룹 제외)
  useEffect(() => {
    const handler = (e) => {
      if (e.key !== 'Escape') return;
      setOpenIds(o => {
        const next = { ...o };
        let changed = false;
        NAV_SECTIONS.forEach(section => {
          section.groups.forEach(g => {
            if (next[g.id] && !isGroupActive(g)) {
              next[g.id] = false;
              changed = true;
            }
          });
        });
        if (!changed) return o;
        setJSONLS(KEYS.SIDEBAR_OPEN, next);
        return next;
      });
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isGroupActive]);

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
        if (active) {
          // active 그룹은 닫지 않고 열기만 (토글 X)
          toggle(item.id, true);
        } else {
          toggle(item.id);
          if (!isOpen) navigate(item.children[0].href);
        }
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
    <aside className="sidebar" ref={sidebarRef} suppressHydrationWarning>
      <div className="sidebar-pill" style={{ top: pillStyle.top, height: pillStyle.height, opacity: pillStyle.opacity }} />
      <a className="brand" href="/" onClick={e => { e.preventDefault(); navigate('/'); }}>
        {activeCompany?.logo
          ? <img className="logo-img" src={activeCompany.logo} alt={activeCompany?.name || '로고'}
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
      <nav aria-label="기본 내비게이션">
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
      </nav>

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
