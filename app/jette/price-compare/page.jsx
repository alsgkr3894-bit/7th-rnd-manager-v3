'use client';
import { useMemo, useState } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { UploadDropzone } from '@/components/ui/UploadDropzone';
import { showToast } from '@/components/Toast';
import { useJettePrice } from '@/lib/price/use-price-upload';
import { PriceLatestView } from '@/components/jette/PriceLatestView';
import { PriceSummaryCards } from '@/components/jette/PriceSummaryCards';
import { PriceCompareControls } from '@/components/jette/PriceCompareControls';
import { PriceCompareTable } from '@/components/jette/PriceCompareTable';
import { PriceFileHistory } from '@/components/jette/PriceFileHistory';

const TABS = [
  { key: 'latest', label: '최신 단가 현황' },
  { key: 'compare', label: '가격 비교' },
  { key: 'history', label: '업로드 이력' },
];

export default function Page() {
  const {
    ready,
    busy,
    files,
    baseFileId,
    setBaseFileId,
    latestFileId,
    setLatestFileId,
    diffRows,
    productTypeLookup,
    handleFile,
    handleDelete,
    handleTypeChange,
  } = useJettePrice();

  const [tab, setTab] = useState('latest');
  const [uploadDate, setUploadDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const summary = useMemo(
    () => ({
      up: diffRows.filter(r => r.changeStatus === '인상').length,
      down: diffRows.filter(r => r.changeStatus === '인하').length,
      total: diffRows.length,
    }),
    [diffRows]
  );

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['제때상품관리', '제때 상품 가격 비교']}
        title="제때 상품 가격 비교"
        sub="최신 단가와 이전 단가를 비교합니다. 원가계산 모듈은 이 데이터를 단일 기준으로 사용합니다."
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                fontSize: 11,
                color: 'var(--text-3)',
              }}
            >
              <span style={{ marginBottom: 2 }}>적용 날짜</span>
              <input
                type="date"
                value={uploadDate}
                onChange={e => setUploadDate(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--surface-2)',
                  color: 'var(--text-1)',
                  fontSize: 13,
                }}
              />
            </label>
          </div>
        }
      />

      <UploadDropzone
        disabled={!ready || busy || !uploadDate}
        busyText="업로드 중..."
        title="단가 엑셀(.xlsx) 또는 CSV 파일을 끌어다 놓으세요"
        maxSizeMB={30}
        onFile={(f, err) => {
          if (err) {
            showToast(err, 'err');
            return;
          }
          handleFile(f, uploadDate);
        }}
      />

      {files.length === 0 && ready ? (
        <EmptyHero />
      ) : (
        <>
          {/* 탭 */}
          <div className="tabs">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`tab ${tab === t.key ? 'active' : ''}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'latest' && (
            <PriceLatestView
              files={files}
              latestFileId={latestFileId}
              onLatestChange={setLatestFileId}
              productTypeLookup={productTypeLookup}
              onTypeChange={handleTypeChange}
            />
          )}

          {tab === 'compare' && (
            <>
              <PriceCompareControls
                files={files}
                baseFileId={baseFileId}
                latestFileId={latestFileId}
                onBaseChange={setBaseFileId}
                onLatestChange={setLatestFileId}
                summary={summary}
              />
              <PriceSummaryCards diffRows={diffRows} />
              <PriceCompareTable
                diffRows={diffRows}
                productTypeLookup={productTypeLookup}
                onTypeChange={handleTypeChange}
              />
            </>
          )}

          {tab === 'history' && <PriceFileHistory files={files} onDelete={handleDelete} />}
        </>
      )}
    </main>
  );
}

function EmptyHero() {
  return (
    <div
      className="card"
      style={{
        marginTop: 24,
        padding: '48px 24px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <Icon.box style={{ width: 48, height: 48, color: 'var(--text-4)' }} />
      <div style={{ fontSize: 15, fontWeight: 700 }}>아직 업로드된 가격 파일이 없습니다</div>
      <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
        엑셀(.xlsx) 또는 CSV 파일을 업로드하면 단가 현황과 변동을 확인할 수 있어요.
      </div>
    </div>
  );
}
