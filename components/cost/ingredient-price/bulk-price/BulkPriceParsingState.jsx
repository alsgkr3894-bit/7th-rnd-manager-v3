'use client';

export function BulkPriceParsingState({ fileName }) {
  return (
    <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-3)' }}>
      <div style={{ fontSize: 13 }}>
        파일 분석 중… <b>{fileName}</b>
      </div>
    </div>
  );
}
