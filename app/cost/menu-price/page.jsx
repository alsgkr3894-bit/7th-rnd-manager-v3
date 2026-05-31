'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader, FilterBar } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { initDB } from '@/lib/db';
import {
  MENU_PRICE_CATEGORIES,
  getAllMenuPrices, addMenuPrice, updateMenuPrice, deleteMenuPrice,
  resetAllMenuPrices, getDefaultPrice,
} from '@/lib/cost/menu-price';
import { getAllMenuMaster } from '@/lib/menu-master';
import { MenuPriceTable } from '@/components/cost/menu-price/MenuPriceTable';
import { MenuPriceForm } from '@/components/cost/menu-price/MenuPriceForm';
import { MenuPriceUploadCard } from '@/components/cost/menu-price/MenuPriceUploadCard';
import { BulkPriceModal } from '@/components/cost/menu-price/BulkPriceModal';

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
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmBulkPizza, setConfirmBulkPizza] = useState(false);

  const load = useCallback(async () => {
    await initDB();
    setRows(await getAllMenuPrices());
  }, []);

  useEffect(() => {
    load().catch(err => { console.error(err); setDbError(err.message || '데이터 로드 실패'); }).finally(() => setLoading(false));
  }, [load]);

  async function handleReset() {
    setResetting(true);
    try {
      await resetAllMenuPrices();
      setRows([]);
      showToast('초기화 완료', 'ok');
    } catch (err) { showToast('실패: ' + err.message, 'err'); }
    finally { setResetting(false); }
  }

  async function handleBulkPizza() {
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
          <button className="btn" onClick={() => setConfirmReset(true)} disabled={resetting} style={{ color: 'var(--negative)' }}>
            <Icon.trash style={{width:14, height:14}}/> {resetting ? '처리 중…' : '초기화'}
          </button>
          <button className="btn" onClick={() => setBulkModal(true)}>
            <Icon.calc style={{width:14, height:14}}/> 코드별 일괄 가격 설정
          </button>
          <button className="btn" onClick={() => setConfirmBulkPizza(true)} disabled={bulking}>
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

      {confirmReset && (
        <ConfirmDialog
          open
          message="메뉴 판매가 전체를 삭제합니다. 계속할까요?"
          danger
          onConfirm={() => { setConfirmReset(false); handleReset(); }}
          onCancel={() => setConfirmReset(false)}
        />
      )}

      {confirmBulkPizza && (
        <ConfirmDialog
          open
          message={`메뉴 마스터의 피자 항목 전체에 기본 판매가를 일괄 등록합니다.\n이미 등록된 코드는 건너뜁니다. 계속할까요?`}
          onConfirm={() => { setConfirmBulkPizza(false); handleBulkPizza(); }}
          onCancel={() => setConfirmBulkPizza(false)}
        />
      )}
    </main>
  );
}
