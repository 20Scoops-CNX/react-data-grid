import { memo } from 'react';
import { css } from '@linaria/core';

import { getCellStyle, getCellClassname, isCellEditable } from './utils';
import type { CellRendererProps } from './types';
import { useRovingCellRef } from './hooks';

const cellCopied = css`
  background-color: #ccccff;
`;

const cellCopiedClassname = `rdg-cell-copied ${cellCopied}`;

const cellDraggedOver = css`
  background-color: #ccccff;

  &.${cellCopied} {
    background-color: #9999ff;
  }
`;

const cellDraggedOverClassname = `rdg-cell-dragged-over ${cellDraggedOver}`;

function Cell<R, SR>({
  column,
  colSpan,
  isCellSelected,
  isCopied,
  isDraggedOver,
  row,
  dragHandle,
  onRowClick,
  onRowDoubleClick,
  onRowChange,
  selectCell,
  onMouseEnter,
  ...props
}: CellRendererProps<R, SR>) {
  const { ref, tabIndex, onFocus } = useRovingCellRef(isCellSelected);

  const { cellClass } = column;
  const className = getCellClassname(
    column,
    {
      [cellCopiedClassname]: isCopied,
      [cellDraggedOverClassname]: isDraggedOver
    },
    typeof cellClass === 'function' ? cellClass(row) : cellClass
  );

  function selectCellWrapper(config: {
    openEditor?: boolean | null;
    isShiftKey: boolean;
    isCommandKey: boolean;
  }) {
    selectCell(
      row,
      column,
      { isShiftKey: config.isShiftKey, isCommandKey: config.isCommandKey },
      config.openEditor
    );
  }

  function handleClick(event: React.MouseEvent) {
    selectCellWrapper({
      openEditor: column.editorOptions?.editOnClick,
      isShiftKey: event.shiftKey,
      isCommandKey: event.metaKey
    });
    onRowClick?.(row, column);
  }

  function handleContextMenu() {
    selectCellWrapper({
      isShiftKey: false,
      openEditor: false,
      isCommandKey: false
    });
  }

  function handleDoubleClick() {
    selectCellWrapper({
      isShiftKey: false,
      openEditor: true,
      isCommandKey: false
    });
    onRowDoubleClick?.(row, column);
  }

  return (
    <div
      role="gridcell"
      aria-colindex={column.idx + 1} // aria-colindex is 1-based
      aria-selected={isCellSelected}
      aria-colspan={colSpan}
      aria-readonly={!isCellEditable(column, row) || undefined}
      ref={ref}
      tabIndex={tabIndex}
      className={className}
      style={getCellStyle(column, colSpan)}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onFocus={onFocus}
      onMouseEnter={onMouseEnter}
      {...props}
    >
      {!column.rowGroup && (
        <>
          <column.formatter
            column={column}
            row={row}
            isCellSelected={isCellSelected}
            onRowChange={onRowChange}
          />
          {dragHandle}
        </>
      )}
    </div>
  );
}

export default memo(Cell) as <R, SR>(props: CellRendererProps<R, SR>) => JSX.Element;
