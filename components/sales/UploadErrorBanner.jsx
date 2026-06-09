'use client';
import { useState } from 'react';
import { Icon } from '@/components/icons';
import { downloadCsv } from '@/lib/download';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

/**
 * UploadErrorBanner — 검증 실패 / 중복 월 / 파일 오류 표시
 *
 * - 5건 이하면 전부 표시
 * - 6건 이상이면 상위 5건 + "전체 N건 보기" 토글
 * - CSV 다운로드로 전체 오류 목록 내보내기 가능
 *
 * @param {{ reason: string, invalidRows?: Array }} error
 */
export function UploadErrorBanner({ error }) {
  const [expanded, setExpanded] = useState(false);

  if (!error) return null;
  const { reason, invalidRows } = error;
  const safeReason = asDisplayText(reason, '파일을 확인해 주세요.');
  const rows = asObjectArray(invalidRows);
  const hasMany = rows.length > 5;
  const visible = expanded || !hasMany ? rows : rows.slice(0, 5);

  function handleDownload() {
    const headers = ['행 번호', '오류 사유', '메뉴명', '값'];
    const data = rows.map(r => [
      asDisplayText(r.originalIndex),
      asDisplayText(r.reason),
      asDisplayText(r.rawMenuName),
      asDisplayText(r.quantity),
    ]);
    downloadCsv([headers, ...data], '업로드오류목록.csv');
  }

  return (
    <div
      className="info-banner"
      style={{
        marginTop: 16,
        background: 'var(--negative-soft)',
        borderColor: 'var(--negative-soft)',
      }}
    >
      <div className="info-banner-ico" style={{ background: 'var(--negative)', color: '#fff' }}>
        <Icon.alert style={{ width: 16, height: 16 }} />
      </div>
      <div style={{ flex: 1 }}>
        <b>업로드 차단</b> — {safeReason}
        {rows.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>
              총 <b>{rows.length}</b>건 오류{hasMany && !expanded ? ' (상위 5건 표시)' : ''}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {visible.map((r, i) => {
                const originalIndex = asDisplayText(r.originalIndex);
                const rowReason = asDisplayText(r.reason, '오류');
                const rawMenuName = asDisplayText(r.rawMenuName);

                return (
                  <div
                    key={`${originalIndex || 'row'}-${i}`}
                    style={{ fontSize: 12, display: 'flex', gap: 8, color: 'var(--text-2)' }}
                  >
                    <span style={{ color: 'var(--negative)', fontWeight: 700, minWidth: 48 }}>
                      {originalIndex ? `${originalIndex}행` : `#${i + 1}`}
                    </span>
                    <span style={{ color: 'var(--text-3)' }}>{rowReason}</span>
                    {rawMenuName && <span style={{ color: 'var(--text-2)' }}>— {rawMenuName}</span>}
                  </div>
                );
              })}
            </div>

            <div
              style={{
                marginTop: 8,
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              {hasMany && (
                <button
                  className="btn sm ghost"
                  onClick={() => setExpanded(e => !e)}
                  style={{ fontSize: 11 }}
                >
                  {expanded ? '접기' : `전체 ${rows.length}건 보기`}
                </button>
              )}
              <button className="btn sm ghost" onClick={handleDownload} style={{ fontSize: 11 }}>
                <Icon.download style={{ width: 11, height: 11 }} /> CSV 다운로드
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
