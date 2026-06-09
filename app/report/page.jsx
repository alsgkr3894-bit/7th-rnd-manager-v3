'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { loadXlsx } from '@/lib/excel';
import { Icon } from '@/components/icons';
import { PageHeader, FilterBar } from '@/components/ui/PageHeader';
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
import {
  getReports,
  deleteReport,
  toggleReportFav,
  saveReport,
  pruneOldReports,
} from '@/lib/report';
import { KIND_META, KIND_CHIP, KIND_EMOJI } from '@/lib/report/constants';
import { useCountUp } from '@/hooks/useCountUp';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import { useDBLoad } from '@/hooks/useDBLoad';
import { asDisplayText, asObjectArray, asFiniteNumber, clampInteger } from '@/lib/ui/prop-guards';

const REPORT_KINDS = KIND_META;
const REPORT_SORT_KEYS = new Set(['id', 'name', 'kind', 'createdAt']);

function SortIco({ k, sortKey, sortDir }) {
  return (
    <span style={{ marginLeft: 4, opacity: sortKey === k ? 1 : 0.3, fontSize: 10 }}>
      {sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  );
}

const ITEMS_PER_PAGE = 10;
const thisMonth = new Date().toISOString().slice(0, 7);

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

function reportSearchText(report) {
  return [
    asDisplayText(report?.name),
    asDisplayText(report?.period),
    asDisplayText(report?.author),
  ].join('');
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
  XLSX.writeFile(wb, `보고서목록_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/* ============================================================
   Page
============================================================ */
export default function Page() {
  const router = useRouter();
  const [kindFilter, setKindFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [favOnly, setFavOnly] = useState(false);
  const [shareTarget, setShareTarget] = useState(null);
  const [previewTarget, setPreviewTarget] = useState(null);
  const [previewPrintOnOpen, setPreviewPrintOnOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [newReportOpen, setNewReportOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [newIds, setNewIds] = useState(new Set());
  const editInputRef = useRef(null);
  const newIdsTimerRef = useRef(null);
  const editFocusTimerRef = useRef(null);

  /* 로드 */
  const { data: reportsData, loading, reload } = useDBLoad(() => getReports());
  const reports = useMemo(() => asObjectArray(reportsData), [reportsData]);

  useVisibilityRefresh(reload);

  /* URL 상태 복원 (page, sort, dir) + 새 보고서 하이라이트 */
  useEffect(() => {
    pruneOldReports(90).catch(e => console.warn('[report] pruneOldReports 실패', e));
    const url = new URL(window.location.href);
    const initialPage = clampInteger(url.searchParams.get('p') || 1, { min: 1, fallback: 1 });
    const sortParam = url.searchParams.get('sort');
    const dirParam = url.searchParams.get('dir');
    const newIdParam = url.searchParams.get('new');
    const newId = newIdParam ? clampInteger(newIdParam, { min: 1, fallback: null }) : null;
    if (initialPage > 1) setPage(initialPage);
    if (REPORT_SORT_KEYS.has(sortParam)) setSortKey(sortParam);
    if (dirParam === 'asc' || dirParam === 'desc') setSortDir(dirParam);
    if (newId && !Number.isNaN(newId)) {
      setNewIds(new Set([newId]));
      if (newIdsTimerRef.current) clearTimeout(newIdsTimerRef.current);
      newIdsTimerRef.current = setTimeout(() => {
        setNewIds(new Set());
        newIdsTimerRef.current = null;
      }, 5000);
    }
    url.searchParams.delete('new');
    window.history.replaceState({}, '', url.toString());
    return () => {
      if (newIdsTimerRef.current) clearTimeout(newIdsTimerRef.current);
      if (editFocusTimerRef.current) clearTimeout(editFocusTimerRef.current);
    };
  }, []);

  /* 정렬·페이지 변경 시 URL 갱신 */
  useEffect(() => {
    const url = new URL(window.location.href);
    if (page > 1) url.searchParams.set('p', page);
    else url.searchParams.delete('p');
    if (sortKey !== 'createdAt') url.searchParams.set('sort', sortKey);
    else url.searchParams.delete('sort');
    if (sortDir !== 'desc') url.searchParams.set('dir', sortDir);
    else url.searchParams.delete('dir');
    window.history.replaceState({}, '', url.toString());
  }, [page, sortKey, sortDir]);

  /* 삭제 (페이드아웃) */
  const handleDelete = async id => {
    setConfirmDeleteId(id);
  };
  const confirmDelete = async () => {
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    setDeletingId(id);
    await new Promise(r => setTimeout(r, 360));
    try {
      await deleteReport(id);
      showToast('보고서가 삭제됐어요.', 'ok');
      reload();
    } catch {
      showToast('삭제 중 오류가 발생했어요.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  /* 즐겨찾기 */
  const handleToggleFav = async (id, fav) => {
    try {
      await toggleReportFav(id, fav);
      reload();
    } catch {
      showToast('즐겨찾기 변경 중 오류가 발생했어요.', 'error');
    }
  };

  /* 이름 인라인 편집 */
  const startEdit = r => {
    setEditingId(r?.id);
    setEditName(asDisplayText(r?.name));
    if (editFocusTimerRef.current) clearTimeout(editFocusTimerRef.current);
    editFocusTimerRef.current = setTimeout(() => {
      editInputRef.current?.focus();
      editFocusTimerRef.current = null;
    }, 50);
  };
  const commitEdit = async r => {
    const nextName = asDisplayText(editName).trim();
    const prevName = asDisplayText(r?.name);
    if (nextName && nextName !== prevName) {
      try {
        await saveReport({ ...r, name: nextName });
        reload();
      } catch {
        showToast('이름 변경 중 오류가 발생했어요.', 'error');
      }
    }
    setEditingId(null);
  };

  /* 정렬 */
  const toggleSort = key => {
    if (!REPORT_SORT_KEYS.has(key)) return;
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('desc');
    }
  };
  /* 필터 + 정렬 */
  const filtered = useMemo(
    () =>
      reports
        .filter(r => {
          if (kindFilter !== 'all' && safeReportKind(r.kind) !== kindFilter) return false;
          if (favOnly && !r.fav) return false;
          const q = asDisplayText(search).trim().toLowerCase();
          if (q && !reportSearchText(r).toLowerCase().includes(q)) return false;
          return true;
        })
        .sort((a, b) => {
          let valA = a[sortKey],
            valB = b[sortKey];
          if (sortKey === 'name' || sortKey === 'kind') {
            valA = asDisplayText(valA);
            valB = asDisplayText(valB);
            return sortDir === 'asc'
              ? valA.localeCompare(valB, 'ko')
              : valB.localeCompare(valA, 'ko');
          }
          if (!valA && !valB) return 0;
          if (!valA) return 1;
          if (!valB) return -1;
          const cmp = valA > valB ? 1 : valA < valB ? -1 : 0;
          return sortDir === 'asc' ? cmp : -cmp;
        }),
    [reports, kindFilter, favOnly, search, sortKey, sortDir]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const list = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  useEffect(() => {
    setPage(1);
  }, [kindFilter, search, favOnly, sortKey, sortDir]);

  /* 통계 */
  const stats = {
    total: reports.length,
    thisMonth: reports.filter(r => asDisplayText(r.createdAt).startsWith(thisMonth)).length,
    auto: 0,
    sharedLinks: reports.reduce((s, r) => s + reportNumber(r.links), 0),
  };
  const cTotal = useCountUp(stats.total, { duration: 900 });
  const cThisMonth = useCountUp(stats.thisMonth, { duration: 900, delay: 80 });
  const cSharedLinks = useCountUp(stats.sharedLinks, { duration: 900, delay: 160 });

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
      <PageHeader
        breadcrumb={['보고서센터']}
        title="보고서센터"
        sub="판매량·가격·출고량·비교·원가 보고서를 한 곳에서 생성하고 보관해요."
        actions={
          <>
            <button className="btn" onClick={() => exportToExcel(reports)}>
              <Icon.download style={{ width: 14, height: 14 }} />
              Excel 내보내기
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

      {/* stat-row — stagger 진입 */}
      <div className="stat-row motion-stagger">
        <div className="stat-card">
          <div className="stat-label">전체 보고서</div>
          <div className="stat-value num">
            {cTotal}
            <span className="unit">건</span>
          </div>
          <div className="stat-foot">전체 기간</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">이번 달 생성</div>
          <div className="stat-value num" style={{ color: 'var(--accent-text)' }}>
            {cThisMonth}
            <span className="unit">건</span>
          </div>
          <div className="stat-foot">{thisMonth.replace('-', '.')} 기준</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">자동 예약</div>
          <div className="stat-value num">
            {stats.auto}
            <span className="unit">건</span>
          </div>
          <div className="stat-foot">
            <button className="link" onClick={() => setScheduleOpen(true)}>
              예약 관리 →
            </button>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">활성 공유 링크</div>
          <div className="stat-value num" style={{ color: '#6B3FCB' }}>
            {cSharedLinks}
            <span className="unit">개</span>
          </div>
          <div className="stat-foot">
            {stats.sharedLinks === 0 ? '활성 링크 없음' : `${stats.sharedLinks}개 활성`}
          </div>
        </div>
      </div>

      {/* 5종 카드 — stagger 진입 */}
      <div className="report-kind-grid report-kind-grid-5 motion-stagger">
        {Object.values(REPORT_KINDS).map(k => {
          const IconEl = Icon[k.icon] || Icon.doc;
          const href = k.id === 'compare' ? '/report/menu-sales-compare' : `/report/${k.id}`;
          return (
            <button key={k.id} className="report-kind-card" onClick={() => router.push(href)}>
              <div
                className="report-kind-ico"
                style={{ background: k.color + '1A', color: k.color }}
              >
                <IconEl style={{ width: 22, height: 22 }} />
              </div>
              <div className="report-kind-body">
                <div className="report-kind-title">{k.title}</div>
                <div className="report-kind-sub">{k.sub}</div>
              </div>
              <div className="report-kind-foot">
                <span className="report-kind-meta">
                  최근 {reports.filter(r => safeReportKind(r.kind) === k.id).length}건
                </span>
                <Icon.chevRight style={{ width: 14, height: 14, color: 'var(--text-4)' }} />
              </div>
            </button>
          );
        })}
      </div>

      {/* 필터바 */}
      <FilterBar
        search={search}
        onSearch={setSearch}
        chips={[
          { id: 'all', label: '전체' },
          { id: 'sales', label: '판매량' },
          { id: 'cost', label: '원가' },
          { id: 'price', label: '가격' },
          { id: 'shipment', label: '출고량' },
          { id: 'compare', label: '비교' },
        ].map(c => ({
          label: c.label,
          count:
            c.id === 'all'
              ? reports.length
              : reports.filter(r => safeReportKind(r.kind) === c.id).length,
          active: kindFilter === c.id,
          onClick: () => setKindFilter(c.id),
        }))}
      />

      <div className="report-list-toolbar">
        <button
          className={'report-toolbar-pill ' + (favOnly ? 'active' : '')}
          onClick={() => setFavOnly(v => !v)}
        >
          <span style={{ color: '#F59E0B' }}>★</span>즐겨찾기만
          <span className="muted">({reports.filter(r => r.fav).length})</span>
        </button>
        <div className="muted" style={{ fontSize: 12, marginLeft: 'auto' }}>
          {filtered.length}건 표시
        </div>
      </div>

      {/* 로딩 스켈레톤 */}
      {loading && (
        <div className="card" style={{ padding: '24px 28px' }}>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}
            >
              <div
                className="skeleton"
                style={{ width: 28, height: 28, borderRadius: 6, flexShrink: 0 }}
              />
              <div className="skeleton skeleton-text" style={{ width: 80, flexShrink: 0 }} />
              <div className="skeleton skeleton-text" style={{ flex: 1 }} />
              <div className="skeleton skeleton-text" style={{ width: 60, flexShrink: 0 }} />
              <div className="skeleton skeleton-text" style={{ width: 100, flexShrink: 0 }} />
              <div className="skeleton skeleton-text" style={{ width: 120, flexShrink: 0 }} />
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
                  <th style={{ width: 110, cursor: 'pointer' }} onClick={() => toggleSort('id')}>
                    보고서 ID
                    <SortIco k="id" sortKey={sortKey} sortDir={sortDir} />
                  </th>
                  <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('name')}>
                    제목
                    <SortIco k="name" sortKey={sortKey} sortDir={sortDir} />
                  </th>
                  <th style={{ width: 80, cursor: 'pointer' }} onClick={() => toggleSort('kind')}>
                    유형
                    <SortIco k="kind" sortKey={sortKey} sortDir={sortDir} />
                  </th>
                  <th style={{ width: 150 }}>대상 기간</th>
                  <th style={{ width: 100 }}>작성자</th>
                  <th
                    style={{ width: 140, cursor: 'pointer' }}
                    onClick={() => toggleSort('createdAt')}
                  >
                    생성일시
                    <SortIco k="createdAt" sortKey={sortKey} sortDir={sortDir} />
                  </th>
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

/* ── 새 보고서 종류 선택 모달 ── */
const NEW_REPORT_KINDS = Object.values(KIND_META);

function NewReportModal({ onClose, router }) {
  return (
    <div className="palette-scrim" onClick={onClose}>
      <div
        className="modal-box"
        style={{ maxWidth: 480, padding: 0, overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>새 보고서 생성</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
            생성할 보고서 종류를 선택하세요
          </div>
        </div>
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NEW_REPORT_KINDS.map(k => (
            <button
              key={k.id}
              onClick={() => {
                onClose();
                router.push(k.href);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '12px 14px',
                borderRadius: 12,
                textAlign: 'left',
                cursor: 'pointer',
                border: '1px solid transparent',
                background: 'transparent',
              }}
              className="company-drop-item"
            >
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: k.color + '1A',
                  color: k.color,
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                  fontSize: 18,
                }}
              >
                {KIND_EMOJI[k.id] || '📄'}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    display: 'block',
                    fontWeight: 700,
                    fontSize: 13,
                    color: 'var(--text-1)',
                  }}
                >
                  {k.title}
                </span>
                <span
                  style={{ display: 'block', fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}
                >
                  {k.sub}
                </span>
              </span>
              <Icon.chevRight
                style={{ width: 14, height: 14, color: 'var(--text-4)', flexShrink: 0 }}
              />
            </button>
          ))}
        </div>
        <div
          style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', textAlign: 'right' }}
        >
          <button className="btn" onClick={onClose}>
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
