import { memo } from 'react';
import { ManageRowActionCell } from './manage-row/ManageRowActionCell';
import { ManageRowCategoryCell } from './manage-row/ManageRowCategoryCell';
import { ManageRowCodeCell } from './manage-row/ManageRowCodeCell';
import { ManageRowNameCell } from './manage-row/ManageRowNameCell';
import { ManageRowPhotoCell } from './manage-row/ManageRowPhotoCell';
import { ManageRowPriceCell } from './manage-row/ManageRowPriceCell';
import { ManageRowScopeCell } from './manage-row/ManageRowScopeCell';
import { ManageRowSelectionCell } from './manage-row/ManageRowSelectionCell';
import { ManageRowTagsCell } from './manage-row/ManageRowTagsCell';
import { buildManageRowModel } from './manage-row/manageRowUtils';

export const ManageRow = memo(function ManageRow({
  r: rawRow = {},
  deletePending,
  deletePreview,
  onEdit,
  onCopy,
  onDeleteStart,
  onDeleteCancel,
  onDeleteConfirm,
  onRestore,
  batchMode,
  isSelected,
  onToggleSelect,
  isHighlighted,
  isViewer = false,
}) {
  const model = buildManageRowModel(rawRow);
  const {
    r,
    productCode,
    productName,
    name,
    unitLabel,
    tags,
    temperature,
    scope,
    category,
    manufacturer,
    photo,
    photoCount,
    priceWithTax,
    originCount,
    allergenCount,
    deletable,
  } = model;
  const handleEdit = typeof onEdit === 'function' ? onEdit : undefined;
  const handleCopy = typeof onCopy === 'function' ? onCopy : undefined;
  const handleDeleteStart = typeof onDeleteStart === 'function' ? onDeleteStart : undefined;
  const handleDeleteCancel = typeof onDeleteCancel === 'function' ? onDeleteCancel : undefined;
  const handleDeleteConfirm = typeof onDeleteConfirm === 'function' ? onDeleteConfirm : undefined;
  const handleRestore = typeof onRestore === 'function' ? onRestore : undefined;
  const toggleSelect = typeof onToggleSelect === 'function' ? onToggleSelect : undefined;

  return (
    <tr
      data-ingredient-highlighted={isHighlighted ? 'true' : undefined}
      style={{
        opacity: r.excluded ? 0.5 : 1,
        background: isHighlighted
          ? 'var(--positive-soft)'
          : isSelected
            ? 'var(--accent-soft)'
            : r.excluded
              ? 'var(--surface-2)'
              : undefined,
        outline: isHighlighted ? '2px solid var(--positive)' : undefined,
        outlineOffset: isHighlighted ? '-1px' : undefined,
        cursor: isViewer || (batchMode && !deletable) ? 'default' : 'pointer',
      }}
      onClick={
        batchMode
          ? !isViewer && deletable && toggleSelect
            ? () => toggleSelect(r.id)
            : undefined
          : isViewer
            ? undefined
            : handleEdit
      }
    >
      {batchMode && (
        <ManageRowSelectionCell
          deletable={deletable}
          isSelected={isSelected}
          rowId={r.id}
          onToggleSelect={toggleSelect}
          disabled={isViewer}
        />
      )}
      <ManageRowCodeCell
        productCode={productCode}
        isManual={r.isManual}
        jetteLinked={r.jetteLinked}
      />
      <ManageRowPhotoCell photo={photo} photoCount={photoCount} name={name} />
      <ManageRowNameCell
        name={name}
        productName={productName}
        discontinued={r.discontinued}
        originCount={originCount}
        allergenCount={allergenCount}
      />
      <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{temperature}</td>
      <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{unitLabel}</td>
      <ManageRowScopeCell scope={scope} />
      <ManageRowPriceCell priceWithTax={priceWithTax} />
      <ManageRowCategoryCell category={category} />
      <ManageRowTagsCell tags={tags} />
      <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{manufacturer}</td>
      <ManageRowActionCell
        excluded={r.excluded}
        deletePending={deletePending}
        deletePreview={deletePreview}
        isManual={r.isManual}
        productCode={productCode}
        onCopy={handleCopy}
        onDeleteStart={handleDeleteStart}
        onDeleteCancel={handleDeleteCancel}
        onDeleteConfirm={handleDeleteConfirm}
        onRestore={handleRestore}
        isViewer={isViewer}
      />
    </tr>
  );
});
