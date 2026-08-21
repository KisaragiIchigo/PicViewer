import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";

import { OPEN_REQUEST } from "@/lib/ipc";
import { useViewer } from "@/store/viewer";

/**
 * 「このパスを開いて」という要求の受け口。
 * 2つ目のインスタンス起動（＝関連付けからのダブルクリック）と、
 * ウィンドウへのドラッグ&ドロップの両方がここへ集まる。
 */
export function useOpenRequests(): void {
  useEffect(() => {
    const pending = listen<string>(OPEN_REQUEST, (event) => {
      void useViewer.getState().openPath(event.payload);
    });

    return () => {
      void pending.then((unlisten) => unlisten());
    };
  }, []);
}
