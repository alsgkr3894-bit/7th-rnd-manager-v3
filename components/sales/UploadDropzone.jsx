'use client';
import { useRef, useState } from 'react';
import { Icon } from '@/components/icons';

const MAX_SIZE_MB = 20;
const ACCEPTED_EXTS = ['.xlsx', '.xls', '.csv'];

/**
 * UploadDropzone — 파일 드롭존 (드래그 + 클릭)
 *
 * @param {(file: File, errorMsg?: string) => void} onFile
 * @param {boolean} disabled  - 검증/저장 중일 때 비활성
 * @param {string}  busyText  - disabled일 때 표시할 텍스트
 * @param {boolean} [showSpinner=true] - busy 상태에서 스피너 표시 여부
 */
export function UploadDropzone({ onFile, disabled = false, busyText = '처리 중...', showSpinner = true }) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);

  function pickFile(file) {
    if (!file) return;
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (!ACCEPTED_EXTS.includes(ext)) {
      onFile(null, '지원하지 않는 파일 형식입니다. (.xlsx / .xls / .csv 만 허용)');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      onFile(null, `파일 크기는 ${MAX_SIZE_MB}MB 이하여야 합니다.`);
      return;
    }
    onFile(file);
  }

  return (
    <div
      className={'card dropzone ' + (drag ? 'drag' : '') + (disabled ? ' disabled' : '')}
      onDragOver={e => { if (disabled) return; e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => {
        if (disabled) return;
        e.preventDefault();
        setDrag(false);
        const f = e.dataTransfer.files?.[0];
        pickFile(f);
      }}
      onClick={() => { if (disabled) return; inputRef.current?.click(); }}
      style={{ cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTS.join(',')}
        style={{ display: 'none' }}
        onChange={e => pickFile(e.target.files?.[0])}
      />
      <div className="dropzone-ico">
        {disabled && showSpinner
          ? <div className="report-loading-spinner" style={{width:32,height:32}}/>
          : <Icon.upload style={{width:32, height:32}}/>
        }
      </div>
      <div className="dropzone-title">
        {disabled ? busyText : '엑셀(.xlsx) 또는 CSV 파일을 끌어다 놓으세요'}
      </div>
      <div className="dropzone-sub">또는 클릭해서 파일 선택 · 최대 {MAX_SIZE_MB}MB</div>
      <div className="dropzone-rules">
        <Rule ok>필수 헤더: 메뉴명 / 판매량(개)</Rule>
        <Rule ok>판매 기간: 월 전체 (YYYY-MM-01 ~ YYYY-MM-말일)</Rule>
        <Rule warn>업로드 즉시 반영 안 함 — 미리보기 단계를 거쳐요</Rule>
      </div>
    </div>
  );
}

function Rule({ ok, warn, children }) {
  return (
    <div className="rule-item">
      {ok && <Icon.check style={{width:14, height:14, color:'var(--positive)'}}/>}
      {warn && <Icon.alert style={{width:14, height:14, color:'var(--warn)'}}/>}
      <span>{children}</span>
    </div>
  );
}
