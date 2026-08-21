import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { X } from "lucide-react";

import { cx } from "@/lib/cx";
import { baseName } from "@/lib/format";
import { thumbSrc } from "@/lib/source";
import { useViewer } from "@/store/viewer";

import { CHROME } from "../chrome";
import { IconButton } from "../ui/IconButton";
import type { Grid, ThumbSize } from "./grid";
import { GAP, LABEL, cellPosition, computeGrid, scrollToShow } from "./grid";
import { useGalleryKeys } from "./useGalleryKeys";

const SIZES: Array<{ key: ThumbSize; label: string }> = [
  { key: "s", label: "S" },
  { key: "m", label: "M" },
  { key: "l", label: "L" },
];

/**
 * フォルダ内の全画像をグリッドで見渡す一覧。
 * 描画するのは画面に入る行だけなので、枚数が増えても DOM は一定のまま。
 */
export function Gallery() {
  const open = useViewer((s) => s.gallery);
  const paths = useViewer((s) => s.paths);
  const index = useViewer((s) => s.index);
  const dir = useViewer((s) => s.dir);
  const jumpTo = useViewer((s) => s.jumpTo);
  const toggleGallery = useViewer((s) => s.toggleGallery);

  const [size, setSize] = useState<ThumbSize>("m");
  const [cursor, setCursor] = useState(index);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  const scrollerRef = useRef<HTMLDivElement>(null);

  const grid = useMemo(
    () => computeGrid(paths.length, size, viewport.width, viewport.height, scrollTop),
    [paths.length, size, viewport.width, viewport.height, scrollTop],
  );

  // 開いた瞬間は、いま見ている画像にカーソルを合わせる。
  useEffect(() => {
    if (open) setCursor(index);
  }, [open, index]);

  useLayoutEffect(() => {
    const element = scrollerRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      setViewport({
        width: Math.round(entry.contentRect.width),
        height: Math.round(entry.contentRect.height),
      });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [open]);

  // カーソルが画面外へ出たら追いかける。
  useEffect(() => {
    const element = scrollerRef.current;
    if (!element || viewport.height === 0) return;

    const next = scrollToShow(cursor, grid, viewport.height, element.scrollTop);
    if (next !== element.scrollTop) element.scrollTo({ top: next });
  }, [cursor, grid, viewport.height]);

  const commit = useCallback(
    (target: number) => {
      jumpTo(target);
      toggleGallery();
    },
    [jumpTo, toggleGallery],
  );

  useGalleryKeys({
    open,
    count: paths.length,
    grid,
    cursor,
    onCursor: setCursor,
    onCommit: commit,
    onClose: toggleGallery,
  });

  const slots = useMemo(() => {
    if (paths.length === 0) return [];
    return Array.from({ length: grid.to - grid.from + 1 }, (_, i) => grid.from + i);
  }, [grid.from, grid.to, paths.length]);

  return (
    <AnimatePresence>
      {open && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
          className="pointer-events-auto absolute inset-0 z-modal flex flex-col bg-base/95 backdrop-blur-xl"
        >
          <header
            style={{ height: CHROME.topBar }}
            className="flex shrink-0 items-center gap-3 border-b border-white/[0.07] px-2.5"
          >
            <span className="label shrink-0">Gallery</span>
            <span className="numeric shrink-0 text-xs text-teal-300">
              {paths.length}
            </span>
            <span className="min-w-0 flex-1 truncate font-jp text-xs text-slate-400">
              {dir}
            </span>

            <div className="flex shrink-0 items-center gap-1">
              {SIZES.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setSize(option.key)}
                  className={cx(
                    "numeric h-6 w-6 rounded border text-xs transition-colors",
                    size === option.key
                      ? "border-teal-500/40 bg-teal-500/10 text-teal-300 shadow-glow"
                      : "border-white/[0.04] text-slate-400 hover:border-white/[0.1] hover:bg-white/[0.05] hover:text-slate-200",
                  )}
                >
                  {option.label}
                </button>
              ))}
              <span className="mx-0.5 h-3.5 w-px bg-white/[0.08]" />
              <IconButton icon={X} label="閉じる" shortcut="Esc" onClick={toggleGallery} />
            </div>
          </header>

          <div
            ref={scrollerRef}
            onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
            className="relative flex-1 overflow-y-auto overflow-x-hidden p-3"
          >
            <div
              className="relative w-full"
              style={{ height: grid.totalRows * grid.rowHeight }}
            >
              {slots.map((slot) => (
                <Cell
                  key={paths[slot]}
                  path={paths[slot]}
                  slot={slot}
                  grid={grid}
                  viewportWidth={viewport.width}
                  current={slot === index}
                  focused={slot === cursor}
                  onPick={() => commit(slot)}
                  onHover={() => setCursor(slot)}
                />
              ))}
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}

type CellProps = {
  path: string;
  slot: number;
  grid: Grid;
  viewportWidth: number;
  current: boolean;
  focused: boolean;
  onPick: () => void;
  onHover: () => void;
};

function Cell({
  path,
  slot,
  grid,
  viewportWidth,
  current,
  focused,
  onPick,
  onHover,
}: CellProps) {
  const { left, top } = cellPosition(slot, grid, viewportWidth);
  // 高DPI環境でも眠くならないよう、表示サイズの2倍を要求する（上限は 640px）。
  const edge = Math.min(640, grid.cell * 2);

  return (
    <button
      type="button"
      onClick={onPick}
      onPointerEnter={onHover}
      style={{ left, top, width: grid.cell }}
      className="absolute flex flex-col gap-1 text-left"
    >
      <span
        className={cx(
          "block overflow-hidden rounded-[4px] border transition-all duration-150",
          current
            ? "border-teal-400/80 shadow-glow-strong"
            : focused
              ? "border-white/40"
              : "border-white/[0.06]",
        )}
        style={{ height: grid.cell }}
      >
        <img
          src={thumbSrc(path, edge)}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          className="h-full w-full bg-black object-cover"
        />
      </span>

      <span
        className={cx(
          "block truncate font-jp text-xs",
          current ? "text-teal-300" : focused ? "text-slate-200" : "text-slate-400",
        )}
        style={{ height: LABEL - GAP / 2 }}
      >
        {baseName(path)}
      </span>
    </button>
  );
}
