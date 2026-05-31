'use client';
import { useEffect, useState, useMemo } from 'react';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { getAllIngredients } from '@/lib/ingredient';
import { useDBLoad } from '@/hooks/useDBLoad';
import {
  getAllAllergenMasters,
  getAllAllergenLinks, deleteAllergenLink,
} from '@/lib/nutrition/allergen/store';
import { getAllMenuMaster } from '@/lib/menu-master';
import { AllergenModal } from '@/components/nutrition/allergen/AllergenModal';
import { SearchBox } from '@/components/ui/SearchBox';

/* ── 메인 페이지 ── */
export default function Page() {
  const [links, setLinks]         = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [allergens, setAllergens] = useState([]);
  const [menuMasters, setMenuMasters] = useState([]);
  const [search, setSearch]       = useState('');
  const [modal, setModal]         = useState(null); // null | 'add' | link

  const { data: loadedData, loading, reload: load } = useDBLoad(async () => {
    const [lks, ings, als, masters] = await Promise.all([
      getAllAllergenLinks(),
      getAllIngredients(),
      getAllAllergenMasters(),
      getAllMenuMaster(),
    ]);
    return { lks, ings, als, masters };
  });

  useVisibilityRefresh(load);

  useEffect(() => {
    if (!loadedData) return;
    const { lks, ings, als, masters } = loadedData;
    setLinks(lks);
    setIngredients(ings.filter(i => !i.discontinued && !i.excluded));
    setAllergens(als);
    setMenuMasters(masters);
  }, [loadedData]);

  const linkedIds = useMemo(() => new Set(links.map(l => l.ingredientId)), [links]);

  const filtered = useMemo(() => {
    if (!search.trim()) return links;
    const q = search.toLowerCase();
    return links.filter(l =>
      (l.ingredientName || '').toLowerCase().includes(q) ||
      (l.displayName || '').toLowerCase().includes(q) ||
      (l.productCode || '').toLowerCase().includes(q)
    );
  }, [links, search]);

  const handleDelete = async (link) => {
    await deleteAllergenLink(link.id);
    showToast(`'${link.ingredientName}' 알레르기 정보 삭제`, 'ok');
    load();
  };

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['영양성분', '알레르기 정보']}
        title="알레르기 정보"
        sub="식재료 마스터에서 가져와 알레르기 항목을 체크하고, 출력용 표기명을 별도 설정하세요"
        actions={
          <button className="btn primary" onClick={() => setModal('add')}>
            <Icon.plus style={{ width: 14, height: 14 }} />식재료 연결
          </button>
        }
      />

      {/* 법정 22종 안내 칩 */}
      <div className="card" style={{ marginTop: 20, padding: '12px 20px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 8 }}>한국 법정 알레르기 22종</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {allergens.map(al => (
            <span key={al.allergenCode} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: 'var(--surface-2)', color: 'var(--text-2)' }}>
              {al.allergenName}
            </span>
          ))}
        </div>
      </div>

      {/* 검색 */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'flex-end' }}>
        <div style={{ maxWidth: 320, flex: '0 0 320px' }}>
          <SearchBox value={search} onChange={setSearch} placeholder="재료명·표기명·코드 검색" />
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 12 }}>
          {links.length}개 연결 / {ingredients.length - linkedIds.size}개 미연결
        </div>
      </div>

      {/* 테이블 */}
      <div className="card table-card" style={{ marginTop: 12 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-4)' }}>불러오는 중…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon-wrap"><Icon.beaker style={{ width: 28, height: 28 }} /></div>
            <div className="empty-title">{links.length === 0 ? '등록된 알레르기 정보가 없어요' : '검색 결과 없음'}</div>
            <div className="empty-sub">+ 식재료 연결 버튼으로 식재료 마스터에서 가져와 등록하세요</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th style={{ width: 100 }}>제때 코드</th>
                  <th style={{ minWidth: 130 }}>재료명 (마스터)</th>
                  <th style={{ minWidth: 110 }}>출력 표기명</th>
                  <th style={{ minWidth: 110 }}>메뉴코드</th>
                  {allergens.map(al => (
                    <th key={al.allergenCode} style={{ width: 46, fontSize: 11, textAlign: 'center', padding: '8px 2px', wordBreak: 'keep-all', lineHeight: 1.3 }}>
                      {al.allergenName}
                    </th>
                  ))}
                  <th style={{ width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(link => {
                  const sameAsIng = !link.displayName || link.displayName === link.ingredientName;
                  return (
                    <tr key={link.id} onClick={() => setModal(link)} style={{ cursor: 'pointer' }}>
                      <td className="mono muted">{link.productCode || '—'}</td>
                      <td style={{ color: 'var(--text-3)', fontSize: 13 }}>{link.ingredientName}</td>
                      <td style={{ fontWeight: 600 }}>
                        {sameAsIng
                          ? <span style={{ color: 'var(--text-3)' }}>{link.ingredientName}</span>
                          : <span style={{ color: 'var(--accent-text)' }}>{link.displayName}</span>
                        }
                      </td>
                      <td>
                        {link.menuCode
                          ? <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--accent-text)', background: 'var(--accent-soft)', padding: '1px 6px', borderRadius: 4 }}>{link.menuCode}</span>
                          : <span style={{ color: 'var(--text-4)' }}>—</span>
                        }
                      </td>
                      {allergens.map(al => {
                        const has = (link.allergenCodes || []).includes(al.allergenCode);
                        return (
                          <td key={al.allergenCode} style={{ textAlign: 'center' }}>
                            {has
                              ? <span style={{ display: 'inline-block', width: 16, height: 16, borderRadius: '50%', background: 'var(--accent)' }} />
                              : <span style={{ color: 'var(--text-4)', fontSize: 11 }}>—</span>
                            }
                          </td>
                        );
                      })}
                      <td>
                        <button className="btn sm ghost" style={{ color: 'var(--danger)' }}
                          onClick={e => { e.stopPropagation(); handleDelete(link); }}>
                          <Icon.trash style={{ width: 13, height: 13 }} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-4)' }}>
        {filtered.length}개 표시 {links.length !== filtered.length && `(전체 ${links.length}개)`}
      </div>

      {modal && (
        <AllergenModal
          link={modal === 'add' ? null : modal}
          ingredients={ingredients}
          linkedIds={linkedIds}
          allergens={allergens}
          menuMasters={menuMasters}
          onSave={() => { setModal(null); load(); }}
          onClose={() => setModal(null)}
        />
      )}
    </main>
  );
}
