'use client';
import { useMemo } from 'react';
import { Icon } from '@/components/icons';
import { STATUS_COLORS, STATUS_BORDER } from '@/lib/note';
import { formatNumber } from '@/lib/format';
import { getCostRateStyles } from '@/lib/cost/rate-color';
import { EmptyState } from '@/components/ui/EmptyState';
import { Sparkline } from '@/components/charts/Sparkline';

// 정식 위치는 @/components/ui/EmptyState — 기존 import 경로 호환을 위해 재export
export { EmptyState };

export function SampleStatsWidget({ samples, router }) {
  // 파생 통계는 samples 변경 시에만 재계산 (정렬·다중 필터 매 렌더 반복 방지)
  const stats = useMemo(() => {
    const list = samples || [];
    const rated = list.filter(s => s.rating > 0);
    const avg = rated.length > 0 ? rated.reduce((a, s) => a + s.rating, 0) / rated.length : 0;
    const withPhoto = list.filter(s => (s.photos?.length || 0) > 0).length;
    const recent = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3);
    const ratingDist = [1, 2, 3, 4, 5].map(r => ({ r, count: list.filter(s => s.rating === r).length }));
    return { avg, withPhoto, recent, ratingDist };
  }, [samples]);

  if (!samples || samples.length === 0) return null;
  const { avg, withPhoto, recent, ratingDist } = stats;
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">샘플기록</div>
          <div className="card-sub">
            총 {samples.length}개 · 사진 {withPhoto}개 · 평균 {avg.toFixed(1)}점
          </div>
        </div>
        <button className="link accent" onClick={() => router.push('/note/sample')}>전체 →</button>
      </div>
      <div style={{margin:'8px 0 12px'}}>
        {ratingDist.slice().reverse().map(({r,count}) => {
          const pct = samples.length > 0 ? Math.round(count/samples.length*100) : 0;
          return (
            <div key={r} className="hist-bar-wrap" style={{marginBottom:4}}>
              <span className="hist-label">{'★'.repeat(r)}</span>
              <div style={{flex:1, background:'var(--border)', borderRadius:4, height:8, overflow:'hidden'}}>
                <div className="hist-bar" style={{width:pct+'%'}}/>
              </div>
              <span className="hist-label" style={{textAlign:'right'}}>{count}</span>
            </div>
          );
        })}
      </div>
      <div style={{display:'flex', flexDirection:'column', gap:6}}>
        {recent.map(s => (
          <div key={s.id} className="widget-row"
            onClick={() => router.push(`/note/sample/${s.id}`)}
            style={{
              display:'flex', alignItems:'center', gap:10,
              padding:'8px 12px', borderRadius:8, cursor:'pointer',
            }}
          >
            {s.photos?.[0] ? (
              <img src={s.photos[0].data} alt={`${s.menuName || s.title} 샘플 사진`}
                style={{width:40, height:32, objectFit:'cover', borderRadius:6, flexShrink:0}}/>
            ) : (
              <div style={{width:40, height:32, borderRadius:6, background:'var(--border)',
                display:'grid', placeItems:'center', fontSize:14, flexShrink:0}}>📷</div>
            )}
            <div style={{flex:1, minWidth:0}}>
              <div title={s.title} style={{fontSize:13, fontWeight:600, color:'var(--text-1)',
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
              }}>{s.title}</div>
              <div style={{fontSize:11, color:'var(--text-3)'}}>{s.menuName}</div>
            </div>
            {s.rating > 0 && (
              <span style={{fontSize:11, color:'var(--star)', flexShrink:0, letterSpacing:1}}>
                {'★'.repeat(s.rating)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export const rowButtonStyle = {
  border: 'none',
  background: 'transparent',
  textAlign: 'left',
  font: 'inherit',
  width: '100%',
  cursor: 'pointer',
};

export function SkeletonChart() {
  return (
    <div style={{
      height:180, background:'linear-gradient(90deg, var(--surface-2), var(--border), var(--surface-2))',
      backgroundSize:'200% 100%', animation:'shimmer 1.5s infinite linear', borderRadius:8,
    }}/>
  );
}

export function RankCard({ title, sub, items, emptyTitle, accent, router }) {
  return (
    <div className="card tx-card">
      <div className="card-header">
        <div>
          <div className="card-title">{title}</div>
          <div className="card-sub">{sub}</div>
        </div>
        <button className="link accent" onClick={() => router.push('/menu-sales/rank-compare')}>전체 →</button>
      </div>
      {items.length === 0 ? (
        <EmptyState
          icon={<Icon.chart style={{width:32,height:32}}/>}
          title={emptyTitle}
          desc="판매량 업로드 후 표시됩니다"
          compact
        />
      ) : (
        <div className="rank-list">
          {items.map(r => (
            <button key={r.rank} className="rank-row"
              onClick={() => router.push(`/menu-sales/rank-compare?menu=${encodeURIComponent(r.name)}`)}
              style={rowButtonStyle}
            >
              <div className={`rank-num num ${accent}`}>{r.rank}</div>
              <div className="rank-name">{r.name}</div>
              {Array.isArray(r.spark) && r.spark.some(v => v > 0) && (
                <div className="rank-mini">
                  <Sparkline data={r.spark} fill={false} width={56} height={22}
                    color={accent === 'down' ? 'var(--negative)' : 'var(--positive)'} />
                </div>
              )}
              {r.quantity != null && <div className="rank-val">{formatNumber(r.quantity)}</div>}
              <Icon.chevRight className="chev" style={{width:16,height:16}}/>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ReportingNotesWidget({ notes, router }) {
  if (!notes || notes.length === 0) return null;
  const sc = STATUS_COLORS['보고예정'];
  const sb = STATUS_BORDER['보고예정'];
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">보고예정 노트</div>
          <div className="card-sub">{notes.length}개 대기 중</div>
        </div>
        <button className="link accent" onClick={() => router.push('/note')}>전체 →</button>
      </div>
      <div style={{display:'flex', flexDirection:'column', gap:6}}>
        {notes.slice(0, 5).map(n => (
          <div key={n.id} className="widget-row"
            onClick={() => router.push(`/note/${n.id}`)}
            style={{
              display:'flex', alignItems:'center', gap:10,
              padding:'8px 12px', borderRadius:8, cursor:'pointer',
              borderLeft:`3px solid ${sb}`,
            }}
          >
            <div style={{flex:1, minWidth:0}}>
              <div title={n.title} style={{fontSize:13, fontWeight:600, color:'var(--text-1)',
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
              }}>{n.title}</div>
              <div style={{fontSize:11, color:'var(--text-3)'}}>{n.menuName}</div>
            </div>
            <span style={{
              fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, flexShrink:0,
              background:sc.bg, color:sc.color,
            }}>보고예정</span>
          </div>
        ))}
        {notes.length > 5 && (
          <div style={{textAlign:'center', fontSize:12, color:'var(--text-3)', padding:'4px 0'}}>
            외 {notes.length - 5}개
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 원가율 경보 위젯 ──────────────────────────────────────── */


export function CostAlertWidget({ data, router }) {
  if (!data || data.items.length === 0) return null;

  const alerts = data.items.filter(i => i.costRate > 40).slice(0, 5);
  const caution = data.items.filter(i => i.costRate > 30 && i.costRate <= 40).length;
  const good    = data.items.filter(i => i.costRate <= 30).length;

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">원가율 경보</div>
          <div className="card-sub">
            레시피 등록 {data.total}개 ·{' '}
            <span style={{ color: 'var(--negative)', fontWeight: 700 }}>경보 {alerts.length}개</span>
            {caution > 0 && <span style={{ color: 'var(--warn)' }}> · 주의 {caution}개</span>}
            {good    > 0 && <span style={{ color: 'var(--positive)' }}> · 양호 {good}개</span>}
          </div>
        </div>
        <button className="link accent" onClick={() => router.push('/cost/margin')}>전체 →</button>
      </div>

      <div className="alert-summary">
        <div className="alert-pill bad"><div className="n">{alerts.length}</div><div className="t">경보 · 40%↑</div></div>
        <div className="alert-pill warn"><div className="n">{caution}</div><div className="t">주의 · 30–40%</div></div>
        <div className="alert-pill good"><div className="n">{good}</div><div className="t">양호 · 30%↓</div></div>
      </div>

      {alerts.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 4px' }}>
          <span style={{ fontSize: 22 }}>✅</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--positive)' }}>경보 메뉴 없음</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>모든 메뉴 원가율 40% 이하</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {alerts.map((item, i) => {
            const c = getCostRateStyles(item.costRate);
            return (
              <button key={i} className="widget-row"
                onClick={() => router.push('/cost/margin')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 8, border: 'none',
                  cursor: 'pointer', textAlign: 'left', font: 'inherit', width: '100%',
                  borderLeft: `3px solid ${c.text}`,
                }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div title={item.menuName} style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.menuName}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                    {item.size} · 원가 {formatNumber(item.cost)}원 / 판매가 {formatNumber(item.sellingPrice)}원
                  </div>
                </div>
                <span style={{
                  fontSize: 13, fontWeight: 800, letterSpacing: '-0.02em',
                  color: c.text, background: c.bg,
                  padding: '3px 9px', borderRadius: 99, flexShrink: 0,
                }}>
                  {item.costRate.toFixed(1)}%
                </span>
              </button>
            );
          })}
          {data.items.filter(i => i.costRate > 40).length > 5 && (
            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-3)', padding: '4px 0' }}>
              외 {data.items.filter(i => i.costRate > 40).length - 5}개
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── 보고서 빠른 생성 위젯 ────────────────────────────────── */

const REPORT_LINKS = [
  { href: '/report/sales',    icon: 'chart',    label: '판매량',    sub: '메뉴별 판매 현황' },
  { href: '/report/shipment', icon: 'box',      label: '출고량',    sub: '제때 상품 출고' },
  { href: '/report/cost',     icon: 'calc',     label: '원가계산',  sub: '원가율·마진 분석' },
  { href: '/report/price',    icon: 'tag',      label: '가격 비교', sub: '제때 단가 비교' },
];

export function QuickReportWidget({ router }) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">보고서 빠른 생성</div>
          <div className="card-sub">보고서 유형을 선택해 바로 시작하세요</div>
        </div>
        <button className="link accent" onClick={() => router.push('/report')}>전체 →</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {REPORT_LINKS.map(({ href, icon, label, sub }) => {
          const IconComp = Icon[icon];
          return (
            <button key={href}
              onClick={() => router.push(href)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '11px 13px', borderRadius: 10,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                cursor: 'pointer', textAlign: 'left', font: 'inherit',
                transition: 'background 0.12s, border-color 0.12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-soft)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-2)';   e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              <span style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: 'var(--accent-soft)', color: 'var(--accent)',
                display: 'grid', placeItems: 'center',
              }}>
                {IconComp && <IconComp style={{ width: 15, height: 15 }} />}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{sub}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
