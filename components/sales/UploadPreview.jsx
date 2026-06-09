'use client';
import { Icon } from '@/components/icons';
import { formatNumber } from '@/lib/format';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

/**
 * UploadPreview — 검증/분류 결과 미리보기
 *
 * @param {object} props
 * @param {{year, month}} props.period
 * @param {Array}  props.classifiedRows
 * @param {Array}  props.groupedIssues
 * @param {Function} props.onCancel
 * @param {Function} props.onConfirm
 * @param {boolean}  props.saving
 */
export function UploadPreview({ period, classifiedRows, groupedIssues, onCancel, onConfirm, saving }) {
  const safeRows = asObjectArray(classifiedRows);
  const safeIssues = asObjectArray(groupedIssues);
  const total = safeRows.length;
  const classified   = safeRows.filter(r => r.status === 'classified').length;
  const excluded     = safeRows.filter(r => r.status === 'excluded').length;
  const unclassified = safeRows.filter(r => r.status === 'unclassified').length;
  const unmatchedGroups = safeIssues.length;
  const safePeriod = period && typeof period === 'object' ? period : {};
  const periodYear = asDisplayText(safePeriod.year, '-');
  const periodMonth = asDisplayText(safePeriod.month, '-');
  const handleCancel = typeof onCancel === 'function' ? onCancel : undefined;
  const handleConfirm = typeof onConfirm === 'function' ? onConfirm : undefined;

  // 표시는 위에서부터: 미매칭 → 제외 → 정상 (사용자 확인 우선순)
  const sortedRows = [...safeRows].sort((a, b) => {
    const order = { unclassified: 0, excluded: 1, classified: 2 };
    return (order[a.status] ?? 9) - (order[b.status] ?? 9);
  }).slice(0, 100); // 처음 100건만 표시

  return (
    <>
      {/* 요약 배너 */}
      <div className="info-banner info-accent" style={{marginTop:16}}>
        <div className="info-banner-ico" style={{background:'var(--accent-soft)', color:'var(--accent-text)'}}>
          <Icon.alert style={{width:16,height:16}}/>
        </div>
        <div>
          <b>{periodYear}년 {periodMonth}월 검증 완료</b> — 총 {formatNumber(total)}건 ·{' '}
          정상 {formatNumber(classified)}건 · 제외 {formatNumber(excluded)}건 ·{' '}
          <span style={{color: unclassified ? 'var(--negative)' : undefined}}>
            미매칭 {formatNumber(unclassified)}건 ({unmatchedGroups}개 그룹)
          </span>
        </div>
      </div>

      <div className="card table-card" style={{marginTop:16}}>
        <div className="card-header">
          <div>
            <div className="card-title">미리보기 (상위 100건)</div>
            <div className="card-sub">미매칭 → 제외 → 정상 순으로 표시 · 반영 후 미매칭 관리에서 처리할 수 있어요</div>
          </div>
        </div>
        <div style={{overflowX:'auto'}}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{width:60}}>행</th>
              <th>원본 메뉴명</th>
              <th>분류 결과</th>
              <th style={{width:100, textAlign:'right'}}>수량</th>
              <th style={{width:120}}>상태</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((r, index) => (
              <tr key={`${asDisplayText(r.originalIndex, index)}-${asDisplayText(r.rawMenuName, 'menu')}`}>
                <td className="muted num">{asDisplayText(r.originalIndex, '-')}</td>
                <td className="cell-name"><div className="menu-name">{asDisplayText(r.rawMenuName, '-')}</div></td>
                <td>{r.status === 'unclassified'
                  ? <span className="muted">—</span>
                  : <CategoryCell row={r} />}</td>
                <td className="num right">{formatNumber(r.quantity)}<span className="unit">건</span></td>
                <td><StatusChip status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      <div style={{display:'flex', gap:8, justifyContent:'flex-end', marginTop:16}}>
        <button className="btn" onClick={handleCancel} disabled={saving}>취소</button>
        <button className="btn primary" onClick={handleConfirm} disabled={saving}>
          <Icon.check style={{width:14, height:14}}/>
          {saving ? '저장 중...' : '최신본으로 반영'}
        </button>
      </div>
    </>
  );
}

function CategoryCell({ row }) {
  const category = asDisplayText(row.category, '—');
  const detailName = asDisplayText(row.detailName);

  return (
    <span>
      <b>{category}</b>
      {detailName && detailName !== category && (
        <span style={{color:'var(--text-3)', marginLeft:6, fontSize:12}}>· {detailName}</span>
      )}
    </span>
  );
}

function StatusChip({ status }) {
  if (status === 'classified') {
    return <span className="chip" style={{background:'var(--positive-soft)', color:'var(--positive)'}}>정상</span>;
  }
  if (status === 'excluded') {
    return <span className="chip" style={{background:'var(--surface-2)', color:'var(--text-2)'}}>제외</span>;
  }
  return <span className="chip" style={{background:'var(--negative-soft)', color:'var(--negative)'}}>미매칭</span>;
}
