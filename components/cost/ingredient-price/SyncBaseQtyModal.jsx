'use client';
import { useState, useEffect, useCallback } from 'react';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { Icon } from '@/components/icons';
import { formatNumber } from '@/lib/format';
import { getPriceFiles, getPriceRowsByFileId } from '@/lib/price';
import { getAllIngredients } from '@/lib/ingredient';
import { buildSyncPlan, applySyncPlan } from '@/lib/cost/sync-base-quantity';

/**
 * 제때 단가 파일의 수량(quantity) 필드를 식자재 기준수량(baseQuantity)으로 동기화하는 모달.
 *
 * 흐름: 파일 선택 → 프리뷰 → 확인 → 완료
 *
 * Props:
 *   onDone  - 적용 완료 시 호출 (count: number)
 *   onClose - 모달 닫기
 */
export function SyncBaseQtyModal({ onDone, onClose }) {
  const [files,      setFiles]      = useState([]);         // 제때 단가 파일 목록
  const [fileId,     setFileId]     = useState(null);       // 선택된 fileId
  const [phase,      setPhase]      = useState('loading');  // loading | pick | computing | preview | applying | done
  const [plan,       setPlan]       = useState(null);       // buildSyncPlan 결과
  const [applying,   setApplying]   = useState(false);
  const [error,      setError]      = useState(null);

  // ── 파일 목록 초기 로드 ───────────────────────────────────
  useEffect(() => {
    let alive = true;
    getPriceFiles()
      .then(list => {
        if (!alive) return;
        setFiles(list);
        if (list.length > 0) setFileId(list[0].id); // 최신 파일 기본 선택
        setPhase(list.length > 0 ? 'pick' : 'pick');
      })
      .catch(err => {
        if (!alive) return;
        setError(err.message || '파일 목록 로드 실패');
        setPhase('pick');
      });
    return () => { alive = false; };
  }, []);

  // ── 프리뷰 계산 ───────────────────────────────────────────
  const handlePreview = useCallback(async () => {
    if (!fileId) return;
    setError(null);
    setPhase('computing');
    try {
      const [priceRows, allIngredients] = await Promise.all([
        getPriceRowsByFileId(fileId),
        getAllIngredients(),
      ]);
      const result = buildSyncPlan(priceRows, allIngredients);
      setPlan(result);
      setPhase('preview');
    } catch (err) {
      setError(err.message || '프리뷰 계산 실패');
      setPhase('pick');
    }
  }, [fileId]);

  // ── 적용 ─────────────────────────────────────────────────
  const handleApply = useCallback(async () => {
    if (!plan || plan.changes.length === 0) return;
    setApplying(true);
    setError(null);
    try {
      const count = await applySyncPlan(plan.changes);
      setPhase('done');
      onDone?.(count);
    } catch (err) {
      setError(err.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setApplying(false);
    }
  }, [plan, onDone]);

  // ── 다시 선택 ─────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setPlan(null);
    setError(null);
    setPhase('pick');
  }, []);

  // ── 선택 파일 라벨 ────────────────────────────────────────
  const selectedFile = files.find(f => f.id === fileId);

  // ── 렌더 ─────────────────────────────────────────────────
  return (
    <ModalFrame
      title="제때 수량 → 기준수량 동기화"
      subtitle="제때 단가 파일의 수량(quantity) 값을 식자재 기준수량(baseQuantity)에 덮어씁니다"
      onClose={onClose}
      width="min(680px, 96vw)"
      zIndex={300}
      padding="24px 28px"
    >
      {/* 경고 안내 */}
      <div style={{
        padding: '10px 14px', borderRadius: 8,
        background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
        fontSize: 12, color: 'var(--text-2)', marginBottom: 16, lineHeight: 1.7,
      }}>
        <b>주의:</b> 이 작업은 기준수량(포장단위)을 덮어씁니다.
        기준수량은 개당 단가 계산의 기준이 되므로 변경 전 반드시 내용을 확인하세요.
        <br/>
        수량이 없는 제때 항목과 매칭이 안 되는 항목은 변경되지 않습니다.
      </div>

      {/* 파일 선택 */}
      {(phase === 'pick' || phase === 'computing') && (
        <>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
              제때 단가 파일 선택
            </label>
            {files.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-3)', padding: '12px 0' }}>
                업로드된 제때 단가 파일이 없습니다.
              </div>
            ) : (
              <select
                value={fileId ?? ''}
                onChange={e => setFileId(Number(e.target.value))}
                disabled={phase === 'computing'}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--surface)',
                  fontSize: 13, color: 'var(--text)',
                }}
              >
                {files.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.fileName || f.name || `파일 #${f.id}`}
                    {(f.updateDate || f.date) ? `  (${f.updateDate || f.date})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn" onClick={onClose} disabled={phase === 'computing'}>
              취소
            </button>
            <button
              className="btn primary"
              onClick={handlePreview}
              disabled={!fileId || files.length === 0 || phase === 'computing'}
            >
              {phase === 'computing' ? '계산 중…' : '프리뷰 보기'}
            </button>
          </div>
        </>
      )}

      {/* 프리뷰 */}
      {phase === 'preview' && plan && (
        <>
          {/* 요약 배지 */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
            {selectedFile && (
              <span style={{ fontSize: 12, color: 'var(--text-3)', marginRight: 4 }}>
                {selectedFile.fileName || selectedFile.name}
                {(selectedFile.updateDate || selectedFile.date)
                  ? ` (${selectedFile.updateDate || selectedFile.date})`
                  : ''}
              </span>
            )}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
              background: 'color-mix(in srgb, var(--accent) 14%, transparent)',
              color: 'var(--accent)',
            }}>
              {plan.changes.length} 변경
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
              background: 'color-mix(in srgb, var(--positive) 14%, transparent)',
              color: 'var(--positive)',
            }}>
              {plan.unchanged} 동일
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
              background: 'color-mix(in srgb, var(--text-3) 14%, transparent)',
              color: 'var(--text-3)',
            }}>
              {plan.unmatched} 미매칭
            </span>
          </div>

          {/* 변경 항목 테이블 */}
          {plan.changes.length > 0 ? (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 6 }}>
                업데이트 항목 ({plan.changes.length}개)
              </div>
              <div style={{
                overflowX: 'auto', maxHeight: 300, overflowY: 'auto',
                borderRadius: 8, border: '1px solid var(--border)',
              }}>
                <table className="data-table" style={{ minWidth: 460 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 90 }}>제품코드</th>
                      <th>재료명</th>
                      <th style={{ width: 90, textAlign: 'right' }}>현재 기준수량</th>
                      <th style={{ width: 90, textAlign: 'right' }}>새 기준수량</th>
                      <th style={{ width: 50 }}>단위</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.changes.map(c => (
                      <tr key={c.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{c.productCode}</td>
                        <td style={{ fontSize: 13 }}>{c.name}</td>
                        <td style={{ textAlign: 'right', fontSize: 13, color: 'var(--text-3)' }}>
                          {c.oldQty != null ? formatNumber(c.oldQty) : '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 13, color: 'var(--accent)' }}>
                          {formatNumber(c.newQty)}
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-3)' }}>{c.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{
              padding: '28px 0', textAlign: 'center',
              color: 'var(--text-3)', fontSize: 13, marginBottom: 16,
            }}>
              <Icon.check style={{ width: 28, height: 28, opacity: .4, marginBottom: 8, display: 'block', margin: '0 auto 8px' }}/>
              변경이 필요한 항목이 없습니다.
              <br/>
              <span style={{ fontSize: 12 }}>
                모든 항목의 기준수량이 이미 최신입니다.
              </span>
            </div>
          )}

          {/* 액션 버튼 */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button className="btn" onClick={handleReset} disabled={applying}>
              다시 선택
            </button>
            <button
              className="btn primary"
              onClick={handleApply}
              disabled={applying || plan.changes.length === 0}
            >
              {applying
                ? '저장 중…'
                : plan.changes.length > 0
                  ? `${plan.changes.length}개 기준수량 업데이트`
                  : '변경 없음'}
            </button>
          </div>
        </>
      )}

      {/* 완료 */}
      {phase === 'done' && (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <Icon.check style={{ width: 36, height: 36, color: 'var(--positive)', marginBottom: 12 }}/>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
            {plan?.changes.length ?? 0}개 기준수량 업데이트 완료
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 20 }}>
            목록이 자동으로 새로고침됩니다.
          </div>
          <button className="btn primary" onClick={onClose}>닫기</button>
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
