import { Check, OptGroup, Seg } from '@/components/report/ReportBuilderShell';
import { asObjectArray, asStringArray } from '@/lib/ui/prop-guards';

export function MarginReportOptions({
  categories,
  categorySelection,
  onCategoryChange,
  edgeOptions,
  edgeSelection,
  onEdgeChange,
  sizeOptions,
  sizeSelection,
  onSizeChange,
  platforms,
  activePlatId,
  onActivePlatId,
  viewMode,
  onViewMode,
  discountEnabled,
  onDiscountEnabled,
  discountType,
  onDiscountType,
  discountValue,
  onDiscountValue,
  includeHidden,
  onIncludeHidden,
  docFormat,
  onFormatChange,
}) {
  const safeCategories = asStringArray(categories);
  const safeEdgeOptions = asObjectArray(edgeOptions);
  const safeSizeOptions = asStringArray(sizeOptions);
  const safePlatforms = asObjectArray(platforms);

  const checked = (selection, key) => selection?.[key] !== false;

  return (
    <>
      <OptGroup
        label="카테고리 항목별 출력"
        hint="체크된 카테고리만 미리보기와 출력물에 포함됩니다"
      >
        {safeCategories.map(category => (
          <Check
            key={category}
            label={category}
            value={checked(categorySelection, category)}
            onChange={value => onCategoryChange(category, value)}
          />
        ))}
      </OptGroup>

      <OptGroup label="엣지별 출력" hint="석쇠기본과 파생 엣지를 필요한 항목만 고를 수 있어요">
        {safeEdgeOptions.map(option => (
          <Check
            key={option.key}
            label={option.label}
            value={checked(edgeSelection, option.key)}
            onChange={value => onEdgeChange(option.key, value)}
          />
        ))}
      </OptGroup>

      <OptGroup label="사이즈별 출력" hint="L/R/단일 중 필요한 사이즈 컬럼만 출력합니다">
        {safeSizeOptions.map(size => (
          <Check
            key={size}
            label={size}
            value={checked(sizeSelection, size)}
            onChange={value => onSizeChange(size, value)}
          />
        ))}
      </OptGroup>

      <OptGroup label="계산 기준">
        <Seg
          value={viewMode}
          onChange={onViewMode}
          options={[
            { value: 'cost', label: '원가율' },
            { value: 'margin', label: '마진율' },
          ]}
        />
        <Check
          label="숨김 메뉴 포함"
          value={includeHidden}
          onChange={onIncludeHidden}
          hint="메뉴 마스터에서 숨긴 항목까지 보고서에 포함합니다"
        />
      </OptGroup>

      <OptGroup label="플랫폼 · 할인">
        <label style={{ display: 'block' }}>
          <span style={{ display: 'block', fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>
            플랫폼
          </span>
          <select
            value={activePlatId}
            onChange={event => onActivePlatId(event.target.value)}
            style={{
              width: '100%',
              height: 36,
              border: '1px solid var(--border)',
              borderRadius: 8,
              background: 'var(--surface)',
              color: 'var(--text-1)',
              padding: '0 10px',
            }}
          >
            {safePlatforms.map(platform => (
              <option key={platform.id} value={platform.id}>
                {platform.name}
              </option>
            ))}
          </select>
        </label>
        <Check
          label="할인 적용"
          value={discountEnabled}
          onChange={onDiscountEnabled}
          hint="할인 후 플랫폼 차감 기준으로 원가율/마진율을 계산합니다"
        />
        {discountEnabled && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 92px', gap: 8 }}>
            <Seg
              value={discountType}
              onChange={onDiscountType}
              options={[
                { value: 'pct', label: '%' },
                { value: 'fixed', label: '원' },
              ]}
            />
            <input
              type="number"
              min="0"
              value={discountValue}
              onChange={event => onDiscountValue(event.target.value)}
              placeholder="할인"
              style={{
                height: 34,
                border: '1px solid var(--border)',
                borderRadius: 8,
                background: 'var(--surface)',
                color: 'var(--text-1)',
                padding: '0 10px',
                minWidth: 0,
              }}
            />
          </div>
        )}
      </OptGroup>

      <OptGroup label="문서 형식">
        <Check label="PDF" value={docFormat.pdf} onChange={value => onFormatChange('pdf', value)} />
        <Check
          label="Excel (.xlsx)"
          value={docFormat.excel}
          onChange={value => onFormatChange('excel', value)}
        />
      </OptGroup>
    </>
  );
}
