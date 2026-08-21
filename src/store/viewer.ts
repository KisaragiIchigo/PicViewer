import { create } from "zustand";

import { ipc } from "@/lib/ipc";
import { baseName, samePath } from "@/lib/format";
import type { Library, Natural, Point, Size, Toast, ViewMode } from "@/lib/types";

let toastSeq = 0;

type ViewerStore = {
  /* ---- ライブラリ ---- */
  dir: string;
  paths: string[];
  index: number;
  /** 表示中のパス。フォルダ走査を待たずに1枚目を出すため paths とは独立に持つ。 */
  current: string | null;
  /** resolveTarget の応答待ち。待機中の読み込み失敗はエラー扱いしない。 */
  resolving: boolean;

  /* ---- 表示状態 ---- */
  natural: Natural | null;
  /** 画像を描画する領域のピクセルサイズ。Stage の ResizeObserver が更新する。 */
  container: Size;
  zoom: number;
  offset: Point;
  mode: ViewMode;
  loadError: string | null;

  /* ---- UI ---- */
  filmstrip: boolean;
  gallery: boolean;
  info: boolean;
  help: boolean;
  slideshow: boolean;
  fullscreen: boolean;
  toasts: Toast[];

  /* ---- 操作 ---- */
  openPath: (path: string) => Promise<void>;
  adoptLibrary: (library: Library) => void;
  go: (delta: number) => void;
  jumpTo: (index: number) => void;
  /** ゴミ箱へ送った直後に一覧から取り除き、隣の画像へ移る。 */
  dropCurrent: () => void;
  /** 表示できる画像が無くなった状態へ戻す。 */
  clearLibrary: () => void;
  /** フォルダの内容を読み直す。外で消されていた場合は近い位置へ寄せる。 */
  reload: () => Promise<void>;

  setNatural: (natural: Natural | null) => void;
  setContainer: (container: Size) => void;
  setLoadError: (message: string | null) => void;
  setView: (zoom: number, offset: Point, mode: ViewMode) => void;
  setMode: (mode: ViewMode) => void;

  toggleFilmstrip: () => void;
  toggleGallery: () => void;
  toggleInfo: () => void;
  toggleHelp: () => void;
  toggleSlideshow: () => void;
  setFullscreen: (value: boolean) => void;

  pushToast: (toast: Omit<Toast, "id">) => void;
  dismissToast: (id: number) => void;
};

/**
 * 画像を切り替えるたびにリセットされる表示状態。
 *
 * zoom と offset は意図的に含めていない。新しい画像が読み終わるまでは前の画像が
 * 表示され続けるので、ここで倍率を 1 に戻すと「切り替えた瞬間に前の画像が
 * 等倍でちらつく」ことになる。倍率は読み込み完了時（useImageLoader）に
 * 新しい寸法と一緒に確定させる。
 */
const FRESH_VIEW = {
  natural: null,
  mode: "fit" as ViewMode,
  loadError: null,
};

export const useViewer = create<ViewerStore>((set, get) => ({
  dir: "",
  paths: [],
  index: 0,
  current: null,
  resolving: false,

  ...FRESH_VIEW,
  container: { width: 0, height: 0 },
  zoom: 1,
  offset: { x: 0, y: 0 },

  filmstrip: false,
  gallery: false,
  info: false,
  help: false,
  slideshow: false,
  fullscreen: false,
  toasts: [],

  openPath: async (path) => {
    // 先に表示を始めてから解決する。ファイルが直接渡された通常ケースでは
    // この時点で既に WebView が画像の取得を開始している。
    set({ ...FRESH_VIEW, current: path, resolving: true });

    let resolved: string | null = null;
    try {
      resolved = await ipc.resolveTarget(path);
    } catch (error) {
      set({ resolving: false, loadError: String(error) });
      return;
    }

    if (!resolved) {
      set({ resolving: false });
      get().clearLibrary();
      get().pushToast({ text: "開ける画像が見つかりませんでした", tone: "danger" });
      return;
    }

    if (resolved !== get().current) {
      set({ ...FRESH_VIEW, current: resolved });
    }
    set({ resolving: false });

    try {
      get().adoptLibrary(await ipc.listSiblings(resolved));
    } catch (error) {
      get().pushToast({ text: `フォルダを読めませんでした: ${error}`, tone: "danger" });
    }
  },

  adoptLibrary: (library) => {
    set({ dir: library.dir, paths: library.paths, index: library.index });
    void ipc.setTitle(titleFor(library.paths[library.index] ?? null, library));
    void ipc.watchFolder(library.dir);
  },

  go: (delta) => {
    const { paths, index } = get();
    if (paths.length === 0) return;
    get().jumpTo((index + delta + paths.length) % paths.length);
  },

  jumpTo: (next) => {
    const { paths, index } = get();
    if (paths.length === 0) return;

    const clamped = Math.max(0, Math.min(paths.length - 1, next));
    if (clamped === index && get().current === paths[clamped]) return;

    set({ ...FRESH_VIEW, index: clamped, current: paths[clamped], resolving: false });
    void ipc.setTitle(titleFor(paths[clamped], get()));
  },

  dropCurrent: () => {
    const { paths, index } = get();

    if (paths.length <= 1) {
      get().clearLibrary();
      return;
    }

    const next = paths.filter((_, i) => i !== index);
    const nextIndex = Math.min(index, next.length - 1);
    set({ ...FRESH_VIEW, paths: next, index: nextIndex, current: next[nextIndex] });
    void ipc.setTitle(titleFor(next[nextIndex], { paths: next, index: nextIndex }));
  },

  clearLibrary: () => {
    set({ ...FRESH_VIEW, paths: [], index: 0, current: null, dir: "", gallery: false });
    void ipc.setTitle("PicView");
    void ipc.watchFolder("");
  },

  reload: async () => {
    const { current, index } = get();
    if (!current) return;

    let library;
    try {
      library = await ipc.listSiblings(current);
    } catch {
      // フォルダごと消えている場合は、いま見えているものをそのまま保つ
      return;
    }

    // 表示中の画像がまだ在るなら、位置を合わせ直すだけで済む。
    if (library.paths.some((path) => samePath(path, current))) {
      get().adoptLibrary(library);
      return;
    }

    if (library.paths.length === 0) {
      get().clearLibrary();
      return;
    }

    // 外で消されていた場合は、元の位置にいちばん近い画像へ寄せる。
    const near = Math.min(index, library.paths.length - 1);
    set({
      ...FRESH_VIEW,
      dir: library.dir,
      paths: library.paths,
      index: near,
      current: library.paths[near],
    });
    void ipc.setTitle(titleFor(library.paths[near], { paths: library.paths, index: near }));
    void ipc.watchFolder(library.dir);
  },

  setNatural: (natural) => set({ natural }),
  setContainer: (container) => set({ container }),
  setLoadError: (loadError) => set({ loadError }),
  setView: (zoom, offset, mode) => set({ zoom, offset, mode }),
  setMode: (mode) => set({ mode }),

  toggleFilmstrip: () => set((s) => ({ filmstrip: !s.filmstrip })),
  toggleGallery: () => set((s) => ({ gallery: !s.gallery })),
  toggleInfo: () => set((s) => ({ info: !s.info })),
  toggleHelp: () => set((s) => ({ help: !s.help })),
  toggleSlideshow: () => set((s) => ({ slideshow: !s.slideshow })),
  setFullscreen: (fullscreen) => set({ fullscreen }),

  pushToast: (toast) => {
    const id = ++toastSeq;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }].slice(-3) }));
    window.setTimeout(() => get().dismissToast(id), toast.action ? 6000 : 2600);
  },

  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

function titleFor(path: string | null, library: { paths: string[]; index: number }): string {
  if (!path) return "PicView";
  return `${baseName(path)} — ${library.index + 1}/${library.paths.length} — PicView`;
}
