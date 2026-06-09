'use client';
import { useMemo, useState } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { UploadDropzone } from '@/components/ui/UploadDropzone';
import { showToast } from '@/components/Toast';
import { useJetteShipment } from '@/lib/shipment/use-shipment';
import { ShipmentSummary } from '@/components/jette/ShipmentSummary';
import { ShipmentTable } from '@/components/jette/ShipmentTable';
import { ShipmentHistory } from '@/components/jette/ShipmentHistory';

const NOW = new Date();
const CURRENT_YEAR = NOW.getFullYear();
const CURRENT_MONTH = NOW.getMonth() + 1;
const MIN_PERIOD_YEAR = 2000;
const MAX_PERIOD_YEAR = 2100;

function normalizePeriodYear(value, fallback) {
  const year = parseInt(value, 10);
  if (!Number.isFinite(year)) return fallback;
  return year;
}

function normalizeShipmentPeriod(period) {
  const year = Math.max(
    MIN_PERIOD_YEAR,
    Math.min(MAX_PERIOD_YEAR, normalizePeriodYear(period?.year, CURRENT_YEAR))
  );
  const month = Math.max(1, Math.min(12, parseInt(period?.month, 10) || CURRENT_MONTH));
  return { year, month };
}

export default function Page() {
  const {
    ready,
    busy,
    files,
    selectedYM,
    setSelectedYM,
    managedProducts,
    aggRows,
    handleFile,
    handleDelete,
  } = useJetteShipment();

  const [period, setPeriod] = useState({ year: CURRENT_YEAR, month: CURRENT_MONTH });

  // 데이터가 있는 년월만 유니크하게 추출
  const uniqueYMs = useMemo(() => {
    const seen = new Set();
    const result = [];
    for (const f of files) {
      const key = `${f.year}-${f.month}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ year: f.year, month: f.month });
      }
    }
    return result;
  }, [files]);

  // 같은 월의 모든 파일 (배너 표시용 + 행수 합산)
  const monthFiles = selectedYM
    ? files.filter(f => f.year === selectedYM.year && f.month === selectedYM.month)
    : [];
  const totalRows = monthFiles.reduce((s, f) => s + (f.totalRows || 0), 0);
  const sourceRows = monthFiles.reduce((s, f) => s + (f.sourceTotalRows || 0), 0);

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['제때상품관리', '제때 제품 출고량']}
        title="제때 제품 출고량"
        sub={`등록된 ${managedProducts.length}개 대상 제품의 출고량을 집계합니다. 대상 외 제품은 자동 제외.`}
        actions={<PeriodInput period={period} onChange={setPeriod} />}
      />

      <UploadDropzone
        disabled={!ready || busy}
        busyText="업로드 중..."
        title="출고량 엑셀(.xlsx) 또는 CSV 파일을 끌어다 놓으세요"
        onFile={(f, err) => {
          if (err) {
            showToast(err, 'err');
            return;
          }
          handleFile(f, normalizeShipmentPeriod(period));
        }}
      />

      {/* 년월 조회 필터 — 데이터 있는 월만 버튼으로 표시 */}
      {uniqueYMs.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 6,
            flexWrap: 'wrap',
            alignItems: 'center',
            marginTop: 16,
            padding: '10px 16px',
            borderRadius: 10,
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--text-3)', marginRight: 4 }}>조회 월</span>
          {uniqueYMs.map(ym => {
            const isActive = selectedYM?.year === ym.year && selectedYM?.month === ym.month;
            return (
              <button
                key={`${ym.year}-${ym.month}`}
                className={`btn sm${isActive ? ' primary' : ''}`}
                onClick={() => {
                  setSelectedYM(ym);
                  setPeriod({ year: ym.year, month: ym.month });
                }}
                style={{ fontVariantNumeric: 'tabular-nums', minWidth: 70 }}
              >
                {ym.year}.{String(ym.month).padStart(2, '0')}
              </button>
            );
          })}
        </div>
      )}

      {files.length === 0 && ready ? (
        <EmptyHero />
      ) : (
        <>
          {selectedYM && (
            <div className="info-banner info-accent" style={{ marginTop: 16 }}>
              <div
                className="info-banner-ico"
                style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)' }}
              >
                <Icon.alert style={{ width: 16, height: 16 }} />
              </div>
              <div>
                <b>
                  {selectedYM.year}년 {selectedYM.month}월 출고량
                </b>
                {' · '}대상 {totalRows}건{sourceRows > 0 && ` (원본 ${sourceRows}건)`}
                {monthFiles.length > 1 && ` · ${monthFiles.length}개 파일 합산`}
              </div>
            </div>
          )}

          <ShipmentSummary aggRows={aggRows} managedCount={managedProducts.length} />
          <ShipmentTable aggRows={aggRows} />
          <ShipmentHistory
            files={files}
            selectedYM={selectedYM}
            onSelectYM={setSelectedYM}
            onDelete={handleDelete}
          />
        </>
      )}
    </main>
  );
}

function PeriodInput({ period, onChange }) {
  return (
    <label
      style={{ display: 'flex', flexDirection: 'column', fontSize: 11, color: 'var(--text-3)' }}
    >
      <span style={{ marginBottom: 2 }}>적용 년월</span>
      <span style={{ display: 'flex', gap: 4 }}>
        <input
          type="number"
          min={MIN_PERIOD_YEAR}
          max={MAX_PERIOD_YEAR}
          value={period.year}
          onChange={e =>
            onChange({ ...period, year: normalizePeriodYear(e.target.value, period.year) })
          }
          style={{ ...numInputStyle, width: 84 }}
        />
        <span style={{ alignSelf: 'center', color: 'var(--text-3)' }}>년</span>
        <select
          value={period.month}
          onChange={e => onChange({ ...period, month: parseInt(e.target.value, 10) })}
          style={{ ...numInputStyle, width: 64 }}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <span style={{ alignSelf: 'center', color: 'var(--text-3)' }}>월</span>
      </span>
    </label>
  );
}

const numInputStyle = {
  padding: '6px 8px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--surface-2)',
  color: 'var(--text-1)',
  fontSize: 13,
};

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
      <div style={{ fontSize: 15, fontWeight: 700 }}>아직 업로드된 출고량 파일이 없습니다</div>
      <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
        엑셀(.xlsx) 또는 CSV 파일을 업로드하면 대상 제품의 출고량이 집계됩니다.
      </div>
    </div>
  );
}
