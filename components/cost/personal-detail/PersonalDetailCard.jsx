'use client';
import { Icon } from '@/components/icons';
import { formatNumber } from '@/lib/format';
import { personalTotalCost, personalIssues } from '@/lib/cost/personal-detail';

export function PersonalDetailCard({ menu, recipe, onEdit }) {
  const totalCost = personalTotalCost(recipe);
  const compCount = recipe?.components?.length || 0;
  const issues = recipe ? personalIssues(recipe) : [];
  const hasRecipe = !!recipe;
  const costRate = (menu.price && totalCost > 0)
    ? (totalCost / menu.price * 100)
    : null;

  return (
    <div className="card" style={{padding:'14px 18px', display:'flex', alignItems:'center', gap:14}}>
      <div style={{flex:1, minWidth:0}}>
        <div style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap'}}>
          <span style={{fontWeight:700, fontSize:15}}>{menu.menuName}</span>
          <span style={{
            fontSize:11, fontFamily:"'JetBrains Mono', ui-monospace, monospace",
            color:'var(--text-3)',
          }}>{menu.menuCode}</span>
          {!hasRecipe && (
            <span style={{
              fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:6,
              background:'var(--warn-soft)', color:'var(--warn)',
            }}>레시피 없음</span>
          )}
        </div>
        <div style={{fontSize:12, color:'var(--text-3)', marginTop:4, display:'flex', gap:12, flexWrap:'wrap'}}>
          <span>구성품 {compCount}개</span>
          {menu.price != null && (
            <span>판매가 {formatNumber(menu.price)}원</span>
          )}
          {issues.length > 0 && (
            <span style={{color:'var(--warn)'}}>· {issues.length}건 확인 필요</span>
          )}
        </div>
      </div>

      <div style={{textAlign:'right', minWidth:140}}>
        <div style={{fontSize:11, color:'var(--text-3)'}}>총 원가</div>
        <div style={{fontSize:17, fontWeight:800, color: totalCost > 0 ? 'var(--text-1)' : 'var(--text-4)', lineHeight:1.2}}>
          {totalCost > 0 ? <>{formatNumber(totalCost)}<span style={{fontSize:12, fontWeight:600, marginLeft:2}}>원</span></> : '—'}
        </div>
        {costRate != null && (
          <div style={{fontSize:11, color: costRate >= 35 ? 'var(--negative)' : costRate >= 30 ? 'var(--warn)' : 'var(--text-3)', marginTop:2, fontWeight:600}}>
            원가율 {costRate.toFixed(1)}%
          </div>
        )}
      </div>

      <button className="btn sm" onClick={onEdit}>
        <Icon.edit style={{width:13, height:13}}/>
        {hasRecipe ? '편집' : '레시피 작성'}
      </button>
    </div>
  );
}
