import { memo, forwardRef } from 'react';
import type { RefAttributes, CSSProperties } from 'react';
import clsx from 'clsx';

import Cell from './Cell';
import { RowSelectionProvider, useLatestFunc, useCombinedRefs, useRovingRowRef } from './hooks';
import { getColSpan } from './utils';
import { rowClassname } from './style';
import type { RowRendererProps } from './types';

function Row<R, SR>(
  {
    className,
    rowIdx,
    selectedCellIdx,
    isRowSelected,
    copiedCellIdx,
    lastFrozenColumnIndex,
    row,
    viewportColumns,
    selectedCellEditor,
    selectedCellDragHandle,
    onRowClick,
    onRowDoubleClick,
    rowClass,
    setDraggedOver,
    onMouseEnter,
    top,
    height,
    onRowChange,
    selectCell,
    getDraggedOverCellIdx,
    ...props
  }: RowRendererProps<R, SR>,
  ref: React.Ref<HTMLDivElement>
) {
  const {
    ref: rowRef,
    tabIndex,
    className: rovingClassName
  } = useRovingRowRef(selectedCellIdx?.[0]);

  const handleRowChange = useLatestFunc((newRow: R) => {
    onRowChange(rowIdx, newRow);
  });

  const handleCellDragEnter = (idx: number) => {
    setDraggedOver?.({
      rowIdx,
      idx
    });
  };

  className = clsx(
    rowClassname,
    `rdg-row-${rowIdx % 2 === 0 ? 'even' : 'odd'}`,
    rovingClassName,
    rowClass?.(row),
    className
  );

  const cells = [];

  for (let index = 0; index < viewportColumns.length; index++) {
    const column = viewportColumns[index];
    const { idx } = column;
    const colSpan = getColSpan(column, lastFrozenColumnIndex, { type: 'ROW', row });
    if (colSpan !== undefined) {
      index += colSpan - 1;
    }

    const isCellSelected = selectedCellIdx?.includes(idx) ?? false;

    if (isCellSelected && selectedCellEditor) {
      cells.push(selectedCellEditor);
    } else {
      cells.push(
        <Cell
          key={column.key}
          column={column}
          colSpan={colSpan}
          row={row}
          isCopied={copiedCellIdx?.includes(idx) ?? false}
          isDraggedOver={getDraggedOverCellIdx(rowIdx, idx)}
          isCellSelected={isCellSelected}
          dragHandle={isCellSelected ? selectedCellDragHandle : undefined}
          onRowClick={onRowClick}
          onRowDoubleClick={onRowDoubleClick}
          onRowChange={handleRowChange}
          selectCell={selectCell}
          onMouseEnter={() => {
            handleCellDragEnter(idx);
          }}
        />
      );
    }
  }

  return (
    <RowSelectionProvider value={isRowSelected}>
      <div
        role="row"
        ref={useCombinedRefs(ref, rowRef)}
        tabIndex={tabIndex}
        className={className}
        style={
          {
            top,
            '--rdg-row-height': `${height}px`
          } as unknown as CSSProperties
        }
        {...props}
      >
        {cells}
      </div>
    </RowSelectionProvider>
  );
}

export default memo(Row) as <R, SR>(props: RowRendererProps<R, SR>) => JSX.Element;

export const RowWithRef = memo(forwardRef(Row)) as <R, SR>(
  props: RowRendererProps<R, SR> & RefAttributes<HTMLDivElement>
) => JSX.Element;
