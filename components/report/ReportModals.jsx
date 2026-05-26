'use client';
import { useState, useEffect } from 'react';
import { Icon } from '@/components/icons';

/* ============================================================
   공유 링크 모달
============================================================ */
export function ShareLinkModal({ report, onClose }) {
  const [expiry, setExpiry] = useState('7d');
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [useWatermark, setUseWatermark] = useState(true);
  const [allowDownload, setAllowDownload] = useState(true);
  const [linkCreated, setLinkCreated] = useState(false);
  const [linkUrl, setLinkUrl] = useState('https://share.wonpay.kr/r/abc123xyz');

  const expiryLabels = {
    '7d': '7일',
    '30d': '30일',
    '90d': '90일',
    'never': '무기한',
  };

  const activeLinks = [];

  const handleCreateLink = () => {
    setLinkCreated(true);
    setLinkUrl(`https://share.wonpay.kr/r/${Math.random().toString(36).substr(2, 9)}`);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(linkUrl);
  };

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal-share" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>공유 링크 생성</h3>
          <button className="modal-close" onClick={onClose}>
            <Icon.x style={{width:20, height:20}}/>
          </button>
        </div>

        <div className="modal-body">
          <div className="share-head">
            <div className="share-title">{report.name}</div>
            <div className="share-sub">{report.id}</div>
          </div>

          {!linkCreated ? (
            <>
              <div className="share-section">
                <div className="share-label">만료 기간</div>
                <div className="share-expiry-grid">
                  {Object.entries(expiryLabels).map(([k, label]) => (
                    <button
                      key={k}
                      className={"share-expiry-btn " + (expiry === k ? "active" : "")}
                      onClick={() => setExpiry(k)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="share-section">
                <label className="share-toggle-row">
                  <input type="checkbox" checked={usePassword} onChange={e => setUsePassword(e.target.checked)} />
                  <span className="toggle-box"></span>
                  <span className="toggle-label">비밀번호 보호</span>
                </label>
                {usePassword && (
                  <input
                    type="password"
                    className="input"
                    placeholder="비밀번호 입력"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{marginTop: 8}}
                  />
                )}
              </div>

              <div className="share-section">
                <label className="share-toggle-row">
                  <input type="checkbox" checked={useWatermark} onChange={e => setUseWatermark(e.target.checked)} />
                  <span className="toggle-box"></span>
                  <span className="toggle-label">워터마크 표시</span>
                </label>
                <div className="share-sub" style={{marginTop: 4}}>보고서에 "공유 복사본" 표시</div>
              </div>

              <div className="share-section">
                <label className="share-toggle-row">
                  <input type="checkbox" checked={allowDownload} onChange={e => setAllowDownload(e.target.checked)} />
                  <span className="toggle-box"></span>
                  <span className="toggle-label">다운로드 허용</span>
                </label>
              </div>

              <div style={{display: 'flex', gap: 8, marginTop: 24}}>
                <button className="btn" onClick={onClose}>취소</button>
                <button className="btn primary" onClick={handleCreateLink}>링크 생성</button>
              </div>
            </>
          ) : (
            <>
              <div className="share-section" style={{background: 'var(--surface-2)', padding: 12, borderRadius: 8}}>
                <div className="share-sub" style={{fontSize: 11, marginBottom: 8}}>공유 링크 복사</div>
                <div className="share-url-box">
                  <code style={{flex: 1, fontSize: 12}}>{linkUrl}</code>
                  <button className="btn sm" onClick={handleCopyLink}>
                    <Icon.copy style={{width: 12, height: 12}}/>
                  </button>
                </div>
              </div>

              <div className="share-summary">
                <div className="summary-item">
                  <div className="summary-label">만료</div>
                  <div className="summary-val">{expiryLabels[expiry]}</div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">보호</div>
                  <div className="summary-val">{usePassword ? '암호' : '공개'}</div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">다운로드</div>
                  <div className="summary-val">{allowDownload ? '허용' : '제한'}</div>
                </div>
              </div>

              <div style={{display: 'flex', gap: 8, marginTop: 24}}>
                <button className="btn" onClick={() => setLinkCreated(false)}>다시 생성</button>
                <button className="btn primary" onClick={onClose}>완료</button>
              </div>
            </>
          )}
        </div>

        {!linkCreated && (
          <div className="modal-foot">
            <div style={{fontSize: 12, color: 'var(--text-3)'}}>
              활성 링크 {activeLinks.length}개 · 최근 링크는 {activeLinks[0].expiry}에 만료
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   예약 관리 모달
============================================================ */
export function ScheduleManagerModal({ onClose }) {
  const [schedules] = useState([]);

  const kindColors = {
    sales: '#3182F6',
    price: '#E1101F',
    shipment: '#1D766F',
    compare: '#7C3AED',
    cost: '#F59E0B',
  };

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal-schedule" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>예약 설정</h3>
          <button className="modal-close" onClick={onClose}>
            <Icon.x style={{width:20, height:20}}/>
          </button>
        </div>

        <div className="modal-body">
          <div className="schedule-list">
            {schedules.map(s => (
              <div key={s.id} className="schedule-row">
                <div style={{flex: 1}}>
                  <div className="schedule-name">
                    <span className="chip" style={{background: kindColors[s.kind] + '22', color: kindColors[s.kind]}}>
                      {s.kind === 'sales' ? '판매량' : s.kind === 'price' ? '가격' : s.kind === 'cost' ? '원가' : '비교'}
                    </span>
                    <span style={{marginLeft: 8}}>{s.name}</span>
                  </div>
                  <div className="schedule-row-meta">{s.freq}</div>
                  <div className="schedule-row-recipients">다음 발송: {s.next}</div>
                </div>
                <div style={{display: 'flex', gap: 6}}>
                  <button className="btn sm">편집</button>
                  <button className="btn sm">삭제</button>
                </div>
              </div>
            ))}
          </div>

          <button className="schedule-add" style={{marginTop: 16}}>
            <Icon.plus style={{width: 14, height: 14}}/>새 예약 추가
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   보고서 미리보기 모달
============================================================ */
function PreviewPageCover({ report }) {
  return (
    <div className="paper-head" style={{textAlign: 'center', paddingBottom: 32, borderBottom: '1px solid var(--border)'}}>
      <div style={{fontSize: 14, color: 'var(--text-2)', marginBottom: 20}}>7번가피자 본사</div>
      <h1 style={{fontSize: 28, fontWeight: 700, marginBottom: 12}}>{report.name}</h1>
      <div style={{fontSize: 13, color: 'var(--text-2)'}}>{report.period}</div>
      <div style={{fontSize: 12, color: 'var(--text-3)', marginTop: 20}}>생성일: {report.created}</div>
    </div>
  );
}

function PreviewPageStub({ page, total }) {
  return (
    <div className="paper-stub">
      <div style={{fontSize: 32, fontWeight: 300, color: 'var(--text-4)'}}>— {page} —</div>
      <div style={{fontSize: 13, color: 'var(--text-3)', marginTop: 16}}>
        {page === 1 ? '표지' : `본문 {page - 1}`}
      </div>
    </div>
  );
}

export function ReportPreviewModal({ report, onClose, onShare }) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = report.pages || 8;

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft' && currentPage > 1) setCurrentPage(currentPage - 1);
    if (e.key === 'ArrowRight' && currentPage < totalPages) setCurrentPage(currentPage + 1);
    if (e.key === 'Escape') onClose();
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages]);

  return (
    <div className="modal-scrim" onClick={onClose} onKeyDown={handleKeyDown} tabIndex={0}>
      <div className="preview-shell" onClick={e => e.stopPropagation()}>
        {/* 좌측 메타 */}
        <div className="preview-meta">
          <button className="modal-close" onClick={onClose} style={{marginBottom: 24}}>
            <Icon.x style={{width: 20, height: 20}}/>
          </button>

          <div style={{marginBottom: 28}}>
            <div style={{fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6}}>
              {report.id}
            </div>
            <div style={{fontSize: 15, fontWeight: 700, marginBottom: 4}}>{report.name}</div>
            <div style={{fontSize: 12, color: 'var(--text-2)'}}>{report.period}</div>
          </div>

          <div style={{fontSize: 12, color: 'var(--text-3)', marginBottom: 28}}>
            <div>작성자: {report.author}</div>
            <div>생성일: {report.created}</div>
          </div>

          <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
            <button
              className="btn sm primary"
              onClick={() => { onShare?.(report); onClose(); }}
            >
              <Icon.upload style={{width: 12, height: 12}}/>공유
            </button>
            <button className="btn sm">
              <Icon.download style={{width: 12, height: 12}}/>PDF
            </button>
            <button className="btn sm">
              <Icon.download style={{width: 12, height: 12}}/>Excel
            </button>
          </div>

          <div style={{borderTop: '1px solid var(--border)', marginTop: 20, paddingTop: 20, fontSize: 12, color: 'var(--text-3)'}}>
            <div>전체 {totalPages}쪽</div>
            <div style={{marginTop: 12}}>← → : 페이지 이동</div>
            <div>Esc : 닫기</div>
          </div>
        </div>

        {/* 우측 페이퍼 */}
        <div className="preview-body">
          <div className="report-paper preview-paper">
            {currentPage === 1 ? (
              <PreviewPageCover report={report} />
            ) : (
              <PreviewPageStub page={currentPage} total={totalPages} />
            )}
            <div className="paper-foot" style={{marginTop: 32}}>
              <span>{currentPage} / {totalPages}</span>
              <span className="mono">7번가 R&D 플랫폼 · WONPAY 비즈니스</span>
            </div>
          </div>

          {/* 페이저 */}
          <div className="preview-pager">
            <button
              className="pager-btn"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              <Icon.chevLeft style={{width: 16, height: 16}}/>
            </button>
            <div className="pager-info">
              {currentPage} / {totalPages}
            </div>
            <button
              className="pager-btn"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              <Icon.chevRight style={{width: 16, height: 16}}/>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
