'use client';
import { Icon } from '@/components/icons';

/**
 * SearchBox — 좌측 검색 아이콘 + 인풋
 *
 * @param {string}   value
 * @param {Function} onChange  - 새 문자열을 인자로 받음 (이벤트 아님)
 * @param {string}   [placeholder='제품명·제품코드 검색']
 */
export function SearchBox({ value, onChange, placeholder = '제품명·제품코드 검색' }) {
  return (
    <div style={{position:'relative', marginBottom:12}}>
      <Icon.search style={{
        width:14, height:14, position:'absolute', top:'50%', left:12,
        transform:'translateY(-50%)', color:'var(--text-4)',
      }}/>
      <input
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width:'100%', padding:`8px ${value ? 32 : 12}px 8px 32px`, borderRadius:8,
          border:'1px solid var(--border)', background:'var(--surface-2)',
          color:'var(--text-1)', fontSize:13,
        }}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="검색어 지우기"
          style={{
            position:'absolute', top:'50%', right:10, transform:'translateY(-50%)',
            border:0, background:'transparent', cursor:'pointer',
            color:'var(--text-4)', padding:0, lineHeight:1, display:'flex',
          }}
        >
          <Icon.close style={{ width:12, height:12 }}/>
        </button>
      )}
    </div>
  );
}
