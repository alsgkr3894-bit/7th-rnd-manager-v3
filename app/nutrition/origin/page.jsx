'use client';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { getAllIngredients } from '@/lib/ingredient';
import { getAllOrigins, upsertOrigin, deleteOrigin } from '@/lib/nutrition/origin/store';
import { getAllMenuMaster } from '@/lib/menu-master';
import MenuCodePicker from '@/components/ui/MenuCodePicker';
import { exportOriginToExcel } from '@/lib/nutrition/origin/export';
import { importOriginFromTemplate, importOriginFromFile } from '@/lib/nutrition/origin/import';

const QUICK_ITEMS = ['쇠고기', '돼지고기', '닭고기', '오리고기', '쌀', '배추', '콩', '고등어', '오징어', '낙지', '명태', '참치'];

const emptyItem = () => ({ displayName: '', originCountry: '', originRegion: '' });

/** 기존 flat 레코드 → items 배열로 변환 */
function toItems(origin) {
  if (origin?.items?.length) return origin.items.map(i => ({ ...emptyItem(), ...i }));
  return [{ displayName: origin?.displayName ?? '', originCountry: origin?.originCountry ?? '', originRegion: origin?.originRegion ?? '' }];
}

/* ── 품목 행 컴포넌트 ── */
function ItemRow({ item, idx, total, onChange, onRemove }) {
  return (
    <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '12px 14px', marginBottom: 8, position: 'relative' }}>
      {/* 번호 + 제거 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          품목 {idx + 1}
        </span>
        {total > 1 && (
          <button type="button" onClick={onRemove}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', padding: '2px 4px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
            제거
          </button>
        )}
      </div>

      {/* 표시품목 빠른선택 */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
        {QUICK_ITEMS.map(q => (
          <button key={q} type="button"
            onClick={() => onChange('displayName', q)}
            style={{
              padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              border: '1px solid',
              borderColor: item.displayName === q ? 'var(--accent)' : 'var(--border)',
              background: item.displayName === q ? 'var(--accent-soft)' : 'var(--surface)',
              color: item.displayName === q ? 'var(--accent-text)' : 'var(--text-2)',
            }}>
            {q}
          </button>
        ))}
      </div>

      {/* 표시품목 직접 입력 */}
      <div style={{ marginBottom: 8 }}>
        <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 3 }}>표시품목 *</label>
        <input className="input" style={{ fontSize: 13 }}
          value={item.displayName}
          onChange={e => onChange('displayName', e.target.value)}
          placeholder="예: 닭고기" />
      </div>

      {/* 원산지 국가 + 세부 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 3 }}>원산지 *</label>
          <input className="input" style={{ fontSize: 13 }}
            value={item.originCountry}
            onChange={e => onChange('originCountry', e.target.value)}
            placeholder="예: 국내산" />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 3 }}>세부 (선택)</label>
          <input className="input" style={{ fontSize: 13 }}
            value={item.originRegion}
            onChange={e => onChange('originRegion', e.target.value)}
            placeholder="예: 경기도" />
        </div>
      </div>
    </div>
  );
}

/* ── 원산지 등록/수정 모달 ── */
function OriginModal({ origin, ingredients, linkedIds, menuMasters, onSave, onClose }) {
  const isEdit = !!origin;

  const [selId, setSelId]       = useState(origin?.ingredientId ?? null);
  const [menuCode, setMenuCode] = useState(origin?.menuCode ?? '');
  const [items, setItems]       = useState(() => toItems(origin));
  const [note, setNote]         = useState(origin?.note ?? '');
  const [search, setSearch]     = useState('');
  const [saving, setSaving]     = useState(false);
  const menuNameRef = useRef(null);

  const selIng = ingredients.find(i => i.id === selId);

  const filtered = useMemo(() => {
    if (isEdit) return [];
    const q = search.toLowerCase();
    const matched = ingredients.filter(i =>
      !q ||
      (i.ingredientName || '').toLowerCase().includes(q) ||
      (i.productCode || '').toLowerCase().includes(q) ||
      (i.category || '').toLowerCase().includes(q)
    );
    // 미연결 먼저, 연결된 건 뒤로
    const unlinked = matched.filter(i => !linkedIds.has(i.id));
    const linked   = matched.filter(i =>  linkedIds.has(i.id));
    return [...unlinked, ...linked].slice(0, 80);
  }, [ingredients, linkedIds, search, isEdit]);

  const handleSelect = (ing) => {
    setSelId(ing.id);
    setTimeout(() => menuNameRef.current?.focus(), 0);
  };

  const updateItem = (idx, field, value) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  };

  const addItem = () => setItems(prev => [...prev, emptyItem()]);

  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!selId) { showToast('식재료를 선택해주세요', 'error'); return; }
    const validItems = items.filter(it => it.displayName.trim() && it.originCountry.trim());
    if (validItems.length === 0) { showToast('표시품목과 원산지를 하나 이상 입력해주세요', 'error'); return; }
    setSaving(true);
    try {
      await upsertOrigin({
        ...(origin?.id ? { id: origin.id } : {}),
        ingredientId: selId,
        productCode: selIng?.productCode || null,
        ingredientName: selIng?.ingredientName || (isEdit ? origin.ingredientName : ''),
        menuCode: menuCode,
        menuName: menuCode ? (menuMasters.find(m => m.menuCode === menuCode)?.menuName ?? '') : '',
        items: validItems,
        // 검색 편의용 flat 필드 (첫 번째 항목 기준)
        displayName: validItems[0].displayName,
        originCountry: validItems[0].originCountry,
        originRegion: validItems[0].originRegion,
        note: note.trim(),
      });
      showToast(isEdit ? '수정 완료' : '등록 완료', 'ok');
      onSave();
    } catch { showToast('저장 실패', 'error'); }
    setSaving(false);
  };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'grid', placeItems: 'center', zIndex: 300 }}>
      <div className="card" style={{ width: 'min(560px,95vw)', padding: '24px 28px', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{isEdit ? '원산지 수정' : '식재료 원산지 등록'}</div>
          <button className="btn ghost" style={{ padding: '4px 8px' }} onClick={onClose}>
            <Icon.close style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* 식재료 선택 — 추가 모드 */}
        {!isEdit && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>식재료 선택 *</label>
            {selIng ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--accent-soft)', borderRadius: 8, border: '1.5px solid var(--accent)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent-text)' }}>{selIng.ingredientName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-4)' }}>{selIng.productCode || '수동 등록'} · {selIng.category || '미분류'}</div>
                </div>
                <button className="btn sm ghost" onClick={() => setSelId(null)}>변경</button>
              </div>
            ) : (
              <div>
                <div style={{ position: 'relative', marginBottom: 8 }}>
                  <Icon.search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text-3)' }} />
                  <input className="input" style={{ paddingLeft: 32 }}
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="재료명·코드·분류로 검색" autoFocus />
                </div>
                <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
                  {filtered.length === 0
                    ? <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-4)', fontSize: 13 }}>
                        {search ? '검색 결과 없음' : '미연결 식재료가 없습니다'}
                      </div>
                    : filtered.map(ing => {
                        const isLinked = linkedIds.has(ing.id);
                        return (
                          <div key={ing.id}
                            onClick={isLinked ? undefined : () => handleSelect(ing)}
                            style={{
                              padding: '8px 12px', borderRadius: 6, margin: '2px 4px',
                              cursor: isLinked ? 'default' : 'pointer',
                              opacity: isLinked ? 0.45 : 1,
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            }}
                            onMouseEnter={e => { if (!isLinked) e.currentTarget.style.background = 'var(--surface-2)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = ''; }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 500 }}>{ing.ingredientName}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-4)' }}>{ing.productCode || '수동 등록'} · {ing.category || '미분류'}</div>
                            </div>
                            {isLinked && (
                              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', background: 'var(--surface-2)', padding: '2px 6px', borderRadius: 4 }}>
                                연결됨
                              </span>
                            )}
                          </div>
                        );
                      })
                  }
                </div>
              </div>
            )}
          </div>
        )}

        {/* 편집 모드 — 식재료 정보 */}
        {isEdit && (
          <div style={{ padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 8, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{origin.ingredientName}</div>
            <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>{origin.productCode || '수동 등록'}</div>
          </div>
        )}

        {/* 음식명 */}
        <div style={{ marginBottom: 16 }}>
          <label ref={menuNameRef} style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>
            음식명 <span style={{ color: 'var(--text-4)' }}>(원산지가 표시될 메뉴명)</span>
          </label>
          <MenuCodePicker
            menuMasters={menuMasters}
            value={menuCode}
            onChange={setMenuCode}
            placeholder={origin?.menuName || '메뉴를 선택하세요'}
          />
        </div>

        {/* 표시품목 + 원산지 목록 */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 700 }}>
              표시품목 · 원산지
            </label>
            <button type="button" className="btn sm" onClick={addItem}
              style={{ fontSize: 12, padding: '4px 10px' }}>
              <Icon.plus style={{ width: 12, height: 12 }} /> 항목 추가
            </button>
          </div>

          {items.map((item, idx) => (
            <ItemRow
              key={idx}
              item={item}
              idx={idx}
              total={items.length}
              onChange={(field, val) => updateItem(idx, field, val)}
              onRemove={() => removeItem(idx)}
            />
          ))}
        </div>

        {/* 비고 */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>비고</label>
          <input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="참고사항" />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn" onClick={onClose}>취소</button>
          <button className="btn primary" onClick={handleSave} disabled={saving || (!isEdit && !selId)}>
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ── 테이블 행 원산지 표시 ── */
function OriginBadges({ row }) {
  const items = row.items?.length
    ? row.items
    : [{ displayName: row.displayName, originCountry: row.originCountry }];

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {items.filter(it => it.displayName || it.originCountry).map((it, i) => (
        <span key={i} style={{
          display: 'inline-flex', alignItems: 'center', gap: 3,
          background: 'var(--surface-2)', borderRadius: 6,
          padding: '2px 8px', fontSize: 12, fontWeight: 600,
        }}>
          <span style={{ color: 'var(--text-2)' }}>{it.displayName}</span>
          {it.originCountry && <>
            <span style={{ color: 'var(--text-4)' }}>:</span>
            <span style={{ color: 'var(--text-1)' }}>{it.originCountry}</span>
          </>}
        </span>
      ))}
    </div>
  );
}

/* ── 메인 페이지 ── */
export default function Page() {
  const [rows, setRows]               = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [menuMasters, setMenuMasters] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [modal, setModal]             = useState(null);
  const [importing, setImporting]     = useState(false);
  const fileInputRef                  = useRef(null);

  const load = useCallback(async () => {
    await initDB();
    const [origins, ings, masters] = await Promise.all([getAllOrigins(), getAllIngredients(), getAllMenuMaster()]);
    setRows(origins);
    setIngredients(ings.filter(i => !i.discontinued && !i.excluded));
    setMenuMasters(masters);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const linkedIds = useMemo(() => new Set(rows.map(r => r.ingredientId)), [rows]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(r => {
      const itemsText = (r.items || []).map(it => `${it.displayName} ${it.originCountry}`).join(' ');
      return (
        (r.menuName || '').toLowerCase().includes(q) ||
        (r.ingredientName || '').toLowerCase().includes(q) ||
        (r.displayName || '').toLowerCase().includes(q) ||
        (r.originCountry || '').toLowerCase().includes(q) ||
        (r.productCode || '').toLowerCase().includes(q) ||
        itemsText.toLowerCase().includes(q)
      );
    });
  }, [rows, search]);

  const handleImportTemplate = async () => {
    setImporting(true);
    try {
      const { imported, skipped, total } = await importOriginFromTemplate();
      showToast(`${imported}개 임포트 완료 (전체 ${total}개, 건너뜀 ${skipped}개)`, 'ok');
      load();
    } catch (e) { showToast('임포트 실패: ' + e.message, 'err'); }
    finally { setImporting(false); }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImporting(true);
    try {
      const { imported, skipped, total } = await importOriginFromFile(file);
      showToast(`${imported}개 임포트 완료 (전체 ${total}개, 건너뜀 ${skipped}개)`, 'ok');
      load();
    } catch (e) { showToast('임포트 실패: ' + e.message, 'err'); }
    finally { setImporting(false); }
  };

  const handleDelete = async (row) => {
    await deleteOrigin(row.id);
    showToast(`'${row.ingredientName}' 원산지 삭제`, 'ok');
    load();
  };

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['영양성분', '원산지 정보']}
        title="원산지 정보"
        sub="식재료 마스터에서 가져와 원산지를 등록하고, 출력용 표기명을 별도 설정하세요"
        actions={
          <>
            {/* 숨겨진 파일 인풋 */}
            <input ref={fileInputRef} type="file" accept=".xlsx" style={{ display: 'none' }} onChange={handleImportFile} />
            <button className="btn" onClick={handleImportTemplate} disabled={importing}>
              <Icon.download style={{ width: 14, height: 14 }} />
              {importing ? '임포트 중…' : 'B타입 템플릿 가져오기'}
            </button>
            <button className="btn" onClick={() => fileInputRef.current?.click()} disabled={importing}>
              <Icon.upload style={{ width: 14, height: 14 }} />파일로 가져오기
            </button>
            <button className="btn" onClick={() => exportOriginToExcel(rows).catch(e => showToast('출력 실패: ' + e.message, 'err'))} disabled={rows.length === 0}>
              <Icon.download style={{ width: 14, height: 14 }} />엑셀로 출력
            </button>
            <button className="btn primary" onClick={() => setModal('add')}>
              <Icon.plus style={{ width: 14, height: 14 }} />식재료 연결
            </button>
          </>
        }
      />

      {/* 통계 */}
      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <div className="card" style={{ padding: '12px 20px', flex: 1 }}>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>연결된 식재료</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>{rows.length}<span style={{ fontSize: 13, color: 'var(--text-3)', marginLeft: 4 }}>개</span></div>
        </div>
        <div className="card" style={{ padding: '12px 20px', flex: 1 }}>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>전체 식재료 (마스터)</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>{ingredients.length}<span style={{ fontSize: 13, color: 'var(--text-3)', marginLeft: 4 }}>개</span></div>
        </div>
        <div className="card" style={{ padding: '12px 20px', flex: 1 }}>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>미연결</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2, color: ingredients.length - linkedIds.size > 0 ? 'var(--warn)' : 'inherit' }}>
            {Math.max(0, ingredients.length - linkedIds.size)}<span style={{ fontSize: 13, color: 'var(--text-3)', marginLeft: 4 }}>개</span>
          </div>
        </div>
      </div>

      {/* 검색 */}
      <div style={{ marginTop: 16 }}>
        <div style={{ position: 'relative', maxWidth: 320 }}>
          <Icon.search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text-3)' }} />
          <input className="input" style={{ paddingLeft: 32 }} value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="재료명·표기명·원산지·코드 검색" />
        </div>
      </div>

      {/* 테이블 */}
      <div className="card table-card" style={{ marginTop: 12 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-4)' }}>불러오는 중…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon-wrap"><Icon.tag style={{ width: 28, height: 28 }} /></div>
            <div className="empty-title">{rows.length === 0 ? '원산지 정보가 없어요' : '검색 결과 없음'}</div>
            <div className="empty-sub">+ 식재료 연결 버튼으로 식재료 마스터에서 가져와 등록하세요</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>음식명</th>
                  <th>표시품목 · 원산지</th>
                  <th style={{ width: 100 }}>제때 코드</th>
                  <th>재료명 (마스터)</th>
                  <th>비고</th>
                  <th style={{ width: 72 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => (
                  <tr key={row.id} onClick={() => setModal(row)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 600 }}>
                      {row.menuCode ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--accent-text)', background: 'var(--accent-soft)', padding: '1px 6px', borderRadius: 4 }}>{row.menuCode}</span>
                          {row.menuName && <span>{row.menuName}</span>}
                        </span>
                      ) : (
                        row.menuName || <span style={{ color: 'var(--text-4)' }}>—</span>
                      )}
                    </td>
                    <td><OriginBadges row={row} /></td>
                    <td className="mono muted">{row.productCode || '—'}</td>
                    <td style={{ color: 'var(--text-3)', fontSize: 13 }}>{row.ingredientName}</td>
                    <td className="muted">{row.note || '—'}</td>
                    <td>
                      <button className="btn sm ghost" style={{ color: 'var(--danger)' }}
                        onClick={e => { e.stopPropagation(); handleDelete(row); }}>
                        <Icon.trash style={{ width: 13, height: 13 }} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-4)' }}>
        {filtered.length}개 표시 {rows.length !== filtered.length && `(전체 ${rows.length}개)`}
      </div>

      {modal && (
        <OriginModal
          origin={modal === 'add' ? null : modal}
          ingredients={ingredients}
          linkedIds={linkedIds}
          menuMasters={menuMasters}
          onSave={() => { setModal(null); load(); }}
          onClose={() => setModal(null)}
        />
      )}
    </main>
  );
}
