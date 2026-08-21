export type ThumbSize = "s" | "m" | "l";

/** サムネイル一辺のピクセル数。 */
export const CELL: Record<ThumbSize, number> = { s: 112, m: 158, l: 224 };

export const GAP = 10;
/** ファイル名を1行置くための高さ。 */
export const LABEL = 20;
/** 画面外にも余分に描いておく行数。スクロール時の欠けを防ぐ。 */
const OVERSCAN = 2;

export type Grid = {
  columns: number;
  cell: number;
  rowHeight: number;
  totalRows: number;
  /** 実際に DOM へ置く範囲。 */
  from: number;
  to: number;
};

/**
 * スクロール位置から「いま描くべき範囲」だけを求める。
 * 数万枚のフォルダでも DOM に載るのは画面ぶん＋前後2行に留まる。
 */
export function computeGrid(
  count: number,
  size: ThumbSize,
  viewportWidth: number,
  viewportHeight: number,
  scrollTop: number,
): Grid {
  const cell = CELL[size];
  const rowHeight = cell + LABEL + GAP;
  const columns = Math.max(1, Math.floor((viewportWidth + GAP) / (cell + GAP)));
  const totalRows = Math.ceil(count / columns);

  const firstRow = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN);
  const visibleRows = Math.ceil(viewportHeight / rowHeight) + OVERSCAN * 2;
  const lastRow = Math.min(totalRows - 1, firstRow + visibleRows);

  return {
    columns,
    cell,
    rowHeight,
    totalRows,
    from: firstRow * columns,
    to: Math.min(count - 1, (lastRow + 1) * columns - 1),
  };
}

/** グリッド内での位置。左端からの余白は中央寄せで決める。 */
export function cellPosition(
  index: number,
  grid: Grid,
  viewportWidth: number,
): { left: number; top: number } {
  const rowWidth = grid.columns * grid.cell + (grid.columns - 1) * GAP;
  const offsetX = Math.max(0, (viewportWidth - rowWidth) / 2);

  return {
    left: offsetX + (index % grid.columns) * (grid.cell + GAP),
    top: Math.floor(index / grid.columns) * grid.rowHeight,
  };
}

/** 指定のセルが画面に入るスクロール位置。すでに見えていれば現在値を返す。 */
export function scrollToShow(
  index: number,
  grid: Grid,
  viewportHeight: number,
  scrollTop: number,
): number {
  const top = Math.floor(index / grid.columns) * grid.rowHeight;
  const bottom = top + grid.rowHeight;

  if (top < scrollTop) return top;
  if (bottom > scrollTop + viewportHeight) return bottom - viewportHeight;
  return scrollTop;
}

/** 矢印キーによるカーソル移動。行末・行頭でも列を跨いで連続して動く。 */
export function moveCursor(
  cursor: number,
  key: "left" | "right" | "up" | "down" | "home" | "end",
  grid: Grid,
  count: number,
): number {
  const next = (() => {
    switch (key) {
      case "left":
        return cursor - 1;
      case "right":
        return cursor + 1;
      case "up":
        return cursor - grid.columns;
      case "down":
        return cursor + grid.columns;
      case "home":
        return 0;
      case "end":
        return count - 1;
    }
  })();

  return Math.max(0, Math.min(count - 1, next));
}
