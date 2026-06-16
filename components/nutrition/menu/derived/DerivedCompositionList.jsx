'use client';
import { Icon } from '@/components/icons';
import { asDisplayText, asStringArray } from '@/lib/ui/prop-guards';
import { amountText } from './derivedCompositionUtils';

const GROUP_HEADER_STYLE = {
  padding: '6px 16px 4px',
  fontSize: 10,
  fontWeight: 800,
  color: 'var(--text-4)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginTop: 8,
};

function DerivedCompositionCard({ comp, menuByCode, ingredientMetaByCode, onEdit, onDelete }) {
  const base = menuByCode[asDisplayText(comp.baseMenuCode)];
  const menuName = asDisplayText(comp.menuName, '이름 없음');
  const baseName = asDisplayText(base?.menuName || comp.baseMenuCode, '베이스 미지정');
  const ingredientsText = asStringArray(comp.ingredientCodes)
    .map(code => {
      const row = ingredientMetaByCode[code];
      const name = asDisplayText(row?.ingredientName || code);
      const sizeText = amountText(comp.ingredientAmounts, code);
      return [name, sizeText ? `(${sizeText})` : ''].filter(Boolean).join(' ');
    })
    .filter(Boolean);

  return (
    <div
      className="card"
      style={{
        padding: '12px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div>
        <span style={{ fontWeight: 700, fontSize: 14 }}>{menuName}</span>
        <span style={{ fontSize: 12, color: 'var(--text-4)', marginLeft: 10 }}>
          {baseName} + {ingredientsText.join(', ') || '(식자재 미선택)'}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn sm ghost" onClick={() => onEdit(comp)}>
          <Icon.edit style={{ width: 13, height: 13 }} />
        </button>
        <button
          className="btn sm ghost"
          style={{ color: 'var(--danger)' }}
          onClick={() => onDelete(comp)}
        >
          <Icon.trash style={{ width: 13, height: 13 }} />
        </button>
      </div>
    </div>
  );
}

function EmptyDerivedState() {
  return (
    <div className="empty-state">
      <div className="empty-icon-wrap">
        <Icon.plus style={{ width: 28, height: 28 }} />
      </div>
      <div className="empty-title">파생 메뉴가 없어요</div>
      <div className="empty-sub">
        베이스 메뉴 + 소스/토핑 조합으로 파생 메뉴를 만드세요
        <br />
        <span style={{ fontSize: 11 }}>예: 컨츄리치킨 + 마요네즈 = 컨츄리마요치킨</span>
      </div>
    </div>
  );
}

function EmptySearchState() {
  return (
    <div className="empty-state">
      <div className="empty-icon-wrap">
        <Icon.search style={{ width: 28, height: 28 }} />
      </div>
      <div className="empty-title">검색 결과가 없어요</div>
      <div className="empty-sub">파생 메뉴명, 베이스 메뉴명, 토핑명으로 다시 검색해보세요</div>
    </div>
  );
}

export function DerivedCompositionList({
  compositions,
  groupedCompositions,
  menuByCode,
  ingredientMetaByCode,
  defaultBaseMenuCode,
  onAdd,
  onEdit,
  onDelete,
}) {
  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700 }}>파생 메뉴</div>
        <button className="btn sm primary" onClick={() => onAdd(defaultBaseMenuCode || '')}>
          <Icon.plus style={{ width: 13, height: 13 }} />
          파생 메뉴 추가
        </button>
      </div>

      {compositions.length === 0 ? (
        <EmptyDerivedState />
      ) : groupedCompositions.length === 0 ? (
        <EmptySearchState />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {groupedCompositions.map(({ group, items }) => (
            <div key={group}>
              {groupedCompositions.length > 1 && <div style={GROUP_HEADER_STYLE}>{group}</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map(comp => (
                  <DerivedCompositionCard
                    key={comp.id || comp.menuCode || asDisplayText(comp.menuName, '이름 없음')}
                    comp={comp}
                    menuByCode={menuByCode}
                    ingredientMetaByCode={ingredientMetaByCode}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
