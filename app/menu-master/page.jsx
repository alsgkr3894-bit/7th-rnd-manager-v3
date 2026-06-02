'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Skeleton } from '@/components/ui/Skeleton';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import { initDB } from '@/lib/db';
import {
  getAllMenuMaster, upsertMenuMaster,
  resetAllMenuMaster, pushMasterToPrices,
} from '@/lib/menu-master';
import { parseCategoryFromCode } from '@/lib/cost/menu-price/code';
import { getDefaultPrice, resetAllMenuPrices } from '@/lib/cost/menu-price';
import { seedMenuMaster } from '@/lib/menu-master/seed';
import { normalizePersonalPizzaCodes } from '@/lib/menu-master/normalize';
import { MenuPriceUploadCard } from '@/components/cost/menu-price/MenuPriceUploadCard';
import { BulkPriceModal } from '@/components/cost/menu-price/BulkPriceModal';

const CATEGORIES = ['피자', '1인피자', '세트박스', '사이드', '소스', '음료', '엣지'];
const PIZZA_SUBS = ['프리미엄 스페셜', '프리미엄', '오리지널', '하프앤하프'];

const STATUS_LABEL = { active: '활성', discontinued: '단종', test: '테스트' };
const STATUS_STYLE = {
  active:       { background: 'var(--positive-soft)', color: 'var(--positive)' },
  discontinued: { background: 'var(--surface-2)',     color: 'var(--text-3)' },
  test:         { background: 'var(--accent-soft)',   color: 'var(--accent)' },
};

const SUB_TAG_STYLE = {
  PS:  { bg: '#F3E8FF', color: '#6B21A8', label: '프리미엄 스페셜' },
  PR:  { bg: '#EEF2FF', color: '#3730A3', label: '프리미엄' },
  OR:  { bg: '#ECFDF5', color: '#065F46', label: '오리지널' },
  HH:  { bg: '#FDF2F8', color: '#9D174D', label: '하프앤하프' },
  ONE: { bg: '#FFF7ED', color: '#9A3412', label: '1인피자' },
  SPG: { bg: '#F0FDF4', color: '#166534', label: '스파게티' },
  TBK: { bg: '#FEF9C3', color: '#854D0E', label: '떡볶이' },
  CHK: { bg: '#FFF1F2', color: '#9F1239', label: '치킨' },
  FRY: { bg: '#FFF7ED', color: '#C2410C', label: '튀김' },
  SNK: { bg: '#F0F9FF', color: '#0369A1', label: '스낵' },
  SLD: { bg: '#F0FDF4', color: '#166534', label: '샐러드' },
  PKL: { bg: '#ECFDF5', color: '#065F46', label: '피클류' },
  SAU: { bg: '#FEF9C3', color: '#713F12', label: '소스추가' },
  CC:  { bg: '#FEE2E2', color: '#991B1B', label: '코카콜라' },
  CZ:  { bg: '#FEE2E2', color: '#7F1D1D', label: '콜라 제로' },
  SPR: { bg: '#ECFDF5', color: '#064E3B', label: '스프라이트' },
  FAM: { bg: '#EFF6FF', color: '#1E40AF', label: '패밀리박스' },
};
const CAT_TAG_STYLE = {
  '피자':    { bg: '#EFF6FF', color: '#1D4ED8' },
  '1인피자': { bg: '#FFF7ED', color: '#C2410C' },
  '사이드':  { bg: '#F0FDF4', color: '#15803D' },
  '음료':    { bg: '#ECFEFF', color: '#0E7490' },
  '세트박스':{ bg: '#FAF5FF', color: '#7E22CE' },
};

function CategoryTags({ menuCode }) {
  if (!menuCode) return null;
  const parts = menuCode.toUpperCase().split('-');
  const sub = parts[1];
  const subStyle = SUB_TAG_STYLE[sub];
  const { category } = parseCategoryFromCode(menuCode);
  const catKey = category?.split('/')[0];
  const catStyle = CAT_TAG_STYLE[catKey] || { bg: 'var(--surface-2)', color: 'var(--text-3)' };
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: catStyle.bg, color: catStyle.color }}>
        {catKey || '—'}
      </span>
      {subStyle && (
        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 999, background: subStyle.bg, color: subStyle.color }}>
          {subStyle.label}
        </span>
      )}
    </div>
  );
}

/* ── 메뉴 추가/수정 모달 (마스터가 메뉴코드·분류·규격·판매가의 기준) ── */
function EditModal({ row, isNew, onSave, onClose }) {
  const [form, setForm] = useState({
    menuCode:          row?.menuCode || '',
    menuName:          row?.menuName || '',
    category:          row?.category || (CATEGORIES[0]),
    size:              row?.size || '',
    price:             row?.price != null ? String(row.price) : '',
    status:            row?.status || 'active',
    note:              row?.note || '',
    excludeFromOrigin: row?.excludeFromOrigin === true,
  });
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }
  const defaultPrice = getDefaultPrice(form.menuCode);
  const canSave = form.menuCode.trim() && form.menuName.trim();

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'grid', placeItems: 'center', zIndex: 300 }}>
      <div className="card" style={{ width: 'min(440px,95vw)', padding: '24px 28px', maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{isNew ? '메뉴 추가' : '메뉴 수정'}</div>
          <button className="btn ghost" style={{ padding: '4px 8px' }} onClick={onClose}>
            <Icon.close style={{ width: 16, height: 16 }} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* 메뉴코드 — 신규는 입력, 기존은 읽기전용 */}
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>메뉴코드</label>
            {isNew ? (
              <>
                <input className="input" value={form.menuCode}
                  onChange={e => set('menuCode', e.target.value.toUpperCase())}
                  placeholder="예) P-OR-005-L" style={{ fontFamily: 'monospace' }} />
                <div style={{ marginTop: 6 }}><CategoryTags menuCode={form.menuCode} /></div>
              </>
            ) : (
              <div style={{ padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-text)' }}>{row.menuCode}</span>
                <CategoryTags menuCode={row.menuCode} />
              </div>
            )}
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>메뉴명</label>
            <input className="input" value={form.menuName} onChange={e => set('menuName', e.target.value)} placeholder="예) 슈퍼콤비네이션" />
          </div>

          {/* 분류 + 규격 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>카테고리</label>
              <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>규격(사이즈)</label>
              <input className="input" value={form.size} onChange={e => set('size', e.target.value)} placeholder="L / R / 단일" />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>
              판매가 (부가세 포함)
              {defaultPrice && <span style={{ marginLeft: 8, color: 'var(--text-4)' }}>기본가 {defaultPrice.toLocaleString()}원</span>}
            </label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input className="input" type="number" value={form.price}
                onChange={e => set('price', e.target.value)}
                placeholder={defaultPrice ? String(defaultPrice) : '직접 입력'} style={{ flex: 1 }} />
              <span style={{ fontSize: 13, color: 'var(--text-3)' }}>원</span>
              {defaultPrice && !form.price && (
                <button className="btn sm" onClick={() => set('price', String(defaultPrice))}>기본가 적용</button>
              )}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>상태</label>
            <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="active">활성</option>
              <option value="discontinued">단종</option>
              <option value="test">테스트</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>비고</label>
            <input className="input" value={form.note} onChange={e => set('note', e.target.value)} placeholder="선택 입력" />
          </div>

          <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 12 }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={form.excludeFromOrigin}
                onChange={e => set('excludeFromOrigin', e.target.checked)}
                style={{ accentColor: 'var(--warn)', width: 15, height: 15 }} />
              <span style={{ fontWeight: 600 }}>원산지·알레르기 출력에서 제외</span>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>(패밀리박스·하프앤하프 등 공통 구성품이 겹치는 메뉴)</span>
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn" onClick={onClose}>취소</button>
          <button className="btn primary" disabled={!canSave}
            onClick={() => onSave({
              ...(row || {}),
              menuCode:          form.menuCode.trim(),
              menuName:          form.menuName.trim(),
              category:          form.category,
              size:              form.size.trim() || null,
              price:             form.price !== '' ? Number(form.price) : null,
              status:            form.status,
              note:              form.note,
              excludeFromOrigin: form.excludeFromOrigin,
            })}>
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── 메인 페이지 ── */
export default function Page() {
  const [rows,       setRows]      = useState([]);
  const [loading,    setLoading]   = useState(true);
  const [seeding,    setSeeding]   = useState(false);
  const [resetting,  setResetting] = useState(false);
  const [bulking,    setBulking]   = useState(false);
  const [catFilter,  setCatFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const [subFilter,  setSubFilter] = useState('all');
  const [search,     setSearch]    = useState('');
  const [editRow,    setEditRow]   = useState(null);
  const [addOpen,    setAddOpen]   = useState(false);
  const [bulkModal,  setBulkModal] = useState(false);
  const [confirmReset,  setConfirmReset]  = useState(false);
  const [confirmBulkPizza, setConfirmBulkPizza] = useState(false);

  const load = useCallback(async () => {
    await initDB();
    // 기존 데이터의 1인피자 P-ONE-###-ONE 코드 정규화 (idempotent — 변경 없으면 no-op)
    await normalizePersonalPizzaCodes().catch(e => console.warn('[menu-master] 코드 정규화 실패', e));
    setRows(await getAllMenuMaster());
  }, []);

  useEffect(() => { load().catch(console.error).finally(() => setLoading(false)); }, [load]);
  useVisibilityRefresh(load);

  // 마스터 변경 후 소비처 미러(cost_selling_prices) 자동 동기화
  async function syncMirror() {
    try { await pushMasterToPrices(); } catch (err) { console.warn('판매가 미러 동기화 실패:', err); }
  }

  async function handleResetAndSeed() {
    setResetting(true);
    try {
      await resetAllMenuMaster();
      await resetAllMenuPrices();   // 미러도 함께 비움
      setRows([]);
      showToast('초기화 완료', 'ok');
    } catch (err) { showToast('실패: ' + err.message, 'err'); }
    finally { setResetting(false); }
  }

  async function handleSeed() {
    setSeeding(true);
    try {
      const { inserted } = await seedMenuMaster();
      await syncMirror();
      setRows(await getAllMenuMaster());
      showToast(`${inserted}개 등록 완료`, 'ok');
    } catch (err) { showToast('등록 실패: ' + err.message, 'err'); }
    finally { setSeeding(false); }
  }

  // 피자 기본가를 마스터의 피자 항목에 일괄 적용 (가격 없는 항목만)
  async function handleBulkPizza() {
    setBulking(true);
    try {
      const masters = await getAllMenuMaster();
      let applied = 0;
      for (const m of masters) {
        if (m.status === 'discontinued' || !m.menuCode) continue;
        const dp = getDefaultPrice(m.menuCode);
        if (dp && (m.price == null || m.price === '')) {
          await upsertMenuMaster({ ...m, price: dp });
          applied++;
        }
      }
      await syncMirror();
      setRows(await getAllMenuMaster());
      showToast(`${applied}개 피자 기본가 적용`, 'ok');
    } catch (err) { showToast('일괄 적용 실패: ' + err.message, 'err'); }
    finally { setBulking(false); }
  }

  function handleExportCsv() {
    const headers = ['메뉴코드', '메뉴명', '판매가', '상태', '카테고리'];
    const rows = filtered.map(r => [
      r.menuCode || '', r.menuName || '',
      r.price != null ? String(r.price) : '',
      r.status || '', r.category || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => '"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');
    const blob = new Blob(['﻿'+csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = '메뉴마스터.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`CSV ${filtered.length}개 내보내기 완료`, 'ok');
  }

  async function handleSaveRow(data) {
    try {
      await upsertMenuMaster(data);
      await syncMirror();
      setRows(await getAllMenuMaster());
      setEditRow(null);
      setAddOpen(false);
      showToast('저장 완료', 'ok');
    } catch (err) { showToast('저장 실패: ' + err.message, 'err'); }
  }

  const active       = rows.filter(r => r.status === 'active');
  const discontinued = rows.filter(r => r.status === 'discontinued');
  const test         = rows.filter(r => r.status === 'test');

  const statusFiltered = useMemo(() =>
    statusFilter === 'all' ? rows : rows.filter(r => r.status === statusFilter),
  [rows, statusFilter]);

  const catCounts = useMemo(() => {
    const m = { all: statusFiltered.length };
    CATEGORIES.forEach(c => { m[c] = statusFiltered.filter(r => (r.category || '').startsWith(c)).length; });
    return m;
  }, [statusFiltered]);

  const filtered = useMemo(() => {
    let list = statusFilter === 'all' ? rows : rows.filter(r => r.status === statusFilter);
    if (catFilter !== 'all') list = list.filter(r => (r.category || '').startsWith(catFilter));
    if (catFilter === '피자' && subFilter !== 'all') list = list.filter(r => r.subCategory === subFilter);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(r =>
      (r.menuCode || '').toLowerCase().includes(q) ||
      (r.menuName || '').toLowerCase().includes(q) ||
      (r.subCategory || '').toLowerCase().includes(q)
    );
    return list;
  }, [rows, catFilter, subFilter, statusFilter, search]);

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['상품 관리', '메뉴 마스터']}
        title="메뉴 마스터"
        sub={loading ? '로딩 중…' : `총 ${rows.length}개 · 원가·영양·원산지·알레르기 전 모듈의 기준 데이터`}
        actions={
          <>
            <button className="btn" onClick={handleExportCsv} disabled={rows.length === 0} style={{ color: 'var(--text-2)' }}>
              <Icon.download style={{ width: 14, height: 14 }} /> CSV 내보내기
            </button>
            <button className="btn" onClick={() => setBulkModal(true)} disabled={rows.length === 0}>
              <Icon.calc style={{ width: 14, height: 14 }} /> 코드별 일괄 가격
            </button>
            <button className="btn" onClick={() => setConfirmBulkPizza(true)} disabled={bulking || rows.length === 0}>
              <Icon.pizza style={{ width: 14, height: 14 }} /> {bulking ? '적용 중…' : '피자 기본가 일괄'}
            </button>
            <button className="btn" onClick={handleSeed} disabled={seeding}>
              <Icon.download style={{ width: 14, height: 14 }} />
              {seeding ? '등록 중…' : '기본 코드 등록'}
            </button>
            <button className="btn" onClick={() => setConfirmReset(true)} disabled={resetting} style={{ color: 'var(--negative)' }}>
              <Icon.trash style={{ width: 14, height: 14 }} />
              {resetting ? '처리 중…' : '초기화'}
            </button>
            <button className="btn primary" onClick={() => setAddOpen(true)}>
              <Icon.plus style={{ width: 14, height: 14 }} /> 메뉴 추가
            </button>
          </>
        }
      />

      {/* 통계 */}
      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-label">전체 메뉴</div>
          <div className="stat-value">{rows.length}<span className="unit">개</span></div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>
            {CATEGORIES.map(c => `${c} ${rows.filter(r => (r.category||'').startsWith(c)).length}`).join(' · ')}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">활성</div>
          <div className="stat-value" style={{ color: 'var(--positive)' }}>{active.length}<span className="unit">개</span></div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>가격 입력 {active.filter(r => r.price).length}개</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">단종</div>
          <div className="stat-value" style={{ color: 'var(--text-3)' }}>{discontinued.length}<span className="unit">개</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">테스트</div>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{test.length}<span className="unit">개</span></div>
        </div>
      </div>

      {/* 일괄 업로드 — 업로드 시 마스터로 자동 반영 */}
      <MenuPriceUploadCard onReplaced={load} />

      {loading && (
        <div className="card table-card">
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 145 }}>메뉴코드</th>
                  <th>메뉴명</th>
                  <th style={{ width: 200 }}>분류 태그</th>
                  <th style={{ width: 60 }}>사이즈</th>
                  <th style={{ width: 100 }}>판매가</th>
                  <th style={{ width: 80 }}>상태</th>
                  <th style={{ width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td><Skeleton width={100} height={13} /></td>
                    <td><Skeleton width="80%" height={13} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Skeleton width={44} height={20} radius={999} />
                        <Skeleton width={72} height={20} radius={999} />
                      </div>
                    </td>
                    <td><Skeleton width={32} height={13} /></td>
                    <td><Skeleton width={60} height={13} style={{ marginLeft: 'auto' }} /></td>
                    <td><Skeleton width={44} height={20} radius={6} /></td>
                    <td><Skeleton width={28} height={28} radius={6} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className="empty-state" style={{ padding: '60px 20px' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', color: 'var(--text-4)', border: '1px solid var(--border)' }}>
            <Icon.box style={{ width: 28, height: 28 }} />
          </div>
          <div className="empty-title">메뉴 마스터 데이터가 없습니다</div>
          <div className="empty-sub">기본 코드 등록 버튼으로 전체 코드 체계를 불러오세요.</div>
          <button className="btn primary" onClick={handleSeed} disabled={seeding} style={{ marginTop: 4 }}>
            <Icon.plus style={{ width: 14, height: 14 }} />
            {seeding ? '등록 중…' : '기본 코드 등록'}
          </button>
        </div>
      )}

      {rows.length > 0 && (
        <div className="content-enter">
          {/* 필터 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)', marginRight: 4, fontWeight: 600 }}>상태</span>
              {[
                { id: 'all',          label: `전체 ${rows.length}` },
                { id: 'active',       label: `활성 ${active.length}` },
                { id: 'discontinued', label: `단종 ${discontinued.length}` },
                { id: 'test',         label: `테스트 ${test.length}` },
              ].map(t => (
                <button key={t.id} className={'chip' + (statusFilter === t.id ? ' active' : '')}
                  onClick={() => { setStatusFilter(t.id); setCatFilter('all'); }}>
                  {t.label}
                </button>
              ))}
              <div className="filter-search" style={{ width: 220, marginLeft: 'auto' }}>
                <Icon.search style={{ width: 14, height: 14, color: 'var(--text-3)', flexShrink: 0 }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="코드·메뉴명 검색" />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)', marginRight: 4, fontWeight: 600 }}>분류</span>
              <button className={'chip' + (catFilter === 'all' ? ' active' : '')}
                onClick={() => { setCatFilter('all'); setSubFilter('all'); }}>
                전체 {catCounts.all}
              </button>
              {CATEGORIES.map(c => catCounts[c] > 0 && (
                <button key={c} className={'chip' + (catFilter === c ? ' active' : '')}
                  onClick={() => { setCatFilter(c); setSubFilter('all'); }}>
                  {c} {catCounts[c]}
                </button>
              ))}
            </div>

            {catFilter === '피자' && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-3)', marginRight: 4, fontWeight: 600 }}>중분류</span>
                <button className={'chip' + (subFilter === 'all' ? ' active' : '')} onClick={() => setSubFilter('all')}>전체</button>
                {PIZZA_SUBS.map(s => (
                  <button key={s} className={'chip' + (subFilter === s ? ' active' : '')} onClick={() => setSubFilter(s)}>{s}</button>
                ))}
              </div>
            )}
          </div>

          {/* 테이블 */}
          <div className="card table-card">
            {filtered.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>조건에 맞는 항목이 없습니다</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table stagger-rows">
                  <thead>
                    <tr>
                      <th style={{ width: 145 }}>메뉴코드</th>
                      <th>메뉴명</th>
                      <th style={{ width: 200 }}>분류 태그</th>
                      <th style={{ width: 60 }}>사이즈</th>
                      <th style={{ width: 100, textAlign: 'right' }}>판매가</th>
                      <th style={{ width: 80 }}>상태</th>
                      <th style={{ width: 60 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(row => (
                      <tr key={row.id} style={{ opacity: row.status === 'discontinued' ? .5 : 1 }}>
                        <td style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: 'var(--accent-text)', letterSpacing: '.5px' }}>
                          {row.menuCode}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {row.menuName}
                          {row.excludeFromOrigin && (
                            <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: 'var(--warn-soft)', color: 'var(--warn)' }}>원산지제외</span>
                          )}
                        </td>
                        <td><CategoryTags menuCode={row.menuCode} /></td>
                        <td style={{ fontSize: 12, color: 'var(--text-2)' }}>
                          {row.size || <span style={{ color: 'var(--text-4)' }}>단일</span>}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 13 }}>
                          {row.price != null
                            ? <span>{row.price.toLocaleString()}<span style={{ fontSize: 11, color: 'var(--text-4)', marginLeft: 2 }}>원</span></span>
                            : <span style={{ color: 'var(--text-4)', fontWeight: 400 }}>—</span>}
                        </td>
                        <td>
                          <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, ...STATUS_STYLE[row.status] }}>
                            {STATUS_LABEL[row.status] || row.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn sm ghost" onClick={() => setEditRow(row)}>
                            <Icon.edit style={{ width: 13, height: 13 }} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ padding: '8px 16px', fontSize: 11, color: 'var(--text-3)', borderTop: '1px solid var(--divider)' }}>
              {filtered.length}개 표시 / 전체 {rows.length}개
            </div>
          </div>
        </div>
      )}

      {editRow && (
        <EditModal row={editRow} isNew={false} onSave={handleSaveRow} onClose={() => setEditRow(null)} />
      )}

      {addOpen && (
        <EditModal row={null} isNew onSave={handleSaveRow} onClose={() => setAddOpen(false)} />
      )}

      {bulkModal && (
        <BulkPriceModal onClose={() => setBulkModal(false)} onDone={load} />
      )}

      {confirmReset && (
        <ConfirmDialog
          open
          message="메뉴 마스터 전체를 삭제합니다. 계속할까요?"
          danger
          onConfirm={() => { setConfirmReset(false); handleResetAndSeed(); }}
          onCancel={() => setConfirmReset(false)}
        />
      )}

      {confirmBulkPizza && (
        <ConfirmDialog
          open
          message={`피자 항목 중 판매가가 비어 있는 메뉴에 기본가를 일괄 적용합니다. 계속할까요?`}
          onConfirm={() => { setConfirmBulkPizza(false); handleBulkPizza(); }}
          onCancel={() => setConfirmBulkPizza(false)}
        />
      )}
    </main>
  );
}
