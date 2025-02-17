import { css } from '@linaria/core';
import { createPortal } from 'react-dom';
import type {
  CalculatedColumn,
  DragOverflowHide,
  DragOverHook,
  FillEvent,
  Position
} from './types';

import type { DataGridProps, SelectCellState } from './DataGrid';
import { useDragHandlePopper } from './dragHandlePopper';

const cellDragHandle = css`
  cursor: move;
  position: absolute;
  width: 7px;
  height: 7px;
  background-color: #66afe9;
  box-sizing: border-box;
`;

const cellDragHandleClassname = `rdg-cell-drag-handle ${cellDragHandle}`;

interface Props<R, SR> extends Pick<DataGridProps<R, SR>, 'rows' | 'onRowsChange'> {
  columns: readonly CalculatedColumn<R, SR>[];
  selectedPosition: SelectCellState;
  latestDraggedOverRowIdx: React.MutableRefObject<number | undefined>;
  isCellEditable: (position: Position) => boolean;
  onFill: (event: FillEvent<R>) => R;
  setDragging: (isDragging: boolean) => void;
  setDraggedOverRowIdx: (overRowIdx: number | undefined) => void;
  dragOverflowHide?: DragOverflowHide;
  setLengthPosition: DragOverHook['setLengthPosition'];
}

export default function DragHandle<R, SR>({
  rows,
  columns,
  selectedPosition,
  latestDraggedOverRowIdx,
  isCellEditable,
  onRowsChange,
  onFill,
  setDragging,
  setDraggedOverRowIdx,
  dragOverflowHide,
  setLengthPosition
}: Props<R, SR>) {
  const { popperRef, styles, attributes, isHide } = useDragHandlePopper({ dragOverflowHide });

  function handleMouseDown(event: React.MouseEvent<HTMLDivElement>) {
    if (event.buttons !== 1) return;
    setDragging(true);
    window.addEventListener('mouseover', onMouseOver);
    window.addEventListener('mouseup', onMouseUp);

    function onMouseOver(event: MouseEvent) {
      const overRowIdx = latestDraggedOverRowIdx.current;
      if (overRowIdx === undefined) return;

      const { rowIdx } = selectedPosition;
      const startRowIndex = rowIdx < overRowIdx ? rowIdx + 1 : overRowIdx + 1;
      const endRowIndex = rowIdx < overRowIdx ? overRowIdx + 1 : rowIdx;
      // Trigger onMouseup in edge cases where we release the mouse button but `mouseup` isn't triggered,
      // for example when releasing the mouse button outside the iframe the grid is rendered in.
      // https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/buttons

      setLengthPosition(startRowIndex, endRowIndex);

      if (event.buttons !== 1) onMouseUp();
    }

    function onMouseUp() {
      window.removeEventListener('mouseover', onMouseOver);
      window.removeEventListener('mouseup', onMouseUp);
      setDragging(false);
      handleDragEnd();
    }
  }

  function handleDragEnd() {
    const overRowIdx = latestDraggedOverRowIdx.current;
    if (overRowIdx === undefined) return;

    const { rowIdx } = selectedPosition;
    const startRowIndex = rowIdx < overRowIdx ? rowIdx + 1 : overRowIdx;
    const endRowIndex = rowIdx < overRowIdx ? overRowIdx + 1 : rowIdx;
    updateRows(startRowIndex, endRowIndex);
    setDraggedOverRowIdx(undefined);
  }

  function handleDoubleClick(event: React.MouseEvent<HTMLDivElement>) {
    event.stopPropagation();
    updateRows(selectedPosition.rowIdx + 1, rows.length);
  }

  function updateRows(startRowIdx: number, endRowIdx: number) {
    const { idx, rowIdx } = selectedPosition;
    const column = columns[idx];
    const sourceRow = rows[rowIdx];
    const updatedRows = [...rows];
    const indexes: number[] = [];
    for (let i = startRowIdx; i < endRowIdx; i++) {
      if (isCellEditable({ rowIdx: i, idx })) {
        const updatedRow = onFill({
          columnKey: column.key,
          sourceRow,
          targetRow: rows[i],
          targetRowIndex: i
        });
        if (updatedRow !== rows[i]) {
          updatedRows[i] = updatedRow;
          indexes.push(i);
        }
      }
    }

    if (indexes.length > 0) {
      onRowsChange?.(updatedRows, { indexes, column });
    }
  }

  return createPortal(
    <div
      ref={popperRef}
      className={cellDragHandleClassname}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      style={{
        ...styles.popper,
        ...(isHide
          ? {
              visibility: 'hidden',
              pointerEvents: 'none'
            }
          : {})
      }}
      {...attributes.popper}
    />,
    document.querySelector('.rdg') ?? document.body
  );
}
