'use client';
import { useState, useEffect, useRef } from 'react';
import { Icon } from '@/components/icons';
import { KIND_COLOR, KIND_LABEL, KIND_EMOJI } from '@/lib/report/constants';

function ReportCover({ report }) {
  const color = KIND_COLOR[report.kind] || '#888';
  const label = KIND_LABEL[report.kind] || '';
  const createdAt = report.createdAt
    ? new Date(report.createdAt).toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric'})
    : '—';
  return (
    <div style={{textAlign:'center', padding:'40px 0 32px', borderBottom:'1px solid var(--border)'}}>
      <div style={{display:'inline-flex', alignItems:'center', justifyContent:'center',
        width:56, height:56, borderRadius:16, background:color+'1A', marginBottom:20}}>
        <span style={{fontSize:22}}>{KIND_EMOJI[report.kind] || '📄'}</span>
      </div>
      <div style={{fontSize:12, color:'var(--text-3)', marginBottom:8, letterSpacing:1, textTransform:'uppercase'}}>
        7번가피자 본사 · R&amp;D팀
      </div>
      <h1 style={{fontSize:24, fontWeight:800, marginBottom:10, lineHeight:1.3}}>{report.name}</h1>
      <div style={{display:'inline-flex', alignItems:'center', gap:8, padding:'4px 12px', borderRadius:20,
        background:color+'1A', color:color, fontSize:12, fontWeight:700, marginBottom:20}}>
        {label} 보고서
      </div>
      <div style={{fontSize:13, color:'var(--text-2)', marginBottom:6}}>{report.period}</div>
      <div style={{fontSize:12, color:'var(--text-3)'}}>생성일: {createdAt}</div>
      {report.author && <div style={{fontSize:12, color:'var(--text-3)', marginTop:4}}>작성자: {report.author}</div>}
    </div>
  );
}

function OptionRow({ label, value }) {
  return (
    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'8px 0', borderBottom:'1px solid var(--divider)'}}>
      <span style={{fontSize:12, color:'var(--text-3)'}}>{label}</span>
      <span style={{fontSize:12, fontWeight:600}}>{value}</span>
    </div>
  );
}

function ReportOptionsPage({ report }) {
  const opts = report.options || {};
  const color = KIND_COLOR[report.kind] || '#888';

  const kindOpts = () => {
    if (report.kind === 'sales') return (<>
      <OptionRow label="집계 기간" value={opts.periodMode === 'year' ? '년 단위' : '월 단위'}/>
      <OptionRow label="대상 범위" value={opts.scope === 'all' ? '전체 메뉴' : opts.scope === 'pizza' ? '피자만' : '사이드만'}/>
      <OptionRow label="순위 깊이" value={opts.topN === 50 ? '전체' : `TOP ${opts.topN}`}/>
      {opts.opts && (<>
        <OptionRow label="카테고리 비중" value={opts.opts.catShare ? '포함' : '제외'}/>
        <OptionRow label="메뉴 순위표" value={opts.opts.rankTable ? '포함' : '제외'}/>
        <OptionRow label="전월 대비" value={opts.opts.prevComp ? '포함' : '제외'}/>
      </>)}
    </>);
    if (report.kind === 'price') return (<>
      <OptionRow label="변동률 임계값" value={`±${opts.threshold ?? 3}%`}/>
      <OptionRow label="기간 모드" value={opts.periodMode === 'week' ? '이번 주' : opts.periodMode === 'month' ? '이번 달' : '사용자 지정'}/>
      {opts.opts && (<>
        <OptionRow label="스파크라인" value={opts.opts.history7 ? '포함' : '제외'}/>
        <OptionRow label="원가 영향" value={opts.opts.costImpact ? '포함' : '제외'}/>
      </>)}
    </>);
    if (report.kind === 'shipment') return (<>
      <OptionRow label="집계 단위" value={opts.periodMode === 'week' ? '주 단위' : opts.periodMode === 'quart' ? '분기 단위' : '월 단위'}/>
      <OptionRow label="대상 분류" value={opts.type === 'managed' ? '관리품목' : opts.type === 'common' ? '범용상품' : '전체'}/>
      {opts.opts && (<>
        <OptionRow label="추이 차트" value={opts.opts.chart ? '포함' : '제외'}/>
        <OptionRow label="TOP 10 목록" value={opts.opts.topList ? '포함' : '제외'}/>
      </>)}
    </>);
    if (report.kind === 'compare') return (<>
      <OptionRow label="비교 모드" value={opts.mode === 'mom' ? '전월 대비' : opts.mode === 'yoy' ? '전년 동월' : '사용자 지정'}/>
      <OptionRow label="기간 A" value={opts.yearA && opts.monthA ? `${opts.yearA}년 ${opts.monthA}월` : '—'}/>
      <OptionRow label="대상 범위" value={opts.scope === 'all' ? '전체' : opts.scope === 'pizza' ? '피자' : '사이드'}/>
      {opts.opts && (<>
        <OptionRow label="순위 이동표" value={opts.opts.rankShift ? '포함' : '제외'}/>
        <OptionRow label="Winners/Losers" value={opts.opts.winners ? '포함' : '제외'}/>
      </>)}
    </>);
    if (report.kind === 'cost') return (<>
      <OptionRow label="집계 기간" value={opts.periodMode === 'year' ? '년 단위' : '월 단위'}/>
      <OptionRow label="위험 기준" value={`${opts.riskThreshold ?? 35}%↑`}/>
      {opts.cats && (
        <OptionRow label="포함 카테고리"
          value={Object.entries(opts.cats).filter(([,v])=>v).map(([k])=>
            k==='pizza'?'피자':k==='personal'?'1인피자':k==='side'?'사이드':k==='set'?'세트박스':'엣지&도우'
          ).join(', ') || '—'}/>
      )}
      {opts.opts && (<>
        <OptionRow label="카테고리 비교표" value={opts.opts.catTable ? '포함' : '제외'}/>
        <OptionRow label="위험 메뉴 부록" value={opts.opts.riskList ? '포함' : '제외'}/>
      </>)}
    </>);
    return <div style={{color:'var(--text-4)',fontSize:13,padding:'16px 0'}}>저장된 옵션 없음</div>;
  };

  return (
    <div style={{padding:'16px 0'}}>
      <div style={{fontSize:11, fontWeight:700, color:color, textTransform:'uppercase',
        letterSpacing:1, marginBottom:12}}>보고서 설정</div>
      {kindOpts()}
    </div>
  );
}

function ReportSummaryPage({ report }) {
  const color = KIND_COLOR[report.kind] || '#888';
  return (
    <div style={{padding:'16px 0'}}>
      <div style={{fontSize:11, fontWeight:700, color:color, textTransform:'uppercase',
        letterSpacing:1, marginBottom:12}}>요약 정보</div>
      <OptionRow label="보고서 ID" value={report.id ? `RPT-${String(report.id).padStart(4,'0')}` : '—'}/>
      <OptionRow label="총 페이지" value={`${report.pages || 1}쪽`}/>
      <OptionRow label="조회수" value={`${report.views || 0}회`}/>
      <OptionRow label="공유 링크" value={report.links > 0 ? `${report.links}개 활성` : '없음'}/>
      <div style={{marginTop:20, padding:12, borderRadius:8, background:'var(--surface-2)',
        fontSize:12, color:'var(--text-3)', lineHeight:1.6}}>
        ℹ️ 보고서는 생성 시점의 데이터로 고정돼요. 이후 데이터 변경은 반영되지 않아요.
      </div>
    </div>
  );
}

const PAGE_COMPONENTS = [
  { title: '표지',       render: (r) => <ReportCover report={r} /> },
  { title: '보고서 설정', render: (r) => <ReportOptionsPage report={r} /> },
  { title: '요약 정보',  render: (r) => <ReportSummaryPage report={r} /> },
];

export function ReportPreviewModal({ report, onClose, onShare }) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = PAGE_COMPONENTS.length;
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') setCurrentPage(p => p > 1 ? p - 1 : p);
      if (e.key === 'ArrowRight') setCurrentPage(p => p < totalPages ? p + 1 : p);
      if (e.key === 'Escape') onCloseRef.current?.();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [totalPages]);

  const pageTitle   = PAGE_COMPONENTS[currentPage - 1]?.title || '';
  const PageContent = PAGE_COMPONENTS[currentPage - 1]?.render;
  const color       = KIND_COLOR[report.kind] || '#888';
  const createdAt   = report.createdAt
    ? new Date(report.createdAt).toLocaleString('ko-KR',{year:'2-digit',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})
    : '—';

  return (
    <div className="modal-scrim">
      <div className="preview-shell" onClick={e => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-labelledby="preview-modal-title">
        <div className="preview-meta">
          <button className="modal-close" onClick={onClose} style={{marginBottom:24}}>
            <Icon.x style={{width:20,height:20}}/>
          </button>
          <div style={{marginBottom:20}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:6,padding:'3px 8px',
              borderRadius:12, background:color+'1A', color, fontSize:11, fontWeight:700, marginBottom:8}}>
              {KIND_LABEL[report.kind]} 보고서
            </div>
            <div id="preview-modal-title" style={{fontSize:15, fontWeight:700, marginBottom:4, lineHeight:1.4}}>{report.name}</div>
            <div style={{fontSize:12, color:'var(--text-2)'}}>{report.period}</div>
          </div>
          <div style={{fontSize:12, color:'var(--text-3)', marginBottom:20}}>
            <div>작성자: {report.author || '—'}</div>
            <div>생성일: {createdAt}</div>
          </div>
          <div style={{marginBottom:20}}>
            {PAGE_COMPONENTS.map((p, i) => (
              <button key={i} onClick={() => setCurrentPage(i + 1)}
                style={{display:'flex', alignItems:'center', gap:8, width:'100%',
                  padding:'7px 10px', borderRadius:8, border:'none', cursor:'pointer', textAlign:'left',
                  background: currentPage === i+1 ? color+'1A' : 'transparent',
                  color: currentPage === i+1 ? color : 'var(--text-2)',
                  fontWeight: currentPage === i+1 ? 700 : 400, fontSize:13, marginBottom:2}}>
                <span style={{fontSize:11, opacity:.6, minWidth:16}}>{i+1}</span>
                {p.title}
              </button>
            ))}
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:6}}>
            <button className="btn sm primary" onClick={() => { onShare?.(report); onClose(); }}>
              <Icon.upload style={{width:12,height:12}}/>공유
            </button>
            <button className="btn sm"><Icon.download style={{width:12,height:12}}/>PDF</button>
          </div>
          <div style={{borderTop:'1px solid var(--border)', marginTop:16, paddingTop:16,
            fontSize:11, color:'var(--text-4)'}}>
            <div>← → : 페이지 이동</div>
            <div>Esc : 닫기</div>
          </div>
        </div>
        <div className="preview-body">
          <div className="report-paper preview-paper">
            {PageContent && PageContent(report)}
            <div className="paper-foot" style={{marginTop:24}}>
              <span>{currentPage} / {totalPages} — {pageTitle}</span>
              <span className="mono">7번가 R&amp;D 플랫폼 · WONPAY 비즈니스</span>
            </div>
          </div>
          <div className="preview-pager">
            <button className="pager-btn" onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1}>
              <Icon.chevLeft style={{width:16,height:16}}/>
            </button>
            <div className="pager-info">{currentPage} / {totalPages}</div>
            <button className="pager-btn" onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages}>
              <Icon.chevRight style={{width:16,height:16}}/>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
