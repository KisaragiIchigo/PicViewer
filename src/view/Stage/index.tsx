import { useEffect, useMemo, useRef } from "react";
import { AlertTriangle } from "lucide-react";

import { refitIfNeeded } from "@/store/view-actions";
import { useViewer } from "@/store/viewer";

import { CHROME, stageInsets } from "../chrome";
import { EmptyState } from "../EmptyState";
import { renderingFor } from "./geometry";
import { useImageLoader } from "./useImageLoader";
import { useZoomPan } from "./useZoomPan";

type Props = {
  /** クロームが引っ込んでいる間はカーソルも隠す。 */
  cursorHidden: boolean;
};

export function Stage({ cursorHidden }: Props) {
  const current = useViewer((s) => s.current);
  const zoom = useViewer((s) => s.zoom);
  const offset = useViewer((s) => s.offset);
  const natural = useViewer((s) => s.natural);
  const container = useViewer((s) => s.container);
  const loadError = useViewer((s) => s.loadError);
  const filmstrip = useViewer((s) => s.filmstrip);
  const setContainer = useViewer((s) => s.setContainer);

  const stageRef = useRef<HTMLDivElement>(null);
  const safeRef = useRef<HTMLDivElement>(null);

  const { src, natural: shownNatural, preview } = useImageLoader(current);
  const { panning, onPointerDown, onDoubleClick } = useZoomPan(stageRef, safeRef);

  const insets = useMemo(() => stageInsets(filmstrip), [filmstrip]);

  // 画像が収まる領域（バーに隠れない範囲）の実寸を追う。
  // 倍率もクランプもカーソル基準のズームも、すべてこの領域を基準に計算される。
  useEffect(() => {
    const element = safeRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setContainer({ width: Math.round(width), height: Math.round(height) });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [setContainer]);

  // 画像サイズか表示領域が変わったらフィット倍率を取り直す。
  useEffect(() => {
    refitIfNeeded();
  }, [natural, container.width, container.height]);

  const overflows =
    !!shownNatural &&
    (shownNatural.width * zoom > container.width + 1 ||
      shownNatural.height * zoom > container.height + 1);

  return (
    <div
      ref={stageRef}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      className="relative h-full w-full overflow-hidden bg-canvas"
      style={{
        cursor: cursorHidden && !panning ? "none" : panning ? "grabbing" : overflows ? "grab" : "default",
      }}
    >
      <div
        ref={safeRef}
        className="absolute inset-x-0"
        style={{ top: insets.top, bottom: insets.bottom }}
      >
        {src && shownNatural && (
          <img
            src={src}
            alt=""
            draggable={false}
            className="absolute left-1/2 top-1/2 select-none"
            style={{
              width: `${shownNatural.width * zoom}px`,
              height: `${shownNatural.height * zoom}px`,
              transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
              imageRendering: renderingFor(zoom),
            }}
          />
        )}
      </div>

      {preview && (
        <div
          className="absolute right-3 flex items-center gap-2 rounded border border-teal-500/20 bg-teal-500/10 px-2.5 py-1"
          style={{ top: CHROME.topBar + CHROME.gap }}
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-400" />
          <span className="font-jp text-xs text-teal-300">読み込み中</span>
        </div>
      )}

      {!src && loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-rose-300">
          <AlertTriangle className="h-6 w-6" strokeWidth={1.5} />
          <p className="max-w-lg text-center font-jp text-sm leading-relaxed">{loadError}</p>
        </div>
      )}

      {!src && !loadError && <EmptyState />}
    </div>
  );
}
