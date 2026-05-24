'use client';
import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Icon } from './icons';

const NAV_MAIN = [
  { id: 'home', label: '홈', icon: Icon.home, href: '/' },
  { id: 'menu-sales', label: '메뉴 판매량', icon: Icon.chart, badge: 3, children: [
    { id: 'menu-sales-upload',    label: '판매량 업로드',  href: '/menu-sales/upload' },
    { id: 'menu-sales-rank',      label: '판매량 순위',    href: '/menu-sales/rank' },
    { id: 'menu-sales-compare',   label: '판매량 비교',    href: '/menu-sales/compare' },
    { id: 'menu-sales-unmatched', label: '미매칭 관리',    href: '/menu-sales/unmatched', badge: 4 },
  ]},
  { id: 'jette', label: '제때상품관리', icon: Icon.box, children: [
    { id: 'jette-price-compare', label: '상품 가격 비교', href: '/jette/price-compare' },
    { id: 'jette-shipment',      label: '범용상품 출고량', href: '/jette/shipment' },
  ]},
  { id: 'cost', label: '원가계산', icon: Icon.calc, children: [
    { id: 'cost-pizza-summary',    label: '피자 종합 원가표',   href: '/cost/pizza-summary' },
    { id: 'cost-pizza-detail',     label: '피자 세부 원가표',   href: '/cost/pizza-detail' },
    { id: 'cost-personal-summary', label: '1인피자 종합',       href: '/cost/personal-summary' },
    { id: 'cost-personal-detail',  label: '1인피자 세부',       href: '/cost/personal-detail' },
    { id: 'cost-side-summary',     label: '사이드 종합',        href: '/cost/side-summary' },
    { id: 'cost-side-detail',      label: '사이드 세부',        href: '/cost/side-detail' },
    { id: 'cost-set-summary',      label: '세트박스 종합',      href: '/cost/set-summary' },
    { id: 'cost-set-detail',       label: '세트박스 세부',      href: '/cost/set-detail' },
    { id: 'cost-edge-dough',       label: '엣지 & 도우',        href: '/cost/edge-dough' },
    { id: 'cost-ingredient-price', label: '식자재 원가표',      href: '/cost/ingredient-price' },
    { id: 'cost-menu-price',       label: '메뉴 판매가',        href: '/cost/menu-price' },
  ]},
  { id: 'ingredient', label: '식자재', icon: Icon.tag, children: [
    { id: 'ingredient-list',   label: '식자재 리스트',   href: '/ingredient/list' },
    { id: 'ingredient-issues', label: '식자재 이슈',     href: '/ingredient/issues', badge: 3 },
    { id: 'ingredient-usage',  label: '식자재 사용 현황', href: '/ingredient/usage' },
  ]},
  { id: 'nutrition', label: '영양성분', icon: Icon.beaker, children: [
    { id: 'nutrition-menu',       label: '메뉴 영양성분',    href: '/nutrition/menu' },
    { id: 'nutrition-allergen',   label: '알레르기 관리',    href: '/nutrition/allergen' },
    { id: 'nutrition-compliance', label: '표시 의무 점검',   href: '/nutrition/compliance' },
  ]},
  { id: 'note', label: '메뉴개발노트', icon: Icon.note, children: [
    { id: 'note-list',  label: '노트 목록', href: '/note' },
    { id: 'note-write', label: '노트 작성', href: '/note/write' },
  ]},
  { id: 'report', label: '보고서센터', icon: Icon.doc, children: [
    { id: 'report-sales',              label: '판매량 보고서',      href: '/report/sales' },
    { id: 'report-cost',               label: '원가계산 보고서',    href: '/report/cost' },
    { id: 'report-price',              label: '제때 가격 보고서',   href: '/report/price' },
    { id: 'report-shipment',           label: '출고량 보고서',      href: '/report/shipment' },
    { id: 'report-menu-sales-compare', label: '판매량 비교 보고서', href: '/report/menu-sales-compare' },
  ]},
];

const NAV_SYS = [
  { id: 'settings', label: '설정 / 백업', icon: Icon.gear, children: [
    { id: 'settings-backup',  label: '데이터 백업', href: '/settings/backup' },
    { id: 'settings-restore', label: '데이터 복원', href: '/settings/restore' },
    { id: 'settings-system',  label: '시스템 설정', href: '/settings/system' },
    { id: 'settings-account', label: '계정 관리',   href: '/settings/account' },
  ]},
];

export default function Sidebar({ onClose }) {
  const pathname = usePathname();
  const router = useRouter();
  const sidebarRef = useRef(null);
  const [pillStyle, setPillStyle] = useState({ top: 0, opacity: 0 });

  const isActive = (item) => {
    if (item.href === '/') return pathname === '/';
    return pathname.startsWith(item.href);
  };

  const isGroupActive = (group) => {
    if (group.href) return isActive(group);
    return group.children?.some(c => isActive(c));
  };

  const [openIds, setOpenIds] = useState(() => {
    const opened = {};
    [...NAV_MAIN, ...NAV_SYS].forEach(g => {
      if (isGroupActive(g)) opened[g.id] = true;
    });
    return opened;
  });

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

  const renderGroup = (item) => {
    const hasKids = !!item.children?.length;
    const active = isGroupActive(item);
    const isOpen = openIds[item.id];

    const handle = () => {
      if (hasKids) {
        toggle(item.id);
        if (!isOpen && !active) navigate(item.children[0].href);
      } else {
        navigate(item.href);
      }
    };

    return (
      <div key={item.id}>
        <button className={'nav-item ' + (active ? 'active' : '')} onClick={handle}>
          <item.icon className="ico" />
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
      <div className="section-label">메인</div>
      {NAV_MAIN.map(renderGroup)}
      <div className="section-label">시스템</div>
      {NAV_SYS.map(renderGroup)}
      <div className="sidebar-footer">
        <div><b>최신 제때 단가</b></div>
        <div style={{ marginTop: 4 }}>2026.05.21 반영 · 정상</div>
      </div>
    </aside>
  );
}
