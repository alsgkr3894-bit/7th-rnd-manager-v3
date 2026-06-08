'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { PageHeader } from '@/components/ui/PageHeader';

const OriginResult        = dynamic(() => import('./OriginResult'),        { ssr: false });
const NutritionLabelResult = dynamic(() => import('./NutritionLabelResult'), { ssr: false });

const TOP_TABS = ['원산지표시판', '영양성분표'];

export default function Page() {
  const [tab, setTab] = useState(0);

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['영양성분', '표 출력']}
        title="표 출력"
        sub="원산지 표시판 · 영양성분표 — 탭 선택 후 인쇄 또는 엑셀 다운로드"
      />
      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #333', marginBottom: 0 }}>
          {TOP_TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)}
              style={{
                padding: '12px 28px', border: '1px solid #ccc', borderBottom: 'none',
                background: tab === i ? '#fff' : '#f5f5f5',
                color: tab === i ? '#111' : '#555',
                fontWeight: 700, fontSize: 16,
                borderColor: tab === i ? '#333' : '#ccc',
                marginBottom: tab === i ? -2 : 0,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
              {t}
            </button>
          ))}
        </div>
        {tab === 0 && <OriginResult />}
        {tab === 1 && <NutritionLabelResult />}
      </div>
    </main>
  );
}
