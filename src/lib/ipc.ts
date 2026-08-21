import { invoke } from "@tauri-apps/api/core";

import type { FileMeta, Library } from "./types";

/**
 * Rust 側コマンドの型付きラッパ。UI からは常にここ経由で呼び、
 * コマンド名の文字列をコンポーネントに散らさない。
 */
export const ipc = {
  boot: () => invoke<string | null>("boot"),
  chromeReady: () => invoke<void>("chrome_ready"),

  startDrag: () => invoke<void>("start_drag"),
  minimize: () => invoke<void>("minimize"),
  toggleMaximize: () => invoke<boolean>("toggle_maximize"),
  closeWindow: () => invoke<void>("close_window"),
  toggleFullscreen: () => invoke<boolean>("toggle_fullscreen"),
  setTitle: (title: string) => invoke<void>("set_title", { title }),

  listSiblings: (target: string) => invoke<Library>("list_siblings", { target }),
  resolveTarget: (path: string) => invoke<string | null>("resolve_target", { path }),
  watchFolder: (dir: string) => invoke<void>("watch_folder", { dir }),
  pickFile: () => invoke<string | null>("pick_file"),

  moveToTrash: (path: string) => invoke<void>("move_to_trash", { path }),
  undoTrash: () => invoke<string | null>("undo_trash"),
  revealInExplorer: (path: string) => invoke<void>("reveal_in_explorer", { path }),
  copyImage: (path: string) => invoke<void>("copy_image", { path }),
  copyPath: (path: string) => invoke<void>("copy_path", { path }),

  fileMeta: (path: string) => invoke<FileMeta>("file_meta", { path }),
};

/** Rust 側から「このパスを開いて」と飛んでくるイベント名。 */
export const OPEN_REQUEST = "picview://open";

/** 表示中のフォルダの中身が変わったことを知らせるイベント名。 */
export const FOLDER_CHANGED = "picview://folder-changed";
