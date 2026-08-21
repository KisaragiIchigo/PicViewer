import { useEffect } from "react";

import { ipc } from "@/lib/ipc";
import { applyActual, applyFit, zoomBy } from "@/store/view-actions";
import { useViewer } from "@/store/viewer";

import type { FileActions } from "./useFileActions";

/**
 * キーボードショートカット。旧バージョン（←/→/O/F/Delete）の操作感は維持したまま、
 * ビューアとして欲しくなる操作を足している。
 */
export function useKeyboard(actions: FileActions): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const store = useViewer.getState();
      const mod = event.ctrlKey || event.metaKey;

      // Ctrl / Meta を伴うものを先に捌く
      if (mod) {
        switch (event.key.toLowerCase()) {
          case "z":
            event.preventDefault();
            void actions.undoTrash();
            return;
          case "c":
            event.preventDefault();
            void (event.shiftKey ? actions.copyPath() : actions.copyImage());
            return;
          case "e":
            event.preventDefault();
            void actions.reveal();
            return;
          case "o":
            event.preventDefault();
            void actions.openDialog();
            return;
          default:
            break;
        }
      }

      switch (event.key) {
        case "ArrowLeft":
        case "PageUp":
        case "Backspace":
          event.preventDefault();
          store.go(-1);
          return;

        case "ArrowRight":
        case "PageDown":
          event.preventDefault();
          store.go(1);
          return;

        case " ":
          event.preventDefault();
          store.go(event.shiftKey ? -1 : 1);
          return;

        case "Home":
          event.preventDefault();
          store.jumpTo(0);
          return;

        case "End":
          event.preventDefault();
          store.jumpTo(store.paths.length - 1);
          return;

        case "Delete":
          event.preventDefault();
          void actions.trash();
          return;

        case "+":
        case "=":
          event.preventDefault();
          zoomBy(1);
          return;

        case "-":
          event.preventDefault();
          zoomBy(-1);
          return;

        case "Enter":
        case "F11":
          event.preventDefault();
          void ipc.toggleFullscreen().then(store.setFullscreen);
          return;

        case "Escape":
          event.preventDefault();
          closeTopLayer();
          return;

        case "F1":
        case "?":
          event.preventDefault();
          store.toggleHelp();
          return;

        default:
          break;
      }

      // 単独の英字キー。修飾キー付きはここまでで処理済み。
      if (mod || event.altKey) return;

      switch (event.key.toLowerCase()) {
        case "f":
        case "0":
          applyFit();
          break;
        case "1":
          applyActual();
          break;
        case "o":
          void actions.openDialog();
          break;
        case "t":
          store.toggleFilmstrip();
          break;
        case "g":
          if (store.paths.length > 0) store.toggleGallery();
          break;
        case "i":
          store.toggleInfo();
          break;
        case "h":
          store.toggleHelp();
          break;
        case "p":
          store.toggleSlideshow();
          break;
        case "r":
          void store.reload();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [actions]);
}

/** Esc は「今いちばん手前にあるもの」から順に閉じる。 */
function closeTopLayer(): void {
  const store = useViewer.getState();

  // 一覧が開いている間のキー操作は Gallery 側が捕捉フェーズで横取りするため、
  // ここへは届かない。
  if (store.help) {
    store.toggleHelp();
    return;
  }
  if (store.info) {
    store.toggleInfo();
    return;
  }
  if (store.slideshow) {
    store.toggleSlideshow();
    return;
  }
  if (store.fullscreen) {
    void ipc.toggleFullscreen().then(store.setFullscreen);
    return;
  }
  if (store.mode !== "fit") {
    applyFit();
  }
}
