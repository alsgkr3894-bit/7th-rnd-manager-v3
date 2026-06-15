'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { loadXlsx } from '@/lib/excel';
import { withDownloadDateSuffix } from '@/lib/download';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { SortableTh } from '@/components/ui/SortableTh';
import { showToast } from '@/components/Toast';

const ShareLinkModal = dynamic(
  () => import('@/components/report/ReportModals').then(m => ({ default: m.ShareLinkModal })),
  { ssr: false }
);
const ScheduleManagerModal = dynamic(
  () => import('@/components/report/ReportModals').then(m => ({ default: m.ScheduleManagerModal })),
  { ssr: false }
);
const ReportPreviewModal = dynamic(
  () => import('@/components/report/ReportModals').then(m => ({ default: m.ReportPreviewModal })),
  { ssr: false }
);
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { getReports } from '@/lib/report';
import { KIND_CHIP } from '@/lib/report/constants';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import { useDBLoad } from '@/hooks/useDBLoad';
import { useReportListState } from '@/hooks/useReportListState';
import { useReportActions } from '@/hooks/useReportActions';
import { formatLocalMonthInput } from '@/lib/date/local-date';
import { asDisplayText, asObjectArray, asFiniteNumber } from '@/lib/ui/prop-guards';
import { ReportFilterToolbar } from '@/components/report/ReportFilterToolbar';
import { NewReportModal } from '@/components/report/NewReportModal';
import { ReportKindGrid } from '@/components/report/ReportKindGrid';
import { ReportStatsRow } from '@/components/report/ReportStatsRow';

const thisMonth = formatLocalMonthInput();

function formatReportId(id) {
  const text = asDisplayText(id);
  return text ? `RPT-${text.padStart(4, '0')}` : '—';
}

function formatReportDate(value) {
  const raw = asDisplayText(value);
  if (!raw) return '—';
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return '—';
  return date.toLocaleString('ko-KR', {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function safeReportKind(kind) {
  return asDisplayText(kind);
}

function reportNumber(value) {
  return asFiniteNumber(value, 0) ?? 0;
}

/* ============================================================
   Excel 내보내기
============================================================ */
async function exportToExcel(rows) {
  const XLSX = await loadXlsx();
  const data = asObjectArray(rows).map(r => ({
    ID: formatReportId(r.id),
    유형: KIND_CHIP[safeReportKind(r.kind)]?.label || safeReportKind(r.kind),
    제목: asDisplayText(r.name),
    '대상 기간': asDisplayText(r.period, '—') || '—',
    작성자: asDisplayText(r.author, '—') || '—',
    생성일: formatReportDate(r.createdAt),
    조회수: reportNumber(r.views),
    즐겨찾기: r.fav ? '★' : '',
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '보고서 목록');
  XLSX.writeFile(wb, withDownloadDateSuffix('보고서 목록.xlsx'));
}

/* ============================================================
   Page
============================================================ */
export default function Page() {
  const router = useRouter();
  const [shareTarget, setShareTarget] = useState(null);
  const [previewTarget, setPreviewTarget] = useState(null);
  const [previewPrintOnOpen, setPreviewPrintOnOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [newReportOpen, setNewReportOpen] = useState(false);

  /* 로드 */
  const { data: reportsData, loading, error: loadError, reload } = useDBLoad(() => getReports());
  const reports = useMemo(() => asObjectArray(reportsData), [reportsData]);

  useVisibilityRefresh(reload);

  const {
    kindFilter,
    setKindFilter,
    search,
    setSearch,
    favOnly,
    setFavOnly,
    page,
    setPage,
    sortKey,
    sortDir,
    newIds,
    filtered,
    totalPages,
    safePage,
    list,
    toggleSort,
  } = useReportListState(reports);

  const {
    deletingId,
    confirmDeleteId,
    setConfirmDeleteId,
    pruneConfirmOpen,
    setPruneConfirmOpen,
    prunableCount,
    editingId,
    setEditingId,
    editName,
    setEditName,
    editInputRef,
    handleDelete,
    confirmDelete,
    handlePruneClick,
    confirmPrune,
    handleToggleFav,
    startEdit,
    commitEdit,
  } = useReportActions({ reload });

  /* 통계 */
  const stats = {
    total: reports.length,
    thisMonth: reports.filter(r => asDisplayText(r.createdAt).startsWith(thisMonth)).length,
    auto: 0,
    sharedLinks: reports.reduce((s, r) => s + reportNumber(r.links), 0),
  };

  if (loadError) {
    return (
      <main className="main">
        <div
          className="card"
          style={{ padding: 32, textAlign: 'center', color: 'var(--negative)', marginTop: 32 }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>보고서 로드 실패</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>
            {loadError.message || String(loadError)}
          </div>
          <button className="btn primary" onClick={reload}>
            다시 시도
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="main">
      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="보고서를 삭제할까요?"
        message="삭제한 보고서는 복구할 수 없습니다."
        confirmLabel="삭제"
        cancelLabel="취소"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
      <ConfirmDialog
        open={pruneConfirmOpen}
        title="오래된 보고서 정리"
        message={`90일이 지난 보고서 ${prunableCount}건을 삭제합니다. 되돌릴 수 없습니다.`}
        confirmLabel="정리"
        cancelLabel="취소"
        danger
        onConfirm={confirmPrune}
        onCancel={() => setPruneConfirmOpen(false)}
      />
      <PageHeader
        breadcrumb={['보고서센터']}
        title="보고서센터"
        sub="판매량·가격·출고량·비교·원가 보고서를 한 곳에서 생성하고 보관해요."
        actions={
          <>
            <button className="btn" onClick={handlePruneClick}>
              오래된 보고서 정리
            </button>
            <button className="btn" onClick={() => exportToExcel(reports)}>
              <Icon.download style={{ width: 14, height: 14 }} />
              엑셀로 내보내기
            </button>
            <button className="btn" onClick={() => setScheduleOpen(true)}>
              <Icon.gear style={{ width: 14, height: 14 }} />
              예약 설정
            </button>
            <button className="btn primary" onClick={() => setNewReportOpen(true)}>
              <Icon.plus style={{ width: 14, height: 14 }} />새 보고서 생성
            </button>
          </>
        }
      />

      <ReportStatsRow
        stats={stats}
        monthLabel={thisMonth.replace('-', '.')}
        onOpenSchedule={() => setScheduleOpen(true)}
      />

      <ReportKindGrid reports={reports} onOpenKind={href => router.push(href)} />

      <ReportFilterToolbar
        reports={reports}
        search={search}
        onSearch={setSearch}
        kindFilter={kindFilter}
        onKindFilterChange={setKindFilter}
        favOnly={favOnly}
        onFavOnlyChange={setFavOnly}
        filteredCount={filtered.length}
      />

      {/* 로딩 스켈레톤 */}
      {loading && (
        <div
          className="card"
          style={{
            padding: 'clamp(16px, 4vw, 24px) clamp(16px, 5vw, 28px)',
            overflow: 'hidden',
          }}
        >
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 12,
                marginBottom: 16,
                alignItems: 'center',
                minWidth: 0,
              }}
            >
              <div
                className="skeleton"
                style={{ width: 28, height: 28, borderRadius: 6, flexShrink: 0 }}
              />
              <div
                className="skeleton skeleton-text"
                style={{ flex: '0 1 80px', maxWidth: '100%' }}
              />
              <div className="skeleton skeleton-text" style={{ flex: '1 1 160px', minWidth: 0 }} />
              <div
                className="skeleton skeleton-text"
                style={{ flex: '0 1 60px', maxWidth: '100%' }}
              />
              <div
                className="skeleton skeleton-text"
                style={{ flex: '0 1 100px', maxWidth: '100%' }}
              />
              <div
                className="skeleton skeleton-text"
                style={{ flex: '0 1 120px', maxWidth: '100%' }}
              />
            </div>
          ))}
        </div>
      )}

      {/* 테이블 */}
      {!loading && (
        <div className="card table-card">
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table stagger-rows">
              <thead>
                <tr>
                  <th style={{ width: 36 }}></th>
                  <SortableTh
                    sortKey="id"
                    active={sortKey}
                    dir={sortDir}
                    onClick={toggleSort}
                    width={110}
                  >
                    보고서 ID
                  </SortableTh>
                  <SortableTh sortKey="name" active={sortKey} dir={sortDir} onClick={toggleSort}>
                    제목
                  </SortableTh>
                  <SortableTh
                    sortKey="kind"
                    active={sortKey}
                    dir={sortDir}
                    onClick={toggleSort}
                    width={80}
                  >
                    유형
                  </SortableTh>
                  <th style={{ width: 150 }}>대상 기간</th>
                  <th style={{ width: 100 }}>작성자</th>
                  <SortableTh
                    sortKey="createdAt"
                    active={sortKey}
                    dir={sortDir}
                    onClick={toggleSort}
                    width={140}
                  >
                    생성일시
                  </SortableTh>
                  <th style={{ width: 100 }}>활동</th>
                  <th style={{ width: 250 }}></th>
                </tr>
              </thead>
              <tbody>
                {list.map(r => {
                  const kind = safeReportKind(r.kind);
                  const chip = KIND_CHIP[kind] || KIND_CHIP.sales;
                  const originalName = asDisplayText(r.name);
                  const reportName = originalName || '이름 없는 보고서';
                  const reportId = asDisplayText(r.id);
                  const displayId = formatReportId(r.id);
                  const createdLabel = formatReportDate(r.createdAt);
                  const views = reportNumber(r.views);
                  const links = reportNumber(r.links);
                  const isDeleting = deletingId === r.id;
                  const isNew = newIds.has(r.id);
                  const isEditing = editingId === r.id;
                  return (
                    <tr
                      key={reportId || `${reportName}-${asDisplayText(r.createdAt)}`}
                      className={isDeleting ? 'deleting' : ''}
                      style={
                        isNew
                          ? { background: 'var(--accent-soft)', transition: 'background 2s ease' }
                          : undefined
                      }
                    >
                      <td>
                        <button
                          className={'fav-btn ' + (r.fav ? 'on' : '')}
                          onClick={() => handleToggleFav(r.id, r.fav)}
                          aria-label={r.fav ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                          title={r.fav ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                        >
                          ★
                        </button>
                      </td>
                      <td className="muted mono" style={{ fontSize: 11 }}>
                        {displayId}
                      </td>
                      <td className="cell-name">
                        {isEditing ? (
                          <input
                            ref={editInputRef}
                            className="input"
                            style={{ fontSize: 13, padding: '4px 8px', width: '100%' }}
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            onBlur={() => commitEdit(r)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                commitEdit(r);
                              }
                              if (e.key === 'Escape') {
                                const nextName = asDisplayText(editName).trim();
                                if (nextName && nextName !== originalName) {
                                  showToast('변경사항이 취소됐어요', 'warn');
                                }
                                setEditingId(null);
                              }
                            }}
                          />
                        ) : (
                          <button
                            className="report-name-btn"
                            onClick={() => setPreviewTarget(r)}
                            onDoubleClick={() => startEdit(r)}
                            title="더블클릭으로 이름 편집"
                          >
                            {reportName}
                          </button>
                        )}
                      </td>
                      <td>
                        <span className="chip" style={{ background: chip.bg, color: chip.color }}>
                          {chip.label}
                        </span>
                      </td>
                      <td className="mono" style={{ fontSize: 12, color: 'var(--text-2)' }}>
                        {asDisplayText(r.period, '—') || '—'}
                      </td>
                      <td>{asDisplayText(r.author, '—') || '—'}</td>
                      <td className="muted mono" style={{ fontSize: 12 }}>
                        {createdLabel}
                      </td>
                      <td>
                        <div className="report-activity">
                          <span title="조회수" className="activity-pill">
                            <svg
                              viewBox="0 0 24 24"
                              width="11"
                              height="11"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                            {views}
                          </span>
                          {links > 0 && (
                            <span
                              title="활성 공유 링크"
                              className="activity-pill"
                              style={{ background: '#F0EBFF', color: '#6B3FCB' }}
                            >
                              🔗{links}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                          <button
                            className="btn sm"
                            onClick={() => {
                              setPreviewPrintOnOpen(false);
                              setPreviewTarget(r);
                            }}
                          >
                            미리보기
                          </button>
                          <button className="btn sm" onClick={() => setShareTarget(r)}>
                            <Icon.upload style={{ width: 12, height: 12 }} />
                            공유
                          </button>
                          <button
                            className="btn sm"
                            onClick={() => {
                              setPreviewPrintOnOpen(true);
                              setPreviewTarget(r);
                            }}
                          >
                            <Icon.download style={{ width: 12, height: 12 }} />
                            PDF
                          </button>
                          <button
                            className="btn sm"
                            style={{ color: 'var(--negative)' }}
                            disabled={isDeleting}
                            onClick={() => handleDelete(r.id)}
                          >
                            <Icon.x style={{ width: 12, height: 12 }} />
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={9}>
                      <div className="empty-state" style={{ padding: 48 }}>
                        <div className="empty-icon-wrap">
                          <Icon.doc style={{ width: 32, height: 32 }} />
                        </div>
                        <div className="empty-title">
                          {reports.length === 0 ? '보고서가 없어요' : '조건에 맞는 보고서가 없어요'}
                        </div>
                        <div className="empty-sub">
                          {reports.length === 0
                            ? '위의 카드에서 원하는 보고서 종류를 선택해 첫 보고서를 생성해보세요.'
                            : '필터를 바꾸거나 새 보고서를 생성해보세요.'}
                        </div>
                        {reports.length === 0 && (
                          <button
                            className="btn primary"
                            style={{ marginTop: 8 }}
                            onClick={() => setNewReportOpen(true)}
                          >
                            <Icon.plus style={{ width: 13, height: 13 }} /> 새 보고서 생성
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="report-pagination">
              <button
                className="page-btn"
                disabled={safePage === 1}
                onClick={() => setPage(p => p - 1)}
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                .reduce((acc, p, i, arr) => {
                  if (i > 0 && arr[i - 1] !== p - 1) acc.push('…');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === '…' ? (
                    <span key={`e${i}`} style={{ padding: '0 4px', color: 'var(--text-3)' }}>
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      className={`page-btn ${p === safePage ? 'active' : ''}`}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  )
                )}
              <button
                className="page-btn"
                disabled={safePage === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                ›
              </button>
            </div>
          )}
        </div>
      )}

      {!loading && (
        <div className="card warn-card" style={{ marginTop: 0 }}>
          <div className="warn-ico">
            <Icon.alert style={{ width: 16, height: 16 }} />
          </div>
          <div>
            <div className="warn-title">보고서는 생성 시점의 데이터로 고정돼요</div>
            <div className="warn-text">
              제때 단가나 판매량이 이후 수정되어도 기존 보고서는 그대로 보관돼요. 다시 만들고 싶으면{' '}
              <b>새 보고서 생성</b>을 눌러주세요.
            </div>
          </div>
        </div>
      )}

      {shareTarget && <ShareLinkModal report={shareTarget} onClose={() => setShareTarget(null)} />}
      {scheduleOpen && <ScheduleManagerModal onClose={() => setScheduleOpen(false)} />}
      {previewTarget && (
        <ReportPreviewModal
          report={previewTarget}
          printOnOpen={previewPrintOnOpen}
          onClose={() => {
            setPreviewTarget(null);
            setPreviewPrintOnOpen(false);
          }}
          onShare={r => {
            setPreviewTarget(null);
            setPreviewPrintOnOpen(false);
            setShareTarget(r);
          }}
        />
      )}
      {newReportOpen && <NewReportModal onClose={() => setNewReportOpen(false)} router={router} />}
    </main>
  );
}
