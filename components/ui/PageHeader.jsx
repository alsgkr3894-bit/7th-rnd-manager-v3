'use client';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { MasterSourceBadge } from '@/components/ui/MasterSourceBadge';
import {
  getBreadcrumbKey,
  getFilterChipKey,
  normalizeBreadcrumbs,
  normalizeFilterChips,
  normalizePageText,
} from '@/lib/ui/page-header';

export function PageHeader({ title, sub, breadcrumb, actions, masterSource }) {
  const router = useRouter();
  const breadcrumbs = normalizeBreadcrumbs(breadcrumb);
  const safeTitle = normalizePageText(title);
  const safeSub = normalizePageText(sub);

  return (
    <div className="page-head">
      {breadcrumbs.length > 0 && (
        <div className="breadcrumb">
          {breadcrumbs.map((b, i) => {
            const isLast = i === breadcrumbs.length - 1;
            return (
              <span key={getBreadcrumbKey(b, i)} style={{display:'inline-flex',alignItems:'center',gap:4}}>
                {i > 0 && <Icon.chevRight style={{width:12,height:12,color:'var(--text-4)'}}/>}
                {!isLast && b.href ? (
                  <button
                    className="bc-link"
                    style={{background:'none',border:'none',padding:0,cursor:'pointer',font:'inherit'}}
                    onClick={() => router.push(b.href)}
                  >{b.label}</button>
                ) : (
                  <span className={isLast ? 'bc-current' : 'bc-link'} {...(isLast ? { 'aria-current': 'page' } : {})}>{b.label}</span>
                )}
              </span>
            );
          })}
        </div>
      )}
      <div className="page-head-row">
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            <h1 className="page-title">{safeTitle}</h1>
            {masterSource && <MasterSourceBadge />}
          </div>
          {safeSub && <div className="page-sub">{safeSub}</div>}
        </div>
        {actions && <div className="page-actions">{actions}</div>}
      </div>
    </div>
  );
}

export function FilterBar({ search, onSearch, chips, dateRange }) {
  const chipItems = normalizeFilterChips(chips);
  const handleSearch = typeof onSearch === 'function' ? onSearch : null;
  const safeSearch = normalizePageText(search);
  const safeDateRange = normalizePageText(dateRange);

  return (
    <div className="filter-bar">
      {handleSearch && (
        <div className="filter-search">
          <Icon.search style={{width:16,height:16,color:'var(--text-3)'}}/>
          <input value={safeSearch} onChange={e=>handleSearch(e.target.value)} placeholder="검색"/>
        </div>
      )}
      {chipItems.length > 0 && (
        <div className="filter-chips">
          {chipItems.map((c,i) => {
            return (
              <button
                key={getFilterChipKey(c, i)}
                className={'chip '+(c.active?'active':'')}
                onClick={c.onClick}
              >
                {c.label}{c.count&&<span className="chip-count">{c.count}</span>}
              </button>
            );
          })}
        </div>
      )}
      {safeDateRange && (
        <button className="filter-date">
          <Icon.doc style={{width:14,height:14}}/>{safeDateRange}
          <Icon.chevDown style={{width:14,height:14,color:'var(--text-3)'}}/>
        </button>
      )}
    </div>
  );
}
