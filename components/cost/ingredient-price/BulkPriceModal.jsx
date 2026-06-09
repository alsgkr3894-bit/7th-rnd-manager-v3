'use client';
import { useState, useRef, useCallback, useMemo } from 'react';
import { showToast } from '@/components/Toast';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { Icon } from '@/components/icons';
import { formatNumber } from '@/lib/format';
import { readSpreadsheetFile } from '@/lib/excel';
import { parseBulkPriceRows, matchAndApply, commitBulkPrice } from '@/lib/cost/bulk-price-update';
import { asObjectArray } from '@/lib/ui/prop-guards';

// ── 보조 스타일 컴포넌트 ──────────────────────────────────────

function StatusBadge({ count, color, label }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
      background: `color-mix(in srgb, ${color} 14%, transparent)`,
      color,
    }}>
      {count} {label}
    </span>
  );
}

function PriceDelta({ oldPrice, newPrice }) {
  if (oldPrice == null) return <span style={{ color: 'var(--text-3)', fontSize: 11 }}>신규</span>;
  const delta = newPrice - oldPrice;
  if (delta === 0) return <span style={{ color: 'var(--text-3)', fontSize: 11 }}>변동 없음</span>;
  const color = delta > 0 ? 'var(--negative, #ef4444)' : 'var(--positive)';
  return (
    <span style={{ color, fontWeight: 600, fontSize: 12 }}>
      {delta > 0 ? '+' : ''}{formatNumber(delta)}원
    </span>
  );
}

const noop = () => {};

// ── 메인 컴포넌트 ─────────────────────────────────────────────

/**
 * 식자재 일괄 가격 업로드 모달.
 *
 * Props:
 *   existingIngredients  - cost_ingredients 전체 레코드 배열
 *   onDone               - 커밋 성공 시 호출 (부모가 목록 새로고침)
 *   onClose              - 모달 닫기
 */
export function BulkPriceModal({ existingIngredients, onDone, onClose }) {
  const fileRef = useRef(null);
  const safeExistingIngredients = useMemo(() => asObjectArray(existingIngredients), [existingIngredients]);
  const close = typeof onClose === 'function' ? onClose : noop;

  const [phase,     setPhase]     = useState('idle');   // idle | parsing | preview | committing | done
  const [error,     setError]     = useState(null);
  const [fileName,  setFileName]  = useState('');
  const [preview,   setPreview]   = useState(null);     // { matched, unmatched }
  const [committing, setCommitting] = useState(false);

  // ── 파일 선택 처리 ────────────────────────────────────────
  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setError(null);
    setFileName(file.name);
    setPhase('parsing');
    try {
      const { rows } = await readSpreadsheetFile(file);
      if (!rows || rows.length === 0) throw new Error('파일에 데이터 행이 없습니다.');

      const parsed = parseBulkPriceRows(rows);
      if (parsed.length === 0) {
        throw new Error(
          '유효한 행을 찾지 못했습니다. 예상 컬럼: 상품코드(필수), 단가(필수), 재료명(선택).'
        );
      }

      const diff = matchAndApply(parsed, safeExistingIngredients);
      setPreview(diff);
      setPhase('preview');
    } catch (e) {
      setError(e?.message || '파일 파싱 중 오류가 발생했습니다.');
      setPhase('idle');
    }
  }, [safeExistingIngredients]);

  const handleInputChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  }, [handleFile]);

  // ── 커밋 ────────────────────────────────────────────────
  const handleCommit = useCallback(async () => {
    const matched = asObjectArray(preview?.matched);
    if (matched.length === 0) return;
    setCommitting(true);
    setError(null);
    try {
      const result = await commitBulkPrice(matched);
      const { applied, skipped } = typeof result === 'object' ? result : { applied: result, skipped: 0 };
      setPhase('done');
      if (skipped > 0) {
        showToast(`${applied}개 적용 완료 · ${skipped}개 건너뜀 (동시 삭제)`, 'warn');
      }
      onDone?.(applied);
    } catch (e) {
      setError(e?.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setCommitting(false);
    }
  }, [preview, onDone]);

  // ── 재선택 ───────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setPhase('idle');
    setPreview(null);
    setFileName('');
    setError(null);
  }, []);

  // ── 렌더 ─────────────────────────────────────────────────
  return (
    <ModalFrame
      title="일괄 가격 업로드"
      subtitle="CSV 또는 Excel 파일로 식자재 단가를 한 번에 업데이트합니다"
      onClose={close}
      width="min(720px, 96vw)"
      zIndex={300}
      padding="24px 28px"
    >
      {/* 포맷 힌트 */}
      <div style={{
        padding: '10px 14px', borderRadius: 8,
        background: 'var(--surface-2)', fontSize: 12,
        color: 'var(--text-2)', marginBottom: 16,
        lineHeight: 1.7,
      }}>
        <b>필수 컬럼:</b> 상품코드 (또는 제품코드·코드·productCode)&emsp;
        <b>단가</b> (또는 가격·부가세포함가·price)
        <br/>
        <b>선택 컬럼:</b> 재료명 (또는 품목명·제품명)&emsp;
        <span style={{ color: 'var(--text-3)' }}>지원 형식: .csv, .xlsx, .xls</span>
      </div>

      {/* 파일 선택 영역 */}
      {phase === 'idle' && (
        <div
          style={{
            border: '2px dashed var(--border)', borderRadius: 10,
            padding: '40px 24px', textAlign: 'center', cursor: 'pointer',
            background: 'var(--surface)',
            transition: 'border-color .15s, background .15s',
          }}
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
        >
          <Icon.upload style={{ width: 32, height: 32, opacity: .4, marginBottom: 12 }}/>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>파일을 선택하거나 드래그하세요</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>.csv · .xlsx · .xls</div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            style={{ display: 'none' }}
            onChange={handleInputChange}
          />
        </div>
      )}

      {/* 파싱 중 */}
      {phase === 'parsing' && (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-3)' }}>
          <div style={{ fontSize: 13 }}>파일 분석 중… <b>{fileName}</b></div>
        </div>
      )}

      {/* 미리보기 */}
      {phase === 'preview' && preview && (() => {
        const matched = asObjectArray(preview.matched);
        const unmatched = asObjectArray(preview.unmatched);
        return (
        <>
          {/* 요약 배지 */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{fileName}</span>
            <StatusBadge count={matched.length}   color="var(--accent)"          label="매칭" />
            <StatusBadge count={unmatched.length} color="var(--text-3)"           label="미매칭" />
            {matched.length > 0 && (
              <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 'auto' }}>
                매칭된 항목의 <b>priceOverride</b> 필드를 업데이트합니다
              </span>
            )}
          </div>

          {/* 매칭 테이블 */}
          {matched.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 6 }}>
                업데이트 항목 ({matched.length}개)
              </div>
              <div style={{ overflowX: 'auto', maxHeight: 320, overflowY: 'auto', borderRadius: 8, border: '1px solid var(--border)' }}>
                <table className="data-table" style={{ minWidth: 480 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 90 }}>제품코드</th>
                      <th>재료명</th>
                      <th style={{ width: 110, textAlign: 'right' }}>현재 단가</th>
                      <th style={{ width: 110, textAlign: 'right' }}>새 단가</th>
                      <th style={{ width: 100, textAlign: 'right' }}>변동</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matched.map(item => (
                      <tr key={item.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{item.productCode}</td>
                        <td style={{ fontSize: 13 }}>{item.name}</td>
                        <td style={{ textAlign: 'right', fontSize: 13, color: 'var(--text-3)' }}>
                          {item.oldPrice != null ? `${formatNumber(item.oldPrice)}원` : '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13 }}>
                          {formatNumber(item.newPrice)}원
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <PriceDelta oldPrice={item.oldPrice} newPrice={item.newPrice} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 미매칭 목록 (접힘) */}
          {unmatched.length > 0 && (
            <details style={{ marginBottom: 12 }}>
              <summary style={{ fontSize: 12, color: 'var(--text-3)', cursor: 'pointer', userSelect: 'none' }}>
                마스터에 없는 항목 {unmatched.length}개 (클릭하여 펼치기)
              </summary>
              <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 6, fontSize: 12 }}>
                {unmatched.map((u, i) => (
                  <div key={i} style={{ color: 'var(--text-3)', lineHeight: 1.8 }}>
                    <span style={{ fontFamily: 'monospace' }}>{u.productCode}</span>
                    {' — '}{formatNumber(u.newPrice)}원
                  </div>
                ))}
              </div>
            </details>
          )}

          {matched.length === 0 && (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
              마스터에 매칭되는 항목이 없습니다. 다른 파일을 선택하거나 제품코드를 확인하세요.
            </div>
          )}

          {/* 액션 버튼 */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="btn" onClick={handleReset} disabled={committing}>
              다시 선택
            </button>
            <button
              className="btn primary"
              onClick={handleCommit}
              disabled={committing || matched.length === 0}
            >
              {committing
                ? '저장 중…'
                : `${matched.length}개 단가 업데이트`}
            </button>
          </div>
        </>
        );
      })()}

      {/* 완료 */}
      {phase === 'done' && (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <Icon.check style={{ width: 36, height: 36, color: 'var(--positive)', marginBottom: 12 }}/>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
            {asObjectArray(preview?.matched).length}개 단가 업데이트 완료
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 20 }}>
            목록이 자동으로 새로고침됩니다.
          </div>
          <button className="btn primary" onClick={close}>닫기</button>
        </div>
      )}

      {/* 오류 */}
      {error && (
        <div style={{
          marginTop: 12, padding: '10px 14px', borderRadius: 8,
          background: 'color-mix(in srgb, var(--negative, #ef4444) 10%, transparent)',
          color: 'var(--negative, #ef4444)', fontSize: 13,
        }}>
          {error}
        </div>
      )}
    </ModalFrame>
  );
}
