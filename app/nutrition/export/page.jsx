'use client';
import { PageHeader } from '@/components/ui/PageHeader';
import OriginResult from './OriginResult';

export default function Page() {
  return (
    <main className="main">
      <PageHeader
        breadcrumb={['영양성분', '표 출력']}
        title="원산지 표시판 출력"
        sub="매장비치용 · 냉장고부착용 · 배달플랫폼용 — 탭 전환 후 인쇄 또는 엑셀 다운로드"
      />
      <div style={{ marginTop: 16 }}>
        <OriginResult />
      </div>
    </main>
  );
}
