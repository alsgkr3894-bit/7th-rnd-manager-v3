'use client';
import { useState, useRef } from 'react';
import { Icon } from '@/components/icons';
import { showToast } from '@/components/Toast';
import { downloadCsv, downloadFailedRows } from '@/lib/download';
import {
  UPLOAD_EXT,
  UPLOAD_MAX_MB,
  checkFileExt,
  checkFileSize,
  parseErrorMsg,
} from '@/lib/upload-policy';
import { readSpreadsheetFile } from '@/lib/excel';
import { formatNumber } from '@/lib/format';
import {
  buildTemplateRows,
  parseMenuPriceRows,
  previewMenuPriceReplacement,
  replaceAllMenuPrices,
} from '@/lib/cost/menu-price';

/**
 * MenuPriceUploadCard
 * - 양식 다운로드 (CSV, BOM 포함)
 * - 파일 업로드 → 미리보기 (성공/실패 카운트, 행 일부)
 * - "최신본으로 반영" 클릭 시 기존 데이터 일괄 교체
 */
export function MenuPriceUploadCard({ onReplaced, isViewer = false }) {
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(null); // { success, failed, fileName, replacementImpact? }
  const [committing, setCommitting] = useState(false);
  const notifyReplaced = typeof onReplaced === 'function' ? onReplaced : null;

  function handleDownloadTemplate() {
    downloadCsv(buildTemplateRows(), '메뉴판매가업로드양식.csv');
    showToast('양식이 다운로드됐어요', 'ok');
  }

  function pickFile() {
    if (isViewer) {
      showToast('관리자 권한이 필요합니다', 'error');
      return;
    }
    fileInputRef.current?.click();
  }

  async function handleFile(e) {
    if (isViewer) {
      e.target.value = '';
      showToast('관리자 권한이 필요합니다', 'error');
      return;
    }
    const file = e.target.files?.[0];
    e.target.value = ''; // 같은 파일 재선택 가능하게
    if (!file) return;
    const sizeErr = checkFileSize(file, UPLOAD_MAX_MB.excel);
    if (sizeErr) {
      showToast(sizeErr, 'error');
      return;
    }
    const extErr = checkFileExt(file, UPLOAD_EXT.excelOrCsv);
    if (extErr) {
      showToast(extErr, 'error');
      return;
    }
    try {
      const parsed = await readSpreadsheetFile(file);
      const { headers, rows } = parsed;
      const result = parseMenuPriceRows(headers, rows);
      if (!result.ok) {
        showToast(result.error || '파일 형식 오류', 'error');
        return;
      }
      if (result.success.length === 0 && result.failed.length === 0) {
        showToast('저장할 행이 없습니다', 'error');
        return;
      }
      let replacementImpact = null;
      if (result.success.length > 0) {
        try {
          replacementImpact = await previewMenuPriceReplacement(result.success);
        } catch (previewErr) {
          console.warn('[MenuPriceUpload] replacement preview failed:', previewErr);
        }
      }
      setPreview({ ...result, fileName: file.name, replacementImpact });
    } catch (err) {
      showToast(parseErrorMsg(err), 'error');
    }
  }

  async function handleCommit() {
    if (!preview || preview.success.length === 0) return;
    if (preview.failed.length > 0) {
      showToast('오류 행을 먼저 수정한 뒤 다시 업로드해주세요.', 'error');
      return;
    }
    if (isViewer) {
      showToast('관리자 권한이 필요합니다', 'error');
      return;
    }
    setCommitting(true);
    try {
      const { replaced, sync } = await replaceAllMenuPrices(preview.success);
      if (sync?.error) {
        showToast(`판매가 ${replaced}개 반영 · ${sync.error}`, 'warn', 8000);
      } else {
        showToast(`반영 완료 — ${replaced}개`, 'ok');
      }
      setPreview(null);
      notifyReplaced?.();
    } catch (err) {
      showToast('반영 실패: ' + (err?.message || err), 'error');
    } finally {
      setCommitting(false);
    }
  }

  return (
    <div className="card" style={{ padding: '16px 18px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>양식 업로드</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
            CSV, TSV 또는 엑셀(xlsx) 양식을 업로드하면 기존 메뉴 판매가가 새 데이터로 교체됩니다.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn sm" onClick={handleDownloadTemplate}>
            <Icon.download style={{ width: 13, height: 13 }} /> 양식 다운로드
          </button>
          <button className="btn sm primary" onClick={pickFile} disabled={isViewer}>
            <Icon.upload style={{ width: 13, height: 13 }} /> 파일 선택
          </button>
          <input
            ref={fileInputRef}
            data-testid="menu-price-upload-input"
            type="file"
            accept=".csv,.tsv,.xlsx,.xls"
            onChange={handleFile}
            disabled={isViewer}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {preview && (
        <div
          style={{
            marginTop: 14,
            padding: '12px 14px',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 10,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ fontSize: 13 }}>
              <b>{preview.fileName}</b> — 정상 {preview.success.length}건
              {preview.failed.length > 0 && (
                <span style={{ color: 'var(--warn)', marginLeft: 8 }}>
                  · 오류 {preview.failed.length}건
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn sm" onClick={() => setPreview(null)} disabled={committing}>
                취소
              </button>
              <button
                className="btn sm primary"
                onClick={handleCommit}
                disabled={
                  committing ||
                  isViewer ||
                  preview.success.length === 0 ||
                  preview.failed.length > 0
                }
              >
                {committing ? '반영 중…' : '최신본으로 반영'}
              </button>
            </div>
          </div>

          {preview.success.length > 0 && (
            <div
              style={{
                marginTop: 10,
                fontSize: 12,
                color: 'var(--text-2)',
                maxHeight: 140,
                overflowY: 'auto',
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-3)',
                  marginBottom: 4,
                  fontStyle: 'italic',
                }}
              >
                메뉴코드 비어있는 행은 저장 시 자동 발급됩니다 (분류별 시퀀스)
              </div>
              {preview.replacementImpact && (
                <div
                  style={{
                    marginBottom: 8,
                    padding: '7px 9px',
                    borderRadius: 8,
                    background:
                      preview.replacementImpact.removed > 0
                        ? 'var(--warn-soft)'
                        : 'var(--positive-soft)',
                    color:
                      preview.replacementImpact.removed > 0 ? 'var(--warn)' : 'var(--positive)',
                    fontWeight: 700,
                  }}
                >
                  기존 {formatNumber(preview.replacementImpact.existing)}건 → 반영{' '}
                  {formatNumber(preview.replacementImpact.replacement)}건 · 유지/갱신{' '}
                  {formatNumber(preview.replacementImpact.retained)}건 · 신규{' '}
                  {formatNumber(preview.replacementImpact.created)}건 · 삭제 예정{' '}
                  {formatNumber(preview.replacementImpact.removed)}건
                </div>
              )}
              {preview.success.slice(0, 8).map((r, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: 8,
                    padding: '3px 0',
                    borderBottom: '1px dashed var(--divider)',
                  }}
                >
                  <span
                    style={{
                      color: 'var(--text-3)',
                      minWidth: 88,
                      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                      fontSize: 11,
                    }}
                  >
                    {r.menuCode || '(자동)'}
                  </span>
                  <span style={{ color: 'var(--text-3)', minWidth: 56 }}>{r.category || '—'}</span>
                  <span style={{ flex: 1, fontWeight: 600 }}>{r.menuName}</span>
                  <span style={{ color: 'var(--text-3)', minWidth: 30 }}>{r.size}</span>
                  <span style={{ minWidth: 80, textAlign: 'right' }}>
                    {formatNumber(r.price)}원
                  </span>
                </div>
              ))}
              {preview.success.length > 8 && (
                <div style={{ padding: '4px 0', color: 'var(--text-3)', fontSize: 11 }}>
                  … 외 {preview.success.length - 8}건
                </div>
              )}
            </div>
          )}

          {preview.failed.length > 0 && (
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--warn)' }}>
              <div style={{ marginBottom: 6, fontWeight: 700 }}>
                오류 행이 있으면 기존 판매가 전체 교체를 진행하지 않습니다.
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                <span>오류 행 (반영 제외):</span>
                <button
                  className="btn xs"
                  style={{ fontWeight: 400 }}
                  onClick={() =>
                    downloadFailedRows(
                      preview.failed.map(f => ({
                        행번호: f.rowIndex,
                        사유: f.reason,
                        메뉴명: f.menuName || '',
                      })),
                      '메뉴판매가_오류행.csv'
                    )
                  }
                >
                  <Icon.download style={{ width: 11, height: 11 }} /> CSV
                </button>
              </div>
              {preview.failed.slice(0, 5).map((f, i) => (
                <div key={i}>
                  · {f.rowIndex}행 — {f.reason}
                  {f.menuName ? ` (${f.menuName})` : ''}
                </div>
              ))}
              {preview.failed.length > 5 && (
                <div style={{ color: 'var(--text-3)', marginTop: 2 }}>
                  … 외 {preview.failed.length - 5}건
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
