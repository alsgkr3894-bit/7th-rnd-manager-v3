'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader, FilterBar } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import {
  MENU_PRICE_CATEGORIES,
  getAllMenuPrices, addMenuPrice, updateMenuPrice, deleteMenuPrice,
} from '@/lib/cost/menu-price';
import { MenuPriceTable } from '@/components/cost/menu-price/MenuPriceTable';
import { MenuPriceForm } from '@/components/cost/menu-price/MenuPriceForm';
import { MenuPriceUploadCard } from '@/components/cost/menu-price/MenuPriceUploadCard';

export default function Page() {
  const [rows, setRows]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [catFilter, setCatFilter]   = useState('all');
  const [formTarget, setFormTarget] = useState(null);
  const [deletePending, setDeletePending] = useState(null);

  const load = useCallback(async () => {
    await initDB();
    setRows(await getAllMenuPrices());
  }, []);

  useEffect(() => {
    load().catch(console.error).finally(() => setLoading(false));
  }, [load]);

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
      await load();
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

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['원가계산', '메뉴 판매가']}
        title="메뉴 판매가"
        sub={sub}
        actions={
          <button className="btn primary" onClick={() => setFormTarget('new')}>
            <Icon.plus style={{width:14, height:14}}/> 직접 추가
          </button>
        }
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
    </main>
  );
}
