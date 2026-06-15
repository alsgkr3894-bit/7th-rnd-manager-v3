'use client';

import { Icon } from '@/components/icons';

export function MenuMasterHeaderActions({
  hasRows,
  isViewer,
  isMain,
  seeding,
  resetting,
  onExportCsv,
  onOpenBulkPrice,
  onSeed,
  onReset,
  onAdd,
}) {
  return (
    <>
      <button
        className="btn"
        onClick={onExportCsv}
        disabled={!hasRows}
        style={{ color: 'var(--text-2)' }}
      >
        <Icon.download style={{ width: 14, height: 14 }} /> 엑셀로 내보내기
      </button>
      <button className="btn" onClick={onOpenBulkPrice} disabled={!hasRows || isViewer}>
        <Icon.calc style={{ width: 14, height: 14 }} /> 코드별 일괄 가격
      </button>
      {isMain && (
        <button className="btn" onClick={onSeed} disabled={seeding || isViewer}>
          <Icon.download style={{ width: 14, height: 14 }} />
          {seeding ? '등록 중…' : '기본 코드 등록'}
        </button>
      )}
      <button
        className="btn"
        onClick={onReset}
        disabled={resetting || isViewer}
        style={{ color: 'var(--negative)' }}
      >
        <Icon.trash style={{ width: 14, height: 14 }} />
        {resetting ? '처리 중…' : '초기화'}
      </button>
      <button className="btn primary" onClick={onAdd} disabled={isViewer}>
        <Icon.plus style={{ width: 14, height: 14 }} /> 메뉴 추가
      </button>
    </>
  );
}
