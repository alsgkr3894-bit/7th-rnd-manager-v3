'use client';
import { useState } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';

/**
 * CostMenuTabPage — 메뉴별 원가 페이지 공통 컴포넌트
 *
 * 종합 + 세부 2개 탭 구조. 피자/1인피자/사이드/세트박스가 동일 패턴이라
 * placeholder는 이 컴포넌트 1개로 처리, 각 페이지는 menuLabel만 다르게 전달.
 *
 * @param {string} menuLabel - "피자", "1인피자" 등
 */
export default function CostMenuTabPage({ menuLabel }) {
  const [tab, setTab] = useState('summary');

  return (
    <main className="main">
      <PageHeader
        breadcrumb={["원가계산", "메뉴 원가", menuLabel]}
        title={`${menuLabel} 원가`}
        sub="종합 원가표와 세부 원가표를 한 곳에서 관리하세요"
        actions={<>
          <button className="btn" onClick={()=>showToast('양식 다운로드 완료','ok')}><Icon.download style={{width:14,height:14}}/>양식 다운로드</button>
          <button className="btn primary" onClick={()=>showToast('파일을 선택해주세요 (데모)','info')}><Icon.upload style={{width:14,height:14}}/>파일 업로드</button>
        </>}
      />

      {/* 종합 / 세부 탭 */}
      <div style={{display:'flex',gap:4,marginTop:16,borderBottom:'1px solid var(--border)'}}>
        <button
          onClick={()=>setTab('summary')}
          style={{padding:'10px 20px',fontWeight:600,border:'none',background:'transparent',cursor:'pointer',color:tab==='summary'?'var(--accent)':'var(--text-3)',borderBottom:tab==='summary'?'2px solid var(--accent)':'2px solid transparent',marginBottom:-1}}>
          종합 원가표
        </button>
        <button
          onClick={()=>setTab('detail')}
          style={{padding:'10px 20px',fontWeight:600,border:'none',background:'transparent',cursor:'pointer',color:tab==='detail'?'var(--accent)':'var(--text-3)',borderBottom:tab==='detail'?'2px solid var(--accent)':'2px solid transparent',marginBottom:-1}}>
          세부 원가표
        </button>
      </div>

      <div className="card" style={{marginTop:24,minHeight:300,display:'grid',placeItems:'center'}}>
        <div style={{textAlign:'center',color:'var(--text-4)'}}>
          <div className="empty-icon-wrap">
            <Icon.calc style={{width:32,height:32}}/>
          </div>
          <div style={{fontWeight:600,marginBottom:4}}>
            {menuLabel} {tab === 'summary' ? '종합' : '세부'} 원가표가 여기에 표시돼요
          </div>
          <div style={{fontSize:13}}>
            {tab === 'summary'
              ? '메뉴별 최종 원가, 판매가, 원가율을 확인할 수 있습니다.'
              : '재료별 사용량과 g·개당 단가로 계산된 세부 원가표입니다.'}
          </div>
        </div>
      </div>
    </main>
  );
}
