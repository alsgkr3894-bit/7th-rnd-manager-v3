'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/icons';
import { PageHeader, FilterBar } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import {
  MENU_PRICE_CATEGORIES,
  getAllMenuPrices, addMenuPrice, updateMenuPrice, deleteMenuPrice,
  resetAllMenuPrices, getDefaultPrice, DEFAULT_PRICE_MAP,
} from '@/lib/cost/menu-price';
import { parseCategoryFromCode } from '@/lib/cost/menu-price/code';
import { getAllMenuMaster } from '@/lib/menu-master';
import { MenuPriceTable } from '@/components/cost/menu-price/MenuPriceTable';
import { MenuPriceForm } from '@/components/cost/menu-price/MenuPriceForm';
import { MenuPriceUploadCard } from '@/components/cost/menu-price/MenuPriceUploadCard';

/* ── 코드별 일괄 가격 설정 모달 ─────────────────────────────── */
const CODE_GROUPS = [
  { sub: 'PS',  label: '프리미엄 스페셜', sizes: ['L', 'R'] },
  { sub: 'PR',  label: '프리미엄',        sizes: ['L', 'R'] },
  { sub: 'OR',  label: '오리지널',        sizes: ['L', 'R'] },
  { sub: 'HH',  label: '하프앤하프',      sizes: ['L', 'R'] },
  { sub: 'ONE', label: '1인피자',         sizes: ['단품'] },
];

function BulkPriceModal({ onClose, onDone }) {
  // 초기값: DEFAULT_PRICE_MAP에서 가져오기
  const [prices, setPrices] = useState(() => {
    const init = {};
    CODE_GROUPS.forEach(g => {
      init[g.sub] = {};
      g.sizes.forEach(s => { init[g.sub][s] = String(DEFAULT_PRICE_MAP[g.sub]?.[s] ?? ''); });
    });
    return init;
  });
  const [saving, setSaving] = useState(false);

  const setPrice = (sub, size, val) =>
    setPrices(p => ({ ...p, [sub]: { ...p[sub], [size]: val } }));

  const handleApply = async () => {
    setSaving(true);
    try {
      await initDB();
      const [masters, existing] = await Promise.all([getAllMenuMaster(), getAllMenuPrices()]);
      const existingMap = new Map(existing.map(r => [r.menuCode, r]));
      let created = 0, updated = 0;

      for (const m of masters) {
        if (!m.menuCode || m.status === 'discontinued') continue;
        const parts = m.menuCode.toUpperCase().split('-');
        const sub  = parts[1]; // PS, PR, OR, HH, ONE …
        const lastPart = parts[parts.length - 1];
        const size = lastPart === 'ONE' ? '단품' : lastPart;
        const group = CODE_GROUPS.find(g => g.sub === sub);
        if (!group) continue;
        const priceVal = Number(prices[sub]?.[size]);
        if (!priceVal) continue;

        const { category } = parseCategoryFromCode(m.menuCode);
        const ex = existingMap.get(m.menuCode);
        if (ex) {
          await updateMenuPrice(ex.id, { ...ex, price: priceVal });
          updated++;
        } else {
          await addMenuPrice({ menuCode: m.menuCode, menuName: m.menuName, category, size: m.size || size, price: priceVal });
          created++;
        }
      }
      showToast(`${created}개 생성 · ${updated}개 업데이트`, 'ok');
      onDone();
      onClose();
    } catch (err) {
      showToast('실패: ' + err.message, 'err');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'grid', placeItems: 'center', zIndex: 300 }}>
      <div className="card" style={{ width: 'min(580px,95vw)', padding: '28px 32px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>코드별 일괄 가격 설정</div>
          <button className="btn ghost" style={{ padding: '4px 8px' }} onClick={onClose}>
            <Icon.close style={{ width: 16, height: 16 }} />
          </button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-4)', marginBottom: 20 }}>
          메뉴 마스터의 코드를 기준으로 일치하는 모든 메뉴에 가격을 일괄 적용합니다
        </div>

        {/* 컬럼 헤더 */}
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr', gap: 8, padding: '6px 4px', borderBottom: '2px solid var(--divider)', marginBottom: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>코드 / 중분류</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.04em' }}>L 사이즈</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.04em' }}>R / 1인피자</div>
        </div>

        {/* 그룹별 행 */}
        {CODE_GROUPS.map(g => (
          <div key={g.sub} style={{
            display: 'grid', gridTemplateColumns: '140px 1fr 1fr',
            gap: 8, alignItems: 'center',
            padding: '12px 4px', borderBottom: '1px solid var(--divider)',
          }}>
            {/* 코드 + 중분류 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontFamily: 'monospace', fontSize: 12, fontWeight: 800,
                color: 'var(--accent-text)', background: 'var(--accent-soft)',
                padding: '3px 8px', borderRadius: 6, flexShrink: 0,
              }}>
                P-{g.sub}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                {g.label}
              </span>
            </div>

            {/* L 가격 */}
            {g.sizes.includes('L') ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                <input type="number" className="input"
                  style={{ textAlign: 'right', fontSize: 14, fontWeight: 600, width: 110 }}
                  value={prices[g.sub]?.L ?? ''}
                  onChange={e => setPrice(g.sub, 'L', e.target.value)}
                  placeholder="0" />
                <span style={{ fontSize: 12, color: 'var(--text-4)', flexShrink: 0 }}>원</span>
              </div>
            ) : (
              <div style={{ textAlign: 'right', color: 'var(--text-4)', fontSize: 13 }}>—</div>
            )}

            {/* R 또는 ONE 가격 */}
            {(g.sizes.includes('R') || g.sizes.includes('단품')) ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                <input type="number" className="input"
                  style={{ textAlign: 'right', fontSize: 14, fontWeight: 600, width: 110 }}
                  value={prices[g.sub]?.[g.sizes.includes('R') ? 'R' : '단품'] ?? ''}
                  onChange={e => setPrice(g.sub, g.sizes.includes('R') ? 'R' : '단품', e.target.value)}
                  placeholder="0" />
                <span style={{ fontSize: 12, color: 'var(--text-4)', flexShrink: 0 }}>원</span>
              </div>
            ) : (
              <div style={{ textAlign: 'right', color: 'var(--text-4)', fontSize: 13 }}>—</div>
            )}
          </div>
        ))}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn" onClick={onClose}>취소</button>
          <button className="btn primary" onClick={handleApply} disabled={saving}>
            {saving ? '적용 중…' : '일괄 적용'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function Page() {
  const [rows, setRows]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [dbError, setDbError]       = useState(null);
  const [search, setSearch]         = useState('');
  const [catFilter,  setCatFilter]  = useState('all');
  const [subFilter,  setSubFilter]  = useState('all');
  const [formTarget, setFormTarget] = useState(null);
  const [deletePending, setDeletePending] = useState(null);
  const [bulking,    setBulking]   = useState(false);
  const [resetting,  setResetting] = useState(false);
  const [bulkModal,  setBulkModal] = useState(false);

  const load = useCallback(async () => {
    await initDB();
    setRows(await getAllMenuPrices());
  }, []);

  useEffect(() => {
    load().catch(err => { console.error(err); setDbError(err.message || '데이터 로드 실패'); }).finally(() => setLoading(false));
  }, [load]);

  async function handleReset() {
    if (!window.confirm('메뉴 판매가 전체를 삭제합니다. 계속할까요?')) return;
    setResetting(true);
    try {
      await resetAllMenuPrices();
      setRows([]);
      showToast('초기화 완료', 'ok');
    } catch (err) { showToast('실패: ' + err.message, 'err'); }
    finally { setResetting(false); }
  }

  async function handleBulkPizza() {
    if (!window.confirm('메뉴 마스터의 피자 항목 전체에 기본 판매가를 일괄 등록합니다.\n이미 등록된 코드는 건너뜁니다. 계속할까요?')) return;
    setBulking(true);
    try {
      await initDB();
      const [masters, existing] = await Promise.all([getAllMenuMaster(), getAllMenuPrices()]);
      const existingCodes = new Set(existing.map(r => r.menuCode).filter(Boolean));
      const pizzaMasters = masters.filter(m =>
        m.status !== 'discontinued' && m.menuCode && getDefaultPrice(m.menuCode)
      );
      let added = 0;
      for (const m of pizzaMasters) {
        if (existingCodes.has(m.menuCode)) continue;
        const price = getDefaultPrice(m.menuCode);
        await addMenuPrice({
          menuCode: m.menuCode,
          menuName: m.menuName,
          category: m.category || '피자',
          size: m.size || 'L',
          price,
          note: '',
        });
        added++;
      }
      setRows(await getAllMenuPrices());
      showToast(`${added}개 피자 판매가 등록 완료`, 'ok');
    } catch (err) {
      showToast('일괄 등록 실패: ' + err.message, 'err');
    } finally {
      setBulking(false);
    }
  }

  async function handleSave(data) {
    try {
      if (formTarget === 'new') {
        await addMenuPrice(data);
        showToast('추가 완료', 'ok');
      } else {
        await updateMenuPrice(formTarget.id, data);
        showToast('수정 완료', 'ok');
      }
      setFormTarget(null);
      setRows(await getAllMenuPrices());
    } catch (err) {
      showToast('저장 실패: ' + err.message, 'err');
      throw err;
    }
  }

  async function handleDelete(id) {
    try {
      await deleteMenuPrice(id);
      setRows(prev => prev.filter(r => r.id !== id));
      setDeletePending(null);
      showToast('삭제 완료', 'ok');
    } catch (err) {
      showToast('삭제 실패: ' + err.message, 'err');
    }
  }

  const counts = useMemo(() => {
    const map = { all: rows.length };
    for (const c of MENU_PRICE_CATEGORIES) {
      map[c] = rows.filter(r => r.category === c).length;
    }
    return map;
  }, [rows]);

  const filtered = useMemo(() => {
    let list = rows;
    if (catFilter !== 'all') list = list.filter(r => r.category === catFilter);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(r =>
      (r.menuCode || '').toLowerCase().includes(q) ||
      (r.menuName || '').toLowerCase().includes(q) ||
      (r.category || '').toLowerCase().includes(q) ||
      (r.note || '').toLowerCase().includes(q)
    );
    return list;
  }, [rows, catFilter, search]);

  const sub = loading
    ? '로딩 중…'
    : rows.length === 0
      ? '메뉴 판매가가 등록되지 않았습니다 — 양식 업로드 또는 직접 추가'
      : `총 ${rows.length}개 등록 · 종합 원가표에서 원가율 자동 계산에 사용`;

  if (dbError) return (
    <main className="main">
      <PageHeader breadcrumb={['원가계산', '메뉴 판매가']} title="메뉴 판매가" sub="로드 실패"/>
      <div className="card" style={{padding:32, textAlign:'center', color:'var(--negative)'}}>데이터베이스 오류: {dbError}</div>
    </main>
  );

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['원가계산', '메뉴 판매가']}
        title="메뉴 판매가"
        sub={sub}
        actions={<>
          <button className="btn" onClick={handleReset} disabled={resetting} style={{ color: 'var(--negative)' }}>
            <Icon.trash style={{width:14, height:14}}/> {resetting ? '처리 중…' : '초기화'}
          </button>
          <button className="btn" onClick={() => setBulkModal(true)}>
            <Icon.calc style={{width:14, height:14}}/> 코드별 일괄 가격 설정
          </button>
          <button className="btn" onClick={handleBulkPizza} disabled={bulking}>
            <Icon.pizza style={{width:14, height:14}}/> {bulking ? '등록 중…' : '피자 기본가 일괄 등록'}
          </button>
          <button className="btn primary" onClick={() => setFormTarget('new')}>
            <Icon.plus style={{width:14, height:14}}/> 직접 추가
          </button>
        </>}
      />

      <MenuPriceUploadCard onReplaced={load}/>

      {rows.length > 0 && (
        <div style={{display:'flex', flexDirection:'column', gap:6}}>
          <div style={{display:'flex', gap:6, flexWrap:'wrap', alignItems:'center'}}>
            <span style={{fontSize:12, color:'var(--text-3)', marginRight:4, fontWeight:600}}>분류</span>
            <button className={'chip' + (catFilter === 'all' ? ' active' : '')}
              onClick={() => setCatFilter('all')}>
              전체 {counts.all}
            </button>
            {MENU_PRICE_CATEGORIES.map(c => (
              counts[c] > 0 && (
                <button key={c}
                  className={'chip' + (catFilter === c ? ' active' : '')}
                  onClick={() => setCatFilter(c)}>
                  {c} {counts[c]}
                </button>
              )
            ))}
          </div>
          <FilterBar search={search} onSearch={setSearch}/>
        </div>
      )}

      {rows.length > 0 && (
        <MenuPriceTable
          rows={filtered}
          deletePending={deletePending}
          onEdit={setFormTarget}
          onDeleteStart={setDeletePending}
          onDeleteCancel={() => setDeletePending(null)}
          onDeleteConfirm={handleDelete}
        />
      )}

      {!loading && rows.length === 0 && (
        <div className="card" style={{minHeight:160, display:'grid', placeItems:'center'}}>
          <div style={{textAlign:'center', color:'var(--text-3)'}}>
            <Icon.doc style={{width:32, height:32, marginBottom:12, opacity:.4}}/>
            <div style={{fontWeight:600, marginBottom:4}}>등록된 메뉴 판매가가 없습니다</div>
            <div style={{fontSize:13}}>위에서 양식을 다운로드 받아 작성 후 업로드하거나, 직접 추가해주세요.</div>
          </div>
        </div>
      )}

      {formTarget !== null && (
        <MenuPriceForm
          initial={formTarget === 'new' ? null : formTarget}
          onSave={handleSave}
          onClose={() => setFormTarget(null)}
        />
      )}

      {bulkModal && (
        <BulkPriceModal
          onClose={() => setBulkModal(false)}
          onDone={load}
        />
      )}
    </main>
  );
}
