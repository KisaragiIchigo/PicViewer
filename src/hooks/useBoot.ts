import { useEffect } from "react";

import { ipc } from "@/lib/ipc";
import { useViewer } from "@/store/viewer";

/**
 * 起動シーケンス。
 * 1. Rust が保持している起動引数を受け取る
 * 2. 画像があれば即座に読み込みを始める（ウィンドウはまだ不可視）
 * 3. 画像が無ければウィンドウを出して案内を表示する
 *
 * ウィンドウの可視化は Stage 側の初回描画完了で行う。ここでは開始だけ。
 */
export function useBoot(): void {
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const initial = await ipc.boot().catch(() => null);
      if (cancelled) return;

      if (initial) {
        void useViewer.getState().openPath(initial);
        return;
      }
      void ipc.chromeReady();
    })();

    return () => {
      cancelled = true;
    };
  }, []);
}
