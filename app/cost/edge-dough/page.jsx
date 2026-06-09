'use client';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchBox } from '@/components/ui/SearchBox';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { formatNumber } from '@/lib/format';
import {
  getAllEdges, upsertEdge, deleteEdge, seedEdges, resetAllEdges,
  edgeTotalCost,
} from '@/lib/cost/edge-dough';
import { EdgeCard } from '@/components/cost/edge-dough/EdgeCard';
import { EdgeEditModal } from '@/components/cost/edge-dough/EdgeEditModal';
import { useIsMainBrand } from '@/hooks/useIsMainBrand';

export default function Page() {
  const isMain = useIsMainBrand(); // 마스터 시드는 7번가 전용
  const [edges,   setEdges]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);
  const [target,  setTarget]  = useState(null);
  const [deletePending, setDeletePending] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [search, setSearch] = useState('');
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    await initDB();
    const nextEdges = await getAllEdges();
    if (mountedRef.current) setEdges(nextEdges);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load()
      .catch(err => {
        if (!mountedRef.current) return;
        console.error(err);
        setDbError(err.message || '데이터 로드 실패');
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });

    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  async function handleSave(data) {
    try {
      await upsertEdge(data);
      showToast('저장 완료', 'ok');
      setTarget(null);
      setEdges(await getAllEdges());
    } catch (err) {
      showToast('저장 실패: ' + err.message, 'err');
      throw err;
    }
  }

  async function handleDelete(id) {
    try {
      await deleteEdge(id);
      setEdges(prev => prev.filter(e => e.id !== id));
      setDeletePending(null);
      showToast('삭제 완료', 'ok');
    } catch (err) {
      showToast('삭제 실패: ' + err.message, 'err');
    }
  }

  async function handleSeed() {
    if (seeding) return;
    setSeeding(true);
    try {
      const result = await seedEdges();
      showToast(`마스터 시드 완료 — 신규 ${result.inserted}개`, 'ok');
      setEdges(await getAllEdges());
    } catch (err) {
      showToast('시드 실패: ' + err.message, 'err');
    } finally { setSeeding(false); }
  }

  async function handleReset() {
    if (resetting) return;
    setResetting(true);
    try {
      const result = await resetAllEdges();
      showToast(`초기화 완료 — ${result.deleted}개 삭제`, 'ok');
      setResetConfirm(false);
      setEdges([]);
    } catch (err) {
      showToast('초기화 실패: ' + err.message, 'err');
    } finally { setResetting(false); }
  }

  const totalSum = edges.reduce((acc, e) => acc + edgeTotalCost(e), 0);
  const filled = edges.filter(e => e.components?.length > 0).length;
  const filteredEdges = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return edges;
    return edges.filter(e =>
      (e.edgeType || '').toLowerCase().includes(q) ||
      (e.edgeCode || '').toLowerCase().includes(q) ||
      (e.size || '').toLowerCase().includes(q) ||
      (e.components || []).some(c =>
        (c.ingredientName || '').toLowerCase().includes(q) ||
        (c.productCode || '').toLowerCase().includes(q)
      )
    );
  }, [edges, search]);

  const sub = loading
    ? '로딩 중…'
    : edges.length === 0
      ? '등록된 엣지·도우가 없습니다 — 마스터 시드로 5종 일괄 등록 또는 직접 추가'
      : `${filled}/${edges.length}개 구성 완료 · 합계 ${formatNumber(totalSum)}원 (피자 세부 원가에서 참조)`;

  if (dbError) return (
    <main className="main">
      <PageHeader breadcrumb={['원가계산', '엣지 & 도우']} title="엣지 & 도우 원가표" sub="로드 실패"/>
      <div className="card" style={{padding:32, textAlign:'center', color:'var(--negative)'}}>데이터베이스 오류: {dbError}</div>
    </main>
  );

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['원가계산', '엣지 & 도우']}
        title="엣지 & 도우 원가표"
        sub={sub}
        actions={
          <>
            {resetConfirm ? (
              <span style={{display:'flex', gap:6, alignItems:'center'}}>
                <span style={{fontSize:12, color:'var(--negative)', fontWeight:600}}>
                  전체({edges.length}개) 삭제할까요?
                </span>
                <button className="btn" style={{background:'var(--negative)', color:'#fff', border:'none'}}
                  onClick={handleReset} disabled={resetting}>
                  {resetting ? '삭제 중…' : '삭제'}
                </button>
                <button className="btn" onClick={() => setResetConfirm(false)}>취소</button>
              </span>
            ) : (
              <button className="btn" onClick={() => setResetConfirm(true)}
                style={{color:'var(--text-3)'}} disabled={edges.length === 0}>
                <Icon.trash style={{width:14, height:14}}/> 초기화
              </button>
            )}
            {isMain && (
              <button className="btn" onClick={handleSeed} disabled={seeding}>
                <Icon.download style={{width:14, height:14}}/>
                {seeding ? '시드 중…' : '마스터 시드 (5)'}
              </button>
            )}
            <button className="btn primary" onClick={() => setTarget('new')}>
              <Icon.plus style={{width:14, height:14}}/> 추가
            </button>
          </>
        }
      />

      {!loading && edges.length === 0 && (
        <div className="card" style={{minHeight:200, display:'grid', placeItems:'center'}}>
          <div style={{textAlign:'center', color:'var(--text-3)'}}>
            <Icon.calc style={{width:32, height:32, marginBottom:12, opacity:.4}}/>
            <div style={{fontWeight:600, marginBottom:4}}>아직 등록된 엣지·도우가 없습니다</div>
            <div style={{fontSize:13}}>
              {isMain
                ? <>상단의 <b>마스터 시드</b>로 5종 (치즈크러스트 L/R · 골드스윗 L/R · 씬도우 L) 일괄 등록 가능</>
                : <><b>추가</b> 버튼으로 엣지·도우를 직접 등록하세요</>}
            </div>
          </div>
        </div>
      )}

      {edges.length > 0 && (
        <>
          <div style={{ marginBottom: 12, maxWidth: 360 }}>
            <SearchBox
              value={search}
              onChange={setSearch}
              placeholder="엣지·도우·구성품 검색"
            />
          </div>
          {filteredEdges.length === 0 ? (
            <div className="card" style={{ minHeight: 120, display: 'grid', placeItems: 'center' }}>
              <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                검색 결과가 없습니다
              </div>
            </div>
          ) : (
            <div style={{display:'flex', flexDirection:'column', gap:8}}>
              {filteredEdges.map(e => (
                <EdgeCard
                  key={e.id}
                  edge={e}
                  onEdit={() => setTarget(e)}
                  onDelete={deletePending === e.id
                    ? null
                    : () => setDeletePending(e.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {deletePending && (
        <div style={{
          position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)',
          background:'var(--surface-1)', border:'1px solid var(--border)', borderRadius:12,
          padding:'12px 18px', boxShadow:'0 4px 16px rgba(0,0,0,.15)',
          display:'flex', gap:10, alignItems:'center', zIndex:50,
        }}>
          <span style={{fontSize:13, fontWeight:600}}>이 엣지를 삭제할까요?</span>
          <button className="btn" style={{background:'var(--negative)', color:'#fff', border:'none'}}
            onClick={() => handleDelete(deletePending)}>삭제</button>
          <button className="btn" onClick={() => setDeletePending(null)}>취소</button>
        </div>
      )}

      {target !== null && (
        <EdgeEditModal
          initial={target === 'new' ? null : target}
          onSave={handleSave}
          onClose={() => setTarget(null)}
        />
      )}
    </main>
  );
}
