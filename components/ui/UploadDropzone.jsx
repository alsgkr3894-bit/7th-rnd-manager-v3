'use client';
import { useRef, useState } from 'react';
import { Icon } from '@/components/icons';
import { asDisplayText, asObjectArray, asStringArray } from '@/lib/ui/prop-guards';

const DEFAULT_ACCEPT = ['.xlsx', '.xls', '.csv'];

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
  accept = DEFAULT_ACCEPT,
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
  const safeAccept = Array.isArray(accept) ? asStringArray(accept) : DEFAULT_ACCEPT;
  const acceptedExts = safeAccept.map(ext => ext.trim().toLowerCase()).filter(Boolean);
  const maxSize = Number.isFinite(Number(maxSizeMB)) && Number(maxSizeMB) > 0 ? Number(maxSizeMB) : 20;
  const safeTitle = asDisplayText(title, '파일을 끌어다 놓으세요');
  const safeBusyText = asDisplayText(busyText, '처리 중...');
  const safeSubText = subText == null
    ? `또는 클릭해서 파일 선택 · 최대 ${maxSize}MB`
    : asDisplayText(subText);
  const safeRules = asObjectArray(rules);
  const handleFile = typeof onFile === 'function' ? onFile : () => {};

  function pickFile(file) {
    if (!file) return;
    const fileName = asDisplayText(file.name);
    const dotIndex = fileName.lastIndexOf('.');
    const ext = dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : '';
    if (!acceptedExts.includes(ext)) {
      handleFile(null, `지원하지 않는 파일 형식입니다. (${safeAccept.join(' / ')} 만 허용)`);
      return;
    }
    if (file.size > maxSize * 1024 * 1024) {
      handleFile(null, `파일 크기는 ${maxSize}MB 이하여야 합니다.`);
      return;
    }
    handleFile(file);
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
        accept={safeAccept.join(',')}
        style={{ display: 'none' }}
        onChange={e => {
          pickFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <div className="dropzone-ico">
        {disabled && showSpinner
          ? <div className="report-loading-spinner" style={{width:32,height:32}}/>
          : <Icon.upload style={{width:32, height:32}}/>
        }
      </div>
      <div className="dropzone-title">
        {disabled ? safeBusyText : safeTitle}
      </div>
      <div className="dropzone-sub">
        {safeSubText}
      </div>
      {safeRules.length > 0 && (
        <div className="dropzone-rules">
          {safeRules.map((r, i) => {
            const type = asDisplayText(r.type);
            const text = asDisplayText(r.text);

            return (
            <div key={i} className="rule-item">
              {type === 'ok'   && <Icon.check style={{width:14, height:14, color:'var(--positive)'}}/>}
              {type === 'warn' && <Icon.alert style={{width:14, height:14, color:'var(--warn)'}}/>}
              <span>{text}</span>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
