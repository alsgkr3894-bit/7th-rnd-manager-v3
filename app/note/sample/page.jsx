'use client';
import { Suspense, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { SampleCardSkeleton } from '@/components/ui/Skeleton';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { getAllSamples, addSample, deleteSample, SAMPLE_CATEGORIES, RATING_LABELS, RATING_COLOR } from '@/lib/sample';

/* ── 별점 표시 ── */
function Stars({ value, size = 14 }) {
  return (
    <span style={{ color:'#F5A623', fontSize:size, letterSpacing:1 }}>
      {'★'.repeat(value)}
      <span style={{ color:'var(--border)' }}>{'★'.repeat(5 - value)}</span>
    </span>
  );
}

/* ── 핀치줌 훅 ── */
function usePinchZoom() {
  const imgRef = useRef(null);
  const scaleRef = useRef(1);
  const lastDistRef = useRef(null);
  const lastTapRef = useRef(0);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;

    function getDistance(touches) {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }

    function onTouchStart(e) {
      if (e.touches.length === 2) {
        lastDistRef.current = getDistance(e.touches);
        e.preventDefault();
      } else if (e.touches.length === 1) {
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          // double-tap: reset
          scaleRef.current = 1;
          setScale(1);
          el.style.transform = 'scale(1)';
          e.preventDefault();
        }
        lastTapRef.current = now;
      }
    }

    function onTouchMove(e) {
      if (e.touches.length === 2 && lastDistRef.current !== null) {
        e.preventDefault();
        const dist = getDistance(e.touches);
        const delta = dist / lastDistRef.current;
        lastDistRef.current = dist;
        const next = Math.min(4, Math.max(1, scaleRef.current * delta));
        scaleRef.current = next;
        setScale(next);
        el.style.transform = `scale(${next})`;
      }
    }

    function onTouchEnd(e) {
      if (e.touches.length < 2) {
        lastDistRef.current = null;
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: false });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  return { imgRef, scale };
}

/* ── 비교 모달 ── */
function CompareModal({ samples, onClose }) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const maxRating = Math.max(...samples.map(s => s.rating || 0));

  const fields = [
    { label: '카테고리', key: 'category' },
    { label: '메뉴명',   key: 'menuName'  },
    { label: '별점',     key: 'rating',   render: (v) => v > 0 ? <Stars value={v}/> : '-' },
    { label: '테스트 내용', key: 'description' },
    { label: '평가 / 결과', key: 'result'      },
    { label: '개선사항',    key: 'improvements'},
  ];

  return (
    <div
      style={{
        position:'fixed', inset:0, zIndex:400,
        background:'rgba(0,0,0,0.65)', display:'flex', alignItems:'center', justifyContent:'center',
        padding:16,
      }}
      onClick={onClose}
    >
      <div
        className="modal-anim"
        style={{
          background:'var(--surface)', borderRadius:20, overflow:'hidden',
          width:'100%', maxWidth:960, maxHeight:'92vh', display:'flex', flexDirection:'column',
          boxShadow:'0 24px 64px rgba(0,0,0,0.28)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div style={{
          display:'flex', justifyContent:'space-between', alignItems:'center',
          padding:'16px 20px', borderBottom:'1px solid var(--border)', flexShrink:0,
        }}>
          <div style={{ fontSize:17, fontWeight:800, color:'var(--text-1)' }}>
            샘플 비교 ({samples.length}개)
          </div>
          <button
            style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', padding:4 }}
            onClick={onClose}
          >
            <Icon.close style={{ width:18, height:18 }}/>
          </button>
        </div>

        {/* 본문 */}
        <div style={{ overflowY:'auto', flex:1, padding:'16px 20px' }}>
          {/* 썸네일 + 제목 헤더 행 */}
          <div style={{ display:'grid', gridTemplateColumns:`repeat(${samples.length}, 1fr)`, gap:12, marginBottom:16 }}>
            {samples.map((s, idx) => (
              <div key={s.id} className="compare-col" style={{ textAlign:'center' }}>
                {s.photos?.[0]?.data ? (
                  <img src={s.photos[0].data} alt=""
                    style={{ width:'100%', maxHeight:140, objectFit:'cover', borderRadius:10, marginBottom:8 }}/>
                ) : (
                  <div style={{
                    width:'100%', height:100, background:'var(--surface-2)',
                    borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:28, marginBottom:8,
                  }}>📷</div>
                )}
                <div style={{ fontWeight:800, fontSize:14, color:'var(--text-1)' }}>
                  <span style={{
                    display:'inline-block', width:22, height:22, borderRadius:'50%',
                    background:'var(--accent)', color:'#fff', fontSize:12, fontWeight:800,
                    lineHeight:'22px', textAlign:'center', marginRight:6,
                  }}>{idx + 1}</span>
                  {s.title}
                </div>
              </div>
            ))}
          </div>

          {/* 필드 비교 */}
          {fields.map(({ label, key, render }) => (
            <div key={key} style={{
              display:'grid', gridTemplateColumns:`160px repeat(${samples.length}, 1fr)`,
              gap:8, marginBottom:8, alignItems:'start',
            }}>
              <div className="compare-field-label" style={{
                fontSize:11, fontWeight:700, color:'var(--text-3)',
                paddingTop:4, paddingRight:8,
              }}>{label}</div>
              {samples.map(s => {
                const val = s[key];
                const isHighlight = key === 'rating' && (val || 0) === maxRating && maxRating > 0;
                return (
                  <div key={s.id}
                    className={'compare-field-val' + (isHighlight ? ' highlight' : '')}
                    style={{
                      fontSize:13, color:'var(--text-1)', lineHeight:1.6,
                      background:'var(--surface-2)', borderRadius:8, padding:'6px 10px',
                      border: isHighlight ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                    }}
                  >
                    {render ? render(val || 0) : (val || <span style={{ color:'var(--text-3)' }}>-</span>)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── 상세 모달 ── */
function DetailModal({ sample, onClose, onEdit, onDelete }) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const photos = sample.photos || [];
  const { imgRef, scale } = usePinchZoom();

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
        padding:16, animation:'fade 150ms ease',
      }}
      onClick={onClose}
    >
      <div
        className="modal-anim"
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
            <div style={{ background:'#000', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:320, position:'relative', overflow:'hidden' }}>
              <img
                ref={imgRef}
                src={photos[photoIdx]?.data}
                alt=""
                style={{
                  maxWidth:'100%', maxHeight:480, objectFit:'contain',
                  touchAction: scale > 1 ? 'none' : 'auto',
                  transformOrigin:'center center',
                  transition: 'transform 0.05s',
                }}
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

const SORT_OPTIONS = [
  { key: 'createdAt', label: '최신순' },
  { key: 'testDate',  label: '날짜순' },
  { key: 'rating',    label: '별점순' },
];

function tryLS(key, fb) { try { return localStorage.getItem(key) ?? fb; } catch { return fb; } }
function setLS(key, v)  { try { localStorage.setItem(key, v); } catch {} }

/* ── 메인 페이지 ── */
export default function Page() {
  return (
    <Suspense fallback={<main className="main"><div style={{padding:48, textAlign:'center', color:'var(--text-3)'}}>로딩 중…</div></main>}>
      <SampleContent/>
    </Suspense>
  );
}

function SampleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [samples,     setSamples]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [catFilter,   setCatFilter]   = useState(() => searchParams.get('cat') || 'all');
  const [ratingMin,   setRatingMin]   = useState(() => Number(searchParams.get('r') || 0));
  const [sortBy,      setSortBy]      = useState(() => tryLS('v3:sample-sort', 'createdAt'));
  const [detailRec,   setDetailRec]   = useState(null);

  // 배치 삭제 모드
  const [batchMode,   setBatchMode]   = useState(false);
  const [selected,    setSelected]    = useState(new Set());

  // 비교 모드
  const [compareMode,  setCompareMode]  = useState(false);
  const [compareSet,   setCompareSet]   = useState(new Set());
  const [showCompare,  setShowCompare]  = useState(false);

  // 뷰 모드
  const [viewMode,    setViewMode]    = useState(() => tryLS('v3:sample-view', 'grid'));
  const [calMonth,    setCalMonth]    = useState(() => new Date());

  const load = useCallback(async () => {
    await initDB();
    setSamples(await getAllSamples());
  }, []);

  useEffect(() => {
    load().catch(console.error).finally(() => setLoading(false));
  }, [load]);

  // URL sync for filters
  useEffect(() => {
    const params = new URLSearchParams();
    if (catFilter !== 'all') params.set('cat', catFilter);
    if (ratingMin > 0) params.set('r', String(ratingMin));
    const qs = params.toString();
    window.history.replaceState(null, '', qs ? `${pathname}?${qs}` : pathname);
  }, [catFilter, ratingMin, pathname]);

  const filtered = useMemo(() => {
    let list = samples;
    if (catFilter !== 'all') list = list.filter(s => s.category === catFilter);
    if (ratingMin > 0) list = list.filter(s => (s.rating || 0) >= ratingMin);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        (s.title      || '').toLowerCase().includes(q) ||
        (s.menuName   || '').toLowerCase().includes(q) ||
        (s.description|| '').toLowerCase().includes(q) ||
        (s.tags       || '').toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'rating')   return (b.rating || 0) - (a.rating || 0);
      if (sortBy === 'testDate') return (b.testDate || '').localeCompare(a.testDate || '');
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [samples, catFilter, ratingMin, search, sortBy]);

  const catCounts = useMemo(() => {
    const m = { all: samples.length };
    for (const s of samples) m[s.category] = (m[s.category] || 0) + 1;
    return m;
  }, [samples]);

  async function handleDelete(rec) {
    setSamples(prev => prev.filter(s => s.id !== rec.id));
    setDetailRec(null);
    let cancelled = false;
    showToast(`"${rec.title}" 삭제됨`, 'ok', 4000, {
      label: '실행취소',
      onClick: () => { cancelled = true; load(); },
    });
    await new Promise(r => setTimeout(r, 3800));
    if (!cancelled) {
      try { await deleteSample(rec.id); }
      catch { load(); showToast('삭제 실패', 'error'); }
    }
  }

  async function handleCopy(rec, e) {
    e?.stopPropagation();
    try {
      await initDB();
      await addSample({ ...rec, title: `${rec.title} (복사)` });
      showToast('샘플을 복사했어요', 'ok');
      load();
    } catch { showToast('복사 실패', 'error'); }
  }

  // 배치 삭제
  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleBatchDelete() {
    if (selected.size === 0) return;
    if (!confirm(`선택한 ${selected.size}개 샘플을 삭제할까요?`)) return;
    const ids = [...selected];
    setSamples(prev => prev.filter(s => !ids.includes(s.id)));
    setBatchMode(false);
    setSelected(new Set());
    try {
      await Promise.all(ids.map(id => deleteSample(id)));
      showToast(`${ids.length}개 샘플 삭제됨`, 'ok');
    } catch {
      showToast('일부 삭제 실패', 'error');
      load();
    }
  }

  // 비교 모드
  function toggleCompare(id) {
    setCompareSet(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 3) {
        next.add(id);
      }
      return next;
    });
  }

  const compareItems = useMemo(() => {
    return [...compareSet].map(id => samples.find(s => s.id === id)).filter(Boolean);
  }, [compareSet, samples]);

  // 캘린더 헬퍼
  function calDays(month) {
    const year = month.getFullYear();
    const mon  = month.getMonth();
    const first = new Date(year, mon, 1);
    const last  = new Date(year, mon + 1, 0);
    const startDow = first.getDay(); // 0=Sun
    const days = [];
    // 이전 달 채우기
    for (let i = 0; i < startDow; i++) {
      const d = new Date(year, mon, -startDow + i + 1);
      days.push({ date: d, cur: false });
    }
    // 현재 달
    for (let d = 1; d <= last.getDate(); d++) {
      days.push({ date: new Date(year, mon, d), cur: true });
    }
    // 다음 달 채우기 (6행 유지)
    const rem = 42 - days.length;
    for (let d = 1; d <= rem; d++) {
      days.push({ date: new Date(year, mon + 1, d), cur: false });
    }
    return days;
  }

  const samplesByDate = useMemo(() => {
    const m = {};
    for (const s of samples) {
      if (s.testDate) {
        if (!m[s.testDate]) m[s.testDate] = [];
        m[s.testDate].push(s);
      }
    }
    return m;
  }, [samples]);

  function toYMD(date) {
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  }

  const today = toYMD(new Date());

  /* ── Actions for PageHeader ── */
  const headerActions = (
    <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
      {!batchMode && !compareMode && (
        <button style={{
          background:'none', border:'none', cursor:'pointer', fontSize:17, padding:'4px 6px',
          borderRadius:8, color:'var(--text-2)',
        }} onClick={() => window.print()} title="인쇄">
          🖨
        </button>
      )}
      {batchMode ? (
        <>
          <button className="btn sm" style={{ color:'var(--negative)', fontWeight:700 }}
            onClick={handleBatchDelete}>
            선택 삭제 ({selected.size})
          </button>
          <button className="btn sm" onClick={() => { setBatchMode(false); setSelected(new Set()); }}>
            취소
          </button>
        </>
      ) : compareMode ? (
        <>
          <button className="btn sm" onClick={() => { setCompareMode(false); setCompareSet(new Set()); }}>
            비교 취소
          </button>
        </>
      ) : (
        <>
          <button className="btn sm" onClick={() => { setBatchMode(true); setSelected(new Set()); }}>
            선택
          </button>
          <button className="btn sm" onClick={() => { setCompareMode(true); setCompareSet(new Set()); }}>
            비교
          </button>
          <button className="btn primary" onClick={() => router.push('/note/sample/write')}>
            <Icon.plus style={{ width:14, height:14 }}/> 새 샘플 작성
          </button>
        </>
      )}
    </div>
  );

  const days = calDays(calMonth);

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['샘플기록']}
        title="샘플기록"
        sub={`총 ${samples.length}개 샘플`}
        actions={headerActions}
      />

      {/* 카테고리 필터 */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:16, marginBottom:8 }}>
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

      {/* 별점 필터 + 정렬 + 뷰 토글 */}
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'center', marginBottom:12 }}>
        <div style={{ display:'flex', gap:6 }}>
          {[{ min:0, label:'전체' }, { min:3, label:'★3이상' }, { min:4, label:'★4이상' }, { min:5, label:'★5' }].map(({ min, label }) => (
            <button
              key={min}
              className={'chip' + (ratingMin === min ? ' active' : '')}
              style={{ fontSize:11 }}
              onClick={() => setRatingMin(min)}
            >{label}</button>
          ))}
        </div>
        <div style={{ width:1, height:20, background:'var(--border)' }}/>
        <div style={{ display:'flex', gap:6 }}>
          {SORT_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              className={'chip' + (sortBy === key ? ' active' : '')}
              style={{ fontSize:11 }}
              onClick={() => { setSortBy(key); setLS('v3:sample-sort', key); }}
            >{label}</button>
          ))}
        </div>
        <div style={{ width:1, height:20, background:'var(--border)' }}/>
        {/* 뷰 토글 */}
        <div style={{ display:'flex', gap:4 }}>
          {[{ v:'grid', label:'갤러리' }, { v:'calendar', label:'캘린더' }].map(({ v, label }) => (
            <button
              key={v}
              className={'chip' + (viewMode === v ? ' active' : '')}
              style={{ fontSize:11 }}
              onClick={() => { setViewMode(v); setLS('v3:sample-view', v); }}
            >{label}</button>
          ))}
        </div>
      </div>

      {/* 검색 */}
      <div style={{ marginBottom:20 }}>
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

      {/* 스켈레톤 로딩 */}
      {loading && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:16 }}>
          {Array.from({ length: 8 }).map((_, i) => <SampleCardSkeleton key={i}/>)}
        </div>
      )}

      {/* ── 캘린더 뷰 ── */}
      {!loading && viewMode === 'calendar' && (
        <div>
          {/* 월 네비게이션 */}
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
            <button className="btn sm" onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}>‹</button>
            <div style={{ fontWeight:800, fontSize:15, color:'var(--text-1)', minWidth:100, textAlign:'center' }}>
              {calMonth.getFullYear()}년 {calMonth.getMonth() + 1}월
            </div>
            <button className="btn sm" onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}>›</button>
          </div>

          {/* 요일 헤더 */}
          <div className="cal-grid" style={{ marginBottom:4 }}>
            {['일','월','화','수','목','금','토'].map(d => (
              <div key={d} style={{
                textAlign:'center', fontSize:11, fontWeight:700,
                color:'var(--text-3)', padding:'4px 0',
              }}>{d}</div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className="cal-grid">
            {days.map(({ date, cur }, idx) => {
              const ymd = toYMD(date);
              const daySamples = samplesByDate[ymd] || [];
              const isToday = ymd === today;
              return (
                <div
                  key={idx}
                  className={'cal-cell' + (!cur ? ' other-month' : '') + (isToday ? ' today' : '')}
                  style={{ cursor: daySamples.length > 0 ? 'pointer' : 'default' }}
                  onClick={() => { if (daySamples.length > 0) setDetailRec(daySamples[0]); }}
                >
                  <span style={{ fontSize:12, fontWeight: isToday ? 800 : 400 }}>{date.getDate()}</span>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:2, marginTop:4 }}>
                    {daySamples.slice(0, 4).map(s => (
                      <span key={s.id} className="cal-dot" style={{ background: RATING_COLOR?.[s.rating] || 'var(--accent)' }}/>
                    ))}
                    {daySamples.length > 4 && (
                      <span style={{ fontSize:9, color:'var(--text-3)' }}>+{daySamples.length - 4}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 빈 상태 (갤러리 뷰일 때만) */}
      {!loading && viewMode === 'grid' && filtered.length === 0 && (
        <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--text-3)' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>📷</div>
          <div style={{ fontSize:15, fontWeight:600, marginBottom:8 }}>
            {search ? `"${search}" 검색 결과가 없어요` :
             ratingMin > 0 ? `별점 ${ratingMin}점 이상 샘플이 없어요` :
             catFilter !== 'all' ? `${catFilter} 카테고리 샘플이 없어요` :
             '샘플 기록이 없어요'}
          </div>
          {!search && catFilter === 'all' && ratingMin === 0 && (
            <button className="btn primary" style={{ marginTop:8 }}
              onClick={() => router.push('/note/sample/write')}>
              첫 샘플 작성하기
            </button>
          )}
        </div>
      )}

      {/* 갤러리 그리드 */}
      {!loading && viewMode === 'grid' && filtered.length > 0 && (
        <div style={{
          display:'grid',
          gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))',
          gap:16,
        }}>
          {filtered.map((rec, i) => {
            const thumb = rec.photos?.[0]?.data;
            const tags = rec.tags ? rec.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
            const isBatchSelected = selected.has(rec.id);
            const compareIdx = [...compareSet].indexOf(rec.id);
            const isCompareSelected = compareIdx !== -1;

            return (
              <div key={rec.id} className="stagger" style={{ animationDelay:`${Math.min(i, 8) * 40}ms`, position:'relative' }}>
                {/* 배치 체크박스 오버레이 */}
                {batchMode && (
                  <div className={'batch-checkbox-wrap' + (isBatchSelected ? ' checked' : '')} style={{
                    position:'absolute', top:8, right:8, zIndex:10,
                    width:20, height:20, borderRadius:4,
                    background:'#fff', border:'2px solid var(--border)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    pointerEvents:'none',
                  }}>
                    {isBatchSelected && (
                      <span style={{ color:'#22c55e', fontSize:14, lineHeight:1 }}>✓</span>
                    )}
                  </div>
                )}
                {/* 비교 뱃지 */}
                {compareMode && isCompareSelected && (
                  <div style={{
                    position:'absolute', top:8, right:8, zIndex:10,
                    width:22, height:22, borderRadius:'50%',
                    background:'var(--accent)', color:'#fff',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:12, fontWeight:800, pointerEvents:'none',
                  }}>
                    {compareIdx + 1}
                  </div>
                )}
                <div
                  className="card card-lift"
                  style={{
                    padding:0, cursor:'pointer', overflow:'hidden', height:'100%',
                    outline: batchMode && isBatchSelected ? '2px solid #22c55e' : compareMode && isCompareSelected ? '2px solid var(--accent)' : 'none',
                  }}
                  onClick={() => {
                    if (batchMode) { toggleSelect(rec.id); return; }
                    if (compareMode) { toggleCompare(rec.id); return; }
                    setDetailRec(rec);
                  }}
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

                    {/* 액션 버튼 (배치/비교 모드 아닐 때만) */}
                    {!batchMode && !compareMode && (
                      <div style={{ display:'flex', gap:6, marginTop:4 }} onClick={e => e.stopPropagation()}>
                        <button className="btn sm" style={{ flex:1 }}
                          onClick={() => router.push(`/note/sample/${rec.id}`)}>
                          수정
                        </button>
                        <button className="btn sm"
                          onClick={e => handleCopy(rec, e)}>
                          복사
                        </button>
                        <button className="btn sm" style={{ color:'var(--negative)' }}
                          onClick={() => handleDelete(rec)}>
                          삭제
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 비교 모드 하단 바 */}
      {compareMode && compareSet.size >= 2 && (
        <div style={{
          position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)',
          background:'var(--accent)', color:'#fff', borderRadius:40,
          padding:'12px 28px', fontWeight:800, fontSize:15,
          boxShadow:'0 8px 32px rgba(0,0,0,0.22)', cursor:'pointer', zIndex:200,
          display:'flex', gap:12, alignItems:'center',
        }}
          onClick={() => setShowCompare(true)}
        >
          {compareSet.size}개 비교하기
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

      {/* 비교 모달 */}
      {showCompare && compareItems.length >= 2 && (
        <CompareModal
          samples={compareItems}
          onClose={() => setShowCompare(false)}
        />
      )}
    </main>
  );
}
