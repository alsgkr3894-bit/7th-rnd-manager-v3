'use client';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/icons';
import { showToast } from '@/components/Toast';
import { asDisplayText } from '@/lib/ui/prop-guards';

export function ShareLinkModal({ report, onClose }) {
  const [expiry, setExpiry] = useState('7d');
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [useWatermark, setUseWatermark] = useState(true);
  const [allowDownload, setAllowDownload] = useState(true);
  const [linkCreated, setLinkCreated] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef(null);
  const safeReport = report && typeof report === 'object' ? report : {};
  const handleClose = typeof onClose === 'function' ? onClose : () => {};
  const reportName = asDisplayText(safeReport.name, '보고서');
  const reportSub = safeReport.id
    ? `RPT-${String(safeReport.id).padStart(4,'0')}`
    : asDisplayText(safeReport.period);

  const expiryLabels = { '7d':'7일', '30d':'30일', '90d':'90일', 'never':'무기한' };
  const activeLinks = [];

  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  async function copyToClipboard(text) {
    if (!text || typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return false;
    await navigator.clipboard.writeText(text);
    return true;
  }

  function markCopied() {
    setCopied(true);
    clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 2000);
  }

  const handleCreateLink = async () => {
    if (usePassword && !password.trim()) {
      showToast('비밀번호를 입력해 주세요', 'error');
      return;
    }
    const url = `https://share.wonpay.kr/r/${Math.random().toString(36).slice(2, 11)}`;
    setLinkUrl(url);
    setLinkCreated(true);
    try {
      const copiedToClipboard = await copyToClipboard(url);
      if (copiedToClipboard) {
        markCopied();
        showToast('공유 링크를 복사했어요', 'ok', 1600);
      } else {
        showToast('링크를 생성했어요. 필요하면 직접 복사해 주세요', 'info', 2200);
      }
    } catch {
      showToast('링크를 생성했어요. 클립보드 복사는 실패했습니다', 'info', 2400);
    }
  };

  const handleCopyLink = async () => {
    if (!linkUrl) {
      showToast('복사할 링크가 없습니다', 'error');
      return;
    }
    try {
      const copiedToClipboard = await copyToClipboard(linkUrl);
      if (!copiedToClipboard) throw new Error('clipboard unavailable');
      markCopied();
      showToast('공유 링크를 복사했어요', 'ok', 1600);
    } catch {
      showToast('클립보드 복사에 실패했습니다', 'error');
    }
  };

  return (
    <div className="modal-scrim">
      <div className="modal-share" onClick={e => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-labelledby="share-modal-title">
        <div className="modal-head">
          <h3 id="share-modal-title">공유 링크 생성</h3>
          <button className="modal-close" onClick={handleClose}><Icon.x style={{width:20,height:20}}/></button>
        </div>
        <div className="modal-body">
          <div className="share-head">
            <div className="share-title">{reportName}</div>
            {reportSub && <div className="share-sub">{reportSub}</div>}
          </div>

          {!linkCreated ? (<>
            <div className="share-section">
              <div className="share-label">만료 기간</div>
              <div className="share-expiry-grid">
                {Object.entries(expiryLabels).map(([k, label]) => (
                  <button key={k} className={"share-expiry-btn " + (expiry === k ? "active" : "")} onClick={() => setExpiry(k)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="share-section">
              <label className="share-toggle-row">
                <input type="checkbox" checked={usePassword} onChange={e => setUsePassword(e.target.checked)}/>
                <span className="toggle-box"></span>
                <span className="toggle-label">비밀번호 보호</span>
              </label>
              {usePassword && (
                <input type="password" className="input" placeholder="비밀번호 입력"
                  value={password} onChange={e => setPassword(e.target.value)} style={{marginTop:8}}/>
              )}
            </div>
            <div className="share-section">
              <label className="share-toggle-row">
                <input type="checkbox" checked={useWatermark} onChange={e => setUseWatermark(e.target.checked)}/>
                <span className="toggle-box"></span>
                <span className="toggle-label">워터마크 표시</span>
              </label>
              <div className="share-sub" style={{marginTop:4}}>보고서에 "공유 복사본" 표시</div>
            </div>
            <div className="share-section">
              <label className="share-toggle-row">
                <input type="checkbox" checked={allowDownload} onChange={e => setAllowDownload(e.target.checked)}/>
                <span className="toggle-box"></span>
                <span className="toggle-label">다운로드 허용</span>
              </label>
            </div>
            <div style={{display:'flex', gap:8, marginTop:24}}>
              <button className="btn" onClick={handleClose}>취소</button>
              <button className="btn primary" onClick={handleCreateLink}>링크 생성</button>
            </div>
          </>) : (<>
            <div className="share-section" style={{background:'var(--surface-2)', padding:12, borderRadius:8}}>
              <div className="share-sub" style={{fontSize:11, marginBottom:8}}>공유 링크 복사</div>
              <div className="share-url-box">
                <code style={{flex:1, fontSize:12}}>{linkUrl}</code>
                <button className="btn sm" onClick={handleCopyLink} style={{minWidth:56}}>
                  {copied ? '복사됨 ✓' : <><Icon.copy style={{width:12,height:12}}/></>}
                </button>
              </div>
            </div>
            <div className="share-summary">
              <div className="summary-item"><div className="summary-label">만료</div><div className="summary-val">{expiryLabels[expiry]}</div></div>
              <div className="summary-item"><div className="summary-label">보호</div><div className="summary-val">{usePassword ? '암호' : '공개'}</div></div>
              <div className="summary-item"><div className="summary-label">다운로드</div><div className="summary-val">{allowDownload ? '허용' : '제한'}</div></div>
            </div>
            <div style={{display:'flex', gap:8, marginTop:24}}>
              <button className="btn" onClick={() => setLinkCreated(false)}>다시 생성</button>
              <button className="btn primary" onClick={handleClose}>완료</button>
            </div>
          </>)}
        </div>
        <div className="modal-foot">
          <div style={{fontSize:12, color:'var(--text-3)'}}>
            {activeLinks.length > 0
              ? `활성 링크 ${activeLinks.length}개 · 최근 링크는 ${activeLinks[0].expiry}에 만료`
              : '활성 공유 링크 없음'}
          </div>
        </div>
      </div>
    </div>
  );
}
