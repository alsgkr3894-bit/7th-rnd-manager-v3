import { MODULE_GROUPS, MODULE_KEYS } from '@/lib/db';
import { Toggle } from '@/components/ui/Toggle';

/**
 * 백업·복원 페이지에서 공유하는 모듈별 토글 목록.
 *
 * @param {Record<string,boolean>}  scopes       - useModuleScopes의 scopes
 * @param {(key: string) => void}   onToggle     - useModuleScopes의 toggleScope
 * @param {(key: string) => string} getCountLabel - 키 → 행 수 라벨 (예: "156건", "백업 32건")
 * @param {boolean}                [disabled]
 */
export function ModuleScopeList({ scopes, onToggle, getCountLabel, disabled }) {
  const safeScopes = scopes && typeof scopes === 'object' ? scopes : {};
  const getSafeCountLabel =
    typeof getCountLabel === 'function' ? getCountLabel : () => '0건';
  const toggleScope = typeof onToggle === 'function' ? onToggle : () => {};

  return (
    <div style={{display:'flex', flexDirection:'column'}}>
      {MODULE_KEYS.map((key, i) => {
        const g = MODULE_GROUPS[key] || { label: key, desc: '' };
        const last = i === MODULE_KEYS.length - 1;
        return (
          <div
            key={key}
            style={{
              display:'flex', alignItems:'center', justifyContent:'space-between', gap:16,
              padding:'14px 0',
              borderBottom: last ? 'none' : '1px solid var(--border)',
            }}
          >
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontWeight:700, fontSize:14, display:'flex', alignItems:'center', gap:8}}>
                {g.label}
                <span className="num" style={{fontSize:12, fontWeight:500, color:'var(--text-3)'}}>
                  ({getSafeCountLabel(key, g)})
                </span>
              </div>
              <div style={{fontSize:12, color:'var(--text-3)', marginTop:2}}>{g.desc}</div>
            </div>
            <Toggle value={Boolean(safeScopes[key])} onChange={() => toggleScope(key)} disabled={disabled} />
          </div>
        );
      })}
    </div>
  );
}
