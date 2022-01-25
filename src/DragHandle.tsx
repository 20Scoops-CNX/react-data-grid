import { css } from '@linaria/core';

import type { CalculatedColumn, FillEvent, Position } from './types';
import type { DataGridProps, SelectCellState } from './DataGrid';

const cellDragHandle = css`
  cursor: move;
  position: absolute;
  right: 0;
  bottom: 0;
  width: 8px;
  height: 8px;
  background-color: var(--rdg-selection-color);

  &:hover {
    width: 16px;
    height: 16px;
    border: 2px solid var(--rdg-selection-color);
    background-color: var(--rdg-background-color);
  }
`;

const cellDragHandleClassname = `rdg-cell-drag-handle ${cellDragHandle}`;

interface Props<R, SR> extends Pick<DataGridProps<R, SR>, 'rows' | 'onRowsChange'> {
  columns: readonly CalculatedColumn<R, SR>[];
  selectedPosition: SelectCellState;
  latestDraggedOver: React.MutableRefObject<{ rowIdx: number; idx: number } | undefined>;
  isCellEditable: (position: Position) => boolean;
  onFill: (event: FillEvent<R>) => R;
  setDragging: (isDragging: boolean) => void;
  setDraggedOver: (draggedOver?: { rowIdx: number; idx: number }) => void;
  onDragEnd: () => void;
}

export default function DragHandle<R, SR>({
  rows,
  columns,
  selectedPosition,
  latestDraggedOver,
  isCellEditable,
  onRowsChange,
  onFill,
  setDragging,
  setDraggedOver,
  onDragEnd
}: Props<R, SR>) {
  function handleMouseDown(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    if (event.buttons !== 1) return;
    setDragging(true);
    window.addEventListener('mouseover', onMouseOver);
    window.addEventListener('mouseup', onMouseUp);

    function onMouseOver(event: MouseEvent) {
      // Trigger onMouseup in edge cases where we release the mouse button but `mouseup` isn't triggered,
      // for example when releasing the mouse button outside the iframe the grid is rendered in.
      // https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/buttons
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
    const draggedOver = latestDraggedOver.current;
    if (draggedOver === undefined) return;

    const { rowIdx, idx } = selectedPosition;

    const hasRowDraggedOver = rowIdx !== draggedOver.rowIdx;

    const { startRowIndex, endRowIndex } = (() => {
      if (!hasRowDraggedOver) {
        return {
          startRowIndex: rowIdx,
          endRowIndex: rowIdx
        };
      }

      return {
        startRowIndex: rowIdx < draggedOver.rowIdx ? rowIdx : draggedOver.rowIdx,
        endRowIndex: rowIdx < draggedOver.rowIdx ? draggedOver.rowIdx : rowIdx
      };
    })();

    const { startColIndex, endColIndex } = (() => {
      if (hasRowDraggedOver) {
        return {
          startColIndex: idx,
          endColIndex: idx
        };
      }
      return {
        startColIndex: idx < draggedOver.idx ? idx : draggedOver.idx,
        endColIndex: idx < draggedOver.idx ? draggedOver.idx : idx
      };
    })();

    updateRows(startRowIndex, endRowIndex, startColIndex, endColIndex);
    setDraggedOver(undefined);
    onDragEnd();
  }

  function handleDoubleClick(event: React.MouseEvent<HTMLDivElement>) {
    event.stopPropagation();
    updateRows(
      selectedPosition.rowIdx + 1,
      rows.length,
      selectedPosition.idx,
      selectedPosition.idx
    );
  }

  function updateRows(
    startRowIdx: number,
    endRowIdx: number,
    startColIndex: number,
    endColIndex: number
  ) {
    const { rowIdx, idx } = selectedPosition;
    const sourceRow = rows[rowIdx];
    const updatedRows = [...rows];

    console.log('onFill', {
      startRowIdx,
      endRowIdx,
      startColIndex,
      endColIndex
    });

    for (let i = startRowIdx; i <= endRowIdx; i++) {
      let updatedRow = { ...rows[i] };
      for (let j = startColIndex; j <= endColIndex; j++) {
        const isSourceCell = i === rowIdx && j === idx;
        if (isCellEditable({ rowIdx: i, idx: j }) && !isSourceCell) {
          const targetColumn = columns[j];
          updatedRow = onFill({
            sourceColumnKey: columns[idx].key,
            sourceRow,
            targetColumnKey: targetColumn.key,
            targetRow: updatedRow,
            targetRowIndex: i
          });
        }
      }
      updatedRows[i] = updatedRow;
    }

    onRowsChange?.(updatedRows);
  }

  return (
    <div
      id="drag-handle-here"
      className={cellDragHandleClassname}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    />
  );
}
