'use client';
import { Icon } from '@/components/icons';
import { Pagination } from '@/components/ui/Pagination';
import { formatNumber } from '@/lib/format';
import { calcCostBySizes, calcMarginRate } from '@/lib/recipe';
import { costRateColor } from '@/lib/cost/rate-color';

/**
 * 원가 레시피 좌측 메뉴 목록 카드 (검색·드래그 정렬·페이지네이션).
 * 상태는 useRecipeListState(listState), 데이터/핸들러는 페이지에서 주입.
 */
export function RecipeSidebar({
  listState,
  loading,
  recipes,
  selectedId,
  unitPriceMap,
  allGroups,
  onNew,
  onSelect,
  onDuplicate,
}) {
  const {
    search,
    setSearch,
    customOrder,
    saveOrder,
    resetCatOrder,
    dragSrc,
    setDragSrc,
    dropTarget,
    setDropTarget,
    filteredRecipes,
    grouped,
    recipePage,
    recipeGoTo,
    recipeTotalPages,
    recipeTotal,
  } = listState;

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '12px 14px 8px', borderBottom: '1px solid var(--divider)' }}>
        <button
          className="btn primary"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={onNew}
        >
          <Icon.plus style={{ width: 13, height: 13 }} /> 새 메뉴 추가
        </button>
        <div className="filter-search" style={{ marginTop: 8 }}>
          <Icon.search style={{ width: 14, height: 14, color: 'var(--text-3)', flexShrink: 0 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="메뉴명·코드·식자재·묶음 검색"
          />
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
          로딩 중…
        </div>
      ) : recipes.length === 0 ? (
        <div className="empty-state" style={{ margin: 16 }}>
          <div className="empty-icon-wrap">
            <Icon.doc style={{ width: 32, height: 32 }} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>레시피가 없어요</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>새 레시피를 추가해보세요</div>
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div className="empty-state" style={{ margin: 16 }}>
          <div className="empty-icon-wrap">
            <Icon.search style={{ width: 28, height: 28 }} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>검색 결과가 없어요</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>다른 키워드로 검색해보세요</div>
        </div>
      ) : (
        <div
          style={{ maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}
          onDragLeave={e => {
            if (!e.currentTarget.contains(e.relatedTarget)) setDropTarget(null);
          }}
        >
          {grouped.map(([cat, items]) => {
            const hasCustOrder = !!customOrder[cat]?.length;
            return (
              <div key={cat}>
                {/* 카테고리 헤더 */}
                <div
                  style={{
                    padding: '6px 14px 3px',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--text-3)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    background: 'var(--surface-2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{cat}</span>
                  {hasCustOrder && !search && recipeTotalPages <= 1 && (
                    <button
                      onClick={() => resetCatOrder(cat)}
                      title="이 카테고리 순서 초기화"
                      style={{
                        fontSize: 9,
                        color: 'var(--text-4)',
                        border: 0,
                        background: 'transparent',
                        cursor: 'pointer',
                        padding: '0 2px',
                        fontWeight: 500,
                        letterSpacing: 0,
                      }}
                    >
                      순서초기화
                    </button>
                  )}
                </div>

                {/* 아이템 목록 */}
                {items.map((r, idx) => {
                  const recipeCostMap = calcCostBySizes(r, unitPriceMap);
                  const activeGids =
                    r.groupIds == null
                      ? new Set(
                          allGroups
                            .filter(g =>
                              (g.defaultCategories || []).some(
                                c =>
                                  (r.menuCategory || '') === c ||
                                  (r.menuCategory || '').startsWith(c + '/')
                              )
                            )
                            .map(g => g.id)
                        )
                      : new Set(r.groupIds);
                  const costMap = {};
                  for (const s of r.sizes || []) {
                    let total = recipeCostMap[s.label] || 0;
                    for (const g of allGroups) {
                      if (!activeGids.has(g.id)) continue;
                      for (const ing of g.ingredients || []) {
                        const info = unitPriceMap.get(ing.productCode);
                        if (!info?.unitPrice) continue;
                        const qty = parseFloat(ing.quantities?.[s.label]) || 0;
                        if (qty) total += info.unitPrice * qty;
                      }
                    }
                    costMap[s.label] = total;
                  }
                  const active = r.id === selectedId;
                  const isDragging = dragSrc?.cat === cat && dragSrc?.fromIdx === idx;
                  const showTop =
                    !search && dropTarget?.cat === cat && dropTarget?.beforeIdx === idx;
                  const showBot =
                    !search &&
                    idx === items.length - 1 &&
                    dropTarget?.cat === cat &&
                    dropTarget?.beforeIdx === items.length;

                  return (
                    <div
                      key={r.id}
                      draggable={!search && recipeTotalPages <= 1}
                      onDragStart={e => {
                        e.dataTransfer.effectAllowed = 'move';
                        setDragSrc({ cat, fromIdx: idx });
                        setDropTarget(null);
                      }}
                      onDragOver={e => {
                        e.preventDefault();
                        if (!dragSrc || dragSrc.cat !== cat) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const before = e.clientY < rect.top + rect.height / 2 ? idx : idx + 1;
                        setDropTarget(prev =>
                          prev?.cat === cat && prev?.beforeIdx === before
                            ? prev
                            : { cat, beforeIdx: before }
                        );
                      }}
                      onDrop={e => {
                        e.preventDefault();
                        const src = dragSrc;
                        setDragSrc(null);
                        setDropTarget(null);
                        if (!src || src.cat !== cat) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        let insertAt = e.clientY < rect.top + rect.height / 2 ? idx : idx + 1;
                        if (src.fromIdx < insertAt) insertAt--;
                        if (src.fromIdx === insertAt) return;
                        const arr = [...items];
                        const [moved] = arr.splice(src.fromIdx, 1);
                        arr.splice(insertAt, 0, moved);
                        saveOrder(cat, arr);
                      }}
                      onDragEnd={() => {
                        setDragSrc(null);
                        setDropTarget(null);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'stretch',
                        borderTop: showTop ? '2px solid var(--accent)' : '2px solid transparent',
                        borderBottom: showBot ? '2px solid var(--accent)' : '2px solid transparent',
                        opacity: isDragging ? 0.35 : 1,
                      }}
                    >
                      {/* 드래그 핸들 */}
                      {!search && recipeTotalPages <= 1 && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            paddingLeft: 8,
                            paddingRight: 2,
                            cursor: 'grab',
                            color: 'var(--text-4)',
                            flexShrink: 0,
                            userSelect: 'none',
                            fontSize: 13,
                          }}
                        >
                          <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
                            <circle cx="3" cy="3" r="1.4" />
                            <circle cx="7" cy="3" r="1.4" />
                            <circle cx="3" cy="8" r="1.4" />
                            <circle cx="7" cy="8" r="1.4" />
                            <circle cx="3" cy="13" r="1.4" />
                            <circle cx="7" cy="13" r="1.4" />
                          </svg>
                        </div>
                      )}
                      {/* 선택 버튼 */}
                      <button
                        onClick={() => onSelect(r.id)}
                        style={{
                          flex: 1,
                          display: 'block',
                          textAlign: 'left',
                          padding: search ? '9px 14px' : '9px 14px 9px 4px',
                          border: 0,
                          cursor: 'pointer',
                          background: active
                            ? 'var(--accent-soft, rgba(56,189,248,.12))'
                            : 'transparent',
                          borderLeft: active
                            ? '3px solid var(--accent, #38bdf8)'
                            : '3px solid transparent',
                          transition: 'background .12s',
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 13,
                            color: 'var(--text-1)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          {r.menuName}
                          {r.menuCode && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: 'var(--accent-text)',
                                background: 'var(--accent-soft)',
                                padding: '1px 5px',
                                borderRadius: 4,
                                fontFamily: 'monospace',
                              }}
                            >
                              {r.menuCode}
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            marginTop: 3,
                            display: 'flex',
                            gap: 6,
                            flexWrap: 'wrap',
                            alignItems: 'center',
                          }}
                        >
                          {(r.sizes || []).map(s => {
                            const cost = costMap[s.label] || 0;
                            const mr = calcMarginRate(cost, s.sellingPrice);
                            return (
                              <span
                                key={s.label}
                                style={{
                                  fontSize: 10,
                                  fontWeight: 600,
                                  color: costRateColor(mr),
                                  background: 'var(--surface-2)',
                                  padding: '1px 5px',
                                  borderRadius: 3,
                                }}
                              >
                                {s.label} {cost > 0 ? formatNumber(Math.round(cost)) + '원' : '—'}
                                {mr != null ? ` (${mr.toFixed(0)}%)` : ''}
                              </span>
                            );
                          })}
                        </div>
                      </button>
                      {/* 복제 버튼 */}
                      <button
                        title="레시피 복제"
                        onClick={e => onDuplicate(r.id, e)}
                        style={{
                          flexShrink: 0,
                          alignSelf: 'center',
                          marginRight: 6,
                          padding: '3px 7px',
                          fontSize: 10,
                          fontWeight: 600,
                          border: '1px solid var(--border)',
                          borderRadius: 5,
                          cursor: 'pointer',
                          background: 'var(--surface-2)',
                          color: 'var(--text-3)',
                          lineHeight: 1.4,
                        }}
                      >
                        복제
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}
          <Pagination
            page={recipePage}
            totalPages={recipeTotalPages}
            onPage={recipeGoTo}
            total={recipeTotal}
            pageSize={40}
          />
        </div>
      )}
    </div>
  );
}
