'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { getAllSamples, deleteSample, SAMPLE_CATEGORIES, RATING_LABELS, RATING_COLOR } from '@/lib/sample';

/* ── 별점 표시 ── */
function Stars({ value, size = 14 }) {
  return (
    <span style={{ color:'#F5A623', fontSize:size, letterSpacing:1 }}>
      {'★'.repeat(value)}
      <span style={{ color:'var(--border)' }}>{'★'.repeat(5 - value)}</span>
    </span>
  );
}

/* ── 상세 모달 ── */
function DetailModal({ sample, onClose, onEdit, onDelete }) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const photos = sample.photos || [];

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const tags = sample.tags ? sample.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

  return (
    <div
      style={{
        position:'fixed', inset:0, zIndex:300,
        background:'rgba(0,0,0,0.62)', display:'flex', alignItems:'center', justifyContent:'center',
        padding:16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background:'var(--surface)', borderRadius:20, overflow:'hidden',
          width:'100%', maxWidth:880, maxHeight:'92vh', display:'flex', flexDirection:'column',
          boxShadow:'0 24px 64px rgba(0,0,0,0.28)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div style={{
          display:'flex', justifyContent:'space-between', alignItems:'flex-start',
          padding:'16px 20px 12px', borderBottom:'1px solid var(--border)',
          flexShrink:0,
        }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:4 }}>
              <span style={{
                background:'var(--accent-soft)', color:'var(--accent-text)',
                fontSize:11, padding:'2px 8px', borderRadius:6, fontWeight:700,
              }}>{sample.category}</span>
              {sample.batchNo && (
                <span style={{
                  background:'var(--surface-2)', color:'var(--text-3)',
                  fontSize:11, padding:'2px 8px', borderRadius:6,
                }}>{sample.batchNo}</span>
              )}
              {sample.rating > 0 && <Stars value={sample.rating}/>}
            </div>
            <div style={{ fontSize:18, fontWeight:800, color:'var(--text-1)' }}>{sample.title}</div>
            <div style={{ fontSize:13, color:'var(--text-3)', marginTop:2 }}>
              {sample.menuName}
              {sample.testDate && <span style={{ marginLeft:10 }}>{sample.testDate}</span>}
              {sample.tester  && <span style={{ marginLeft:10 }}>담당: {sample.tester}</span>}
            </div>
          </div>
          <div style={{ display:'flex', gap:8, flexShrink:0, marginLeft:16 }}>
            <button className="btn sm" onClick={onEdit}>수정</button>
            <button className="btn sm" style={{ color:'var(--negative)' }} onClick={onDelete}>삭제</button>
            <button
              style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', padding:4 }}
              onClick={onClose}
            >
              <Icon.close style={{ width:18, height:18 }}/>
            </button>
          </div>
        </div>

        {/* 본문 — 스크롤 */}
        <div style={{ overflowY:'auto', flex:1, display:'grid', gridTemplateColumns: photos.length ? '1fr 1fr' : '1fr' }}>

          {/* 사진 뷰어 */}
          {photos.length > 0 && (
            <div style={{ background:'#000', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:320, position:'relative' }}>
              <img
                src={photos[photoIdx]?.data}
                alt=""
                style={{ maxWidth:'100%', maxHeight:480, objectFit:'contain' }}
              />
              {photos.length > 1 && (
                <>
                  <button
                    onClick={() => setPhotoIdx(i => Math.max(0, i - 1))}
                    disabled={photoIdx === 0}
                    style={{
                      position:'absolute', left:8, top:'50%', transform:'translateY(-50%)',
                      background:'rgba(255,255,255,0.15)', border:'none', borderRadius:8,
                      color:'#fff', width:32, height:32, cursor:'pointer', fontSize:18,
                      opacity: photoIdx === 0 ? 0.3 : 1,
                    }}
                  >‹</button>
                  <button
                    onClick={() => setPhotoIdx(i => Math.min(photos.length - 1, i + 1))}
                    disabled={photoIdx === photos.length - 1}
                    style={{
                      position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
                      background:'rgba(255,255,255,0.15)', border:'none', borderRadius:8,
                      color:'#fff', width:32, height:32, cursor:'pointer', fontSize:18,
                      opacity: photoIdx === photos.length - 1 ? 0.3 : 1,
                    }}
                  >›</button>
                  {/* 썸네일 스트립 */}
                  <div style={{ display:'flex', gap:6, padding:'10px 12px', overflowX:'auto', width:'100%', boxSizing:'border-box' }}>
                    {photos.map((p, i) => (
                      <button key={i} onClick={() => setPhotoIdx(i)}
                        style={{
                          width:52, height:40, flexShrink:0, borderRadius:6, overflow:'hidden',
                          border: i === photoIdx ? '2px solid #fff' : '2px solid transparent',
                          padding:0, cursor:'pointer', background:'#222',
                        }}>
                        <img src={p.data} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* 텍스트 내용 */}
          <div style={{ padding:20, display:'flex', flexDirection:'column', gap:14 }}>
            {sample.description && (
              <Section title="테스트 내용 / 조건">{sample.description}</Section>
            )}
            {sample.result && (
              <Section title="평가 / 결과">{sample.result}</Section>
            )}
            {sample.improvements && (
              <Section title="개선사항">{sample.improvements}</Section>
            )}
            {sample.nextAction && (
              <Section title="다음 액션">{sample.nextAction}</Section>
            )}
            {tags.length > 0 && (
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', marginBottom:6 }}>태그</div>
                <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                  {tags.map(t => (
                    <span key={t} style={{
                      background:'var(--surface-2)', color:'var(--text-2)',
                      fontSize:11, padding:'2px 8px', borderRadius:10, border:'1px solid var(--border)',
                    }}>{t}</span>
                  ))}
                </div>
              </div>
            )}
            {!sample.description && !sample.result && !sample.improvements && !sample.nextAction && tags.length === 0 && (
              <div style={{ color:'var(--text-3)', fontSize:13 }}>상세 내용이 없습니다.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <div style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', marginBottom:4 }}>{title}</div>
      <div style={{ fontSize:13, color:'var(--text-1)', lineHeight:1.7, whiteSpace:'pre-wrap' }}>{children}</div>
    </div>
  );
}

/* ── 메인 페이지 ── */
export default function Page() {
  const router = useRouter();
  const [samples,    setSamples]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [catFilter,  setCatFilter]  = useState('all');
  const [detailRec,  setDetailRec]  = useState(null);

  const load = useCallback(async () => {
    await initDB();
    setSamples(await getAllSamples());
  }, []);

  useEffect(() => {
    load().catch(console.error).finally(() => setLoading(false));
  }, [load]);

  const filtered = useMemo(() => {
    let list = samples;
    if (catFilter !== 'all') list = list.filter(s => s.category === catFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        (s.title      || '').toLowerCase().includes(q) ||
        (s.menuName   || '').toLowerCase().includes(q) ||
        (s.description|| '').toLowerCase().includes(q) ||
        (s.tags       || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [samples, catFilter, search]);

  const catCounts = useMemo(() => {
    const m = { all: samples.length };
    for (const s of samples) m[s.category] = (m[s.category] || 0) + 1;
    return m;
  }, [samples]);

  async function handleDelete(rec) {
    if (!confirm(`"${rec.title}" 샘플을 삭제할까요?`)) return;
    try {
      await deleteSample(rec.id);
      showToast('삭제됐어요', 'ok');
      setDetailRec(null);
      load();
    } catch { showToast('삭제 실패', 'error'); }
  }

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['샘플기록']}
        title="샘플기록"
        sub={`총 ${samples.length}개 샘플`}
        actions={
          <button className="btn primary" onClick={() => router.push('/note/sample/write')}>
            <Icon.plus style={{ width:14, height:14 }}/> 새 샘플 작성
          </button>
        }
      />

      {/* 필터 */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:16, marginBottom:4 }}>
        {[{ key:'all', label:'전체' }, ...SAMPLE_CATEGORIES.map(c => ({ key:c, label:c }))].map(({ key, label }) => (
          <button
            key={key}
            className={'chip' + (catFilter === key ? ' active' : '')}
            onClick={() => setCatFilter(key)}
          >
            {label}
            {catCounts[key] > 0 && (
              <span style={{ marginLeft:4, fontSize:10, opacity:0.7 }}>{catCounts[key] || 0}</span>
            )}
          </button>
        ))}
      </div>

      {/* 검색 */}
      <div style={{ marginTop:10, marginBottom:20 }}>
        <div style={{ position:'relative', maxWidth:320 }}>
          <Icon.search style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', width:14, height:14, color:'var(--text-3)' }}/>
          <input
            className="form-input filter-search"
            style={{ paddingLeft:32 }}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="제목, 메뉴명, 내용, 태그 검색"
          />
        </div>
      </div>

      {/* 로딩 */}
      {loading && (
        <div style={{ textAlign:'center', padding:48, color:'var(--text-3)' }}>불러오는 중…</div>
      )}

      {/* 빈 상태 */}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--text-3)' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>📷</div>
          <div style={{ fontSize:15, fontWeight:600, marginBottom:8 }}>
            {search || catFilter !== 'all' ? '검색 결과가 없어요' : '샘플 기록이 없어요'}
          </div>
          {!search && catFilter === 'all' && (
            <button className="btn primary" style={{ marginTop:8 }}
              onClick={() => router.push('/note/sample/write')}>
              첫 샘플 작성하기
            </button>
          )}
        </div>
      )}

      {/* 갤러리 그리드 */}
      {!loading && filtered.length > 0 && (
        <div style={{
          display:'grid',
          gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))',
          gap:16,
        }}>
          {filtered.map(rec => {
            const thumb = rec.photos?.[0]?.data;
            const tags = rec.tags ? rec.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
            return (
              <div
                key={rec.id}
                className="card card-lift"
                style={{ padding:0, cursor:'pointer', overflow:'hidden' }}
                onClick={() => setDetailRec(rec)}
              >
                {/* 썸네일 */}
                <div style={{
                  height:180, background:'var(--surface-2)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  position:'relative', overflow:'hidden',
                }}>
                  {thumb ? (
                    <img src={thumb} alt=""
                      style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                  ) : (
                    <div style={{ fontSize:40, opacity:0.3 }}>📷</div>
                  )}
                  {/* 사진 수 배지 */}
                  {(rec.photos?.length || 0) > 1 && (
                    <span style={{
                      position:'absolute', top:8, right:8,
                      background:'rgba(0,0,0,0.55)', color:'#fff',
                      fontSize:10, padding:'2px 7px', borderRadius:10, fontWeight:700,
                    }}>
                      📷 {rec.photos.length}
                    </span>
                  )}
                  {/* 카테고리 배지 */}
                  <span style={{
                    position:'absolute', bottom:8, left:8,
                    background:'rgba(0,0,0,0.5)', color:'#fff',
                    fontSize:10, padding:'2px 8px', borderRadius:6, fontWeight:700,
                  }}>{rec.category}</span>
                </div>

                {/* 카드 내용 */}
                <div style={{ padding:'12px 14px 14px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
                    <div style={{
                      fontSize:14, fontWeight:700, color:'var(--text-1)',
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1,
                    }}>{rec.title}</div>
                    {rec.rating > 0 && (
                      <Stars value={rec.rating} size={12}/>
                    )}
                  </div>

                  <div style={{ fontSize:12, color:'var(--text-3)', marginBottom:8, display:'flex', gap:6, alignItems:'center' }}>
                    <span style={{ fontWeight:600, color:'var(--text-2)' }}>{rec.menuName}</span>
                    {rec.testDate && <span>· {rec.testDate}</span>}
                    {rec.batchNo  && <span>· {rec.batchNo}</span>}
                  </div>

                  {rec.description && (
                    <div style={{
                      fontSize:12, color:'var(--text-3)', lineHeight:1.6,
                      display:'-webkit-box', WebkitLineClamp:2,
                      WebkitBoxOrient:'vertical', overflow:'hidden', marginBottom:8,
                    }}>{rec.description}</div>
                  )}

                  {tags.length > 0 && (
                    <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:8 }}>
                      {tags.slice(0, 4).map(t => (
                        <span key={t} style={{
                          background:'var(--surface-2)', color:'var(--text-3)',
                          fontSize:10, padding:'1px 6px', borderRadius:8,
                        }}>#{t}</span>
                      ))}
                    </div>
                  )}

                  {/* 액션 버튼 */}
                  <div style={{ display:'flex', gap:6, marginTop:4 }} onClick={e => e.stopPropagation()}>
                    <button className="btn sm" style={{ flex:1 }}
                      onClick={() => router.push(`/note/sample/${rec.id}`)}>
                      수정
                    </button>
                    <button className="btn sm" style={{ color:'var(--negative)' }}
                      onClick={() => handleDelete(rec)}>
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 상세 모달 */}
      {detailRec && (
        <DetailModal
          sample={detailRec}
          onClose={() => setDetailRec(null)}
          onEdit={() => { setDetailRec(null); router.push(`/note/sample/${detailRec.id}`); }}
          onDelete={() => handleDelete(detailRec)}
        />
      )}
    </main>
  );
}
