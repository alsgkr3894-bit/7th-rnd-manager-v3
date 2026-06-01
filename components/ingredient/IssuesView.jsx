import { useState, useMemo } from 'react';
import { Icon } from '@/components/icons';
import { formatNumber } from '@/lib/format';

const ISSUE_META = {
  'price-up':      { label:'단가 인상',     Ico: Icon.arrowUp,   color:'var(--negative)', bg:'var(--negative-soft)' },
  'price-down':    { label:'단가 인하',     Ico: Icon.arrowDown, color:'var(--positive)', bg:'var(--positive-soft)' },
  uncategorized:   { label:'미분류',        Ico: Icon.tag,       color:'var(--warn)',     bg:'var(--warn-soft)' },
  'no-unit':       { label:'포장수량 없음', Ico: Icon.alert,     color:'var(--warn)',     bg:'var(--warn-soft)' },
  'no-price-link': { label:'단가 미연동',   Ico: Icon.alert,     color:'var(--warn)',     bg:'var(--warn-soft)' },
};

function fmtPriceDiff({ oldPrice, newPrice, diff, pct }) {
  const sign = diff > 0 ? '+' : '';
  return `${formatNumber(oldPrice)}원 → ${formatNumber(newPrice)}원 (${sign}${pct.toFixed(1)}% / ${sign}${formatNumber(diff)}원)`;
}

function IssueCard({ r, onEdit }) {
  const name = r.ingredientName || r.displayName || r.productName;
  return (
    <div className="card" style={{display:'flex', alignItems:'center', gap:14, padding:'12px 18px'}}>
      <div style={{flex:1, minWidth:0}}>
        <div style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap'}}>
          <span style={{fontWeight:700, fontSize:14}}>{name}</span>
          {r.productCode && <span style={{fontSize:11, color:'var(--text-3)'}}>{r.productCode}</span>}
        </div>
        {r.priceDiff && (
          <div style={{fontSize:12, color:'var(--text-2)', marginTop:3}}>{fmtPriceDiff(r.priceDiff)}</div>
        )}
        <div style={{display:'flex', gap:8, flexWrap:'wrap', marginTop:6}}>
          {r.issues.map(iss => {
            const m = ISSUE_META[iss];
            if (!m) return null;
            const IcoComp = m.Ico;
            return (
              <span key={iss} style={{display:'inline-flex', alignItems:'center', gap:4,
                padding:'2px 8px', fontSize:11, fontWeight:600, borderRadius:6,
                background:m.bg, color:m.color}}>
                <IcoComp style={{width:11, height:11}}/>{m.label}
              </span>
            );
          })}
        </div>
      </div>
      <button className="btn sm" onClick={onEdit}><Icon.edit style={{width:13,height:13}}/> 수정</button>
    </div>
  );
}

export function IssuesView({ issueRows, onEdit }) {
  const [filter, setFilter] = useState('all');

  const counts = useMemo(() => ({
    'price-up':      issueRows.filter(r => r.issues.includes('price-up')).length,
    'price-down':    issueRows.filter(r => r.issues.includes('price-down')).length,
    uncategorized:   issueRows.filter(r => r.issues.includes('uncategorized')).length,
    'no-unit':       issueRows.filter(r => r.issues.includes('no-unit')).length,
    'no-price-link': issueRows.filter(r => r.issues.includes('no-price-link')).length,
  }), [issueRows]);
  const TYPES = [
    { id:'all',           label:'전체',          count: issueRows.length },
    { id:'price-up',      label:'단가 인상',     count: counts['price-up'] },
    { id:'price-down',    label:'단가 인하',     count: counts['price-down'] },
    { id:'uncategorized', label:'미분류',        count: counts.uncategorized },
    { id:'no-unit',       label:'포장수량 없음', count: counts['no-unit'] },
    { id:'no-price-link', label:'단가 미연동',   count: counts['no-price-link'] },
  ];

  const filtered = filter === 'all' ? issueRows : issueRows.filter(r => r.issues.includes(filter));

  if (issueRows.length === 0) {
    return (
      <div className="card" style={{minHeight:160, display:'grid', placeItems:'center'}}>
        <div style={{textAlign:'center', color:'var(--text-3)'}}>
          <Icon.check style={{width:32, height:32, marginBottom:12, opacity:.4}}/>
          <div style={{fontWeight:600, marginBottom:4}}>이슈가 없습니다</div>
          <div style={{fontSize:13}}>모든 식자재 항목이 정상적으로 설정되어 있습니다.</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
        {TYPES.map(t => (
          <button key={t.id} className={'chip' + (filter === t.id ? ' active' : '')}
            onClick={() => setFilter(t.id)}>
            {t.label} {t.count}
          </button>
        ))}
      </div>
      <div style={{display:'flex', flexDirection:'column', gap:6}}>
        {filtered.map((r, i) => (
          <IssueCard key={`${r.productCode ?? r.id ?? 'm'}-${i}`} r={r} onEdit={() => onEdit(r)}/>
        ))}
      </div>
    </>
  );
}
