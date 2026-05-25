'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { initDB } from '@/lib/db';
import { formatNumber } from '@/lib/format';
import { getPriceFiles, getPriceRowsByFileId } from '@/lib/price';
import { getIngredientMetaMap, mergeIngredientRows, getCategoryStyle } from '@/lib/ingredient';

const TYPE_META = {
  'price-up':     { label: '단가 인상', iconBg: 'var(--negative-soft)', iconColor: 'var(--negative)', Icon: Icon.arrowUp },
  'price-down':   { label: '단가 인하', iconBg: 'var(--positive-soft)', iconColor: 'var(--positive)', Icon: Icon.arrowDown },
  'unclassified': { label: '미분류',    iconBg: 'var(--warn-soft)',     iconColor: 'var(--warn)',     Icon: Icon.tag },
  'no-unit':      { label: '포장단위 없음', iconBg: 'var(--warn-soft)', iconColor: 'var(--warn)',     Icon: Icon.alert },
};

export default function Page() {
  const [issues,       setIssues]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [dateInfo,     setDateInfo]     = useState(null); // { latest, prev }
  const [filter,       setFilter]       = useState('all');

  const load = useCallback(async () => {
    await initDB();
    const files = await getPriceFiles();
    if (!files.length) { setIssues([]); return; }

    const latest = files[0];
    const prev   = files[1] ?? null;

    const [latestRows, metaMap] = await Promise.all([
      getPriceRowsByFileId(latest.id),
      getIngredientMetaMap(),
    ]);

    const merged = mergeIngredientRows(latestRows, metaMap);
    const result = [];

    // ── 가격 변동 (이전 파일 있을 때만) ───────────────────────
    if (prev) {
      const prevRows = await getPriceRowsByFileId(prev.id);
      const prevMap  = new Map(prevRows.map(r => [r.productCode, r]));

      for (const row of merged) {
        const prevRow = prevMap.get(row.productCode);
        if (!prevRow) continue;
        const oldPrice = prevRow.priceWithTax;
        const newPrice = row.priceWithTax;
        if (oldPrice == null || newPrice == null || oldPrice === newPrice) continue;

        const diff = newPrice - oldPrice;
        const pct  = (diff / oldPrice * 100).toFixed(1);
        result.push({
          type: diff > 0 ? 'price-up' : 'price-down',
          productCode: row.productCode,
          displayName: row.displayName || row.productName,
          category:    row.category,
          oldPrice, newPrice, diff, pct,
        });
      }
      // 인상 폭 큰 순 정렬
      result.sort((a, b) => Math.abs(Number(b.pct)) - Math.abs(Number(a.pct)));
    }

    // ── 미분류 (관리 중 & 카테고리 없음) ─────────────────────
    for (const row of merged) {
      if (row.hasRecord && !row.excluded && !row.category) {
        result.push({
          type: 'unclassified',
          productCode: row.productCode,
          displayName: row.displayName || row.productName,
          category: '',
        });
      }
    }

    // ── 포장단위 없음 (관리 중 & baseQuantity 없음) ──────────
    for (const row of merged) {
      if (row.hasRecord && !row.excluded && !row.baseQuantity) {
        result.push({
          type: 'no-unit',
          productCode: row.productCode,
          displayName: row.displayName || row.productName,
          category:    row.category,
        });
      }
    }

    setDateInfo({ latest: latest.updateDate, prev: prev?.updateDate ?? null });
    setIssues(result);
  }, []);

  useEffect(() => {
    load().catch(console.error).finally(() => setLoading(false));
  }, [load]);

  const counts = useMemo(() => {
    const c = {};
    for (const it of issues) c[it.type] = (c[it.type] || 0) + 1;
    return c;
  }, [issues]);

  const filtered = useMemo(() =>
    filter === 'all' ? issues : issues.filter(i => i.type === filter),
    [issues, filter]
  );

  const FILTERS = [
    { id: 'all',          label: '전체' },
    { id: 'price-up',     label: '단가 인상' },
    { id: 'price-down',   label: '단가 인하' },
    { id: 'unclassified', label: '미분류' },
    { id: 'no-unit',      label: '포장단위 없음' },
  ];

  const sub = loading
    ? '로딩 중…'
    : dateInfo?.prev
      ? `${dateInfo.prev} → ${dateInfo.latest} 비교 · 총 ${issues.length}건`
      : dateInfo
        ? `${dateInfo.latest} 기준 · 총 ${issues.length}건 (이전 파일 없어 가격 비교 불가)`
        : '제때 가격 파일이 없습니다';

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['식자재', '식자재 이슈']}
        title="식자재 이슈"
        sub={sub}
      />

      {/* 필터 칩 */}
      {!loading && (
        <div style={{display:'flex', gap:6, flexWrap:'wrap', margin:'16px 0 8px'}}>
          {FILTERS.map(f => {
            const cnt = f.id === 'all' ? issues.length : (counts[f.id] || 0);
            if (f.id !== 'all' && cnt === 0) return null;
            return (
              <button key={f.id}
                className={'chip' + (filter === f.id ? ' active' : '')}
                onClick={() => setFilter(f.id)}>
                {f.label}{cnt > 0 ? ` (${cnt})` : ''}
              </button>
            );
          })}
        </div>
      )}

      {/* 빈 상태 */}
      {!loading && issues.length === 0 && (
        <div className="card" style={{marginTop:16, minHeight:180, display:'grid', placeItems:'center'}}>
          <div style={{textAlign:'center', color:'var(--text-3)'}}>
            <Icon.check style={{width:32, height:32, marginBottom:12, opacity:.4}}/>
            <div style={{fontWeight:600, marginBottom:4}}>이슈 없음</div>
            <div style={{fontSize:13}}>단가 변동, 미분류, 포장단위 누락 항목이 없습니다.</div>
          </div>
        </div>
      )}

      {/* 이슈 목록 */}
      {filtered.length > 0 && (
        <div style={{display:'flex', flexDirection:'column', gap:8, marginTop:4}}>
          {filtered.map((it, i) => <IssueCard key={i} issue={it} />)}
        </div>
      )}
    </main>
  );
}

// ── 카드 컴포넌트 ──────────────────────────────────────────────

function IssueCard({ issue: it }) {
  const meta = TYPE_META[it.type];
  const IcoComponent = meta.Icon;

  return (
    <div className="card" style={{display:'flex', alignItems:'center', gap:14, padding:'14px 20px'}}>
      <div style={{
        width:36, height:36, borderRadius:10, flexShrink:0,
        background: meta.iconBg, color: meta.iconColor,
        display:'grid', placeItems:'center',
      }}>
        <IcoComponent style={{width:17, height:17}}/>
      </div>

      <div style={{flex:1, minWidth:0}}>
        <div style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap'}}>
          <span style={{fontWeight:700, fontSize:14}}>{it.displayName}</span>
          {it.category && (
            <span className="chip" style={{...getCategoryStyle(it.category), padding:'2px 8px', fontSize:11}}>
              {it.category}
            </span>
          )}
        </div>
        <div style={{fontSize:13, color:'var(--text-2)', marginTop:3}}>
          {it.type === 'price-up' &&
            `${formatNumber(it.oldPrice)}원 → ${formatNumber(it.newPrice)}원  (+${it.pct}%  +${formatNumber(it.diff)}원)`}
          {it.type === 'price-down' &&
            `${formatNumber(it.oldPrice)}원 → ${formatNumber(it.newPrice)}원  (${it.pct}%  ${formatNumber(it.diff)}원)`}
          {it.type === 'unclassified' && '분류가 설정되지 않았습니다 — 식자재 관리에서 설정해주세요'}
          {it.type === 'no-unit' && '포장단위가 없어 g·개당 단가를 계산할 수 없습니다'}
        </div>
      </div>

      <span style={{
        fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:6,
        background: meta.iconBg, color: meta.iconColor, whiteSpace:'nowrap', flexShrink:0,
      }}>
        {meta.label}
      </span>
    </div>
  );
}
