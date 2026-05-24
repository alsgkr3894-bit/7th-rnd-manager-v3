'use client';
import { Icon } from '@/components/icons';

export function PageHeader({ title, sub, breadcrumb, actions }) {
  return (
    <div className="page-head">
      {breadcrumb && (
        <div className="breadcrumb">
          {breadcrumb.map((b, i) => (
            <span key={i} style={{display:'inline-flex',alignItems:'center',gap:4}}>
              {i > 0 && <Icon.chevRight style={{width:12,height:12,color:'var(--text-4)'}}/>}
              <span className={i === breadcrumb.length-1 ? 'bc-current' : 'bc-link'}>{b}</span>
            </span>
          ))}
        </div>
      )}
      <div className="page-head-row">
        <div>
          <h1 className="page-title">{title}</h1>
          {sub && <div className="page-sub">{sub}</div>}
        </div>
        {actions && <div className="page-actions">{actions}</div>}
      </div>
    </div>
  );
}

export function FilterBar({ search, onSearch, chips, dateRange }) {
  return (
    <div className="filter-bar">
      {onSearch && (
        <div className="filter-search">
          <Icon.search style={{width:16,height:16,color:'var(--text-3)'}}/>
          <input value={search||''} onChange={e=>onSearch(e.target.value)} placeholder="검색"/>
        </div>
      )}
      {chips && (
        <div className="filter-chips">
          {chips.map((c,i)=>(
            <button key={i} className={'chip '+(c.active?'active':'')} onClick={c.onClick}>
              {c.label}{c.count!=null&&<span className="chip-count">{c.count}</span>}
            </button>
          ))}
        </div>
      )}
      {dateRange && (
        <button className="filter-date">
          <Icon.doc style={{width:14,height:14}}/>{dateRange}
          <Icon.chevDown style={{width:14,height:14,color:'var(--text-3)'}}/>
        </button>
      )}
    </div>
  );
}
