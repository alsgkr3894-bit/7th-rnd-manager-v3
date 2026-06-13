'use client';
/* eslint-disable react/no-unescaped-entities */
import { Icon } from '@/components/icons';
import { MODULE_GROUPS, ALL_STORES, hasStore } from '@/lib/db';
import { formatNumber } from '@/lib/format';
import { ModuleScopeList } from '@/components/settings/ModuleScopeList';

const chipStyle = active => ({
  display: 'inline-block',
  padding: '2px 10px',
  borderRadius: 99,
  fontSize: 12,
  fontWeight: 700,
  background: active ? 'var(--accent-soft)' : 'var(--surface-2)',
  color: active ? 'var(--accent-text)' : 'var(--text-3)',
});

/**
 * 복원 미리보기·범위·예상 변경 사항 (섹션 2·3·4).
 *
 * @param {{
 *   parsed: object,
 *   ready: boolean,
 *   impact: object|null,
 *   dangerRows: object[],
 *   wipeRows: object[],
 *   unchangedSelectedStores: string[],
 *   scopes: object,
 *   toggleScope: (key: string) => void,
 *   setAllScopes: (v: boolean) => void,
 *   selectedKeys: string[],
 * }} props
 */
export function RestorePreview({
  parsed,
  ready,
  impact,
  dangerRows,
  wipeRows,
  unchangedSelectedStores,
  scopes,
  toggleScope,
  setAllScopes,
  selectedKeys,
}) {
  const missingStores =
    parsed && ready
      ? Object.keys(parsed.stores).filter(n => ALL_STORES.includes(n) && !hasStore(n))
      : [];
  const unknownStores = parsed?._summary?.unknownStores || [];
  const backupTotalRows =
    parsed?._summary?.totalRows ??
    (parsed
      ? Object.values(parsed.stores).reduce((s, r) => s + (Array.isArray(r) ? r.length : 0), 0)
      : 0);
  const backupAgeDays = parsed?.exportedAt
    ? Math.floor((Date.now() - new Date(parsed.exportedAt).getTime()) / 86400000)
    : null;
  const selectedRestoreStoreCount = impact?.storeCount ?? 0;

  return (
    <>
      {/* ── 2. 미리보기 ──────────────────────────────────── */}
      <div className="card" style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
          2. 백업 파일 미리보기
        </h2>
        <div
          style={{
            display: 'flex',
            gap: 32,
            marginBottom: 16,
            padding: '8px 0',
            borderBottom: '1px solid var(--border)',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>파일</div>
            <div style={{ fontWeight: 600, fontSize: 13, fontFamily: 'monospace' }}>
              {parsed._fileName}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>버전</div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{parsed.version || '미상'}</div>
          </div>
          {parsed.exportedAt && (
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>백업 시점</div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>
                {new Date(parsed.exportedAt).toLocaleString('ko-KR')}
                {backupAgeDays !== null && backupAgeDays > 30 && (
                  <span
                    style={{
                      marginLeft: 6,
                      fontSize: 11,
                      color: 'var(--warn)',
                      fontWeight: 700,
                    }}
                  >
                    ({backupAgeDays}일 전)
                  </span>
                )}
              </div>
            </div>
          )}
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>총 행</div>
            <div className="num" style={{ fontWeight: 700, fontSize: 18 }}>
              {formatNumber(backupTotalRows)}건
            </div>
          </div>
        </div>

        {/* schema 불일치 경고 */}
        {missingStores.length > 0 && (
          <div
            style={{
              padding: 12,
              background: 'var(--warn-soft)',
              borderRadius: 8,
              fontSize: 13,
              color: 'var(--text-1)',
              lineHeight: 1.6,
            }}
          >
            <b style={{ color: 'var(--warn)' }}>일부 store가 현재 DB에 없습니다.</b>{' '}
            <span className="num" style={{ fontSize: 12 }}>
              {missingStores.slice(0, 5).join(', ')}
              {missingStores.length > 5 ? ` 외 ${missingStores.length - 5}개` : ''}
            </span>
            <br />
            전체 복원을 원하면 먼저 <b>시스템 설정 → 위험 영역 → "DB 완전 재생성"</b>을
            실행하세요.
          </div>
        )}
        {unknownStores.length > 0 && (
          <div
            style={{
              marginTop: 10,
              padding: 12,
              background: 'var(--surface-2)',
              borderRadius: 8,
              fontSize: 13,
              color: 'var(--text-1)',
              lineHeight: 1.6,
            }}
          >
            <b>알 수 없는 store는 복원에서 건너뜁니다.</b>{' '}
            <span className="num" style={{ fontSize: 12, color: 'var(--text-3)' }}>
              {unknownStores.slice(0, 5).join(', ')}
              {unknownStores.length > 5 ? ` 외 ${unknownStores.length - 5}개` : ''}
            </span>
          </div>
        )}
      </div>

      {/* ── 3. 복원 범위 선택 ─────────────────────────────── */}
      <div className="card" style={{ marginTop: 16 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>3. 복원 범위</h2>
            <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
              선택한 모듈만 백업 시점으로 되돌립니다. 나머지는 현재 상태 유지.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn sm" onClick={() => setAllScopes(true)}>
              전체
            </button>
            <button className="btn sm" onClick={() => setAllScopes(false)}>
              해제
            </button>
          </div>
        </div>
        <ModuleScopeList
          scopes={scopes}
          onToggle={toggleScope}
          getCountLabel={(key, g) => {
            const count = g.stores.reduce(
              (sum, n) =>
                sum + (Array.isArray(parsed.stores?.[n]) ? parsed.stores[n].length : 0),
              0
            );
            return `백업 ${formatNumber(count)}건`;
          }}
        />

        {/* 선택 범위 요약 칩 */}
        <div
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: 6,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <span
            style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, marginRight: 2 }}
          >
            선택:
          </span>
          {selectedKeys.length === 0 ? (
            <span style={{ fontSize: 12, color: 'var(--warn)', fontWeight: 600 }}>
              ⚠ 복원할 모듈을 선택해주세요
            </span>
          ) : (
            selectedKeys.map(k => (
              <span key={k} style={chipStyle(true)}>
                {MODULE_GROUPS[k]?.label || k}
              </span>
            ))
          )}
        </div>
        {/* 공통 store 항상 포함 안내 */}
        <div
          style={{
            marginTop: 10,
            padding: '10px 12px',
            borderRadius: 8,
            background: 'var(--surface-2)',
            fontSize: 12,
            color: 'var(--text-3)',
            lineHeight: 1.5,
          }}
        >
          <b style={{ color: 'var(--text-2)' }}>항상 포함:</b> 시스템 설정·메뉴마스터·보고서 등
          공통 데이터는 모듈 선택과 무관하게 복원됩니다.
        </div>
        {/* 백업 생성 시 실패한 store 경고 */}
        {(parsed._failedStores?.length ?? 0) > 0 && (
          <div
            style={{
              marginTop: 8,
              padding: '10px 12px',
              borderRadius: 8,
              background: 'var(--warn-soft)',
              fontSize: 12,
              color: 'var(--warn)',
              lineHeight: 1.5,
            }}
          >
            <b>⚠ 백업 생성 오류:</b> 아래 store는 백업 당시 읽기에 실패하여 포함되지 않았습니다.
            복원 시 현재 데이터가 유지됩니다.{' '}
            <span style={{ color: 'var(--text-3)' }}>
              {parsed._failedStores
                .map(f => f.store)
                .slice(0, 5)
                .join(', ')}
              {parsed._failedStores.length > 5
                ? ` 외 ${parsed._failedStores.length - 5}개`
                : ''}
            </span>
          </div>
        )}
        {unchangedSelectedStores.length > 0 && (
          <div
            style={{
              marginTop: 8,
              padding: '10px 12px',
              borderRadius: 8,
              background: 'var(--surface-2)',
              fontSize: 12,
              color: 'var(--text-2)',
              lineHeight: 1.5,
            }}
          >
            <b>백업 파일에 없는 store는 현재 상태를 유지합니다.</b>{' '}
            <span className="num" style={{ color: 'var(--text-3)' }}>
              {unchangedSelectedStores.slice(0, 5).join(', ')}
              {unchangedSelectedStores.length > 5
                ? ` 외 ${unchangedSelectedStores.length - 5}개`
                : ''}
            </span>
          </div>
        )}
        {selectedKeys.length > 0 && selectedRestoreStoreCount === 0 && (
          <div
            style={{
              marginTop: 10,
              padding: '10px 12px',
              borderRadius: 8,
              background: 'var(--warn-soft)',
              fontSize: 12,
              color: 'var(--warn)',
              fontWeight: 700,
            }}
          >
            선택한 범위와 백업 파일이 겹치지 않아 복원할 store가 없습니다.
          </div>
        )}
      </div>

      {/* ── 4. 예상 변경 사항 (위험 store 강조) ──────────── */}
      {impact && impact.rows.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>4. 예상 변경 사항</h2>
            {dangerRows.length > 0 && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 99,
                  background: 'var(--negative-soft)',
                  color: 'var(--negative)',
                }}
              >
                ⚠ 데이터 감소 {dangerRows.length}개
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 12 }}>
            선택한 모듈의 현재 상태와 백업 시점 비교
          </p>

          {/* 합계 요약 */}
          <div
            style={{
              display: 'flex',
              gap: 24,
              padding: '8px 0',
              borderBottom: '1px solid var(--border)',
              marginBottom: 8,
            }}
          >
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>현재</div>
              <div className="num" style={{ fontWeight: 700, fontSize: 18 }}>
                {formatNumber(impact.totalNow)}건
              </div>
            </div>
            <div style={{ color: 'var(--text-4)', alignSelf: 'center', fontSize: 18 }}>→</div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>복원 후</div>
              <div className="num" style={{ fontWeight: 700, fontSize: 18 }}>
                {formatNumber(impact.totalAfter)}건
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>변동</div>
              <div
                className="num"
                style={{
                  fontWeight: 700,
                  fontSize: 18,
                  color:
                    impact.totalAfter > impact.totalNow
                      ? 'var(--accent-text)'
                      : impact.totalAfter < impact.totalNow
                        ? 'var(--negative)'
                        : 'var(--text-3)',
                }}
              >
                {impact.totalAfter - impact.totalNow > 0 ? '+' : ''}
                {formatNumber(impact.totalAfter - impact.totalNow)}건
              </div>
            </div>
          </div>

          {/* store별 상세 테이블 */}
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>store</th>
                  <th style={{ textAlign: 'right', width: 90 }}>현재</th>
                  <th style={{ textAlign: 'right', width: 90 }}>복원 후</th>
                  <th style={{ textAlign: 'right', width: 90 }}>변동</th>
                </tr>
              </thead>
              <tbody>
                {impact.rows.map(r => {
                  const isWipe = r.now > 0 && r.after === 0;
                  const isDanger = r.now > 0 && r.after < r.now;
                  return (
                    <tr
                      key={r.name}
                      style={{
                        background: isWipe
                          ? 'color-mix(in oklab, var(--negative) 8%, transparent)'
                          : isDanger
                            ? 'color-mix(in oklab, var(--warn) 6%, transparent)'
                            : undefined,
                      }}
                    >
                      <td style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {isWipe && (
                          <span
                            title="현재 데이터 전체 삭제"
                            style={{ color: 'var(--negative)', fontSize: 12, fontWeight: 700 }}
                          >
                            ⊗
                          </span>
                        )}
                        {!isWipe && isDanger && (
                          <span
                            title="현재보다 데이터 감소"
                            style={{ color: 'var(--warn)', fontSize: 12 }}
                          >
                            ↓
                          </span>
                        )}
                        <span
                          className="num"
                          style={{
                            fontSize: 12,
                            color: isWipe
                              ? 'var(--negative)'
                              : isDanger
                                ? 'var(--warn)'
                                : 'var(--text-3)',
                          }}
                        >
                          {r.name}
                        </span>
                      </td>
                      <td className="num" style={{ textAlign: 'right' }}>
                        {formatNumber(r.now)}
                      </td>
                      <td
                        className="num"
                        style={{
                          textAlign: 'right',
                          fontWeight: isWipe || isDanger ? 700 : undefined,
                        }}
                      >
                        {formatNumber(r.after)}
                      </td>
                      <td
                        className="num"
                        style={{
                          textAlign: 'right',
                          color:
                            r.diff > 0
                              ? 'var(--accent-text)'
                              : r.diff < 0
                                ? 'var(--negative)'
                                : 'var(--text-4)',
                        }}
                      >
                        {r.diff > 0 ? '+' : ''}
                        {formatNumber(r.diff)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 위험 항목 요약 배너 */}
          {dangerRows.length > 0 && (
            <div
              style={{
                marginTop: 10,
                padding: '10px 14px',
                borderRadius: 8,
                background: wipeRows.length > 0 ? 'var(--negative-soft)' : 'var(--warn-soft)',
                fontSize: 13,
                lineHeight: 1.6,
                color: wipeRows.length > 0 ? 'var(--negative)' : 'var(--warn)',
              }}
            >
              {wipeRows.length > 0 && (
                <>
                  <b>⊗ 전체 삭제 {wipeRows.length}개:</b>{' '}
                  <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {wipeRows.map(r => r.name).join(', ')}
                  </span>
                  <br />
                </>
              )}
              {dangerRows.length > wipeRows.length && (
                <>
                  <b>↓ 데이터 감소 {dangerRows.length - wipeRows.length}개:</b>{' '}
                  <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {dangerRows
                      .filter(r => r.after > 0)
                      .map(r => r.name)
                      .join(', ')}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
