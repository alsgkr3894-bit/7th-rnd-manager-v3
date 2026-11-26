'use client';
import { SearchBox } from '@/components/ui/SearchBox';
import { formatNumber } from '@/lib/format';
import { MODULE_GROUPS } from '@/lib/db';
import { S_HISTORY_EMPTY, formatFileCheck } from './backupPanelShared';
import { BackupFileCheckButton } from './BackupFileCheckButton';

export function BackupHistoryCard({
  checking,
  onCheckFile,
  history,
  filteredHistory,
  historyQuery,
  setHistoryQuery,
  historyFilter,
  setHistoryFilter,
  onExportCsv,
  onTogglePin,
}) {
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>최근 백업 이력</h2>
      <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16 }}>
        이 브라우저에서 다운로드를 요청한 기록입니다. 저장 여부는 브라우저가 알 수 없으니, 저장한
        파일을 [저장한 파일 확인]으로 확인해 주세요. 파일 읽기 확인은 DB 복원 검증과 다릅니다.
      </p>

      {history.length === 0 ? (
        <div style={S_HISTORY_EMPTY}>아직 백업 이력이 없습니다.</div>
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              marginBottom: 12,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: '1 1 260px' }}>
              <SearchBox
                value={historyQuery}
                onChange={setHistoryQuery}
                placeholder="백업 ID·범위·파일명 검색"
              />
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {[
                { key: 'all', label: '전체' },
                { key: 'pinned', label: '고정' },
                { key: 'week', label: '최근 7일' },
              ].map(f => (
                <button
                  key={f.key}
                  className={'chip' + (historyFilter === f.key ? ' active' : '')}
                  onClick={() => setHistoryFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <BackupFileCheckButton checking={checking} onCheckFile={onCheckFile} />
            <button
              className="btn sm"
              onClick={onExportCsv}
              disabled={filteredHistory.length === 0}
            >
              엑셀로 내보내기
            </button>
          </div>
          {filteredHistory.length === 0 ? (
            <div style={S_HISTORY_EMPTY}>조건에 맞는 백업 이력이 없습니다.</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 44 }} />
                    <th style={{ width: 120 }}>백업 ID</th>
                    <th style={{ width: 170 }}>다운로드 요청</th>
                    <th style={{ width: 170 }}>파일 확인</th>
                    <th>범위</th>
                    <th style={{ width: 100, textAlign: 'right' }}>행 수</th>
                    <th>파일명</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map(h => (
                    <tr
                      key={h.id}
                      style={h.pinned ? { background: 'var(--accent-soft)' } : undefined}
                    >
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn sm"
                          title={h.pinned ? '고정 해제' : '고정(20건 초과 시에도 보존)'}
                          aria-pressed={h.pinned}
                          onClick={() => onTogglePin(h.id)}
                          style={{
                            padding: '2px 6px',
                            color: h.pinned ? 'var(--accent)' : 'var(--text-4)',
                          }}
                        >
                          {h.pinned ? '📌' : '📍'}
                        </button>
                      </td>
                      <td className="num" style={{ color: 'var(--text-3)', fontSize: 12 }}>
                        {h.id}
                      </td>
                      <td className="num" style={{ fontSize: 12 }}>
                        {new Date(h.at).toLocaleString('ko-KR')}
                      </td>
                      <td className="num" style={{ fontSize: 12 }}>
                        {formatFileCheck(h)}
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {(h.scopes || []).map(k => MODULE_GROUPS[k]?.label || k).join(', ') ||
                          '전체'}
                      </td>
                      <td className="num" style={{ textAlign: 'right' }}>
                        {formatNumber(h.totalRows)}
                      </td>
                      <td className="num" style={{ fontSize: 11, color: 'var(--text-3)' }}>
                        {h.fileName}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
