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
          width:'100%', padding:'8px 12px 8px 32px', borderRadius:8,
          border:'1px solid var(--border)', background:'var(--surface-2)',
          color:'var(--text-1)', fontSize:13,
        }}
      />
    </div>
  );
}
