import { useEffect } from "react";

import type { Grid } from "./grid";
import { moveCursor } from "./grid";

type Options = {
  open: boolean;
  count: number;
  grid: Grid;
  cursor: number;
  onCursor: (index: number) => void;
  onCommit: (index: number) => void;
  onClose: () => void;
};

/**
 * 一覧を開いている間だけキー操作を横取りする。
 * 捕捉フェーズで stopPropagation するので、グローバルのショートカットとは衝突しない。
 */
export function useGalleryKeys({
  open,
  count,
  grid,
  cursor,
  onCursor,
  onCommit,
  onClose,
}: Options): void {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const handled = (): boolean => {
        switch (event.key) {
          case "ArrowLeft":
            onCursor(moveCursor(cursor, "left", grid, count));
            return true;
          case "ArrowRight":
            onCursor(moveCursor(cursor, "right", grid, count));
            return true;
          case "ArrowUp":
            onCursor(moveCursor(cursor, "up", grid, count));
            return true;
          case "ArrowDown":
            onCursor(moveCursor(cursor, "down", grid, count));
            return true;
          case "Home":
            onCursor(moveCursor(cursor, "home", grid, count));
            return true;
          case "End":
            onCursor(moveCursor(cursor, "end", grid, count));
            return true;
          case "Enter":
          case " ":
            onCommit(cursor);
            return true;
          case "Escape":
            onClose();
            return true;
          default:
            if (event.key.toLowerCase() === "g") {
              onClose();
              return true;
            }
            return false;
        }
      };

      if (handled()) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [open, count, grid, cursor, onCursor, onCommit, onClose]);
}
