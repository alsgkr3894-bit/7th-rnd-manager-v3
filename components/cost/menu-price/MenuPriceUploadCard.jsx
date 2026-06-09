'use client';
import { useState, useRef } from 'react';
import { Icon } from '@/components/icons';
import { showToast } from '@/components/Toast';
import { downloadCsv, makeFileName, readFileAsText, readFileAsArrayBuffer } from '@/lib/download';
import { readCsvFile, readExcelFile } from '@/lib/excel';
import { formatNumber } from '@/lib/format';
import { buildTemplateRows, parseMenuPriceRows, replaceAllMenuPrices } from '@/lib/cost/menu-price';

/**
 * MenuPriceUploadCard
 * - 양식 다운로드 (CSV, BOM 포함)
 * - 파일 업로드 → 미리보기 (성공/실패 카운트, 행 일부)
 * - "최신본으로 반영" 클릭 시 기존 데이터 일괄 교체
 */
export function MenuPriceUploadCard({ onReplaced }) {
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(null); // { success, failed, fileName }
  const [committing, setCommitting] = useState(false);
  const notifyReplaced = typeof onReplaced === 'function' ? onReplaced : null;

  function handleDownloadTemplate() {
    downloadCsv(buildTemplateRows(), makeFileName('menu-price-template', 'csv'));
    showToast('양식이 다운로드됐어요', 'ok');
  }

  function pickFile() {
    fileInputRef.current?.click();
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // 같은 파일 재선택 가능하게
    if (!file) return;
    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let parsed;
      if (ext === 'csv') {
        const text = await readFileAsText(file, ['.csv']);
        parsed = readCsvFile(text);
      } else if (ext === 'xlsx' || ext === 'xls') {
        const buf = await readFileAsArrayBuffer(file, ['.xlsx', '.xls']);
        parsed = await readExcelFile(buf);
      } else {
        showToast('CSV 또는 엑셀(.xlsx, .xls) 파일만 지원합니다', 'err');
        return;
      }
      const { headers, rows } = parsed;
      const result = parseMenuPriceRows(headers, rows);
      if (!result.ok) {
        showToast(result.error || '파일 형식 오류', 'err');
        return;
      }
      setPreview({ ...result, fileName: file.name });
    } catch (err) {
      showToast('파일 읽기 실패: ' + (err?.message || err), 'err');
    }
  }

  async function handleCommit() {
    if (!preview || preview.success.length === 0) return;
    setCommitting(true);
    try {
      const { replaced } = await replaceAllMenuPrices(preview.success);
      showToast(`반영 완료 — ${replaced}개`, 'ok');
      setPreview(null);
      notifyReplaced?.();
    } catch (err) {
      showToast('반영 실패: ' + (err?.message || err), 'err');
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
            CSV 또는 엑셀(xlsx) 양식을 업로드하면 기존 메뉴 판매가가 새 데이터로 교체됩니다.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn sm" onClick={handleDownloadTemplate}>
            <Icon.download style={{ width: 13, height: 13 }} /> 양식 다운로드
          </button>
          <button className="btn sm primary" onClick={pickFile}>
            <Icon.upload style={{ width: 13, height: 13 }} /> 파일 선택
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFile}
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
                disabled={committing || preview.success.length === 0}
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
              <div style={{ fontWeight: 600, marginBottom: 4 }}>오류 행 (반영 제외):</div>
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
