'use client';
import { useState } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader, FilterBar } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';

export default function Page() {
  const title = "메뉴판매량 업로드";
  const bc = ["메뉴 판매량","판매량 업로드"];

  const [stage, setStage] = useState('idle');
  const [drag, setDrag] = useState(false);
  return (
    <main className="main">
      <PageHeader breadcrumb={bc} title={title}
        sub="엑셀 / CSV 파일을 업로드하면 검증·미리보기·반영 순서로 처리해요."
        actions={<button className="btn" onClick={()=>showToast('양식 다운로드 완료','ok')}><Icon.download style={{width:14,height:14}}/>양식 다운로드</button>}
      />
      <div className="card" style={{marginTop:24}}>
        {stage === 'idle' && (
          <div className={'drop-zone '+(drag?'drag-over':'')}
            onDragOver={e=>{e.preventDefault();setDrag(true);}}
            onDragLeave={()=>setDrag(false)}
            onDrop={e=>{e.preventDefault();setDrag(false);showToast('파일 업로드 중...','info');setStage('validating');setTimeout(()=>{setStage('preview');showToast('검증 완료 — 12,840건 처리됐어요','ok');},800);}}
            onClick={()=>{showToast('파일 업로드 중...','info');setStage('validating');setTimeout(()=>{setStage('preview');showToast('검증 완료 — 12,840건 처리됐어요','ok');},800);}}>
            <Icon.upload style={{width:40,height:40,color:'var(--text-4)'}}/>
            <div style={{marginTop:12,fontWeight:700}}>파일을 드래그하거나 클릭해서 선택</div>
            <div style={{marginTop:4,fontSize:13,color:'var(--text-3)'}}>XLS, XLSX, CSV · 최대 20MB</div>
          </div>
        )}
        {stage === 'validating' && (
          <div style={{padding:60,textAlign:'center'}}>
            <div className="skeleton skeleton-chart" style={{maxWidth:400,margin:'0 auto'}}></div>
            <div style={{marginTop:16,color:'var(--text-3)'}}>파일 검증 중...</div>
          </div>
        )}
        {stage === 'preview' && (
          <div>
            <div className="card-header"><div className="card-title">미리보기 — 12,840건</div>
              <div style={{display:'flex',gap:8}}>
                <button className="btn" onClick={()=>setStage('idle')}>다시 업로드</button>
                <button className="btn primary" onClick={()=>{showToast('2026년 5월 판매량 데이터 반영 완료','ok');setStage('idle');}}>
                  <Icon.check style={{width:14,height:14}}/>최신본으로 반영
                </button>
              </div>
            </div>
            <div style={{padding:'16px 0',color:'var(--text-3)',fontSize:13}}>미리보기 테이블이 여기에 표시됩니다.</div>
          </div>
        )}
      </div>
    </main>
  );
}
