'use client';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { getAllIngredients } from '@/lib/ingredient';
import { getAllOrigins, deleteOrigin, clearAllOrigins } from '@/lib/nutrition/origin/store';
import { getAllMenuMaster } from '@/lib/menu-master';
import { exportOriginToExcel } from '@/lib/nutrition/origin/export';
import { importOriginFromTemplate, importOriginFromFile } from '@/lib/nutrition/origin/import';
import { OriginModal } from '@/components/nutrition/origin/OriginModal';
import { SmallStatCard } from '@/components/ui/SmallStatCard';
import { SearchBox } from '@/components/ui/SearchBox';

function getMenuCodesArray(row) {
  if (row.menuCodes?.length) return row.menuCodes;
  if (row.menuCode) return [{ menuCode: row.menuCode, menuName: row.menuName }];
  return [];
}

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

export default function Page() {
  const [rows,        setRows]        = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [menuMasters, setMenuMasters] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [modal,       setModal]       = useState(null);
  const [importing,   setImporting]   = useState(false);
  const fileInputRef                  = useRef(null);

  const load = useCallback(async () => {
    await initDB();
    const [origins, ings, masters] = await Promise.all([getAllOrigins(), getAllIngredients(), getAllMenuMaster()]);
    setRows(origins);
    setIngredients(ings.filter(i => !i.discontinued && !i.excluded));
    setMenuMasters(masters);
  }, []);

  useEffect(() => { load().catch(console.error).finally(() => setLoading(false)); }, [load]);
  useVisibilityRefresh(load);

  const linkedIds = useMemo(() => new Set(rows.map(r => r.ingredientId)), [rows]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(r => {
      const itemsText    = (r.items || []).map(it => `${it.displayName} ${it.originCountry}`).join(' ');
      const menuCodesText = (r.menuCodes || []).map(m => `${m.menuCode} ${m.menuName}`).join(' ');
      return (
        menuCodesText.toLowerCase().includes(q) ||
        (r.menuName      || '').toLowerCase().includes(q) ||
        (r.ingredientName|| '').toLowerCase().includes(q) ||
        (r.displayName   || '').toLowerCase().includes(q) ||
        (r.originCountry || '').toLowerCase().includes(q) ||
        (r.productCode   || '').toLowerCase().includes(q) ||
        itemsText.toLowerCase().includes(q)
      );
    });
  }, [rows, search]);

  const handleImportTemplate = async () => {
    setImporting(true);
    try {
      const { imported, skipped, total } = await importOriginFromTemplate();
      showToast(`${imported}개 임포트 완료 (전체 ${total}개, 건너뜀 ${skipped}개)`, 'ok');
      await load();
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
      await load();
    } catch (e) { showToast('임포트 실패: ' + e.message, 'err'); }
    finally { setImporting(false); }
  };

  const handleDelete = async (row) => {
    try { await deleteOrigin(row.id); }
    catch (e) { showToast('삭제 실패: ' + e.message, 'err'); return; }
    showToast(`'${row.ingredientName}' 원산지 삭제`, 'ok');
    await load();
  };

  const handleClearAll = async () => {
    if (!confirm(`원산지 정보 전체(${rows.length}개)를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
    try {
      await clearAllOrigins();
      showToast('원산지 정보 전체 삭제 완료', 'ok');
      await load();
    } catch (e) { showToast('삭제 실패: ' + e.message, 'err'); }
  };

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['영양성분', '원산지 정보']}
        title="원산지 정보"
        sub="식재료 마스터에서 가져와 원산지를 등록하고, 출력용 표기명을 별도 설정하세요"
        actions={
          <>
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
            <button className="btn" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
              onClick={handleClearAll} disabled={rows.length === 0}>
              <Icon.trash style={{ width: 14, height: 14 }} />전체 초기화
            </button>
            <button className="btn primary" onClick={() => setModal('add')}>
              <Icon.plus style={{ width: 14, height: 14 }} />식재료 연결
            </button>
          </>
        }
      />

      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <SmallStatCard label="연결된 식재료"       value={rows.length} />
        <SmallStatCard label="전체 식재료 (마스터)" value={ingredients.length} />
        <SmallStatCard
          label="미연결"
          value={Math.max(0, ingredients.length - linkedIds.size)}
          valueColor={ingredients.length - linkedIds.size > 0 ? 'var(--warn)' : undefined}
        />
      </div>

      <div style={{ marginTop: 16, maxWidth: 320 }}>
        <SearchBox value={search} onChange={setSearch} placeholder="재료명·표기명·원산지·코드 검색" />
      </div>

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
                  <th>메뉴명</th>
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
                      {getMenuCodesArray(row).length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {getMenuCodesArray(row).map(({ menuCode, menuName }) => (
                            <span key={menuCode} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                              <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--accent-text)', background: 'var(--accent-soft)', padding: '1px 6px', borderRadius: 4 }}>{menuCode}</span>
                              {menuName && <span style={{ fontSize: 13 }}>{menuName}</span>}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-4)' }}>—</span>
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
          onSave={async () => { setModal(null); await load(); }}
          onClose={() => setModal(null)}
        />
      )}
    </main>
  );
}
