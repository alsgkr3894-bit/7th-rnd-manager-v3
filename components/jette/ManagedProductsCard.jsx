'use client';
import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/icons';
import { showToast } from '@/components/Toast';
import { Chip } from '@/components/ui/Chip';
import { SearchBox } from '@/components/ui/SearchBox';
import {
  getAllManagedProducts,
  addManagedProduct, deleteManagedProduct, updateManagedProduct,
  migrateExclusiveFromPriceList,
} from '@/lib/shipment';
import { getPriceFiles, getPriceRowsByFileId } from '@/lib/price';
import { ManagedProductsForm } from './ManagedProductsForm';
import { ManagedProductsRow } from './ManagedProductsRow';

/**
 * ManagedProductsCard — 제때 출고량 대상 제품 관리
 *
 * 구성:
 *   - 추가 폼 (ManagedProductsForm)
 *   - 분류 chip 필터 (전체 / 전용 / 범용) + 관리품목만 토글
 *   - 테이블 (ManagedProductsRow)
 *   - 가격비교 productCode 자동 마이그레이션 ('exclusive' 일괄 추가)
 */
const EMPTY_FORM = { productCode: '', productName: '', productType: 'generic', isManaged: false };

export function ManagedProductsCard() {
  const [list, setList] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | exclusive | generic | disabled
  const [managedOnly, setManagedOnly] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [migrating, setMigrating] = useState(false);

  useEffect(() => { refresh(); }, []);

  async function refresh() {
    try { setList(await getAllManagedProducts()); } catch (err) { console.warn(err); }
  }

  async function handleAdd() {
    if (!form.productCode.trim() || !form.productName.trim()) return;
    setBusy(true);
    try {
      await addManagedProduct(form);
      showToast('대상 제품이 추가됐어요', 'ok');
      setForm(EMPTY_FORM);
      setAdding(false);
      refresh();
    } catch (err) {
      if (err.message === 'CODE_DUPLICATE') showToast('이미 등록된 제품코드입니다', 'err');
      else showToast(err.message || '추가 실패', 'err');
    } finally { setBusy(false); }
  }

  async function handleDelete(id) {
    try { await deleteManagedProduct(id); showToast('삭제됐어요', 'ok'); refresh(); }
    catch { showToast('삭제 실패', 'err'); }
  }

  async function handleToggleEnable(p) {
    try { await updateManagedProduct({ id: p.id, enable: p.enable === false }); refresh(); }
    catch { showToast('토글 실패', 'err'); }
  }

  async function handleChangeType(p, productType) {
    try { await updateManagedProduct({ id: p.id, productType }); refresh(); }
    catch { showToast('변경 실패', 'err'); }
  }

  async function handleToggleManaged(p) {
    try { await updateManagedProduct({ id: p.id, isManaged: !p.isManaged }); refresh(); }
    catch { showToast('변경 실패', 'err'); }
  }

  /** 가격비교 최신 파일의 productCode 중 ref에 없는 것을 'exclusive'로 일괄 추가 */
  async function handleMigrate() {
    setMigrating(true);
    try {
      const files = await getPriceFiles();
      if (files.length === 0) { showToast('가격비교 데이터가 없습니다', 'err'); return; }
      const rows = await getPriceRowsByFileId(files[0].id);
      if (rows.length === 0) { showToast('가격비교 행이 없습니다', 'err'); return; }
      const priceProducts = rows
        .filter(r => r.productCode && r.productName)
        .map(r => ({ productCode: r.productCode, productName: r.productName }));
      const { added, skipped } = await migrateExclusiveFromPriceList(priceProducts);
      showToast(`전용상품 ${added}개 추가 (기존 ${skipped}개 유지)`, added > 0 ? 'ok' : 'info');
      refresh();
    } catch (err) {
      console.error(err);
      showToast(err.message || '마이그레이션 실패', 'err');
    } finally { setMigrating(false); }
  }

  const counts = useMemo(() => ({
    all:              list.length,
    exclusive:        list.filter(p => p.productType === 'exclusive').length,
    generic:          list.filter(p => p.productType === 'generic' || !p.productType).length,
    'generic-managed': list.filter(p => p.productType === 'generic-managed').length,
    managed:          list.filter(p => p.isManaged).length,
    disabled:         list.filter(p => p.enable === false).length,
  }), [list]);

  const filtered = useMemo(() => {
    let r = list;
    if (filter === 'disabled') r = r.filter(p => p.enable === false);
    else if (filter !== 'all') r = r.filter(p => (p.productType || 'generic') === filter);
    if (managedOnly) r = r.filter(p => p.isManaged);
    const q = search.trim().toLowerCase();
    if (q) r = r.filter(p =>
      (p.productName || '').toLowerCase().includes(q)
      || (p.productCode || '').toLowerCase().includes(q)
    );
    return r;
  }, [list, search, filter, managedOnly]);

  return (
    <div className="card" style={{marginTop:16}}>
      <div className="card-header">
        <div>
          <div className="card-title">대상 제품 목록</div>
          <div className="card-sub">
            총 {list.length}개 (전용 {counts.exclusive} · 범용 {counts.generic} · 범용관리 {counts['generic-managed']} · 관리품목 {counts.managed})
          </div>
        </div>
        <div style={{display:'flex', gap:6}}>
          <button className="btn sm" onClick={handleMigrate} disabled={migrating}>
            <Icon.download style={{width:12, height:12}}/>
            {migrating ? '가져오는 중...' : '가격비교에서 전용상품 가져오기'}
          </button>
          <button className="btn sm" onClick={() => setAdding(v => !v)}>
            {adding ? '닫기' : <><Icon.plus style={{width:12, height:12}}/> 추가</>}
          </button>
        </div>
      </div>

      {adding && (
        <ManagedProductsForm
          form={form}
          setForm={setForm}
          busy={busy}
          onSubmit={handleAdd}
          onCancel={() => setAdding(false)}
        />
      )}

      <div style={{display:'flex', gap:6, flexWrap:'wrap', marginBottom:12, alignItems:'center'}}>
        <Chip label="전체"     count={counts.all}                   active={filter === 'all'}              onClick={() => setFilter('all')}/>
        <Chip label="전용상품" count={counts.exclusive}             active={filter === 'exclusive'}         onClick={() => setFilter('exclusive')}/>
        <Chip label="범용상품" count={counts.generic}               active={filter === 'generic'}           onClick={() => setFilter('generic')}/>
        <Chip label="범용관리" count={counts['generic-managed']}    active={filter === 'generic-managed'}   onClick={() => setFilter('generic-managed')}/>
        <span style={{width:1, height:18, background:'var(--border)', margin:'0 4px'}}/>
        <Chip label="관리품목만" count={counts.managed}    active={managedOnly}            onClick={() => setManagedOnly(v => !v)}/>
        {counts.disabled > 0 && (
          <Chip label="비활성" count={counts.disabled} active={filter === 'disabled'} onClick={() => setFilter('disabled')}/>
        )}
      </div>

      <SearchBox value={search} onChange={setSearch}/>

      {filtered.length === 0 ? (
        <div style={{padding:'32px 0', textAlign:'center', color:'var(--text-3)', fontSize:13}}>
          조건에 맞는 제품이 없습니다
        </div>
      ) : (
        <div style={{maxHeight:480, overflowY:'auto', borderTop:'1px solid var(--border)'}}>
          <table className="data-table">
            <thead style={{position:'sticky', top:0, background:'var(--surface)', zIndex:1}}>
              <tr>
                <th style={{width:120}}>제품코드</th>
                <th>제품명</th>
                <th style={{width:70, textAlign:'center'}}>활성</th>
                <th style={{width:130}}>분류</th>
                <th style={{width:80, textAlign:'center'}}>관리품목</th>
                <th style={{width:70}}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <ManagedProductsRow
                  key={p.id}
                  product={p}
                  onToggleEnable={handleToggleEnable}
                  onChangeType={handleChangeType}
                  onToggleManaged={handleToggleManaged}
                  onDelete={handleDelete}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
