import { Icon } from '@/components/icons';
import { asDisplayText, asObjectArray, noop } from '@/lib/ui/prop-guards';

export function SampleLinkedProductsCard({
  linked,
  options,
  search,
  onSearchChange,
  onBlurSearch,
  onAdd,
  onRemove,
}) {
  const linkedItems = Array.isArray(linked)
    ? linked
        .map((item, sourceIndex) => ({ item, sourceIndex }))
        .filter(({ item }) => item && typeof item === 'object' && !Array.isArray(item))
    : [];
  const safeOptions = asObjectArray(options);
  const safeSearch = asDisplayText(search);
  const updateSearch = typeof onSearchChange === 'function' ? onSearchChange : noop;
  const blurSearch = typeof onBlurSearch === 'function' ? onBlurSearch : noop;
  const add = typeof onAdd === 'function' ? onAdd : noop;
  const remove = typeof onRemove === 'function' ? onRemove : noop;
  const query = safeSearch.trim().toLowerCase();
  const filtered = query
    ? safeOptions
        .filter(
          option =>
            asDisplayText(option.name).toLowerCase().includes(query) ||
            asDisplayText(option.code).toLowerCase().includes(query)
        )
        .slice(0, 12)
    : [];

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="card-title" style={{ marginBottom: 10 }}>
        연결 제품
      </div>

      <div style={{ position: 'relative' }}>
        <input
          className="form-input"
          value={safeSearch}
          placeholder="식자재명 또는 메뉴명 검색"
          onChange={event => updateSearch(event.target.value)}
          onBlur={blurSearch}
        />
        {filtered.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 2px)',
              left: 0,
              right: 0,
              zIndex: 200,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              boxShadow: '0 4px 16px rgba(0,0,0,.12)',
              maxHeight: 200,
              overflowY: 'auto',
            }}
          >
            {filtered.map((option, index) => {
              const kind = asDisplayText(option.kind);
              const code = asDisplayText(option.code);
              const name = asDisplayText(option.name, '이름 없음');

              return (
                <div
                  key={`${kind || 'item'}-${code || name}-${index}`}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    fontSize: 13,
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                  }}
                  onMouseDown={event => {
                    event.preventDefault();
                    add(option);
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '1px 5px',
                      borderRadius: 3,
                      background:
                        kind === 'ingredient' ? 'var(--positive-soft)' : 'var(--accent-soft)',
                      color: kind === 'ingredient' ? 'var(--positive)' : 'var(--accent-text)',
                    }}
                  >
                    {kind === 'ingredient' ? '식자재' : '메뉴'}
                  </span>
                  {name}
                  {code && (
                    <span style={{ fontSize: 11, color: 'var(--text-4)', marginLeft: 'auto' }}>
                      {code}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {linkedItems.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {linkedItems.map(({ item: product, sourceIndex }, index) => {
            const kind = asDisplayText(product.kind);
            const name = asDisplayText(product.name, '이름 없음');

            return (
              <span
                key={`${kind || 'item'}-${asDisplayText(product.code) || name}-${index}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 8px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                  background: kind === 'ingredient' ? 'var(--positive-soft)' : 'var(--accent-soft)',
                  color: kind === 'ingredient' ? 'var(--positive)' : 'var(--accent-text)',
                }}
              >
                {name}
                <button
                  type="button"
                  onClick={() => remove(sourceIndex)}
                  style={{
                    border: 0,
                    background: 'transparent',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    color: 'inherit',
                    opacity: 0.6,
                  }}
                >
                  <Icon.close style={{ width: 11, height: 11 }} />
                </button>
              </span>
            );
          })}
        </div>
      )}
      {linkedItems.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 8 }}>연결된 제품 없음</div>
      )}
    </div>
  );
}
