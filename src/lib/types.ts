export type Library = {
  dir: string;
  paths: string[];
  index: number;
};

export type FileMeta = {
  name: string;
  path: string;
  dir: string;
  ext: string;
  bytes: number;
  modified: number;
};

export type Natural = {
  width: number;
  height: number;
};

export type Size = {
  width: number;
  height: number;
};

export type Point = {
  x: number;
  y: number;
};

/** fit: 画面に収める / actual: 実寸 100% / free: ホイールで自由に変更した状態 */
export type ViewMode = "fit" | "actual" | "free";

export type Toast = {
  id: number;
  text: string;
  tone: "info" | "danger";
  action?: { label: string; run: () => void };
};
