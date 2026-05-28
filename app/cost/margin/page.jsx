'use client';
import { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/icons';
import { initDB } from '@/lib/db';
import { formatNumber } from '@/lib/format';
import { getPriceFiles, getPriceRowsByFileId } from '@/lib/price';
import { getAllIngredients } from '@/lib/ingredient';
import { getAllRecipes, buildUnitPriceMap, calcCostBySizes } from '@/lib/recipe';
import { MENU_PRICE_CATEGORIES, getAllMenuPrices } from '@/lib/cost/menu-price';
import {
  loadPlatforms, savePlatforms,
  applyDiscount, calcNetRevenue, calcPlatformMargin,
} from '@/lib/cost/margin/platforms';
import { componentSubtotal } from '@/lib/cost/shared/calc';
import { getPizzaRecipeMap } from '@/lib/cost/pizza-detail';
import { getPersonalRecipeMap } from '@/lib/cost/personal-detail';
import { getSideRecipeMap } from '@/lib/cost/side-detail';
import { getSetRecipeMap } from '@/lib/cost/set-detail';
import { PlatformSettingsModal } from '@/components/cost/margin/PlatformSettingsModal';

const MC = (pct) => {
  if (pct == null) return 'var(--text-3)';
  if (pct <  0)   return 'var(--negative, #ef4444)';
  if (pct >= 70)  return 'var(--positive, #10b981)';
  if (pct >= 60)  return '#f59e0b';
  return 'var(--negative, #ef4444)';
};

export default function Page() {
  const [rows,         setRows]         = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [dbError,      setDbError]      = useState(null);
  const [catFilter,    setCatFilter]    = useState('전체');
  const [platforms,    setPlatforms]    = useState([]);
  const [activePlatId, setActivePlatId] = useState('default');
  const [showSettings, setShowSettings] = useState(false);
  const [discOpen,     setDiscOpen]     = useState(false);
  const [discType,     setDiscType]     = useState('pct');   // 'pct' | 'fixed'
  const [discVal,      setDiscVal]      = useState('');

  const load = useCallback(async () => {
    await initDB();
    const [files, meta, recipes, allMenuPrices, pizzaMap, personalMap, sideMap, setMap] = await Promise.all([
      getPriceFiles(), getAllIngredients(), getAllRecipes(),
      getAllMenuPrices(),
      getPizzaRecipeMap(), getPersonalRecipeMap(), getSideRecipeMap(), getSetRecipeMap(),
    ]);

    // lib/recipe rows (old system)
    const latest = files[0] || null;
    const priceRowMap = new Map();
    if (latest) {
      const priceRows = await getPriceRowsByFileId(latest.id);
      priceRows.forEach(r => { if (r.productCode) priceRowMap.set(r.productCode, r); });
    }
    const upm = buildUnitPriceMap(meta, priceRowMap);
    const recipeRows = recipes.map(r => ({ ...r, costMap: calcCostBySizes(r, upm) }));

    // detail store rows (new system: pizza/personal/side/set)
    const DETAIL_STORE_MAP = {
      '피자':              pizzaMap,
      '피자/프리미엄 스페셜': pizzaMap,
      '피자/프리미엄':     pizzaMap,
      '피자/오리지널':     pizzaMap,
      '피자/하프앤하프':   pizzaMap,
      '1인피자':           personalMap,
      '세트박스':          setMap,
      '사이드':            sideMap,
      '소스':              sideMap,
      '음료':              sideMap,
      '엣지':              sideMap,
    };

    const calcComponentCost = (components) =>
      Array.isArray(components)
        ? Math.round(components.reduce((acc, c) => acc + componentSubtotal(c), 0))
        : 0;

    // Group menu prices by (menuName, category)
    const menuGroups = new Map();
    for (const m of allMenuPrices) {
      if (!DETAIL_STORE_MAP[m.category]) continue; // only detail-store categories
      const key = `${m.menuName}||${m.category}`;
      if (!menuGroups.has(key)) menuGroups.set(key, { menuName: m.menuName, category: m.category, entries: [] });
      menuGroups.get(key).entries.push({ menuCode: m.menuCode, size: m.size, price: m.price });
    }

    const detailRows = [];
    for (const { menuName, category, entries } of menuGroups.values()) {
      const recMap  = DETAIL_STORE_MAP[category];
      const costMap = {};
      const sizes   = [];
      for (const { menuCode, size, price } of entries) {
        sizes.push({ label: size, sellingPrice: price });
        const recipe = recMap?.get(menuCode);
        if (recipe) {
          const cost = calcComponentCost(recipe.components);
          if (cost > 0) costMap[size] = cost;
        }
      }
      detailRows.push({
        id:           `detail||${menuName}||${category}`,
        menuName,
        menuCategory: category,
        sizes,
        costMap,
        isDetailStore: true,
      });
    }

    // Merge: detail store rows take precedence; recipe rows fill in the rest
    const detailKeys = new Set(detailRows.map(r => `${r.menuName}||${r.menuCategory}`));
    const filteredRecipeRows = recipeRows.filter(
      r => !detailKeys.has(`${r.menuName}||${r.menuCategory || '기타'}`)
    );

    setRows([...detailRows, ...filteredRecipeRows]);
    setPlatforms(loadPlatforms());
  }, []);

  useEffect(() => {
    load().catch(err => { console.error(err); setDbError(err.message || '데이터 로드 실패'); }).finally(() => setLoading(false));
  }, [load]);

  const activePlatform = useMemo(
    () => platforms.find(p => p.id === activePlatId) ?? platforms[0] ?? { id:'default', name:'기본', fees:[] },
    [platforms, activePlatId]
  );

  const discount = useMemo(() => {
    const v = parseFloat(discVal);
    if (!discOpen || !discVal || isNaN(v) || v <= 0) return null;
    return { type: discType, value: v };
  }, [discOpen, discType, discVal]);

  const hasAdjustment = !!(discount || activePlatform.fees?.length);

  const cats = useMemo(() => {
    const set = new Set(rows.map(r => r.menuCategory || '기타'));
    const order = [...MENU_PRICE_CATEGORIES, '기타'];
    return ['전체', ...[...set].sort((a, b) => {
      const ia = order.indexOf(a), ib = order.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    })];
  }, [rows]);

  const filtered = useMemo(() =>
    catFilter === '전체' ? rows : rows.filter(r => (r.menuCategory || '기타') === catFilter),
    [rows, catFilter]
  );

  const sizeLabels = useMemo(() => {
    const set = new Set();
    filtered.forEach(r => r.sizes?.forEach(s => { if (s.label) set.add(s.label); }));
    const order = ['L', 'R', '단일', '단품', '세트'];
    return [...set].sort((a, b) => {
      const ia = order.indexOf(a), ib = order.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      return ia !== -1 ? -1 : ib !== -1 ? 1 : a.localeCompare(b, 'ko');
    });
  }, [filtered]);

  const stats = useMemo(() => {
    if (!rows.length) return null;
    const all = rows.flatMap(r =>
      (r.sizes || []).map(s => {
        const cost = r.costMap?.[s.label] || 0;
        const eff  = applyDiscount(s.sellingPrice, discount);
        const net  = calcNetRevenue(eff, activePlatform.fees, s.label);
        return calcPlatformMargin(cost, net);
      }).filter(m => m != null)
    );
    if (!all.length) return null;
    const avg = all.reduce((a, b) => a + b, 0) / all.length;
    return { avg, above70: all.filter(m => m >= 70).length, below60: all.filter(m => m < 60).length };
  }, [rows, activePlatform, discount]);

  function handleSavePlatforms(newPlats) {
    savePlatforms(newPlats);
    setPlatforms(newPlats);
    if (!newPlats.find(p => p.id === activePlatId)) setActivePlatId('default');
    setShowSettings(false);
  }

  if (dbError) return (
    <main className="main">
      <PageHeader breadcrumb={['원가계산', '마진표']} title="메뉴 마진표" sub="로드 실패"/>
      <div className="card" style={{padding:32, textAlign:'center', color:'var(--negative)'}}>데이터베이스 오류: {dbError}</div>
    </main>
  );

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['원가계산', '마진표']}
        title="메뉴 마진표"
        sub="레시피 원가 기준 메뉴별 마진율 · 플랫폼·할인 시뮬레이션 지원"
      />

      {/* Stats */}
      {stats && (
        <div className="stat-row" style={{ marginTop:8 }}>
          <div className="stat-card">
            <div className="stat-label">평균 마진율{hasAdjustment ? ' ⟳' : ''}</div>
            <div className="stat-value" style={{ color:MC(stats.avg) }}>
              {stats.avg.toFixed(1)}<span className="unit">%</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">70% 이상</div>
            <div className="stat-value" style={{ color:'var(--positive, #10b981)' }}>
              {stats.above70}<span className="unit">개</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">60% 미만</div>
            <div className="stat-value" style={{ color:stats.below60 > 0 ? 'var(--negative, #ef4444)' : undefined }}>
              {stats.below60}<span className="unit">개</span>
            </div>
          </div>
        </div>
      )}

      {/* Platform bar */}
      <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap', marginTop:14 }}>
        <span style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', letterSpacing:'0.05em', marginRight:2 }}>플랫폼</span>
        {platforms.map(p => (
          <button key={p.id}
            className={'chip' + (p.id === activePlatId ? ' active' : '')}
            onClick={() => setActivePlatId(p.id)}
          >
            {p.name}
            {p.id !== 'default' && p.fees?.length > 0 && (
              <span style={{ fontSize:10, marginLeft:4, opacity:.55 }}>{p.fees.length}건</span>
            )}
          </button>
        ))}
        <button className="btn sm" onClick={() => setShowSettings(true)} title="플랫폼 설정">
          <Icon.gear style={{ width:13, height:13 }}/>
        </button>
        <div style={{ marginLeft:'auto' }}>
          <button
            className={'btn sm' + (discOpen ? ' primary' : '')}
            onClick={() => setDiscOpen(o => !o)}
            style={{ fontSize:11, display:'flex', alignItems:'center', gap:4 }}
          >
            <Icon.calc style={{ width:12, height:12 }}/>
            할인 시뮬레이터
            {discount && <span style={{ fontWeight:700, marginLeft:2 }}>ON</span>}
          </button>
        </div>
      </div>

      {/* Discount simulator bar */}
      {discOpen && (
        <div className="card" style={{ padding:'10px 16px', display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', marginTop:6 }}>
          <span style={{ fontSize:12, fontWeight:700, color:'var(--text-2)', whiteSpace:'nowrap' }}>할인 적용</span>

          {/* Type toggle */}
          <div style={{ display:'flex', border:'1px solid var(--border)', borderRadius:6, overflow:'hidden' }}>
            {(['pct', 'fixed']).map(t => (
              <button key={t} onClick={() => { setDiscType(t); setDiscVal(''); }}
                style={{
                  padding:'5px 12px', fontSize:12, fontWeight:600, border:'none',
                  background: discType === t ? 'var(--accent)' : 'var(--surface-2)',
                  color: discType === t ? '#fff' : 'var(--text-2)',
                  cursor:'pointer',
                }}
              >
                {t === 'pct' ? '% 할인' : '원 할인'}
              </button>
            ))}
          </div>

          {/* Value input */}
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            <input
              className="form-input"
              type="number"
              value={discVal}
              onChange={e => setDiscVal(e.target.value)}
              placeholder={discType === 'pct' ? '예) 20' : '예) 5000'}
              style={{ width:90, textAlign:'right' }}
            />
            <span style={{ fontSize:12, color:'var(--text-3)' }}>{discType === 'pct' ? '%' : '원'}</span>
          </div>

          {/* Status badge */}
          {discount ? (
            <span style={{ fontSize:12, color:'var(--accent)', background:'var(--surface-2)', padding:'3px 10px', borderRadius:20, fontWeight:600 }}>
              {discType === 'pct' ? `${discount.value}% 할인` : `${formatNumber(discount.value)}원 할인`} 적용 중
            </span>
          ) : discVal ? (
            <span style={{ fontSize:11, color:'var(--text-4)' }}>양수 값을 입력하세요</span>
          ) : null}

          <button className="btn sm" onClick={() => setDiscVal('')}
            style={{ marginLeft:'auto', fontSize:11, color:'var(--text-3)' }}>
            초기화
          </button>
        </div>
      )}

      {/* Platform fee summary (non-default) */}
      {activePlatform.fees?.length > 0 && (
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:6, alignItems:'center' }}>
          <span style={{ fontSize:11, color:'var(--text-4)' }}>차감:</span>
          {activePlatform.fees.map(f => (
            <span key={f.id} style={{ fontSize:11, color:'var(--text-3)',
              background:'var(--surface-2)', padding:'2px 10px', borderRadius:4, display:'inline-flex', gap:4, alignItems:'center' }}>
              <b style={{ color:'var(--text-2)' }}>{f.label}</b>
              {f.type === 'pct'
                ? `${f.value}%`
                : feeAmountLabel(f)}
            </span>
          ))}
        </div>
      )}

      {/* Category filter */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', margin:'10px 0 8px' }}>
        {cats.map(c => (
          <button key={c} className={'chip' + (catFilter === c ? ' active' : '')}
            onClick={() => setCatFilter(c)}>{c}</button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="card" style={{ padding:40, textAlign:'center', color:'var(--text-3)', fontSize:13 }}>로딩 중…</div>
      ) : rows.length === 0 ? (
        <div className="card" style={{ padding:40, textAlign:'center', color:'var(--text-3)' }}>
          <Icon.box style={{ width:28, height:28, opacity:.4, marginBottom:8 }}/>
          <div style={{ fontSize:13 }}>원가 레시피 탭에서 메뉴를 먼저 등록해주세요</div>
        </div>
      ) : (
        <div className="card table-card">
          <div style={{ overflowX:'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 160, whiteSpace: 'nowrap' }}>메뉴명</th>
                  <th style={{ width: 90, whiteSpace: 'nowrap' }}>카테고리</th>
                  {sizeLabels.map(l => (
                    <th key={l+'_c'} style={{ width:100, textAlign:'right' }}>{l} 원가</th>
                  ))}
                  {sizeLabels.map(l => (
                    <th key={l+'_p'} style={{ width:100, textAlign:'right' }}>{l} 판매가</th>
                  ))}
                  {hasAdjustment && sizeLabels.map(l => (
                    <th key={l+'_n'} style={{ width:120, textAlign:'right', color:'var(--accent)' }}>
                      {l} 할인적용금액
                    </th>
                  ))}
                  {sizeLabels.map(l => (
                    <th key={l+'_m'} style={{ width:96, textAlign:'right' }}>{l} 마진율</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <MarginRow
                    key={r.id}
                    r={r}
                    sizeLabels={sizeLabels}
                    activePlatform={activePlatform}
                    discount={discount}
                    hasAdjustment={hasAdjustment}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding:'8px 16px', fontSize:11, color:'var(--text-3)', borderTop:'1px solid var(--divider)' }}>
            {filtered.length}개 메뉴
            {hasAdjustment && (
              <span style={{ marginLeft:8, color:'var(--accent)' }}>
                · {activePlatform.id !== 'default' ? activePlatform.name : ''}
                {activePlatform.id !== 'default' && discount ? ' + ' : ''}
                {discount ? (discType === 'pct' ? `${discount.value}% 할인` : `${formatNumber(discount.value)}원 할인`) : ''} 적용 중
              </span>
            )}
          </div>
        </div>
      )}

      {showSettings && (
        <PlatformSettingsModal
          platforms={platforms}
          onSave={handleSavePlatforms}
          onClose={() => setShowSettings(false)}
        />
      )}
    </main>
  );
}

const MarginRow = memo(function MarginRow({ r, sizeLabels, activePlatform, discount, hasAdjustment }) {
  return (
    <tr>
      <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{r.menuName}</td>
      <td style={{ whiteSpace: 'nowrap' }}><span className="chip">{r.menuCategory || '기타'}</span></td>

      {/* 원가 */}
      {sizeLabels.map(l => {
        const cost = r.costMap?.[l] || 0;
        return (
          <td key={l+'_c'} style={{ textAlign:'right', color:'var(--text-2)' }}>
            {cost > 0 ? `${formatNumber(Math.round(cost))}원` : '—'}
          </td>
        );
      })}

      {/* 판매가 */}
      {sizeLabels.map(l => {
        const s = r.sizes?.find(s => s.label === l);
        return (
          <td key={l+'_p'} style={{ textAlign:'right', color:'var(--text-2)' }}>
            {s?.sellingPrice != null ? `${formatNumber(s.sellingPrice)}원` : '—'}
          </td>
        );
      })}

      {/* 할인적용금액 (플랫폼/할인 조정 시만) */}
      {hasAdjustment && sizeLabels.map(l => {
        const s = r.sizes?.find(s => s.label === l);
        if (!s?.sellingPrice) return <td key={l+'_n'} style={{ textAlign:'right', color:'var(--text-3)' }}>—</td>;
        const eff = applyDiscount(s.sellingPrice, discount);
        const net = calcNetRevenue(eff, activePlatform.fees, l);
        return (
          <td key={l+'_n'} style={{ textAlign:'right', fontSize:12, color:'var(--text-2)' }}>
            {formatNumber(Math.round(net))}원
            {eff !== s.sellingPrice && (
              <div style={{ fontSize:10, color:'var(--text-4)' }}>
                {formatNumber(eff)}원 기준
              </div>
            )}
          </td>
        );
      })}

      {/* 마진율 */}
      {sizeLabels.map(l => {
        const cost   = r.costMap?.[l] || 0;
        const s      = r.sizes?.find(s => s.label === l);
        const eff    = applyDiscount(s?.sellingPrice, discount);
        const net    = calcNetRevenue(eff, activePlatform.fees, l);
        const mr     = calcPlatformMargin(cost, net);
        // 기준 마진율 (조정 전, 비교용)
        const baseMr = hasAdjustment
          ? calcPlatformMargin(cost, s?.sellingPrice || 0)
          : null;
        return (
          <td key={l+'_m'} style={{ textAlign:'right' }}>
            {mr != null ? (
              <span style={{ fontWeight:700, color:MC(mr) }}>{mr.toFixed(1)}%</span>
            ) : '—'}
            {baseMr != null && baseMr !== mr && (
              <span style={{ fontSize:10, color:'var(--text-4)', marginLeft:5 }}>
                ({baseMr.toFixed(1)}%)
              </span>
            )}
          </td>
        );
      })}
    </tr>
  );
});

/** 고정비 fee의 표시 문자열 — 사이즈 오버라이드 있으면 전부 표시 */
function feeAmountLabel(f) {
  const base = f.value ?? 0;
  const ov   = f.sizeOverrides || {};
  const hasL = ov.L != null && ov.L !== '';
  const hasR = ov.R != null && ov.R !== '';

  if (!hasL && !hasR) return `${formatNumber(base)}원`;

  const parts = [`공통 ${formatNumber(base)}원`];
  if (hasL) parts.push(`L ${formatNumber(ov.L)}원`);
  if (hasR) parts.push(`R ${formatNumber(ov.R)}원`);
  return parts.join(' · ');
}
