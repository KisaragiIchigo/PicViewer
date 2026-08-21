import type { Point } from "@/lib/types";
import {
  clampOffset,
  clampZoom,
  fitZoom,
  zoomAround,
} from "@/view/Stage/geometry";

import { useViewer } from "./viewer";

const ZOOM_STEP = 1.18;

/** 画面に収める。ズーム・平行移動もリセットする。 */
export function applyFit(): void {
  const { natural, container, setView } = useViewer.getState();
  if (!natural) return;
  setView(fitZoom(natural, container), { x: 0, y: 0 }, "fit");
}

/** 実寸 100%。中心を保ったまま倍率だけ変える。 */
export function applyActual(): void {
  const { natural, container, zoom, offset, setView } = useViewer.getState();
  if (!natural) return;

  const next = 1;
  const shifted = zoomAround({ x: 0, y: 0 }, zoom, offset, next);
  setView(next, clampOffset(shifted, next, natural, container), "actual");
}

/** フィットと実寸を往復する。ダブルクリックの挙動。 */
export function toggleFitActual(): void {
  const { mode, natural, container } = useViewer.getState();
  if (!natural) return;

  // フィット倍率が既に等倍なら往復しても変化がないので、そのままフィットに戻す。
  if (mode !== "fit" || fitZoom(natural, container) >= 1) {
    applyFit();
    return;
  }
  applyActual();
}

/** カーソル位置（コンテナ中心を原点とした座標）を基準に拡大縮小する。 */
export function zoomBy(steps: number, cursor: Point = { x: 0, y: 0 }): void {
  const { natural, container, zoom, offset, setView } = useViewer.getState();
  if (!natural) return;

  const next = clampZoom(zoom * ZOOM_STEP ** steps);
  if (next === zoom) return;

  const shifted = zoomAround(cursor, zoom, offset, next);
  setView(next, clampOffset(shifted, next, natural, container), "free");
}

/** ドラッグによる平行移動。 */
export function panBy(dx: number, dy: number): void {
  const { natural, container, zoom, offset, mode, setView } = useViewer.getState();
  if (!natural) return;

  const moved = { x: offset.x + dx, y: offset.y + dy };
  setView(zoom, clampOffset(moved, zoom, natural, container), mode);
}

/** 画像・ウィンドウサイズが変わったときにフィット倍率を追従させる。 */
export function refitIfNeeded(): void {
  const { natural, container, mode, zoom, offset, setView } = useViewer.getState();
  if (!natural || container.width <= 0) return;

  if (mode === "fit") {
    setView(fitZoom(natural, container), { x: 0, y: 0 }, "fit");
    return;
  }
  setView(zoom, clampOffset(offset, zoom, natural, container), mode);
}
