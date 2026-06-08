'use client';
import { useRef, useState } from 'react';
import { Icon } from '@/components/icons';

/**
 * UploadDropzone — 범용 파일 드롭존 (드래그 + 클릭)
 *
 * @param {(file: File, errorMsg?: string) => void} onFile
 * @param {string[]} accept      - 허용 확장자 배열 (예: ['.xlsx', '.csv'])
 * @param {number}   maxSizeMB   - 최대 파일 크기 (MB)
 * @param {string}   title       - 드롭존 메인 문구
 * @param {string}   [subText]   - 서브 문구 (기본: "또는 클릭해서 파일 선택 · 최대 NMB")
 * @param {Array<{type: 'ok'|'warn', text: string}>} rules - 안내 규칙 목록
 * @param {boolean}  disabled
 * @param {string}   busyText
 * @param {boolean}  [showSpinner=true]
 */
export function UploadDropzone({
  onFile,
  accept = ['.xlsx', '.xls', '.csv'],
  maxSizeMB = 20,
  title = '파일을 끌어다 놓으세요',
  subText,
  rules = [],
  disabled = false,
  busyText = '처리 중...',
  showSpinner = true,
}) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);

  function pickFile(file) {
    if (!file) return;
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (!accept.includes(ext)) {
      onFile(null, `지원하지 않는 파일 형식입니다. (${accept.join(' / ')} 만 허용)`);
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      onFile(null, `파일 크기는 ${maxSizeMB}MB 이하여야 합니다.`);
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
        pickFile(e.dataTransfer.files?.[0]);
      }}
      onClick={() => { if (disabled) return; inputRef.current?.click(); }}
      style={{ cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept.join(',')}
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
        {disabled ? busyText : title}
      </div>
      <div className="dropzone-sub">
        {subText ?? `또는 클릭해서 파일 선택 · 최대 ${maxSizeMB}MB`}
      </div>
      {rules.length > 0 && (
        <div className="dropzone-rules">
          {rules.map((r, i) => (
            <div key={i} className="rule-item">
              {r.type === 'ok'   && <Icon.check style={{width:14, height:14, color:'var(--positive)'}}/>}
              {r.type === 'warn' && <Icon.alert style={{width:14, height:14, color:'var(--warn)'}}/>}
              <span>{r.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
