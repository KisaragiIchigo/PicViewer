import { useCallback, useEffect, useRef, useState } from "react";

import { panBy, toggleFitActual, zoomBy } from "@/store/view-actions";
import { useViewer } from "@/store/viewer";

/** ホイールの累積がこの量を超えたら1枚送る。マウスの1ノッチ（100前後）は即座に反応する。 */
const WHEEL_STEP = 40;
/** この時間だけ間が空いたら累積をリセットする。 */
const WHEEL_RESET_MS = 200;

export type ZoomPan = {
  panning: boolean;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onDoubleClick: () => void;
};

/**
 * ステージ上のポインタ操作。
 * - ホイール         : 次／前の画像（旧バージョンの操作感を踏襲）
 * - Ctrl + ホイール  : カーソル位置を軸にした拡大縮小
 * - ドラッグ         : 拡大時の平行移動
 * - ダブルクリック   : フィットと実寸の往復
 */
export function useZoomPan(
  stageRef: React.RefObject<HTMLDivElement>,
  safeRef: React.RefObject<HTMLDivElement>,
): ZoomPan {
  const [panning, setPanning] = useState(false);
  const wheelAccum = useRef(0);
  const wheelStamp = useRef(0);

  const navigate = useCallback((delta: number) => {
    const now = performance.now();
    if (now - wheelStamp.current > WHEEL_RESET_MS) wheelAccum.current = 0;
    wheelStamp.current = now;

    wheelAccum.current += delta;
    if (Math.abs(wheelAccum.current) < WHEEL_STEP) return;

    useViewer.getState().go(wheelAccum.current > 0 ? 1 : -1);
    wheelAccum.current = 0;
  }, []);

  useEffect(() => {
    const element = stageRef.current;
    if (!element) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();

      if (!event.ctrlKey) {
        navigate(event.deltaY);
        return;
      }

      // 座標の原点はバーに隠れない領域の中心。画像の配置基準と揃える。
      const rect = (safeRef.current ?? element).getBoundingClientRect();
      zoomBy(event.deltaY < 0 ? 1 : -1, {
        x: event.clientX - rect.left - rect.width / 2,
        y: event.clientY - rect.top - rect.height / 2,
      });
    };

    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [stageRef, safeRef, navigate]);

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;

    const { natural, container, zoom } = useViewer.getState();
    if (!natural) return;

    const overflows =
      natural.width * zoom > container.width + 1 ||
      natural.height * zoom > container.height + 1;
    if (!overflows) return;

    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    setPanning(true);

    let lastX = event.clientX;
    let lastY = event.clientY;

    const onMove = (move: PointerEvent) => {
      panBy(move.clientX - lastX, move.clientY - lastY);
      lastX = move.clientX;
      lastY = move.clientY;
    };

    const onUp = () => {
      setPanning(false);
      target.releasePointerCapture(event.pointerId);
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", onUp);
      target.removeEventListener("pointercancel", onUp);
    };

    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
    target.addEventListener("pointercancel", onUp);
  }, []);

  const onDoubleClick = useCallback(() => toggleFitActual(), []);

  return { panning, onPointerDown, onDoubleClick };
}
