'use client';
import { useRef, useState } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { useJetteShipment } from '@/lib/shipment/use-shipment';
import { ShipmentSummary } from '@/components/jette/ShipmentSummary';
import { ShipmentTable } from '@/components/jette/ShipmentTable';
import { ShipmentHistory } from '@/components/jette/ShipmentHistory';

const NOW = new Date();
const CURRENT_YEAR  = NOW.getFullYear();
const CURRENT_MONTH = NOW.getMonth() + 1;

export default function Page() {
  const {
    ready, busy, files,
    selectedYM, setSelectedYM,
    managedProducts, aggRows,
    handleFile, handleDelete,
  } = useJetteShipment();

  const [period, setPeriod] = useState({ year: CURRENT_YEAR, month: CURRENT_MONTH });
  const fileInputRef = useRef(null);

  // 같은 월의 모든 파일 (배너 표시용 + 행수 합산)
  const monthFiles = selectedYM
    ? files.filter(f => f.year === selectedYM.year && f.month === selectedYM.month)
    : [];
  const totalRows   = monthFiles.reduce((s, f) => s + (f.totalRows || 0), 0);
  const sourceRows  = monthFiles.reduce((s, f) => s + (f.sourceTotalRows || 0), 0);

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['제때상품관리', '제때 제품 출고량']}
        title="제때 제품 출고량"
        sub={`등록된 ${managedProducts.length}개 대상 제품의 출고량을 집계합니다. 대상 외 제품은 자동 제외.`}
        actions={
          <div style={{display:'flex', gap:8, alignItems:'flex-end'}}>
            <PeriodInput period={period} onChange={setPeriod}/>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{display:'none'}}
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handleFile(f, period);
                e.target.value = '';
              }}
            />
            <button
              className="btn primary"
              disabled={!ready || busy}
              onClick={() => fileInputRef.current?.click()}
            >
              <Icon.upload style={{width:14, height:14}}/>
              {busy ? '업로드 중...' : '출고량 업로드'}
            </button>
          </div>
        }
      />

      {files.length === 0 && ready ? (
        <EmptyHero />
      ) : (
        <>
          {selectedYM && (
            <div className="info-banner info-accent" style={{marginTop:16}}>
              <div className="info-banner-ico" style={{background:'var(--accent-soft)', color:'var(--accent-text)'}}>
                <Icon.alert style={{width:16, height:16}}/>
              </div>
              <div>
                <b>{selectedYM.year}년 {selectedYM.month}월 출고량</b>
                {' · '}대상 {totalRows}건
                {sourceRows > 0 && ` (원본 ${sourceRows}건)`}
                {monthFiles.length > 1 && ` · ${monthFiles.length}개 파일 합산`}
              </div>
            </div>
          )}

          <ShipmentSummary aggRows={aggRows} managedCount={managedProducts.length}/>
          <ShipmentTable aggRows={aggRows}/>
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
    <label style={{display:'flex', flexDirection:'column', fontSize:11, color:'var(--text-3)'}}>
      <span style={{marginBottom:2}}>적용 년월</span>
      <span style={{display:'flex', gap:4}}>
        <input
          type="number"
          value={period.year}
          onChange={e => onChange({ ...period, year: Number(e.target.value) })}
          style={{...numInputStyle, width:84}}
        />
        <span style={{alignSelf:'center', color:'var(--text-3)'}}>년</span>
        <select
          value={period.month}
          onChange={e => onChange({ ...period, month: Number(e.target.value) })}
          style={{...numInputStyle, width:64}}
        >
          {Array.from({length:12}, (_, i) => i + 1).map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <span style={{alignSelf:'center', color:'var(--text-3)'}}>월</span>
      </span>
    </label>
  );
}

const numInputStyle = {
  padding:'6px 8px', borderRadius:8,
  border:'1px solid var(--border)', background:'var(--surface-2)',
  color:'var(--text-1)', fontSize:13,
};

function EmptyHero() {
  return (
    <div className="card" style={{
      marginTop:24, padding:'48px 24px', textAlign:'center',
      display:'flex', flexDirection:'column', alignItems:'center', gap:12,
    }}>
      <Icon.box style={{width:48, height:48, color:'var(--text-4)'}}/>
      <div style={{fontSize:15, fontWeight:700}}>아직 업로드된 출고량 파일이 없습니다</div>
      <div style={{fontSize:13, color:'var(--text-3)'}}>
        엑셀(.xlsx) 또는 CSV 파일을 업로드하면 대상 제품의 출고량이 집계됩니다.
      </div>
    </div>
  );
}
