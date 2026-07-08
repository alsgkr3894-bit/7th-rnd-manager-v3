'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { UploadDropzone } from '@/components/ui/UploadDropzone';
import { showToast } from '@/components/Toast';
import { useCurrentRole } from '@/hooks/useCurrentRole';
import { readSpreadsheetFile } from '@/lib/excel';
import { UPLOAD_EXT, UPLOAD_MAX_MB } from '@/lib/upload-policy';
import {
  buildCorporateCardMonthlySummary,
  downloadCorporateCardStatement,
  getCorporateCardEntries,
  importCorporateCardEntries,
  parseCorporateCardRows,
  removeCorporateCardEntry,
} from '@/lib/rnd/corporate-card';

const HIDDEN_DETECTED_COLUMNS = new Set(['cardName', 'ispMemo']);

function formatAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toLocaleString('ko-KR') : '0';
}

function detectedColumnText(columns = {}) {
  return Object.entries(columns)
    .filter(([key, value]) => value && !HIDDEN_DETECTED_COLUMNS.has(key))
    .map(([key, value]) => `${key}: ${value}`)
    .join(' · ');
}

function monthLabel(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})$/);
  if (!match) return value || '날짜 없음';
  return `${match[1]}년 ${Number(match[2])}월`;
}

export default function CorporateCardPage() {
  const { isAdmin, ready } = useCurrentRole();
  const canEdit = ready && isAdmin;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [lastImport, setLastImport] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await getCorporateCardEntries());
    } catch (err) {
      console.error('[corporate-card] load failed', err);
      showToast('법인카드 내역을 불러오지 못했습니다', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ready && canEdit) load();
  }, [ready, canEdit, load]);

  async function handleUpload(file, errorMsg) {
    if (errorMsg) {
      showToast(errorMsg, 'warn');
      return;
    }
    if (!file || !canEdit || uploading) return;
    setUploading(true);
    try {
      const parsed = await readSpreadsheetFile(file);
      const result = parseCorporateCardRows(parsed);
      if (result.entries.length === 0) {
        showToast('업로드할 법인카드 내역을 찾지 못했습니다', 'warn');
        setLastImport({
          fileName: file.name,
          inserted: 0,
          warnings: result.warnings,
          columns: result.columns,
        });
        return;
      }
      const saved = await importCorporateCardEntries(result.entries);
      const importedMonths = [...new Set(result.entries.map(row => row.yearMonth).filter(Boolean))];
      if (importedMonths.length === 1) setSelectedMonth(importedMonths[0]);
      setLastImport({
        fileName: file.name,
        inserted: saved.inserted,
        warnings: result.warnings,
        columns: result.columns,
      });
      await load();
      showToast(`법인카드 내역 ${saved.inserted}건을 업로드했습니다`, 'ok');
    } catch (err) {
      console.error('[corporate-card] upload failed', err);
      showToast('엑셀 업로드 실패: ' + (err?.message || '알 수 없는 오류'), 'error');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id) {
    if (!canEdit) return;
    await removeCorporateCardEntry(id);
    await load();
  }

  async function handleExport() {
    if (visibleRows.length === 0) {
      showToast('출력할 법인카드 내역이 없습니다', 'warn');
      return;
    }
    await downloadCorporateCardStatement(visibleRows);
  }

  const monthlySummary = useMemo(() => buildCorporateCardMonthlySummary(rows), [rows]);
  const visibleRows = useMemo(
    () => (selectedMonth === 'all' ? rows : rows.filter(row => row.yearMonth === selectedMonth)),
    [rows, selectedMonth]
  );
  const total = rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const visibleTotal = visibleRows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const selectedMonthLabel = selectedMonth === 'all' ? '전체 기간' : monthLabel(selectedMonth);

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['RND', '법인카드 내역서']}
        title="법인카드 내역서"
        sub={`저장 ${rows.length}건 · 합계 ${formatAmount(total)}원`}
        actions={
          <button className="btn primary" onClick={handleExport} disabled={rows.length === 0}>
            엑셀 출력
          </button>
        }
      />

      {!canEdit && ready ? (
        <section className="card" style={{ marginTop: 18 }}>
          관리자만 법인카드 내역을 업로드할 수 있습니다.
        </section>
      ) : (
        <>
          <div style={{ marginTop: 18 }}>
            <UploadDropzone
              onFile={handleUpload}
              accept={UPLOAD_EXT.excelOrCsv}
              maxSizeMB={UPLOAD_MAX_MB.excel}
              disabled={uploading || !canEdit}
              busyText="법인카드 엑셀 처리 중"
              title="법인카드 엑셀 파일 업로드"
              subText="사용일 기준으로 년월을 자동 저장하고 월별 합계를 계산합니다."
              rules={[
                {
                  type: 'ok',
                  text: '사용일·승인일·이용일, 사용처·가맹점명, 금액·승인금액 헤더를 자동 인식합니다.',
                },
                {
                  type: 'warn',
                  text: '업로드한 행은 기존 내역 뒤에 추가됩니다. 삭제가 필요한 행은 목록에서 개별 삭제하세요.',
                },
              ]}
            />
          </div>

          {lastImport && (
            <section className="card" style={{ marginTop: 12 }}>
              <div className="card-title">최근 업로드</div>
              <div style={{ color: 'var(--text-2)', fontSize: 13, marginTop: 6 }}>
                {lastImport.fileName} · 저장 {lastImport.inserted}건
              </div>
              {detectedColumnText(lastImport.columns) && (
                <div style={{ color: 'var(--text-3)', fontSize: 12, marginTop: 6 }}>
                  인식 컬럼: {detectedColumnText(lastImport.columns)}
                </div>
              )}
              {lastImport.warnings?.length > 0 && (
                <ul
                  style={{ margin: '8px 0 0', paddingLeft: 18, color: 'var(--warn)', fontSize: 12 }}
                >
                  {lastImport.warnings.slice(0, 8).map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                  {lastImport.warnings.length > 8 && (
                    <li>외 {lastImport.warnings.length - 8}건의 경고가 더 있습니다.</li>
                  )}
                </ul>
              )}
            </section>
          )}

          <section className="card" style={{ marginTop: 18 }}>
            <div
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div className="card-title">월별 총금액</div>
                <div className="card-sub">
                  {selectedMonthLabel} · {visibleRows.length}건 · {formatAmount(visibleTotal)}원
                </div>
              </div>
              <button
                className={'btn sm' + (selectedMonth === 'all' ? ' primary' : '')}
                type="button"
                onClick={() => setSelectedMonth('all')}
              >
                전체 {formatAmount(total)}원
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              {monthlySummary.length === 0 ? (
                <span className="muted" style={{ fontSize: 13 }}>
                  저장된 월별 내역이 없습니다.
                </span>
              ) : (
                monthlySummary.map(item => (
                  <button
                    key={item.yearMonth}
                    className={'btn sm' + (selectedMonth === item.yearMonth ? ' primary' : '')}
                    type="button"
                    onClick={() => setSelectedMonth(item.yearMonth)}
                    style={{ justifyContent: 'space-between', gap: 12 }}
                  >
                    <span>{monthLabel(item.yearMonth)}</span>
                    <span className="mono">{formatAmount(item.total)}원</span>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="card table-card" style={{ marginTop: 18 }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>사용일</th>
                    <th>사용처</th>
                    <th style={{ textAlign: 'right' }}>금액</th>
                    <th style={{ textAlign: 'right' }}>부가세</th>
                    <th>계정과목</th>
                    <th>비고</th>
                    <th style={{ width: 80 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7}>불러오는 중</td>
                    </tr>
                  ) : visibleRows.length === 0 ? (
                    <tr>
                      <td colSpan={7}>선택한 월에 저장된 법인카드 내역이 없습니다.</td>
                    </tr>
                  ) : (
                    visibleRows.map(row => (
                      <tr key={row.id}>
                        <td>{row.usedAt || '-'}</td>
                        <td>{row.vendor || '-'}</td>
                        <td style={{ textAlign: 'right' }}>{formatAmount(row.amount)}원</td>
                        <td style={{ textAlign: 'right' }}>{formatAmount(row.vat)}원</td>
                        <td>{row.category || '-'}</td>
                        <td>{row.memo || '-'}</td>
                        <td>
                          <button
                            className="btn sm"
                            onClick={() => handleDelete(row.id)}
                            disabled={!canEdit}
                          >
                            삭제
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
