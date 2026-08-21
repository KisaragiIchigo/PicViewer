import type { Natural, Point, Size } from "@/lib/types";

export const MIN_ZOOM = 0.02;
export const MAX_ZOOM = 40;

/**
 * 画面に収まる倍率。等倍を超える拡大はしない（32px のアイコンが画面いっぱいに
 * 引き伸ばされる方が、余白があるより見づらいため）。
 */
export function fitZoom(natural: Natural, container: Size): number {
  if (natural.width <= 0 || natural.height <= 0) return 1;
  if (container.width <= 0 || container.height <= 0) return 1;

  return Math.min(
    container.width / natural.width,
    container.height / natural.height,
    1,
  );
}

/**
 * 画像が画面外へ飛んでいかないよう平行移動量を制限する。
 * 拡大後のサイズが画面より小さい軸は中央固定にする。
 */
export function clampOffset(
  offset: Point,
  zoom: number,
  natural: Natural,
  container: Size,
): Point {
  const scaledWidth = natural.width * zoom;
  const scaledHeight = natural.height * zoom;

  const limitX = Math.max(0, (scaledWidth - container.width) / 2);
  const limitY = Math.max(0, (scaledHeight - container.height) / 2);

  return {
    x: Math.max(-limitX, Math.min(limitX, offset.x)),
    y: Math.max(-limitY, Math.min(limitY, offset.y)),
  };
}

/**
 * カーソル位置を固定したまま倍率を変えたときの新しい平行移動量。
 *
 * 画像上の点 p は画面上（コンテナ中心基準）で `p * zoom + offset` に写る。
 * カーソル c の下にある点は `p = (c - offset) / zoom` なので、
 * 倍率を next に変えても同じ点が c に来る条件は
 * `offsetNext = c - (c - offset) * (next / zoom)` となる。
 */
export function zoomAround(
  cursor: Point,
  zoom: number,
  offset: Point,
  next: number,
): Point {
  const ratio = next / zoom;
  return {
    x: cursor.x - (cursor.x - offset.x) * ratio,
    y: cursor.y - (cursor.y - offset.y) * ratio,
  };
}

export function clampZoom(zoom: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
}

/** 拡大率が高いときは補間を切って、ドット単位で見えるようにする。 */
export function renderingFor(zoom: number): "pixelated" | "auto" {
  return zoom >= 3 ? "pixelated" : "auto";
}
