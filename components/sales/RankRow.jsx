'use client';
import { memo } from 'react';
import { Icon } from '@/components/icons';
import { formatNumber } from '@/lib/format';

/**
 * RankRow — MonthRankTable의 단일 행 (메인 + 펼친 사이즈 상세)
 *
 * @param {number} rank
 * @param {{ name, category, quantity, sizes }} row
 * @param {number} total — 비중% 계산 기준
 * @param {boolean} expanded
 * @param {() => void} onToggle
 */
export const RankRow = memo(function RankRow({ rank, row, total, expanded, onToggle }) {
  const share = total > 0 ? row.quantity / total : 0;
  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 8,
      background: expanded ? 'var(--accent-soft)' : 'var(--surface)',
      transition: 'background 200ms',
    }}>
      <button
        onClick={onToggle}
        style={{
          width:'100%', display:'grid',
          gridTemplateColumns: '50px 1.4fr 90px 110px 1.2fr 80px 30px',
          gap: 12, alignItems: 'center', padding: '14px 12px',
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--text-1)', font: 'inherit', textAlign: 'left',
        }}
      >
        <div className="num" style={{fontWeight:700, color:'var(--text-2)'}}>{rank}</div>
        <div style={{fontWeight:700}}>
          {row.name}
          <span style={{
            marginLeft:8, fontSize:11, color:'var(--text-3)', fontWeight:500,
          }}>{row.sizes.length}개 규격</span>
        </div>
        <span className="chip" style={{
          background:'var(--surface-2)', color:'var(--text-2)', justifySelf:'start',
        }}>{row.category}</span>
        <div className="num right" style={{textAlign:'right'}}>
          {formatNumber(row.quantity)}<span className="unit">개</span>
        </div>
        <div style={{display:'flex', alignItems:'center', gap:8}}>
          <div style={{flex:1, height:6, borderRadius:3, background:'var(--surface-2)', overflow:'hidden'}}>
            <div style={{width:`${Math.min(100, share * 100)}%`, height:'100%', background:'var(--accent)'}}/>
          </div>
          <span className="num" style={{fontSize:12, minWidth:42, textAlign:'right'}}>
            {(share * 100).toFixed(1)}%
          </span>
        </div>
        <div></div>
        <Icon.chevDown style={{
          width:16, height:16, color:'var(--text-3)',
          transform: expanded ? 'rotate(180deg)' : 'none',
          transition: 'transform 200ms',
        }}/>
      </button>

      {expanded && <SizeDetail row={row} />}
    </div>
  );
});

function SizeDetail({ row }) {
  return (
    <div style={{padding:'4px 12px 14px 62px', borderTop:'1px solid var(--border)'}}>
      <div style={{fontSize:11, color:'var(--text-3)', margin:'8px 0 6px'}}>
        {row.name} · 규격별 판매량
      </div>
      <div style={{display:'flex', flexDirection:'column', gap:4}}>
        {row.sizes.map(s => (
          <div key={s.size} style={{
            display:'grid', gridTemplateColumns:'1fr 1fr 80px 60px',
            gap:12, alignItems:'center', padding:'6px 0', fontSize:13,
          }}>
            <span>
              {row.name} <span className="chip" style={{
                background:'var(--surface-2)', color:'var(--text-2)', fontSize:11, marginLeft:6,
              }}>{s.size}</span>
            </span>
            <div style={{display:'flex', alignItems:'center'}}>
              <div style={{flex:1, height:6, borderRadius:3, background:'var(--surface-2)', overflow:'hidden'}}>
                <div style={{width:`${Math.min(100, s.share * 100)}%`, height:'100%', background:'var(--accent)'}}/>
              </div>
            </div>
            <div className="num" style={{textAlign:'right', fontWeight:600}}>
              {formatNumber(s.quantity)}<span className="unit">개</span>
            </div>
            <div className="num" style={{textAlign:'right', color:'var(--text-3)', fontSize:12}}>
              {(s.share * 100).toFixed(1)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
