'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { useCurrentRole } from '@/hooks/useCurrentRole';
import { MarketDetailModal } from './_MarketDetailModal';
import { MarketListPanel } from './_MarketListPanel';
import { MarketPhotoLightbox } from './_MarketPhotoLightbox';
import { MarketWriteModal } from './_MarketWriteModal';
import { useMarketResearchList } from './useMarketResearchList';
import { useMarketWriteForm } from './useMarketWriteForm';

export default function MarketResearchPage() {
  return (
    <Suspense
      fallback={
        <main className="main">
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)' }}>로딩 중…</div>
        </main>
      }
    >
      <MarketResearchContent />
    </Suspense>
  );
}

function MarketResearchContent() {
  const { isAdmin, ready: roleReady } = useCurrentRole();
  const canEdit = roleReady && isAdmin;
  const searchParams = useSearchParams();
  const editIdParam = searchParams.get('edit');
  const [detailRow, setDetailRow] = useState(null);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  const list = useMarketResearchList();
  const write = useMarketWriteForm({
    canEdit,
    rows: list.rows,
    reload: list.load,
    editIdParam,
    closeDetail: () => setDetailRow(null),
  });
  const { form, writing, startWrite, closeWrite } = write;

  return (
    <main className="main market-page">
      <PageHeader
        breadcrumb={['RND', '시장조사']}
        title="시장조사"
        sub="경쟁사, 시장 흐름, 피해 트렌드, 타브랜드 참고 포인트를 기록합니다."
        actions={
          <button
            className="btn primary"
            type="button"
            onClick={() => startWrite()}
            disabled={!canEdit}
          >
            <Icon.plus style={{ width: 14, height: 14 }} /> 작성하기
          </button>
        }
      />

      {!canEdit && roleReady ? (
        <section className="card" style={{ marginTop: 18 }}>
          관리자만 시장조사를 작성할 수 있습니다.
        </section>
      ) : (
        <MarketListPanel
          rows={list.rows}
          query={list.query}
          onQueryChange={list.setQuery}
          loading={list.loading}
          filtered={list.filtered}
          groupedRows={list.groupedRows}
          activeId={form.id}
          canEdit={canEdit}
          onDetail={setDetailRow}
          onEdit={row => startWrite(row)}
          onDelete={write.handleDelete}
          onPhotoClick={setLightboxPhoto}
        />
      )}

      {canEdit && !writing && (
        <button
          type="button"
          className="btn primary market-fab"
          onClick={() => startWrite()}
          title="시장조사 작성하기"
        >
          <Icon.plus style={{ width: 16, height: 16 }} /> 작성하기
        </button>
      )}

      {writing && (
        <MarketWriteModal
          form={form}
          canEdit={canEdit}
          saving={write.saving}
          competitorOptions={list.competitorOptions}
          onUpdate={write.update}
          onClose={closeWrite}
          onSave={write.handleSave}
        />
      )}

      {detailRow && (
        <MarketDetailModal
          row={detailRow}
          canEdit={canEdit}
          onClose={() => setDetailRow(null)}
          onEdit={() => {
            const row = detailRow;
            setDetailRow(null);
            startWrite(row);
          }}
          onPhotoClick={setLightboxPhoto}
        />
      )}

      <MarketPhotoLightbox photo={lightboxPhoto} onClose={() => setLightboxPhoto(null)} />
    </main>
  );
}
